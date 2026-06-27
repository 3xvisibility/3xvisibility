# Changelog

All notable, reversible UI/feature changes are documented here so they can be
audited and reverted easily.

## [Unreleased]

### Removed
- **Create Campaign → Mapping step: "How Mapping Works" intro section.**
  - File: `src/components/campaigns/MappingStep.tsx`
  - What: The instructional intro block (previously rendered above the
    "Variable Mapping" header) explaining how CSV columns map to template
    variables. It was removed at the user's request to declutter the step.
  - Why: Redundant — inline tooltips and the unmapped-variable alert already
    cover the same guidance.
  - How to revert: Re-add an intro block immediately before the
    `{/* Header */}` comment (around the `return (` of the mapping panel).
    The block was a static card with a heading "How Mapping Works" and a short
    list describing: (1) pick a CSV column or custom value per variable,
    (2) optionally map to a CMS target field, (3) optionally apply a transform.
    Alternatively, restore via the chat History tab to the version prior to
    this change.

### Verified
- Mapping step is responsive: mobile uses a stacked `flex-col` layout, desktop
  uses `sm:grid`; overflow is guarded with `overflow-hidden`, `min-w-0`,
  `truncate`, and `flex-wrap`. No text overflow or gaps on mobile/desktop.
- Confirmed "How Mapping Works" no longer renders anywhere in the codebase.
