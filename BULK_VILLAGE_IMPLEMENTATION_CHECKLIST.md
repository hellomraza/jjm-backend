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

- [ ] Add current active-user check that also denies staff when parent TPI is inactive.
- [ ] Add Executive Engineer guard/service check that reads current database state.
- [ ] Add own-district Bulk Village scope validation.
- [ ] Add TPI ownership and staff assignment validation.
- [ ] Add agreement type-compatibility validation.
- [ ] Add work-order type filtering to lists and type-derived agreement filtering.
- [ ] Ensure untyped agreements appear in both mode lists.
- [ ] Ensure typed agreement cannot accept a work item of another type.
- [ ] Add DTO response projections that exclude TPI photo URLs from HO responses.

## Phase 3 — accounts and assignments

- [ ] Implement HO TPI create/list/search/edit/status APIs.
- [ ] Enforce one active TPI per district transactionally.
- [ ] Extend DO update API with Executive Engineer flag.
- [ ] Permit TPI dashboard login and password reset.
- [ ] Deny dashboard login for TPI staff.
- [ ] Implement TPI staff create/list/edit APIs with no user code.
- [ ] Implement Executive Engineer assign/change/unassign TPI APIs.
- [ ] Resolve current active district TPI automatically; never accept arbitrary TPI ID from DO assignment request.
- [ ] Implement TPI staff work-order assignment APIs.

## Phase 4 — reference evidence

- [ ] Implement TPI_STAFF no-progress upload endpoint.
- [ ] Confirm upload accepts URL/location/timestamp but rejects `progress`.
- [ ] Confirm upload does not modify `WorkItemComponent.progress` or contractor status.
- [ ] Implement strict reference photo listing by TPI/staff/Executive Engineer scope.
- [ ] Implement TPI select/deselect reference endpoints.
- [ ] Enforce one selected reference photo per component transactionally.
- [ ] Block staff upload after TPI selection.
- [ ] Allow deselect/re-upload only before contractor approval.
- [ ] Block select/deselect/upload after contractor approval.
- [ ] Confirm DO has no approve/reject endpoint for reference photos.

## Phase 5 — dashboard

- [ ] Add HO SVS/Bulk Village mode switch.
- [ ] Add Executive Engineer-only DO mode switch and direct-route protection.
- [ ] Clear/reject Bulk navigation after Executive Engineer revocation.
- [ ] Add HO TPI management tab; do not add Excel import.
- [ ] Add Executive Engineer toggle to DO create/edit/list UI.
- [ ] Add type-aware work order/agreement filters and creation/import context.
- [ ] Add Executive Engineer Bulk work-order TPI assignment controls with no picker.
- [ ] Show contractor and TPI evidence as separate groups; only contractor group gets approval buttons.
- [ ] Build TPI dashboard, staff management, staff assignment, and reference selection views.
- [ ] Show HO TPI identity/staff list while omitting all reference image data.

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
