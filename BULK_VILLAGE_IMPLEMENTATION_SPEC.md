# Bulk Village Work Order — Implementation Specification

## Purpose

This is the authoritative implementation specification for adding the **Bulk Village** workflow to the JJM system without breaking the existing **SVS** (Single Village Service) workflow.

Applies to:

- NestJS backend in this repository
- Next.js admin dashboard in `../Jal-Jeeven-Mission_Admin`
- React Native app in `../../JjmMobile`
- MySQL / TypeORM schema, migrations, seeds, API contracts, authorization, and tests

> **Non-negotiable:** frontend visibility is UX only. Every permission, scope, state transition, and data filter below must be enforced in the backend.

---

## 1. Vocabulary and roles

| Code | Role | Surface | Responsibility |
|---|---|---|---|
| `HO` | Head Office | Dashboard | Manages DOs and TPIs; operates SVS and Bulk Village modes. |
| `DO` | District Officer | Dashboard | Existing SVS responsibilities. Bulk Village is available only with Executive Engineer access. |
| `CO` | Contractor | Dashboard | Existing contractor workflow; assigns employees, selects contractor evidence. |
| `EM` | Employee | Mobile | Existing progress-photo workflow for contractor-assigned work. |
| `TPI` | Third-Party Inspector | Dashboard | Bulk Village-only; manages TPI staff and selects reference evidence. |
| `TPI_STAFF` | TPI staff | Mobile | Uploads no-progress reference photos for assigned Bulk Village work. |

### Canonical names

- Existing work-order type: `SVS` (not SPS).
- New work-order type: `BULK_VILLAGE`.
- TPI photos are **reference evidence**, not contractor evidence.

---

## 2. Work-order modes and agreements

### 2.1 Work-order type

Persist this enum on `work_items` only:

```ts
export enum WorkOrderType {
  SVS = 'SVS',
  BULK_VILLAGE = 'BULK_VILLAGE',
}
```

All existing work items must be backfilled to `SVS`.

### 2.2 Agreement type is derived, never persisted

Do **not** add `work_order_type` to `agreements`. Its mode is inferred from linked work items.

| Agreement state | SVS mode | Bulk Village mode |
|---|---:|---:|
| Has no linked work orders | visible | visible |
| Has one or more SVS work orders | visible | hidden |
| Has one or more Bulk Village work orders | hidden | visible |

An agreement may contain work orders of only one type. The backend must reject linking a work item whose type conflicts with an already typed agreement.

### 2.3 Dashboard mode behavior

- HO always has an SVS/Bulk Village mode switch.
- DO has the switch only while `is_executive_engineer = true`.
- A revoked Executive Engineer immediately loses the switch and all Bulk Village API access, including direct/deep-linked routes.
- CO has no global switch; its own assigned work may include both types, clearly labelled.
- TPI has no switch; TPI dashboard is Bulk Village-only.
- EM and TPI_STAFF have no dashboard mode switch.
- Work-order creation/import receives `workOrderType` from the active dashboard mode. Excel/form rows do not contain a type selector.

---

## 3. Components

### 3.1 Template model

Component definitions must be data, not hard-coded UI constants.

- SVS uses the existing twelve components.
- Bulk Village starts with eight placeholder components named `Inspection: <existing component name>`.
- Name, unit, display order, and component count may change later.
- A work order must snapshot its chosen template definitions at creation time; future template changes must not rewrite historical/in-progress work orders.

### 3.2 Schema implication

The existing global `Component.order_number` unique constraint cannot support order `1` for both types. Replace it with a type-aware template model or uniqueness on `(work_order_type, order_number)`.

Recommended new table:

```text
component_templates
  id
  work_order_type         // SVS | BULK_VILLAGE
  name
  unit
  order_number
  is_active
  created_at
  updated_at
```

`work_item_components` should contain an immutable snapshot of template name, unit, and order (or an equivalent versioned snapshot reference).

---

## 4. Executive Engineer and TPI rules

### 4.1 Executive Engineer

- Add `users.is_executive_engineer BOOLEAN NOT NULL DEFAULT false`.
- Only users with role `DO` may have it set to true.
- HO can enable/disable it on the District Officer management screen.
- Executive Engineer retains every normal DO permission plus Bulk Village access in their own district.
- Revoking the flag hides Bulk Village immediately and prevents all Bulk Village backend requests.

### 4.2 TPI identity and district assignment

- `TPI` is a new user role.
- HO creates TPIs manually; no Excel import is allowed.
- A TPI receives contractor-equivalent profile fields and a manually entered, globally unique user code.
- A TPI belongs to one district.
- One district has at most one **active** TPI.
- HO may deactivate a TPI and create a replacement in the same district later.
- Deactivating a TPI preserves its historical work-order assignments but prevents the TPI and all its staff from logging in or using protected APIs.

Recommended history table:

```text
district_tpi_assignments
  id
  district_code
  tpi_id
  is_active
  assigned_at
  ended_at
  created_at
  updated_at
```

Enforce one active TPI per district transactionally. MySQL does not provide a portable partial unique index; service-level transaction/locking validation is required.

### 4.3 Assigning a TPI to a work order

- TPI can be assigned only to `BULK_VILLAGE` work orders.
- Assignment is optional. The Executive Engineer DO explicitly decides whether a work order receives a TPI.
- The DO does **not** choose between TPIs. The backend resolves the one active TPI for the DO's district.
- DO may change/unassign the current TPI later while still Executive Engineer.
- Work order district must equal the Executive Engineer DO district.
- SVS assignment, cross-district assignment, inactive TPI assignment, and non-Executive Engineer mutation must fail.
- HO does not assign a TPI.

Add current assignment fields to `work_items` plus audit metadata, for example:

```text
tpi_id nullable
tpi_assigned_by_id nullable
tpi_assigned_at nullable
```

Preserve assignment history in an audit/history relation if assignment changes are audited separately.

---

## 5. TPI staff

- `TPI_STAFF` is a new user role.
- TPI creates/manages its own staff using **name, email, password only**. Staff has no user code.
- TPI staff uses mobile login only. TPI uses dashboard login and contractor-style password reset.
- Each staff member belongs to exactly one TPI.
- TPI explicitly assigns its own staff to its own assigned Bulk Village work orders.
- A staff member may be assigned to multiple eligible work orders.
- If the parent TPI becomes inactive, every related staff account loses login/API access without deleting historical evidence.

Recommended tables:

```text
tpi_staff_relationships
  id
  tpi_id
  staff_id
  created_at

work_item_tpi_staff_assignments
  id
  work_item_id
  staff_id
  created_at
```

Enforce uniqueness of `staff_id` in the relationship table and `(work_item_id, staff_id)` in the assignment table.

---

## 6. Evidence workflows

### 6.1 Contractor/employee flow — unchanged for both types

1. CO assigns EM users to a work order.
2. EM uploads geotagged/timestamped progress photos.
3. EM provides progress; existing quantity, non-decreasing-progress, maximum-progress, and component-order rules remain active.
4. CO selects one contractor photo when existing submission requirements are met.
5. DO approves/rejects contractor evidence using the existing behavior.

This applies unchanged to SVS and Bulk Village.

### 6.2 TPI reference flow — Bulk Village only

1. TPI creates and assigns TPI staff to a work order assigned to that TPI.
2. TPI_STAFF opens any of the eight Bulk Village components; no contractor component-order restriction applies.
3. TPI_STAFF uploads any number of geotagged/timestamped reference photos **without progress or quantity fields**.
4. TPI selects one reference photo per component.
5. While a reference photo is selected, no more TPI staff photos can be uploaded for that component.
6. Before contractor evidence approval, TPI may deselect the selected reference photo. Staff can then upload replacement photos and TPI can select another.
7. An Executive Engineer DO sees the contractor-selected photo and selected TPI reference photo together.
8. DO may approve/reject only contractor evidence. TPI evidence has no approval/rejection action and does not affect component/work-order progress.
9. After contractor evidence approval, selected reference evidence is immutable.

### 6.3 Evidence isolation requirements

Do not reuse the contractor photo-selection/approval state as TPI reference state. TPI photos need a dedicated source discriminator and/or dedicated status table so they cannot accidentally:

- receive contractor approval/rejection;
- change component status/progress;
- appear in HO photo views;
- be selected by CO;
- become visible to unrelated TPI/staff users.

Recommended table:

```text
tpi_reference_photo_statuses
  id
  photo_id
  work_item_id
  component_id
  status                 // UPLOADED | SELECTED
  selected_by
  selected_at
  created_at
  updated_at
```

Enforce one currently selected TPI reference photo per component with a transaction/locking strategy. Include a race-condition test.

---

## 7. Backend changes and API contract

### 7.1 Cross-cutting controls

Create centralized guards/services for:

- current active user/TPI-parent validation;
- Executive Engineer Bulk Village access;
- own-district work-order access;
- TPI ownership of work order/staff/photo;
- TPI staff assignment validation;
- agreement work-order type compatibility;
- redacted response projection for HO.

Check current DB state for `is_executive_engineer` and active TPI status on protected calls; a token's old role claim must not allow revoked access until expiry.

### 7.2 New/changed APIs

| Endpoint | Actor | Required behavior |
|---|---|---|
| `POST /users/tpi` | HO | Create TPI with manually entered unique code and district. Reject second active TPI in district. |
| `GET /users/tpis` | HO | Searchable/paginated TPI list, filterable by district and active state. |
| `GET/PATCH /users/tpi/:id` | HO | Read/edit TPI; validate district/active-TPI rules. |
| `PATCH /users/tpi/:id/status` | HO | Activate/deactivate; deactivate TPI and staff access without deleting history. |
| `POST /users/tpi-staff` | TPI | Create own staff with name/email/password; no code. |
| `GET/PATCH /users/tpi-staff/:id` | TPI | Manage only own staff. |
| `PATCH /users/do/:id` | HO | Extend payload with `is_executive_engineer`. |
| `POST /work-items` | HO / permitted DO | Require `work_order_type`; DO may create Bulk only while Executive Engineer. Create type-specific component snapshots. |
| `POST /import/work-items/bulk` | HO | Accept mode-derived `workOrderType`; no Excel type column. |
| `GET /agreements` | role-dependent | Apply mode filtering: requested-type work orders OR no work orders. Enforce user scope. |
| `POST /work-items/:id/assign-tpi` | Executive Engineer DO | Bulk own-district only; automatically resolve active district TPI. |
| `DELETE /work-items/:id/tpi` | Executive Engineer DO | Bulk own-district only; unassign without deleting evidence. |
| `POST /work-items/:id/assign-tpi-staff` | TPI | Assign own staff to own assigned Bulk work order. |
| `DELETE /work-items/:id/tpi-staff/:staffId` | TPI | Remove assignment, preserve historical photos. |
| `POST /components/:componentId/tpi-reference-photos-url` | TPI_STAFF | Upload URL/lat/lng/timestamp only; no progress; Bulk + staff assignment only; reject after TPI selection. |
| `GET /components/:componentId/tpi-reference-photos` | TPI / assigned staff / Executive Engineer DO | Strictly scoped reference photo list. HO must not receive image URLs. |
| `POST /tpi-photo-status/select/:photoId` | TPI | Select one reference photo per component before contractor approval only. |
| `POST /tpi-photo-status/deselect/:photoId` | TPI | Deselect before contractor approval; re-enable staff upload. |
| `GET /tpi-photo-status/component/:componentId` | eligible actors | TPI/assigned staff/Executive Engineer DO only; scope data by actor. |

Authentication changes:

- Dashboard login permits `HO`, `DO`, `CO`, and `TPI`.
- Dashboard login denies `EM` and `TPI_STAFF`.
- Mobile login permits existing `EM` and new `TPI_STAFF`.
- TPI receives the existing contractor-style forgot/reset-password workflow.

### 7.3 Response shaping

HO may view assigned TPI identity and TPI staff list in a Bulk Village work-order view, but must not receive TPI reference-photo URLs or image metadata. Use separate DTOs/query projections; do not simply hide these fields in React.

---

## 8. Dashboard requirements

### HO

- Always show SVS/Bulk Village switch.
- Filter work orders and typed agreements by mode; show untyped agreements in both modes.
- Create/import work orders according to active mode.
- Add TPI tab with list, search, create, edit, activate/deactivate. No TPI Excel upload.
- Add Executive Engineer toggle to District Officer management.
- In Bulk work-order details, show TPI identity and staff list but no TPI photo thumbnails/URLs.

### Normal DO

- No Bulk Village switch.
- No Bulk Village routes/data/action controls.
- Existing SVS workflow unchanged.

### Executive Engineer DO

- Sees SVS/Bulk Village switch and only own-district Bulk data.
- Can explicitly assign/change/unassign the automatically resolved district TPI for a Bulk work order.
- Never sees a TPI picker because there is one active TPI per district.
- Sees contractor-selected evidence and selected TPI reference evidence separately.
- Only contractor evidence has Approve/Reject controls.
- If flag is revoked during session, exit Bulk routes and invalidate cached data immediately.

### Contractor

- Existing dashboard/workflow unchanged.
- May receive assigned SVS and Bulk work orders; type must be visible.
- Employee/photo selection remains contractor evidence only.

### TPI

- Bulk Village-only dashboard.
- Shows assigned work orders, component/reference photo state, selected reference-photo counts, and staff count.
- Creates/manages staff, assigns them to eligible work orders, reviews staff evidence, selects/deselects one reference image per component.
- Has no SVS data and no contractor approval controls.

---

## 9. Mobile requirements

### Employee (`EM`)

- Existing login/navigation/camera/compression/Cloudinary flow stays unchanged.
- May see only contractor-assigned work, regardless of SVS/Bulk type.
- Keeps all progress and ordering validations.

### TPI staff (`TPI_STAFF`)

- Uses the same mobile app with email/password login.
- Receives only its assigned Bulk Village work orders through the parent TPI.
- Shows the eight snapshot components and may open any component.
- Capture screen hides quantity and progress entirely.
- Upload payload is URL, work-item/component identity, latitude, longitude, timestamp; never progress.
- If TPI selected a photo, show locked/read-only state and disable capture/upload.
- Before contractor approval, TPI deselection re-enables upload. After approval, lock is permanent.
- Must not see contractor selection/approval UI or data outside permitted scope.

---

## 10. Required validations

| Rule | Required result |
|---|---|
| SVS has TPI assignment attempt | `400`/`403`; reject. |
| Normal DO uses Bulk endpoint | `403`; reject. |
| Executive Engineer accesses foreign district work | `403`; reject. |
| No active district TPI during assignment | clear validation error; do not offer a picker fallback. |
| Second active TPI in district | `409 Conflict`. |
| TPI staff not owned by current TPI | `403`; reject. |
| TPI staff assigned to wrong TPI/work item | `403`/`400`; reject. |
| TPI upload includes progress | DTO whitelist rejects it; no component progress change. |
| TPI uploads after selected reference photo | reject. |
| TPI selects/deselects after contractor approval | reject. |
| HO requests TPI images | `403` or deliberately redacted DTO; never leak URLs. |
| Parent TPI inactive | deny TPI and all related staff authentication/protected calls. |

---

## 11. Implementation order and gates

1. **Preflight:** inspect current migrations/data/test coverage; decide open policy below; plan production backup/rollback.
2. **Schema:** add enums/entities/migrations/indexes; backfill SVS; seed template families; snapshot component definitions.
3. **Backend core:** add roles, active/Executive Engineer checks, type filters, agreement compatibility, TPI/staff management, assignments.
4. **Evidence APIs:** implement TPI reference storage, upload/list/select/deselect, contractor-approval locking, and HO redaction.
5. **Dashboard foundation:** mode context/switch, HO TPI management, Executive Engineer toggle.
6. **Dashboard flows:** DO assignment/review; TPI dashboard, staff management, photo review.
7. **Mobile:** role-aware EM/TPI_STAFF navigation and no-progress upload UI.
8. **Integrated QA:** migrations, unit/e2e/UI/mobile tests, manual multi-role smoke test, security review, staged release.

Do not start a later phase until the prior phase's tests and data checks pass.

---

## 12. Mandatory acceptance scenarios

1. Existing SVS data and workflow work without TPI UI/data.
2. Typed work orders/agreements are isolated by selected mode; agreement without work orders appears in both modes.
3. Granting/revoking Executive Engineer access changes UI and direct API access immediately.
4. A district cannot have two active TPIs; deactivation permits a replacement while retaining old assignments/history.
5. Executive Engineer explicitly assigns TPI to an own-district Bulk work order; system resolves the one active district TPI automatically.
6. Deactivated TPI remains listed on historical work order, but TPI/staff cannot log in.
7. TPI staff sees only assigned Bulk work and uploads no-progress photos to any component.
8. Reference selection blocks additional TPI staff uploads; deselection before contractor approval re-enables; contractor approval locks permanently.
9. Executive Engineer sees both evidence streams but can approve/reject only contractor evidence.
10. HO sees TPI identity/staff but never TPI photo URLs/thumbnails.
11. CO/EM Bulk workflow retains existing progress, selection, and approval requirements.

---

## 13. Open policy decision before implementation

The business rule says each district has one DO. Existing schema may allow multiple DO users with the same district. Decide whether to enforce **one active DO per district** for new records while preserving any historical duplicates. This decision should be made before adding a unique-active-DO constraint/migration.

