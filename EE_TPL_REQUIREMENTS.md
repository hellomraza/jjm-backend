# Work-Order-TPI & TPI User — Requirements Specification

> **Project**: Jal Jeevan Mission (JJM) Work Monitoring System
> **Feature**: TPI Work Orders & TPI User Type
> **Date**: 16 Aug 2026

---

## Overview

Introduce a new type of work order (**work-order-tpi**) stored in a separate table with 8 static components, alongside the existing work orders (referred to internally as **work-order-svs**, 12 components). Both follow the same contractor/employee flow, but work-order-tpi additionally supports a **TPI** user — an independent inspector (one per district) who uploads a reference photo directly to the DO for dual-view approval.

### System Flow Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WORK-ORDER-SVS (Existing)                        │
│                                                                         │
│  HO creates agreement + work order (12 components)                      │
│       ↓                                                                 │
│  Auto-assigned to DO (via district_id)                                  │
│  Auto-assigned to CO (via agreement's contractor_code)                  │
│       ↓                                                                 │
│  CO creates EM → assigns EM to work order                               │
│       ↓                                                                 │
│  EM uploads photos (mobile) → CO selects photo → DO approves            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        WORK-ORDER-TPI (New)                             │
│                                                                         │
│  HO creates agreement + work order (8 components) — stored in          │
│  separate `work_order_tpi` table                                        │
│       ↓                                                                 │
│  Auto-assigned to DO (via district_id)                                  │
│  Auto-assigned to CO (via agreement's contractor_code)                  │
│       ↓                                                                 │
│  CO creates EM → assigns EM to work order (same as SVS)                 │
│       ↓                                                                 │
│  EM uploads photos → CO selects photo ──────────────┐                   │
│                                                      ↓                  │
│  DO (with EE permission) assigns TPI ──→ TPI        DO sees BOTH:       │
│  uploads 1 photo per component ─────────────────→   • CO-selected photo │
│  (directly to DO, no CO step)                       • TPI photo (ref)   │
│                                                      ↓                  │
│                                             DO approves CO-selected     │
│                                             photo → component approved  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## R1 — New `work_order_tpi` Table

**Module**: Backend

Store work-order-tpi records in a separate table from the existing `work_items` table.

**Acceptance Criteria:**
- [ ] New table `work_order_tpi` with the same columns/structure as `work_items`
- [ ] Has **8 static components** (different from the 12 SVS components — component list pending from user)
- [ ] Existing `work_items` table remains unchanged (internally called work-order-svs, no rename)
- [ ] work-order-tpi belongs to the **same `agreements` table** — one agreement can have both SVS and TPI work orders

---

## R2 — TPI as a New User Role

**Module**: Backend

Introduce TPI as a new user type in the system.

**Acceptance Criteria:**
- [ ] Add `TPI = 'TPI'` to the `UserRole` enum
- [ ] TPI is created by HO (Head Office)
- [ ] **Strictly one TPI per district** — enforced as a database constraint
- [ ] TPI creation fields are the same as Employee creation (name, email, code, mobile, password, district)
- [ ] TPI does **not** have access to the admin dashboard
- [ ] TPI **does** have access to the mobile application

---

## R3 — Executive Engineer Permission on DO

**Module**: Backend, Admin Frontend
**Actor**: HO

HO can grant Executive Engineer permission to a DO via a boolean flag.

**Acceptance Criteria:**
- [ ] Add `is_executive_engineer` boolean column to the `users` table (default: `false`)
- [ ] Only applicable to users with `role = DO`
- [ ] HO can toggle this on/off from the DO management screen
- [ ] A DO must have `is_executive_engineer = true` to assign a TPI to work-order-tpi
- [ ] Toggling does **not** change the user's role — it stays `DO`

---

## R4 — TPI Assignment to Work-Order-TPI

**Module**: Backend, Admin Frontend
**Actor**: DO (with Executive Engineer permission)

DO assigns the TPI of their district to work-order-tpi records.

**Acceptance Criteria:**
- [ ] New join table: `work_order_tpi_assignments` with columns: `id`, `work_order_tpi_id`, `tpi_id`, `created_at`
- [ ] DO can only assign the TPI that belongs to their own district
- [ ] TPI can only be assigned to work-order-tpi, **never** to work-order-svs
- [ ] One TPI can be assigned to **multiple** work-order-tpi
- [ ] A work-order-tpi can operate without a TPI assigned (TPI assignment is optional and can happen later)
- [ ] Only DO with `is_executive_engineer = true` can perform this assignment

---

## R5 — TPI Photo Upload (Mobile)

**Module**: Backend, Mobile App
**Actor**: TPI

TPI uploads exactly one photo per component on work-order-tpi assigned to them.

**Acceptance Criteria:**
- [ ] TPI can upload **one photo per component** (not multiple)
- [ ] TPI photo goes **directly to DO** — no contractor selection step
- [ ] TPI photo is stored with a reference to the TPI user, work-order-tpi, and component
- [ ] TPI can only upload photos for work-order-tpi that are assigned to them

---

## R6 — DO Dual-View Photo Approval for TPI Work Orders

**Module**: Backend, Admin Frontend
**Actor**: DO

When reviewing a component on work-order-tpi, the DO sees both the contractor-selected photo and the TPI photo (as reference), but approves only the contractor-selected photo.

**Acceptance Criteria:**
- [ ] DO approval screen shows **both photos side by side** for each component:
  - Contractor-selected photo (from the CO/EM flow)
  - TPI photo (reference/supplementary)
- [ ] DO approves only the **contractor-selected photo** — the TPI photo is for reference only
- [ ] TPI photo is **optional** — DO can approve a component even without a TPI photo
- [ ] Approval marks the component as approved (same as current SVS flow)

---

## R7 — HO Navbar Toggle (SVS / TPI Mode)

**Module**: Admin Frontend
**Actor**: HO

HO has a navbar toggle to switch the entire admin panel between SVS mode and TPI mode.

**Acceptance Criteria:**
- [ ] Toggle in the navbar switches between **SVS mode** and **TPI mode**
- [ ] **SVS mode** (default): existing dashboard, agreements, work orders, user management — all for work-order-svs
- [ ] **TPI mode**: dashboard stats, agreements, work orders, creation/upload — all for work-order-tpi
- [ ] In TPI mode: contractor tab is **hidden**, TPI creation and listing tab is **shown**
- [ ] The toggle switches the **entire admin panel** — dashboard, lists, creation flows, everything

---

## R8 — DO Navbar Toggle (DO / Executive Engineer Mode)

**Module**: Admin Frontend
**Actor**: DO (with `is_executive_engineer = true`)

DO has a navbar toggle to switch between regular DO mode and Executive Engineer mode.

**Acceptance Criteria:**
- [ ] Toggle appears in navbar — only if logged-in DO has `is_executive_engineer = true`
- [ ] **DO mode** (default): existing DO dashboard — work-order-svs, contractors, employees, photo reviews
- [ ] **Executive Engineer mode**: TPI management, work-order-tpi list, TPI assignment to work orders, TPI photo reviews (dual-view)
- [ ] Switching mode is a client-side toggle

---

## R9 — HO Creates TPI Users (TPI Mode)

**Module**: Backend, Admin Frontend
**Actor**: HO

In TPI mode, HO can create and manage TPI users instead of contractors.

**Acceptance Criteria:**
- [ ] In HO TPI mode: contractor management tab is hidden
- [ ] New TPI management tab is shown with create/edit/list functionality
- [ ] TPI creation uses Employee-style fields (name, email, code, mobile, password, district)
- [ ] Enforce **one TPI per district** — reject creation if district already has a TPI
- [ ] HO can list, edit, and manage all TPI users

---

## R10 — HO Creates Work-Order-TPI (TPI Mode)

**Module**: Backend, Admin Frontend
**Actor**: HO

In TPI mode, HO creates agreements and work orders that are stored as work-order-tpi.

**Acceptance Criteria:**
- [ ] Same creation flow/UI as work-order-svs
- [ ] Data is stored in the `work_order_tpi` table (not `work_items`)
- [ ] Work-order-tpi has **8 static components** (pending component list from user)
- [ ] Agreement can hold both SVS and TPI work orders
- [ ] Auto-assigned to DO via `district_id` and to contractor via agreement's `contractor_code`

---

## R11 — EE Toggle on DO List (HO View)

**Module**: Admin Frontend
**Actor**: HO

HO can toggle Executive Engineer permission for each DO from the DO management table.

**Acceptance Criteria:**
- [ ] New column in DOManagementTable: "Executive Engineer" with a toggle switch
- [ ] Toggle calls backend API to update `is_executive_engineer`
- [ ] Toggle is reversible — HO can turn it on and off
- [ ] This toggle should be visible in **both** SVS and TPI modes (since it's a DO property)

---

## R12 — Mobile Login Choice Screen

**Module**: Mobile App (JjmMobile)
**Actor**: EM, TPI

New screen before login where the user selects their login type.

**Acceptance Criteria:**
- [ ] New screen shown before the login form
- [ ] Two options: **"SVS Login"** (employee) and **"TPI Login"**
- [ ] Both options lead to the same login form
- [ ] Login type stored in AsyncStorage and remembered across sessions
- [ ] User can change login type by logging out and re-selecting

---

## R13 — TPI Mobile Flow (Post-Login)

**Module**: Backend, Mobile App
**Actor**: TPI

After TPI login, the TPI sees agreements and work-order-tpi assigned to them, and can upload photos.

**Acceptance Criteria:**
- [ ] TPI sees **AgreementList** filtered to agreements containing work-order-tpi assigned to them
- [ ] TPI sees only **work-order-tpi** (never work-order-svs)
- [ ] TPI sees only work orders assigned to them (via `work_order_tpi_assignments`)
- [ ] TPI navigates to components and uploads **one photo per component**
- [ ] Same camera/upload flow as employees (geotagged, timestamped)
- [ ] TPI photo goes directly to DO (no contractor selection step)

---

## R14 — Backend Auth for TPI

**Module**: Backend
**Actor**: TPI

Authentication system supports TPI login from mobile.

**Acceptance Criteria:**
- [ ] TPI users authenticate via existing login endpoint
- [ ] JWT token includes the `TPI` role
- [ ] TPI role is authorized for mobile-facing endpoints (work-order-tpi, components, photos, upload)
- [ ] TPI role is **not** authorized for admin dashboard endpoints

---

## R15 — Work-Order-TPI 8 Static Components

**Module**: Backend

work-order-tpi has 8 static components (different from the 12 SVS components).

**Acceptance Criteria:**
- [ ] 8 component templates specific to work-order-tpi
- [ ] Auto-created when a work-order-tpi is created

> **⏳ PENDING**: Component names/definitions to be provided by user

---

## R16 — Contractor/Employee Flow on Work-Order-TPI

**Module**: Backend, Admin Frontend, Mobile App

The contractor/employee flow on work-order-tpi is identical to work-order-svs.

**Acceptance Criteria:**
- [ ] Contractor is auto-assigned via agreement (same as SVS)
- [ ] Contractor creates employees and assigns them to work-order-tpi
- [ ] Employees see work-order-tpi in mobile app (via SVS/employee login)
- [ ] Employee uploads photos → contractor selects → goes to DO for approval
- [ ] This flow works independently of whether a TPI is assigned or not

---

## Impact Summary

| # | Requirement | Backend | Admin | Mobile | Status |
|---|---|:---:|:---:|:---:|---|
| R1 | `work_order_tpi` table | ✅ | — | — | Ready |
| R2 | TPI role in enum | ✅ | — | — | Ready |
| R3 | EE permission flag on DO | ✅ | ✅ | — | Ready |
| R4 | TPI ↔ work-order-tpi assignment | ✅ | ✅ | — | Ready |
| R5 | TPI photo upload (1 per component) | ✅ | — | ✅ | Ready |
| R6 | DO dual-view photo approval | ✅ | ✅ | — | Ready |
| R7 | HO navbar toggle (SVS/TPI) | — | ✅ | — | Ready |
| R8 | DO navbar toggle (DO/EE) | — | ✅ | — | Ready |
| R9 | HO creates TPI users | ✅ | ✅ | — | Ready |
| R10 | HO creates work-order-tpi | ✅ | ✅ | — | Ready |
| R11 | EE toggle on DO list | ✅ | ✅ | — | Ready |
| R12 | Mobile login choice screen | — | — | ✅ | Ready |
| R13 | TPI mobile flow | ✅ | — | ✅ | Ready |
| R14 | Backend auth for TPI | ✅ | — | — | Ready |
| R15 | 8 static components | ✅ | — | — | ⏳ Pending |
| R16 | CO/EM flow on work-order-tpi | ✅ | ✅ | ✅ | Ready |
