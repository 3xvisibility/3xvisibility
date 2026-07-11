#!/usr/bin/env node
/**
 * Automated RLS + column-level grant regression check for sensitive fields.
 *
 * Runs the expectations declared in `sensitive-fields.mjs` against the live
 * database using `psql` (the managed PG* environment variables must be set).
 * Intended to run after every migration and in CI:
 *
 *   node scripts/security/check-sensitive-grants.mjs
 *
 * Exit codes:
 *   0  all checks passed
 *   1  one or more security expectations violated
 *   2  no database connection available (PG* env not set)
 *
 * For each sensitive table it asserts:
 *   - Row-Level Security is enabled (when requireRls).
 *   - Each secret column is NOT SELECT-able by anon or authenticated.
 *   - Each secret column IS SELECT-able by service_role (so backend code works).
 */

import { execFileSync } from "node:child_process";
import {
  SENSITIVE_TABLES,
  UNTRUSTED_ROLES,
  TRUSTED_ROLE,
} from "./sensitive-fields.mjs";

function haveDbConnection() {
  return Boolean(process.env.PGHOST || process.env.PGDATABASE);
}

/** Run a scalar SQL query and return trimmed stdout. */
function psql(sql) {
  return execFileSync("psql", ["-t", "-A", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function rlsEnabled(table) {
  const out = psql(
    `SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='${table}';`,
  );
  if (out === "") throw new Error(`table public.${table} does not exist`);
  return out === "t";
}

function canSelectColumn(role, table, column) {
  const out = psql(
    `SELECT has_column_privilege('${role}','public.${table}','${column}','SELECT');`,
  );
  return out === "t";
}

function main() {
  if (!haveDbConnection()) {
    console.error(
      "⚠  No database connection (PG* env not set) — skipping sensitive-grant regression check.",
    );
    process.exit(2);
  }

  const failures = [];
  let checks = 0;

  for (const { table, requireRls, secretColumns } of SENSITIVE_TABLES) {
    if (requireRls) {
      checks++;
      try {
        if (!rlsEnabled(table)) {
          failures.push(`RLS is DISABLED on public.${table}`);
        }
      } catch (err) {
        failures.push(`could not verify RLS on public.${table}: ${err.message}`);
      }
    }

    for (const column of secretColumns) {
      for (const role of UNTRUSTED_ROLES) {
        checks++;
        try {
          if (canSelectColumn(role, table, column)) {
            failures.push(
              `EXPOSED: role "${role}" can SELECT secret column ${table}.${column}`,
            );
          }
        } catch (err) {
          failures.push(
            `could not verify grant on ${table}.${column} for ${role}: ${err.message}`,
          );
        }
      }

      // service_role must retain access so trusted backend code keeps working.
      checks++;
      try {
        if (!canSelectColumn(TRUSTED_ROLE, table, column)) {
          failures.push(
            `REGRESSION: trusted role "${TRUSTED_ROLE}" lost SELECT on ${table}.${column}`,
          );
        }
      } catch (err) {
        failures.push(
          `could not verify ${TRUSTED_ROLE} grant on ${table}.${column}: ${err.message}`,
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n✗ Sensitive-field security regression check FAILED (${failures.length} issue(s)):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(`✓ Sensitive-field security regression check passed (${checks} assertions).`);
}

main();
