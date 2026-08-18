# Bulk Village Implementation Checklist

Use this checklist in order. Do not mark a phase complete until every validation item passes.

## Phase 0 — decisions and preflight

- [x] Confirm whether new DO records enforce one active DO per district while preserving legacy duplicates.
- [x] Confirm eight temporary Bulk Village template names/units/orders (`Inspection: <existing component name>` is the current placeholder convention).
- [x] Confirm contractor-equivalent fields required for TPI create/edit form.
- [x] Confirm individual TPI staff activation/deactivation policy in addition to parent-TPI deactivation.
- [x] Back up target database and document migration rollback procedure.
- [x] Inspect current production-like row counts for users, work items, agreements, components, mappings, photos, and statuses.
- [x] Identify all current role enum switches in backend/admin/mobile that require `TPI` and `TPI_STAFF` handling.

## Phase 1 — schema and migration

- [x] Add `SVS` and `BULK_VILLAGE` work-order type enum.
- [x] Add and backfill `work_items.work_order_type = SVS`.
- [x] Add `users.is_executive_engineer` with default false.
- [x] Add `TPI` and `TPI_STAFF` user roles.
- [x] Add type-aware component template storage and snapshot strategy.
- [x] Remove/replace global component-order uniqueness that prevents order reuse per type.
- [x] Seed/migrate 12 SVS templates and seed 8 Bulk Village placeholders.
- [x] Add TPI district, staff relationship, staff work assignment, and reference-photo status tables/indexes.
- [x] Add work-item current-TPI assignment/audit fields.
- [x] Run migration on an empty database and a copied legacy database.
- [x] Verify all legacy work items, component mappings, photos, and IDs are preserved and classified as SVS.

## Phase 2 — backend authorization and data access

- [x] Add current active-user check that also denies staff when parent TPI is inactive.
- [x] Add Executive Engineer guard/service check that reads current database state.
- [x] Add own-district Bulk Village scope validation.
- [x] Add TPI ownership and staff assignment validation.
- [x] Add agreement type-compatibility validation.
- [x] Add work-order type filtering to lists and type-derived agreement filtering.
- [x] Ensure untyped agreements appear in both mode lists.
- [x] Ensure typed agreement cannot accept a work item of another type.
- [x] Add DTO response projections that exclude TPI photo URLs from HO responses.

## Phase 3 — accounts and assignments

- [x] Implement HO TPI create/list/search/edit/status APIs.
- [x] Enforce one active TPI per district transactionally.
- [x] Extend DO update API with Executive Engineer flag.
- [x] Permit TPI dashboard login and password reset.
- [x] Deny dashboard login for TPI staff.
- [x] Implement TPI staff create/list/edit APIs with no user code.
- [x] Implement Executive Engineer assign/change/unassign TPI APIs.
- [x] Resolve current active district TPI automatically; never accept arbitrary TPI ID from DO assignment request.
- [x] Implement TPI staff work-order assignment APIs.

## Phase 4 — reference evidence

- [x] Implement TPI_STAFF no-progress upload endpoint.
- [x] Confirm upload accepts URL/location/timestamp but rejects `progress`.
- [x] Confirm upload does not modify `WorkItemComponent.progress` or contractor status.
- [x] Implement strict reference photo listing by TPI/staff/Executive Engineer scope.
- [x] Implement TPI select/deselect reference endpoints.
- [x] Enforce one selected reference photo per component transactionally.
- [x] Block staff upload after TPI selection.
- [x] Allow deselect/re-upload only before contractor approval.
- [x] Block select/deselect/upload after contractor approval.
- [x] Confirm DO has no approve/reject endpoint for reference photos.

## Phase 5 — dashboard

- [x] Add HO SVS/Bulk Village mode switch.
- [x] Add Executive Engineer-only DO mode switch and direct-route protection.
- [x] Clear/reject Bulk navigation after Executive Engineer revocation.
- [x] Add HO TPI management tab; do not add Excel import.
- [x] Add Executive Engineer toggle to DO create/edit/list UI.
- [x] Add type-aware work order/agreement filters and creation/import context.
- [x] Add Executive Engineer Bulk work-order TPI assignment controls with no picker.
- [x] Show contractor and TPI evidence as separate groups; only contractor group gets approval buttons.
- [x] Build TPI dashboard, staff management, staff assignment, and reference selection views.
- [x] Show HO TPI identity/staff list while omitting all reference image data.

## Phase 6 — mobile

- [ ] Add TPI_STAFF mobile authentication/profile handling.
- [ ] Scope agreement/work-item APIs to assigned TPI staff work only.
- [ ] Reuse navigation/camera/location/compression/Cloudinary flow.
- [ ] Hide quantity/progress input for TPI staff.
- [ ] Use dedicated reference-photo upload endpoint for TPI staff.
- [ ] Show reference-photo locked state after TPI selection.
- [ ] Preserve all existing EM progress/photo behavior and tests.

## Phase 7 — verification and release

- [ ] Unit-test every validation/guard and role matrix allow/deny condition.
- [ ] Add controller/e2e tests for types, agreements, TPI management, assignments, staff, reference evidence, locking, and redaction.
- [ ] Test concurrent TPI selection requests; only one selection may succeed.
- [ ] Test TPI/parent deactivation with already issued tokens.
- [ ] Test Executive Engineer revocation with already issued token.
- [ ] Test Next.js mode, navigation, cache invalidation, loading, and error states.
- [ ] Test React Native EM and TPI_STAFF flows separately.
- [ ] Manually walk through HO, normal DO, Executive Engineer DO, CO, EM, TPI, TPI_STAFF across at least two districts.
- [ ] Verify no TPI reference URL exists in any HO API response, network response, or rendered markup.
- [ ] Run lint, unit tests, builds, migration dry run, and smoke test before release.
