import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  SENSITIVE_TABLES,
  UNTRUSTED_ROLES,
  TRUSTED_ROLE,
} from "../../scripts/security/sensitive-fields.mjs";

/**
 * Live database regression guard for RLS + column-level grants on sensitive
 * fields. Mirrors `scripts/security/check-sensitive-grants.mjs` so the same
 * expectations run inside the normal `vitest` suite whenever a database
 * connection is available (post-migration environments, this sandbox, CI with
 * DB access).
 *
 * When no PG* connection is present (e.g. isolated unit-test CI) the suite
 * skips instead of failing, keeping `bun run test` green everywhere while still
 * catching real grant regressions wherever the DB is reachable.
 */

const hasDb = Boolean(process.env.PGHOST || process.env.PGDATABASE);

function psql(sql: string): string {
  return execFileSync("psql", ["-t", "-A", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const canSelect = (role: string, table: string, column: string) =>
  psql(`SELECT has_column_privilege('${role}','public.${table}','${column}','SELECT');`) === "t";

const rlsOn = (table: string) =>
  psql(
    `SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='${table}';`,
  ) === "t";

describe.skipIf(!hasDb)("sensitive-field RLS & column-grant regression", () => {
  for (const { table, requireRls, secretColumns } of SENSITIVE_TABLES) {
    if (requireRls) {
      it(`${table}: RLS is enabled`, () => {
        expect(rlsOn(table)).toBe(true);
      });
    }

    for (const column of secretColumns) {
      for (const role of UNTRUSTED_ROLES) {
        it(`${table}.${column}: not readable by ${role}`, () => {
          expect(canSelect(role, table, column)).toBe(false);
        });
      }

      it(`${table}.${column}: still readable by ${TRUSTED_ROLE}`, () => {
        expect(canSelect(TRUSTED_ROLE, table, column)).toBe(true);
      });
    }
  }
});

it.skipIf(hasDb)("sensitive-field grant check skipped (no DB connection)", () => {
  expect(hasDb).toBe(false);
});
