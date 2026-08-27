# Quick Task Summary: sovereignty-field-info-tooltips

**Status:** complete  
**Validation:** `cd client && yarn type-check` → Exit 0 (no errors)

## Files Changed

| File                                                | Change                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client/src/components/common/GenericForm.tsx`      | Added `tooltip?: string` to `FieldConfig`; imported `Tooltip`, `InfoOutlined`, `InputAdornment`; rendered info icon as `endAdornment` in select fields |
| `client/src/components/common/SovereigntyFields.ts` | Added the same tooltip key to all 8 maturity select fields (4 req + 4 ach); rationale/evidence/weight/date fields unchanged                              |
| `client/messages/de.json`                           | Added the shared five-level enforcement definition                                                                                                    |
| `client/messages/en.json`                           | Added the shared five-level enforcement definition                                                                                                    |
| `client/messages/fr.json`                           | Added the shared five-level enforcement definition                                                                                                    |

## What Was Done

- Extended `FieldConfig` interface with optional `tooltip?: string` property.
- Added `Tooltip`, `InfoOutlined` (18px, `action.active`, `cursor: help`), and `InputAdornment` imports to `GenericForm.tsx`.
- In the `select` field render block, conditionally adds an `endAdornment` with the info icon wrapped in MUI `Tooltip` when `field.tooltip` is defined.
- The `mr: 2` margin on the adornment avoids overlap with the select dropdown arrow.
- Set `tooltip: tCommon('sovereignty.tooltip')` on all 8 maturity select fields.
- Added the same Level/Durchsetzung definition for Very High through None in de/en/fr.

## Issues

None.
