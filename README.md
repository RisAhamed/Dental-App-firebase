# 🦷 DentaRecord — Dental Clinic Management System

**DentaRecord** is a full-featured, chairside dental clinic management application built with **React 19**, **Firebase**, and **Tailwind CSS v4**. It provides patient registration, session-based clinical record keeping, dental charting, doctor management, payment tracking, file attachments, vital sign recording, and a global patient search — all within a responsive sidebar-driven layout.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Routing Map](#routing-map)
- [Pages — Detailed Breakdown](#pages--detailed-breakdown)
  - [Dashboard](#1-dashboard-dashboardjsx)
  - [Patients](#2-patients-patientsjsx)
  - [Patient Detail](#3-patient-detail-patientdetailjsx)
  - [Edit Patient](#4-edit-patient-editpatientjsx)
  - [Doctors](#5-doctors-doctorsjsx)
  - [Payments](#6-payments-paymentsjsx)
  - [Search](#7-search-searchjsx)
  - [New Session](#8-new-session-newsessionjsx)
  - [Edit Session](#9-edit-session-editsessionjsx)
- [Reusable Components](#reusable-components)
  - [AppLayout](#applayout-applayoutjsx)
  - [SessionCard](#sessioncard-sessioncardjsx)
  - [Skeleton](#skeleton-skeletonjsx)
  - [Toast / ToastProvider](#toast--toastprovider-toastjsx)
- [Custom Hooks](#custom-hooks)
- [Library & Configuration](#library--configuration)
- [Firebase Integration](#firebase-integration)
  - [Firestore Collections & Data Models](#firestore-collections--data-models)
  - [Firebase Storage](#firebase-storage)
- [System Design & Data Flow](#system-design--data-flow)
- [UI/UX Design System](#uiux-design-system)
- [Environment Variables](#environment-variables)
- [Firebase Setup](#firebase-setup)
- [Run Locally](#run-locally)
- [Build for Production](#build-for-production)
- [Deploy to Vercel](#deploy-to-vercel)
- [Branding Configuration](#branding-configuration)

---

## Tech Stack

| Category        | Technology                                                         |
| --------------- | ------------------------------------------------------------------ |
| **Framework**   | React 19 (JSX, functional components, hooks)                      |
| **Build Tool**  | Vite 8 with `@vitejs/plugin-react`                                |
| **Styling**     | Tailwind CSS v4 (via `@tailwindcss/vite` plugin)                   |
| **Routing**     | React Router DOM v6 (nested `<Routes>`, `<Outlet>`, `<NavLink>`)  |
| **Database**    | Firebase Firestore (NoSQL document-based)                          |
| **File Storage**| Firebase Storage (for X-rays, reports, prescriptions, photos)      |
| **Icons**       | lucide-react (50+ icons used across the app)                       |
| **Date Utility**| date-fns (v4) — `format`, `parseISO`                              |
| **Linting**     | ESLint with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` |
| **Runtime**     | Node.js (npm)                                                      |

---

## Project Structure

```
dental-clinic/
├── .env                          # Firebase credentials (gitignored)
├── .gitignore                    # Ignore rules for node_modules, dist, .env
├── eslint.config.js              # ESLint flat config with React plugins
├── firestore-collections.md      # Firestore schema reference document
├── index.html                    # HTML entry point with <div id="root">
├── package.json                  # Dependencies, scripts (dev, build, lint, preview)
├── vite.config.js                # Vite config with React + Tailwind CSS plugins
├── public/
│   ├── favicon.svg               # Browser tab icon (tooth icon)
│   └── icons.svg                 # SVG sprite sheet for UI icons
├── src/
│   ├── main.jsx                  # App bootstrap — React 19 createRoot + StrictMode
│   ├── App.jsx                   # Root component — ToastProvider, BrowserRouter, Routes
│   ├── App.css                   # Legacy Vite template styles (unused by app)
│   ├── index.css                 # Global styles — Tailwind import, font, bg color
│   ├── assets/
│   │   ├── hero.png              # Decorative hero image asset
│   │   ├── react.svg             # React logo
│   │   └── vite.svg              # Vite logo
│   ├── components/
│   │   ├── AppLayout.jsx         # Sidebar + header + <Outlet> shell (4 sub-components)
│   │   ├── SessionCard.jsx       # Visit/session display card (5 sub-components)
│   │   ├── Skeleton.jsx          # Animated loading placeholder
│   │   └── Toast.jsx             # Toast notification provider + renderer
│   ├── hooks/
│   │   ├── toastContext.js       # React context for toast system
│   │   └── useToast.js           # Custom hook to access showToast/dismissToast
│   ├── lib/
│   │   ├── config.js             # Clinic name/subtitle branding constants
│   │   └── firebase.js           # Firebase app init, Firestore + Storage exports
│   ├── pages/
│   │   ├── Dashboard.jsx         # Overview stats, upcoming appointments, recent patients
│   │   ├── Patients.jsx          # Patient list, search, registration modal
│   │   ├── PatientDetail.jsx     # Patient profile + visit history timeline
│   │   ├── EditPatient.jsx       # Edit patient demographics + medical history
│   │   ├── Doctors.jsx           # Doctor CRUD table with active/inactive toggle
│   │   ├── Payments.jsx          # Outstanding payment tracker with mark-as-paid
│   │   ├── Search.jsx            # Global patient search with last visit summary
│   │   ├── NewSession.jsx        # Multi-section session creation form
│   │   └── EditSession.jsx       # Edit existing session with delete option
│   └── utils/                    # (Reserved — currently empty)
└── dist/                         # Production build output (gitignored)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          index.html                                 │
│                    <div id="root"></div>                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  main.jsx   │   React 19 createRoot + StrictMode
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   App.jsx   │   ToastProvider → BrowserRouter → Routes
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │      AppLayout.jsx      │   Persistent sidebar + header
              │  ┌──────────────────┐   │
              │  │    <Outlet />    │   │   Page content renders here
              │  └──────────────────┘   │
              └─────────────────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        │                  │                      │
   ┌────▼────┐     ┌───────▼───────┐      ┌──────▼──────┐
   │  Pages  │     │  Components   │      │   Hooks     │
   │ (9 JSX) │     │  (4 shared)   │      │ (2 files)   │
   └────┬────┘     └───────┬───────┘      └──────┬──────┘
        │                  │                      │
        └──────────────────┼──────────────────────┘
                           │
              ┌────────────▼────────────┐
              │     lib/firebase.js     │   Firestore (db) + Storage
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │    Firebase Cloud       │
              │  ┌─────────────────┐    │
              │  │   Firestore DB  │    │   6 collections
              │  ├─────────────────┤    │
              │  │ Firebase Storage│    │   File uploads
              │  └─────────────────┘    │
              └─────────────────────────┘
```

---

## Routing Map

All routes are nested inside `<AppLayout>`, which provides the persistent sidebar and header.

| Route Pattern                      | Page Component  | Description                           |
| ---------------------------------- | --------------- | ------------------------------------- |
| `/`                                | `Dashboard`     | Home — stats, appointments, patients  |
| `/dashboard`                       | `Dashboard`     | Alias for `/`                         |
| `/patients`                        | `Patients`      | Patient list + registration           |
| `/patients/:patientId`             | `PatientDetail` | Patient profile + visit history       |
| `/patients/:patientId/edit`        | `EditPatient`   | Edit patient record                   |
| `/doctors`                         | `Doctors`       | Doctor management table               |
| `/payments`                        | `Payments`      | Outstanding payment tracker           |
| `/search`                          | `Search`        | Global patient search                 |
| `/sessions/new`                    | `NewSession`    | Create session (no patient pre-selected) |
| `/sessions/new/:patientId`         | `NewSession`    | Create session for specific patient   |
| `/sessions/edit/:sessionId`        | `EditSession`   | Edit an existing session              |
| `*` (catch-all)                    | → Redirects to `/` | Unknown routes redirect to home    |

---

## Pages — Detailed Breakdown

### 1. Dashboard (`Dashboard.jsx`)

**Route:** `/` or `/dashboard`

The Dashboard is the landing page that provides an at-a-glance overview of the clinic's current state.

#### UI Sections & Elements

| Section                | Element                         | Description                                                                                  |
| ---------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| **Header**             | Title "Dashboard"               | Page heading with bold `text-2xl` styling                                                    |
|                        | Date display                    | Current date in `en-IN` locale (e.g., "Monday, 14 July 2026")                                |
| **Stats Grid**         | Total Patients card             | Teal-themed card — uses `getCountFromServer` (no document download)                          |
|                        | Sessions This Month card        | Blue-themed card — targeted `where('visit_date', '>=', monthStart)` query                    |
|                        | Today's Appointments card       | Purple-themed card — targeted `where('next_visit_date', '==', today)` query                  |
|                        | Pending Dues card               | Red-themed card — two parallel `where('payment_status', '==', …)` queries merged client-side |
| **Upcoming Appointments** | Clickable appointment rows   | Next 7 days of scheduled follow-ups, each row shows patient name, complaint, date, and phone |
|                        | Empty state                     | Calendar icon + "No upcoming appointments" message                                           |
|                        | "Next 7 days" label             | Timeframe indicator in the section header                                                    |
| **Recent Patients**    | Patient rows                    | 5 most recently registered patients with avatar initial, name, phone, and date               |
|                        | "View all" link                 | Navigates to `/patients`                                                                     |
|                        | Empty state                     | Users icon + "No patients yet" message                                                       |

#### Internal Components

- **`StatCard`** — Renders a colored stat card with icon, label, value, and optional detail text
- **`EmptyState`** — Centered icon + message for empty data sections

#### Data Flow

1. **Total patients:** `getCountFromServer(collection(db, 'patients'))` — server-side aggregation, zero document downloads
2. **Sessions this month:** `where('visit_date', '>=', monthStart)` — only matching sessions are transferred
3. **Today's appointments:** `where('next_visit_date', '==', today)` — single targeted query
4. **Pending dues:** Two parallel queries (`payment_status == 'Pending'` + `payment_status == 'Partial'`) merged client-side (Firestore cannot do OR on the same field)
5. **Upcoming appointments:** `where('next_visit_date', '>=', today)` + `where('next_visit_date', '<=', nextWeek)` with `orderBy` + `limit(10)` — fully server-side sorted and paginated
6. **Patient enrichment (batch):** Collects unique `patient_id` values from upcoming sessions, then fetches them in a single `where('__name__', 'in', [...])` query (chunked in groups of 30 for Firestore's `in` limit) — replaces the previous N+1 individual `getDoc` calls
7. **Recent patients:** `orderBy('created_at', 'desc')` + `limit(5)` — server-side sort and limit, no full collection download

> **Note on Robust Date Sorting & Formatting (Applied Globally):** The utility functions `toDate()`, `toMillis()`, and `formatDate()` are hardened across pages (`Dashboard.jsx`, `Search.jsx`, `PatientDetail.jsx`, and `NewSession.jsx`) to guard against missing, null, or malformed values:
> - `toDate` returns `null` instead of generating invalid Dates or throwing exceptions.
> - `toMillis` returns `-Infinity` so records with missing or corrupt dates sort safely to the end instead of returning `NaN` (which breaks JS `Array.sort` implementations in some browsers).
> - `formatDate` gracefully falls back to a clean default (`—` or `-`) without passing invalid parameters to formatting library functions.

#### Buttons & Actions

| Button/Element           | Action                                                  |
| ------------------------ | ------------------------------------------------------- |
| Appointment row click    | Navigates to `/patients/:patientId`                     |
| Recent patient row click | Navigates to `/patients/:patientId`                     |
| "View all" button        | Navigates to `/patients`                                |

---

### 2. Patients (`Patients.jsx`)

**Route:** `/patients`

The Patients page is the patient registry — listing all registered patients with search and a registration modal.

#### UI Sections & Elements

| Section               | Element                       | Description                                                                         |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| **Header**            | Title "Patients"              | `text-3xl` heading                                                                  |
|                       | Subtitle                      | "Register patients and open their clinical records."                                |
|                       | **+ Add Patient** button      | Teal primary button opens the registration modal                                    |
| **Search Bar**        | Search input                  | Full-width input with magnifying glass icon                                         |
|                       | Debounced search              | 300ms debounce on keystroke; searches `full_name`, `phone`, `patient_id`            |
| **Patient Grid**      | Patient cards                 | Responsive grid (1/2/3 columns) of clickable cards                                  |
|                       | Each card shows               | Patient ID badge, creation date, avatar icon, full name, phone, gender              |
|                       | Hover effect                  | Card lifts (`-translate-y-0.5`) with teal border highlight                          |
| **Empty State**       | No patients message           | Dashed border container with Users icon and "+ Add First Patient" button             |
| **Loading State**     | Skeleton grid                 | 6 skeleton placeholder cards with animated pulse                                     |
| **Add Patient Modal** | Full-screen overlay           | Semi-transparent backdrop with centered scrollable modal                             |

#### Add Patient Modal — Form Fields

The modal is a comprehensive patient registration form organized in a 2-column grid:

| Field                      | Type       | Required | Validation                  |
| -------------------------- | ---------- | -------- | --------------------------- |
| Full Name                  | `text`     | ✅       | Non-empty trim check        |
| Date Added                 | `date`     | ❌       | Optional registration date  |
| DOB                        | `date`     | ❌       |                             |
| Gender                     | `select`   | ❌       | Options: Male, Female, Other |
| Phone                      | `tel`      | ✅       | Non-empty trim check        |
| Email                      | `email`    | ❌       |                             |
| Blood Group                | `select`   | ❌       | Options: A+, A-, B+, B-, O+, O-, AB+, AB- |
| Address                    | `textarea` | ❌       | Full-width (spans 2 columns) |
| Allergies                  | `textarea` | ❌       |                             |
| Medical History            | `textarea` | ❌       |                             |
| Emergency Contact Name     | `text`     | ❌       |                             |
| Emergency Contact Phone    | `tel`      | ❌       |                             |

**Vital Signs Section** (inside the modal):

| Field          | Type     | Unit   |
| -------------- | -------- | ------ |
| Age            | `number` | years  |
| Weight         | `number` | kg     |
| Blood Pressure | `text`   | mmHg   |
| Blood Sugar    | `number` | mg/dL  |
| Pulse Rate     | `number` | bpm    |
| SPO2           | `number` | %      |

#### Buttons & Actions

| Button                | Action                                          |
| --------------------- | ----------------------------------------------- |
| **+ Add Patient**     | Opens registration modal                        |
| Patient card click    | Navigates to `/patients/:patientId`             |
| **Cancel** (modal)    | Closes modal, resets form                       |
| **Save Patient**      | Validates → generates Patient ID → saves to Firestore → reloads list |
| **×** close (modal)   | Closes modal                                    |
| **+ Add First Patient** | Opens modal (shown in empty state)            |

#### Patient ID Generation

Patient IDs follow the format `DC-YYYY-####-XXX` (e.g., `DC-2026-0043-X7K`):
- `DC` — Clinic prefix
- `YYYY` — Current year
- `####` — Zero-padded sequential counter via `getCountFromServer` (server-side aggregation)
- `XXX` — Random 3-character alphanumeric suffix for collision prevention

The count is obtained using Firestore's `getCountFromServer()` instead of fetching all documents, which avoids downloading the entire collection and prevents race conditions when two staff members register patients simultaneously.

> **Note:** `PatientDetail.jsx` and `Search.jsx` only *display* the `patient_id` string — they don't parse or generate it, so they require no changes when the ID format is updated.

---

### 3. Patient Detail (`PatientDetail.jsx`)

**Route:** `/patients/:patientId`

This is the comprehensive patient profile page showing demographics, vital signs, medical history, and complete visit timeline.

#### UI Sections & Elements

| Section                   | Element                      | Description                                                                    |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| **Back Button**           | "← Back" button              | Returns to `/patients`                                                         |
| **Patient Header Card**   | Full name (h1)               | Large heading with patient name                                                |
|                           | Patient ID badge             | Teal rounded badge (e.g., `DC-2026-0001`)                                     |
|                           | **Edit Patient** button      | Navigates to `/patients/:patientId/edit`                                       |
|                           | **+ Add New Session** button | Teal primary button → `/sessions/new/:patientId`                              |
|                           | Info grid                    | Date Added, Gender, DOB, Phone, Email in 5-column grid                        |
| **Medical Info**          | Blood Group badge            | Slate-colored pill badge                                                       |
|                           | Allergies badge              | Rose-colored badge (or "None recorded")                                       |
|                           | Medical History              | Collapsible text with "Show more/less" toggle (>140 chars)                    |
| **Emergency Contact**     | Contact bar                  | Slate background bar showing name and phone                                    |
| **Vital Signs**           | Vitals grid                  | Color-coded cards: Age (blue), Weight (green), BP (red), Sugar (yellow), Pulse (purple), SPO2 (teal) |
| **Medical History Detail** | Tagged rows                 | Allergies (red), Conditions (yellow), Medications (blue), Dental History (gray), Notes (purple) |
| **Visit History**         | Section header               | "Visit History" title with visit count badge                                   |
|                           | Time filter buttons          | Segmented control: 3M, 6M, 1Y, 5Y, All                                       |
|                           | Session cards                | List of `SessionCard` components with full clinical details                    |
|                           | Empty state                  | Calendar icon + "No visits recorded yet" + "+ Add First Session" button        |

#### Internal Components

- **`InfoItem`** — Label + value pair for the patient info grid
- **`MedicalHistoryRow`** — Color-coded badge + value for medical history entries

#### Data Flow

1. Fetches patient document by `patientId`
2. Queries `sessions` where `patient_id == patientId`, ordered by `visit_date` desc
3. For each session, fetches related `dental_chart_entries`, `session_doctors`, and `session_files` in parallel
4. For each session doctor, resolves the doctor document to get name/specialty
5. Builds a follow-up session map for cross-referencing follow-up visits

#### Buttons & Actions

| Button                  | Action                                              |
| ----------------------- | --------------------------------------------------- |
| **← Back**              | Navigate to `/patients`                             |
| **Edit Patient**        | Navigate to `/patients/:patientId/edit`             |
| **+ Add New Session**   | Navigate to `/sessions/new/:patientId`              |
| **Edit** (on session)   | Navigate to `/sessions/edit/:sessionId`             |
| Time filter buttons     | Filter sessions by 3 months, 6 months, 1/5 years, or all |
| **+ Add First Session** | Navigate to `/sessions/new/:patientId` (empty state) |
| Show more/less toggle   | Expand/collapse medical history text                |

---

### 4. Edit Patient (`EditPatient.jsx`)

**Route:** `/patients/:patientId/edit`

A full-page form for editing an existing patient's demographics, vital signs, and medical history.

#### Form Sections

**Section 1 — Patient Info** (rounded card with border):

| Field                    | Type       | Required | Notes                                |
| ------------------------ | ---------- | -------- | ------------------------------------ |
| Full Name                | `text`     | ✅       | Spans 2 columns                     |
| Date Added               | `date`     | ❌       |                                      |
| Date of Birth            | `date`     | ❌       | Handles Firestore Timestamp objects  |
| Gender                   | `select`   | ❌       | Male / Female / Other                |
| Phone                    | `text`     | ✅       |                                      |
| Email                    | `email`    | ❌       |                                      |
| Address                  | `textarea` | ❌       | Spans 2 columns                     |
| Blood Group              | `select`   | ❌       | 8 blood group options                |
| Emergency Contact Name   | `text`     | ❌       |                                      |
| Emergency Contact Phone  | `text`     | ❌       | Spans 2 columns                     |

**Section 2 — Vital Signs** (separate card):

Age, Weight, Blood Pressure, Blood Sugar, Pulse Rate, SPO2 — same fields as registration.

**Section 3 — Medical History** (separate card):

| Field                   | Type       | Notes                                                   |
| ----------------------- | ---------- | ------------------------------------------------------- |
| Known Allergies         | `textarea` | Has "Important for treatment" warning label in red      |
| Medical Conditions      | `textarea` | Placeholder: "Diabetes Type 2, Hypertension…"          |
| Current Medications     | `textarea` | Placeholder: "Metformin 500mg, Amlodipine 5mg…"        |
| Previous Dental History | `textarea` | Placeholder: "Root canal in 2020, dentures…"            |
| Internal Notes          | `textarea` | Staff-only notes (e.g., "Patient is anxious")           |

#### Sticky Bottom Bar

A fixed-position action bar at the bottom of the viewport:

| Button           | Action                                               |
| ---------------- | ---------------------------------------------------- |
| **Cancel** (× icon) | Navigate back (`navigate(-1)`)                    |
| **Save Changes** (💾 icon) | Validate → `updateDoc` to Firestore → navigate to patient detail |

---

### 5. Doctors (`Doctors.jsx`)

**Route:** `/doctors`

Doctor management page with a full CRUD data table and modal form.

#### UI Sections

| Section          | Element                     | Description                                              |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| **Header**       | Title "Doctors"             | `text-3xl` heading                                       |
|                  | Subtitle                    | "Manage clinic doctors, specialties, and availability."  |
|                  | **+ Add Doctor** button     | Teal primary button opens the add/edit modal             |
| **Doctors Table**| Data table                  | Full-width table with horizontal scroll on mobile        |

#### Table Columns

| Column        | Content                                                          |
| ------------- | ---------------------------------------------------------------- |
| Name          | Doctor's full name (bold)                                        |
| Specialty     | e.g., "Orthodontist", "Endodontist"                             |
| Qualification | e.g., "BDS, MDS" (or "-" if empty)                              |
| Phone         | Phone number (or "-")                                            |
| Email         | Email address (or "-")                                           |
| Status        | Active (green badge) / Inactive (gray badge)                     |
| Actions       | **Edit**, **Active/Inactive toggle**, **Delete** buttons         |

#### Action Buttons per Row

| Button                 | Appearance                        | Action                                                    |
| ---------------------- | --------------------------------- | --------------------------------------------------------- |
| **Edit**               | Outlined, pencil icon             | Opens modal pre-filled with doctor data                   |
| **Inactive/Active**    | Amber (to deactivate) / Green (to activate) | Toggles `is_active` field in Firestore          |
| **Delete**             | Rose/red, trash icon              | `window.confirm` → deletes doctor document permanently    |

#### Add/Edit Doctor Modal — Fields

| Field         | Type    | Required | Placeholder          |
| ------------- | ------- | -------- | -------------------- |
| Full Name     | `text`  | ✅       | "Dr. Asha Mehta"     |
| Specialty     | `text`  | ✅       | "Orthodontist"       |
| Qualification | `text`  | ❌       | "BDS, MDS"           |
| Phone         | `tel`   | ❌       | "+91 98765 43210"    |
| Email         | `email` | ❌       | "doctor@clinic.com"  |

| Modal Button | Action                                                       |
| ------------ | ------------------------------------------------------------ |
| **Cancel**   | Close modal                                                  |
| **Save** (✓) | Validate → `addDoc` (new) or `updateDoc` (edit) → reload list |

#### States

- **Loading:** Skeleton table rows with animated pulse
- **Empty:** Stethoscope icon + "No doctors added yet" + "+ Add First Doctor" button
- **Toggling:** Spinner icon replaces toggle button while status is updating

---

### 6. Payments (`Payments.jsx`)

**Route:** `/payments`

A dedicated page for tracking and resolving outstanding patient payments.

#### UI Sections

| Section            | Element                       | Description                                                        |
| ------------------ | ----------------------------- | ------------------------------------------------------------------ |
| **Header**         | Title "Pending Payments"      | Bold heading                                                       |
|                    | Outstanding total             | "Total outstanding: ₹X,XXX" in red text                           |
|                    | Filter buttons                | **All** / **Pending** / **Partial** — pill-style toggle buttons    |
| **Payment Cards**  | Session payment rows          | Each row shows patient info, billing details, and mark-paid button |

#### Payment Card Details

Each payment card displays:

| Element              | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| Patient name         | Clickable — navigates to patient detail                    |
| Phone + Visit date   | Subtitle with patient phone and session date               |
| Chief complaint      | Truncated complaint text                                   |
| Total cost           | "Total: ₹X,XXX" in gray                                   |
| Amount paid          | "Paid: ₹X,XXX" in gray                                    |
| Due amount           | "₹X,XXX" in large bold red text                           |
| Status badge         | "Pending" (red) or "Partial" (yellow) pill badge           |
| **Mark Paid** button | Green button with checkmark — marks full payment           |

#### Mark Paid Action

When clicked:
1. Updates the session document: `amount_paid = treatment_cost`, `payment_status = 'Paid'`
2. Shows success toast "Marked as paid ✓"
3. Reloads the list (the paid session disappears since only outstanding sessions are shown)

#### States

- **Loading:** 4 skeleton pulse rows
- **Empty:** Green checkmark icon + "All payments are cleared!" message

---

### 7. Search (`Search.jsx`)

**Route:** `/search` (accessible via the sidebar, not shown as a nav item — used from AppLayout header)

Global patient search across the entire clinic database.

#### UI Sections

| Section              | Element                    | Description                                                       |
| -------------------- | -------------------------- | ----------------------------------------------------------------- |
| **Header**           | Title "Search Patients"    | `text-3xl` heading                                                |
|                      | Subtitle                   | "Find patients by name, phone number, or clinic patient ID."      |
| **Search Box**       | Large search input         | Full-width with magnifying glass icon, `text-base` size           |
|                      | Minimum chars hint         | "Type at least 2 characters to search." shown for 1-char queries  |
| **Results Grid**     | Patient result cards       | 2-column responsive grid of `PatientResultCard` components        |
| **Default State**    | Search icon + instructions | "Start typing at least 2 characters to find matching patients."   |
| **No Results State** | SearchX icon + message     | "No patients found for 'query'" with retry suggestion             |
| **Loading State**    | Skeleton cards             | 4 animated placeholder cards                                      |

#### Patient Result Card Elements

| Element                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| Patient ID badge        | Teal pill badge (e.g., `DC-2026-0001`)                       |
| Full name               | Large `text-xl` heading                                      |
| Gender + DOB            | "Male · 15 Mar 1990" subtitle                                |
| **View Patient** button | Teal button with arrow → navigates to patient detail         |
| Phone number            | With phone icon                                              |
| Blood group badge       | Slate pill (if available)                                     |
| Allergies badge         | Rose badge with warning triangle icon (if available)         |
| Last visit summary      | Gray background bar: "Last visit: 10 Jul 2026 — Tooth pain" |

#### Search Behavior

- **Debounced:** 300ms delay before search executes
- **Minimum:** Requires ≥ 2 characters
- **Scope:** Searches `full_name`, `phone`, and `patient_id` fields
- **Data Strategy:** Loads ALL patients and sessions on mount, then filters client-side for instant results
- **Last Visit:** Computes the most recent session per patient for the summary display

---

### 8. New Session (`NewSession.jsx`)

**Route:** `/sessions/new/:patientId`

The most complex page — a multi-section clinical session entry form with 7 form sections and a sticky action bar.

#### Form Sections

**Section 1 — Visit Info:**

| Field                 | Type     | Notes                                              |
| --------------------- | -------- | -------------------------------------------------- |
| Patient (read-only)   | display  | Shows "Patient Name (Patient ID)"                  |
| Visit Date            | `date`   | Defaults to today's date                           |
| Visit Type            | `select` | New Problem / Follow-up / Emergency / Routine Checkup |
| Follow-up of          | `select` | (Conditional) Dropdown of previous sessions, shown only when Visit Type = "Follow-up" |

**Section 2 — Vital Signs:**

| Field          | Type     | Unit  | Grid Position |
| -------------- | -------- | ----- | ------------- |
| Age            | `number` | years | 6-col grid    |
| Weight         | `number` | kg    |               |
| Blood Pressure | `text`   | mmHg  |               |
| Blood Sugar    | `number` | mg/dL |               |
| Pulse Rate     | `number` | bpm   |               |
| SPO2           | `number` | %     |               |

**Section 3 — Clinical Details:**

| Field             | Type       | Required | Notes                                   |
| ----------------- | ---------- | -------- | --------------------------------------- |
| Chief Complaint   | `textarea` | ✅       | Spans full width                        |
| Diagnosis         | `textarea` | ❌       |                                         |
| Treatment Given   | `textarea` | ❌       |                                         |
| Injection Given   | `toggle`   | —        | Custom toggle switch (YES/NO)           |
| Injection Details | `text`     | ❌       | (Conditional) Shown only when injection is toggled ON |

**Section 4 — Dental Chart Entries:**

A dynamic form for adding multiple tooth/region procedures per session.

| Field          | Type     | Required | Options                                                       |
| -------------- | -------- | -------- | ------------------------------------------------------------- |
| Region         | `select` | —        | Upper Jaw, Lower Jaw, Left Cheek, Right Cheek, Palate, Gums, Tongue, Other |
| Tooth Number   | `text`   | ❌       | e.g., "11", "36", "11 gamma"                                 |
| Procedure Done | `text`   | ✅       | e.g., "Root Canal", "Extraction", "Filling"                  |
| Notes          | `text`   | ❌       | Optional notes per entry                                      |

| Button               | Action                                              |
| -------------------- | --------------------------------------------------- |
| **+ Add Entry**      | Validates → adds chart entry to local list          |
| **Delete** (per row) | Removes the chart entry from local list             |

Each added entry appears as a card with region badge, tooth number, procedure, and notes.

**Section 5 — Doctors Involved:**

- Displays all **active** doctors as pill-style toggle buttons
- Click to select/deselect (teal when selected, gray when not)
- Shows "No active doctors found" message if none available

**Section 6 — Billing:**

| Field            | Type     | Notes                                             |
| ---------------- | -------- | ------------------------------------------------- |
| Treatment Cost   | `number` | ₹ prefix, step=1                                 |
| Amount Paid      | `number` | ₹ prefix, step=1                                 |
| Payment Status   | display  | Auto-computed badge: Paid (green), Partial (yellow), Pending (red) |

**Payment Status Auto-Computation Logic:**
- If cost = 0 → **Paid**
- If paid ≤ 0 → **Pending**
- If paid ≥ cost → **Paid**
- Otherwise → **Partial**

**Section 7 — Additional Notes & Next Visit:**

| Field           | Type       | Notes                   |
| --------------- | ---------- | ----------------------- |
| Additional Notes| `textarea` | 4 rows                  |
| Next Visit Date | `date`     | Schedules follow-up     |

#### Sticky Bottom Action Bar

Positioned outside the `<form>` element, sticks to the bottom of the viewport:

| Button            | Action                                                          |
| ----------------- | --------------------------------------------------------------- |
| **Cancel** (× icon) | Navigate back (`navigate(-1)`)                               |
| **Save Session** (💾 icon) | Validates → saves session + chart entries + doctor links to Firestore → navigates to patient detail |

#### Save Operation (Multi-Document Write)

1. Creates a new document in `sessions` collection
2. For each chart entry: creates a document in `dental_chart_entries` with `session_id`
3. For each selected doctor: creates a document in `session_doctors` with `session_id` + `doctor_id`
4. Shows success toast, then navigates to patient detail after 700ms

---

### 9. Edit Session (`EditSession.jsx`)

**Route:** `/sessions/edit/:sessionId`

Edit an existing clinical session with all the same fields as New Session, plus session deletion.

#### Differences from New Session

- **Sticky top bar** instead of bottom bar (Cancel, Delete, Update Session)
- Pre-populates all fields from existing session data
- Loads existing chart entries, doctor assignments, and vitals
- **Delete Session** button with `window.confirm` dialog

#### Sticky Top Bar Buttons

| Button                | Appearance          | Action                                                           |
| --------------------- | ------------------- | ---------------------------------------------------------------- |
| **Cancel**            | Outlined            | Navigate back                                                    |
| **Delete**            | Red outlined         | Confirm → deletes session + all chart entries + all doctor links |
| **Update Session**    | Teal filled          | Updates session doc + replaces all chart entries + replaces all doctor links |

#### Update Operation (Replace Strategy)

1. Updates the `sessions` document with new field values
2. **Deletes ALL** existing `dental_chart_entries` for this session
3. **Creates new** `dental_chart_entries` from the current form state
4. **Deletes ALL** existing `session_doctors` for this session
5. **Creates new** `session_doctors` from the current selection
6. Shows success toast → navigates to patient detail

#### Delete Operation

1. Fetches all related `dental_chart_entries` and `session_doctors`
2. Deletes all related documents + the session document in parallel
3. Navigates to patient detail page

---

## Reusable Components

### AppLayout (`AppLayout.jsx`)

The persistent shell component that wraps all pages.

#### Sub-Components

| Component          | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| **`AppLayout`**    | Root layout with sidebar, header, and `<Outlet>` for page content          |
| **`SidebarContent`** | Desktop sidebar content with logo, navigation, and collapse toggle       |
| **`Logo`**         | Clinic branding — tooth emoji + `CLINIC_NAME` (expanded) or just emoji (collapsed) |
| **`SidebarNav`**   | Navigation links rendered from `navigationItems` array                     |

#### Navigation Items

| Label       | Path        | Icon               | Aliases         |
| ----------- | ----------- | ------------------ | --------------- |
| Dashboard   | `/`         | `LayoutDashboard`  | `/dashboard`    |
| Patients    | `/patients` | `Users`            | —               |
| Doctors     | `/doctors`  | `Stethoscope`      | —               |
| Payments    | `/payments` | `IndianRupee`      | —               |

#### Sidebar Behavior

- **Desktop:** Fixed left sidebar, collapsible between 240px (expanded) and 64px (collapsed)
- **Collapsed tooltips:** Hover shows label tooltip on collapsed sidebar
- **Mobile:** Hamburger menu (☰) opens a slide-in drawer with semi-transparent backdrop
- **Active state:** Current page highlighted with teal background
- **Transition:** 300ms ease-in-out animation for all width/position changes

#### Header

- Dynamic page title determined by regex-based `routeTitles` matching against `location.pathname`
- Mobile: centered title with hamburger button
- Desktop: left-aligned title

---

### SessionCard (`SessionCard.jsx`)

A rich card component displaying a single clinical session's full details.

#### Displayed Elements

| Element                | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| Visit date             | Calendar icon + formatted date                                       |
| Visit type badge       | Color-coded: New (blue), Follow-up (purple), Emergency (rose), Routine (slate) |
| Injection badge        | Cyan badge with syringe icon (if injection given)                    |
| Follow-up reference    | "Follow-up of [date]" (if session is a follow-up)                    |
| Chief complaint (h3)   | Bold heading                                                         |
| Diagnosis              | Prefixed with "Diagnosis:" label                                     |
| Treatment given        | Collapsible text with "Show more/less" toggle (>140 chars)           |
| Doctors list           | Avatar pills showing doctor name + specialty                         |
| Dental chart entries   | Blue pill badges: region, tooth number, procedure, notes             |
| Vitals display         | Color-coded vital sign pills (if vitals recorded)                    |
| Billing summary        | Treatment Cost ₹X · Paid ₹X · Status badge                          |
| Next appointment       | Teal text with formatted date                                        |
| Last updated           | Shown only if session was edited after creation                      |
| **Edit** button        | Outlined button with pencil icon                                     |

#### Sub-Components

- **`Badge`** — Reusable pill badge with ring border and custom colors

#### Helper Functions

- **`formatDate`** — Formats ISO date strings using `date-fns`
- **`formatMoney`** — Formats numbers with Indian locale (`en-IN`)
- **`isDifferentDateTime`** — Compares `created_at` vs `updated_at` to detect edits

---

### Skeleton (`Skeleton.jsx`)

A minimal loading placeholder component.

```jsx
<Skeleton className="h-5 w-28" />  // Creates a pulsing gray rectangle
```

- Uses Tailwind's `animate-pulse` for smooth loading animation
- Accepts custom `className` for width/height control

---

### Toast / ToastProvider (`Toast.jsx`)

A context-based notification system with animated toasts.

#### Toast Types & Styles

| Type        | Colors                     | Icon             |
| ----------- | -------------------------- | ---------------- |
| `success`   | Emerald border/bg/text     | `CheckCircle`    |
| `error`     | Rose border/bg/text        | `XCircle`        |
| `warning`   | Amber border/bg/text       | `AlertTriangle`  |
| `info`      | Blue border/bg/text        | `Info`           |

#### Behavior

- **Position:** Fixed bottom-right corner (`bottom-5 right-5`)
- **Animation:** Slides in from right (`translate-x-8` → `translate-x-0`)
- **Auto-dismiss:** 4 seconds timeout
- **Manual dismiss:** Click the ✕ button
- **Stacking:** Multiple toasts stack vertically with gap
- **Exit animation:** Fades out + slides right over 250ms before removal

#### API

```js
const { showToast, dismissToast } = useToast()
showToast('Patient saved successfully.', 'success')  // Returns toast ID
dismissToast(toastId)  // Manual dismiss
```

---

## Custom Hooks

### `useToast` (`hooks/useToast.js`)

Provides access to the toast notification system via React Context.

```js
const { showToast, dismissToast } = useToast()
```

- Throws `Error('useToast must be used within ToastProvider')` if used outside provider
- Returns `{ showToast, dismissToast }` from `ToastContext`

### `ToastContext` (`hooks/toastContext.js`)

A React context (`createContext(null)`) that holds the toast API. Provided by `ToastProvider` at the app root.

---

## Library & Configuration

### `config.js` (`lib/config.js`)

Clinic branding constants used throughout the app:

```js
export const CLINIC_NAME = 'DentaRecord'
export const CLINIC_SUBTITLE = 'Dental Clinic Management'
```

Change these values to rebrand the application.

### `firebase.js` (`lib/firebase.js`)

Firebase initialization module:

- Reads all 6 Firebase config values from `import.meta.env` (Vite environment variables)
- Initializes Firebase app with `initializeApp()`
- Exports `db` (Firestore instance) and `storage` (Firebase Storage instance)
- Used by every page that reads/writes data

---

## Firebase Integration

### Firestore Collections & Data Models

The app uses 6 top-level Firestore collections with explicit relationship IDs (no subcollections):

#### 1. `patients`

| Field                   | Type        | Description                               |
| ----------------------- | ----------- | ----------------------------------------- |
| `patient_id`            | `string`    | Auto-generated `DC-YYYY-####` format      |
| `full_name`             | `string`    | Patient's full name (required)             |
| `registration_date`     | `string`    | Optional registration date                 |
| `date_of_birth` / `dob` | `string`   | Date of birth                              |
| `gender`                | `string`    | Male / Female / Other                      |
| `phone`                 | `string`    | Phone number (required)                    |
| `email`                 | `string`    | Email address                              |
| `address`               | `string`    | Full address                               |
| `blood_group`           | `string`    | A+, A-, B+, B-, O+, O-, AB+, AB-          |
| `allergies`             | `string`    | Known allergies                            |
| `medical_history`       | `string`    | General medical history                    |
| `medical_conditions`    | `string`    | Systemic diseases                          |
| `current_medications`   | `string`    | Current medications                        |
| `previous_dental_history` | `string` | Past dental work                           |
| `emergency_contact_name` | `string`  | Emergency contact name                     |
| `emergency_contact_phone` | `string` | Emergency contact phone                    |
| `age`                   | `number`    | Patient age (vital sign)                   |
| `weight`                | `number`    | Weight in kg                               |
| `blood_pressure`        | `string`    | Blood pressure reading                     |
| `blood_sugar`           | `number`    | Blood sugar in mg/dL                       |
| `pulse_rate`            | `number`    | Pulse rate in bpm                          |
| `spo2`                  | `number`    | Oxygen saturation %                        |
| `notes`                 | `string`    | Internal staff notes                       |
| `created_at`            | `Timestamp` | Firestore server timestamp                 |
| `updated_at`            | `Timestamp` | Firestore server timestamp                 |

#### 2. `sessions`

| Field              | Type        | Description                                  |
| ------------------ | ----------- | -------------------------------------------- |
| `patient_id`       | `string`    | References `patients` document ID            |
| `visit_date`       | `string`    | Date of the visit (YYYY-MM-DD)               |
| `visit_type`       | `string`    | New / Follow-up / Emergency / Routine Checkup |
| `followup_of`      | `string`    | References another `sessions` document ID    |
| `chief_complaint`  | `string`    | Main reason for visit (required)             |
| `diagnosis`        | `string`    | Doctor's diagnosis                           |
| `treatment_given`  | `string`    | Procedures and treatments performed          |
| `injection_given`  | `boolean`   | Whether injection was administered           |
| `injection_details`| `string`    | Injection type, location, dosage             |
| `treatment_cost`   | `number`    | Total cost in ₹ (rounded to 2 decimals)      |
| `amount_paid`      | `number`    | Amount paid in ₹                             |
| `payment_status`   | `string`    | Paid / Partial / Pending (auto-computed)     |
| `notes`            | `string`    | Additional notes                             |
| `next_visit_date`  | `string`    | Scheduled next appointment (YYYY-MM-DD)      |
| `vitals`           | `object`    | `{ age, weight, blood_pressure, blood_sugar, pulse_rate, spo2 }` |
| `created_at`       | `Timestamp` | Firestore server timestamp                   |
| `updated_at`       | `Timestamp` | Firestore server timestamp                   |

#### 3. `doctors`

| Field           | Type        | Description                        |
| --------------- | ----------- | ---------------------------------- |
| `name`          | `string`    | Doctor's full name (required)      |
| `specialty`     | `string`    | Dental specialty (required)        |
| `qualification` | `string`    | Degree/qualification               |
| `phone`         | `string`    | Contact phone                      |
| `email`         | `string`    | Contact email                      |
| `is_active`     | `boolean`   | Active/inactive status             |
| `created_at`    | `Timestamp` | Firestore server timestamp         |
| `updated_at`    | `Timestamp` | Firestore server timestamp         |

#### 4. `session_doctors` (Junction Table)

| Field        | Type        | Description                           |
| ------------ | ----------- | ------------------------------------- |
| `session_id` | `string`    | References `sessions` document ID     |
| `doctor_id`  | `string`    | References `doctors` document ID      |
| `created_at` | `Timestamp` | Firestore server timestamp            |

#### 5. `dental_chart_entries`

| Field            | Type        | Description                           |
| ---------------- | ----------- | ------------------------------------- |
| `session_id`     | `string`    | References `sessions` document ID     |
| `patient_id`     | `string`    | References `patients` document ID     |
| `region`         | `string`    | Oral region (Upper Jaw, Lower Jaw, etc.) |
| `tooth_number`   | `string`    | FDI tooth number (e.g., "11", "36")   |
| `procedure_done` | `string`    | Procedure performed (required)        |
| `notes`          | `string`    | Optional notes per entry              |
| `created_at`     | `Timestamp` | Firestore server timestamp            |

#### 6. `session_files`

| Field        | Type        | Description                           |
| ------------ | ----------- | ------------------------------------- |
| `session_id` | `string`    | References `sessions` document ID     |
| `file_name`  | `string`    | Original file name                    |
| `file_url`   | `string`    | Firebase Storage download URL         |
| `file_type`  | `string`    | MIME type or category                 |
| `created_at` | `Timestamp` | Firestore server timestamp            |

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   patients   │       │    sessions      │       │   doctors    │
│──────────────│       │──────────────────│       │──────────────│
│ id (auto)    │◄──────│ patient_id       │       │ id (auto)    │
│ patient_id   │       │ id (auto)        │──────►│ name         │
│ full_name    │       │ visit_date       │  via  │ specialty    │
│ phone        │       │ chief_complaint  │       │ is_active    │
│ ...          │       │ treatment_cost   │       │ ...          │
└──────────────┘       │ payment_status   │       └──────┬───────┘
                       │ vitals {}        │              │
                       │ ...              │              │
                       └────────┬─────────┘              │
                                │                        │
                    ┌───────────┼────────────┐           │
                    │           │            │           │
           ┌────────▼───────┐   │   ┌────────▼───────┐   │
           │ dental_chart   │   │   │ session_files  │   │
           │ _entries       │   │   │                │   │
           │────────────────│   │   │────────────────│   │
           │ session_id     │   │   │ session_id     │   │
           │ patient_id     │   │   │ file_name      │   │
           │ region         │   │   │ file_url       │   │
           │ tooth_number   │   │   │ file_type      │   │
           │ procedure_done │   │   └────────────────┘   │
           └────────────────┘   │                        │
                                │   ┌────────────────────▼┐
                                │   │ session_doctors      │
                                │   │─────────────────────│
                                └──►│ session_id           │
                                    │ doctor_id            │
                                    └─────────────────────┘
```

### Firebase Storage

Used for uploading and storing clinical attachments per session:
- X-ray images
- Lab reports
- Prescriptions
- Intraoral photos
- Other clinical files

Files are queried via the `session_files` Firestore collection which stores metadata and Storage download URLs.

---

## System Design & Data Flow

### Application Lifecycle

```
1. Browser loads index.html
2. Vite serves /src/main.jsx
3. React 19 createRoot renders <App /> in StrictMode
4. ToastProvider wraps the entire app (context at root)
5. BrowserRouter initializes client-side routing
6. AppLayout renders as the layout wrapper for all routes
7. Sidebar + Header render persistently
8. <Outlet /> renders the matched page component
9. Each page fetches data from Firestore on mount (useEffect)
10. User interactions trigger Firestore writes
11. Toast notifications provide user feedback
```

### Data Fetching Pattern

All pages follow the same pattern:
1. `useState` for loading, data, and error states
2. `useEffect` on mount triggers an async function
3. The async function uses `Promise.resolve().then(loadFunction)` to avoid React StrictMode double-fires
4. Firestore queries use targeted `where()`, `orderBy()`, `limit()`, and `getCountFromServer()` to minimize document reads
5. Batch lookups use `where('__name__', 'in', [...])` instead of N+1 individual `getDoc` calls
6. Data is transformed and stored in state
7. Loading state is toggled in `finally` block
8. Errors are caught and displayed via `showToast`

### State Management

- **No global state library** — all state is component-local via `useState`
- **Context:** Only used for the toast notification system
- **Derived state:** Payment status is auto-computed from `treatment_cost` and `amount_paid`
- **Debounced search:** Custom implementation using `setTimeout` + `useEffect` cleanup (300ms)

### Form Handling

- Controlled components with `useState`
- Validation on submit (required fields checked with trim)
- Loading spinner during save operations
- Buttons disabled while saving
- Toast notifications for success/error/warning feedback

---

## UI/UX Design System

### Color Palette

| Usage                | Color                 | Tailwind Class        |
| -------------------- | --------------------- | --------------------- |
| Primary action       | Teal 600              | `bg-teal-600`         |
| Primary hover        | Teal 700              | `hover:bg-teal-700`   |
| Sidebar background   | Slate 950             | `bg-slate-950`        |
| Page background      | Slate 50              | `bg-slate-50`         |
| Card background      | White                 | `bg-white`            |
| Text primary         | Slate 950             | `text-slate-950`      |
| Text secondary       | Slate 600             | `text-slate-600`      |
| Text muted           | Slate 400             | `text-slate-400`      |
| Borders              | Slate 200             | `border-slate-200`    |
| Danger               | Rose 600              | `text-rose-600`       |
| Success              | Emerald 700           | `text-emerald-700`    |
| Warning              | Amber 700             | `text-amber-700`      |

### Typography

- **Font family:** Inter, ui-sans-serif, system-ui (set in `index.css`)
- **Headings:** `font-semibold` or `font-bold`, `tracking-normal`
- **Body:** `text-sm` (14px) throughout
- **Labels:** `text-xs` (12px) uppercase for metadata labels

### Responsive Breakpoints

| Breakpoint | Tailwind Prefix | Usage                                     |
| ---------- | --------------- | ----------------------------------------- |
| < 768px    | (default)       | Single column, mobile sidebar drawer      |
| ≥ 768px    | `md:`           | Desktop sidebar visible                   |
| ≥ 1024px   | `lg:`           | Multi-column grids, wider layouts         |
| ≥ 1280px   | `xl:`           | 3-column patient grid                     |

### Loading States

Every page implements one of:
- **Skeleton components:** Animated pulse placeholders matching the final layout shape
- **Loading spinner:** `Loader2` icon with `animate-spin` for button loading states
- **Text indicator:** "Loading patient..." for simple loading states

### Empty States

Every list/grid implements an empty state with:
- Centered icon in a teal circular background
- Descriptive message
- Action button (e.g., "+ Add First Patient", "+ Add First Session")
- Dashed border container

---

## Environment Variables

Create a `.env` file in the project root with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Note:** The `VITE_` prefix is required for Vite to expose these variables to client-side code via `import.meta.env`.

---

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web App** and copy the configuration values to `.env`.
3. Enable **Firestore Database** in test mode.
4. Enable **Firebase Storage** in test mode.
5. Firestore collections are **created automatically** when the app first writes data. No manual setup needed.

> **⚠ Production Warning:** Replace test-mode security rules with authenticated, role-based rules before handling real patient data (HIPAA/DISHA compliance).

---

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

---

## Build for Production

```bash
npm run build
```

Output is written to `dist/`. Preview the production build:

```bash
npm run preview
```

---

## Deploy to Vercel

1. Push the project to GitHub.
2. In Vercel, click **Add New Project** and import the GitHub repository.
3. Set the framework preset to **Vite** if not auto-detected.
4. Add the 6 environment variables listed above.
5. Deploy.

---

## Branding Configuration

Clinic branding is configured in `src/lib/config.js`:

```js
export const CLINIC_NAME = 'DentaRecord'
export const CLINIC_SUBTITLE = 'Dental Clinic Management'
```

These values are used in:
- Sidebar logo (expanded view)
- Default page title fallback
- Browser context where `CLINIC_NAME` is referenced

Update these values to rename the application for any dental clinic.
