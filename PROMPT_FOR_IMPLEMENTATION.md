# NWIS MVP Implementation Prompt

Build a working MVP for the NWIS project using the existing repo structure in this workspace. The goal is a connected, realistic demo that works end-to-end with generated fake data and proper backend/frontend integration.

## Objective
Create a functional operational intelligence platform for oil and gas well monitoring, with real data flow from the database to the frontend. The app should look and feel like a serious drilling intelligence dashboard, but it should remain implementable within a 2-day sprint.

## Important constraints
- Use the existing backend and frontend structure already in the repo.
- Do not produce dead mock-only pages.
- Do not leave core features as static placeholders.
- Do not rely on hardcoded arrays for wells, alerts, risk data, or dashboard metrics unless they are generated from seeded data in the database.
- Make the app feel like a real system, not a prototype-only UI shell.
- Implement a realistic MVP, not a full production-grade platform.

## Required fake data
Seed 15 to 20 realistic wells across 4 to 5 fields in an Assam-style oil basin. The data must look operationally believable.

Required seeded entities:
- users
- wells
- formations
- surveys
- drilling parameters
- operational events
- casing sections
- cement jobs
- mud programs
- documents
- knowledge chunks

### Wells
Create 18 wells total, distributed across fields like:
- Lakwa Central
- Duliajan North
- Moran East
- Naharkatiya
- Baghjan / another realistic basin field

Each well should have:
- realistic name and well number
- field name
- operator
- latitude and longitude values in the Assam region
- status: active, completed, suspended
- total depth
- primary formation
- recent events
- formation intervals

### Operational realism
Seed realistic event types such as:
- mud_loss
- kick
- stuck_pipe
- fishing
- torque_spike
- pressure_anomaly
- casing_issue
- well_control
- blowout (optional, not too many)
- other

Also include realistic severities:
- low
- medium
- high
- critical

### Knowledge content
Create knowledge chunks tied to historical incidents and mitigation notes. Each chunk should include:
- source type: document, event, lesson, mitigation, formation
- realistic chunk text
- filterable metadata like well_id, formation, event_type, severity

## Required features
The following features must be properly implemented and connected to real backend data.

### 1. Authentication
- Registration
- Login
- JWT-based protected routes
- getMe endpoint
- role handling for engineer, operator, and administrator

### 2. Well management
- list wells
- get single well
- near-by well search by coordinates
- filter by status and field
- create/update/delete well
- return associated formations and recent events

### 3. Risk intelligence
- compute risk per well using historical events and depth/formation patterns
- active alerts page
- mitigation suggestions based on nearest similar historical cases
- alert severity: low, watch, high, critical
- no static hardcoded alerts for the main app flow

### 4. Search and knowledge retrieval
- semantic or similarity-based search over the knowledge base
- support filters by:
  - well_id
  - event_type
  - formation
  - severity
- return ranked results with relevant metadata

### 5. Report upload flow
- upload PDF reports
- save metadata to database
- show status: uploaded, processing, processed, failed
- list uploaded reports
- make upload page functional, not decorative

### 6. Overview dashboard
- show summary metrics from seeded data
- wells in motion
- active alerts
- risk distribution
- recent events
- use API-backed data

### 7. Admin / operational screens
- admin page should be functional and protected
- support at least a basic admin overview with counts and operational summaries

## Required technical implementation
- Use the existing schema and service architecture
- Keep REST API endpoints clean and consistent
- Use proper validation and error handling
- Use fake data only for demo data generation, but use it realistically
- Ensure all major pages fetch live data from backend APIs
- Integrate frontend with backend using real HTTP requests
- Ensure major routes are protected when necessary

## Must not do
- Do not leave login, well list, risk, knowledge, or upload pages as static mock implementations
- Do not hardcode core app data into UI components for final state
- Do not keep major screens disconnected from the API
- Do not keep placeholder business logic without real database-backed flow

## Data generation expectations
Each seeded dataset should be realistic and internally consistent.

Examples:
- wells in the same field should have related coordinates
- events should correlate with the well depth and formation names
- some wells should have more risk events than others
- some wells should be stable and low-risk
- some should show severe historical issues like lost circulation, stuck pipe, or pressure anomaly

## Expected output
The final solution should include:
- updated seed files for fake data
- backend logic to serve real data
- frontend integration to use real API data
- validation that the app starts and runs locally
- clear notes on which parts are MVP and which are future enhancements

## Success criteria
The app should be demo-usable and feel realistic.

At minimum, the following flows must work:
- user signs up or logs in
- wells list loads from database
- well detail page shows formation and incident history
- risk page shows logical alerts from seed data
- knowledge search returns results from seeded documents/chunks
- upload page accepts a PDF and stores metadata
- dashboard counts reflect seeded data

## Final instruction
Do not stop at design or UI-only work. Build real functionality around the current repo structure, and make the app behave like a real operational intelligence platform powered by seeded data.
