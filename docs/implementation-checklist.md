# Clube das Tercas Implementation Checklist

This checklist is the working plan for the first full local implementation based on `roadmap-clube-das-tercas.md`.

## Architecture

- [x] Use a self-contained Node.js app so the project runs before external hosting and database services are configured.
- [x] Serve a mobile-first SPA from the same local server during development.
- [x] Implement business rules in a framework-independent domain module.
- [x] Keep storage behind a JSON repository adapter so MySQL/Prisma can replace it later without rewriting UI flows.
- [x] Add SQL schema documentation matching the roadmap entities.

## TDD Checkpoints

- [x] Write failing tests for authentication, roles, Tuesdays, attendance, pool ranking, drinks logs, charges, dinner teams, and notices.
- [x] Run tests and confirm they fail because production code is missing.
- [x] Implement the minimal domain code to pass tests.
- [x] Run tests and confirm the domain rules pass.

## Backend API

- [x] `POST /api/auth/login`
- [x] `POST /api/auth/logout`
- [x] `GET /api/auth/me`
- [x] `GET /api/members`
- [x] `POST /api/members`
- [x] `PUT /api/members/:id`
- [x] `GET /api/club-tuesdays`
- [x] `GET /api/club-tuesdays/current`
- [x] `PATCH /api/club-tuesdays/:id/status`
- [x] `GET /api/attendance/:clubTuesdayId`
- [x] `POST /api/attendance`
- [x] `GET /api/notices/active`
- [x] `GET /api/notices`
- [x] `POST /api/notices`
- [x] `GET /api/dinner-teams/:clubTuesdayId`
- [x] `POST /api/dinner-teams`
- [x] `GET /api/pool/championships`
- [x] `POST /api/pool/championships`
- [x] `GET /api/pool/teams`
- [x] `POST /api/pool/teams`
- [x] `GET /api/pool/matches`
- [x] `POST /api/pool/matches`
- [x] `PUT /api/pool/matches/:id/result`
- [x] `POST /api/pool/matches/:id/approve`
- [x] `POST /api/pool/matches/:id/reject`
- [x] `GET /api/pool/ranking/:championshipId`
- [x] `GET /api/drinks/:clubTuesdayId`
- [x] `POST /api/drinks`
- [x] `PUT /api/drinks/:id`
- [x] `DELETE /api/drinks/:id`
- [x] `GET /api/drinks/logs/:clubTuesdayId`
- [x] `GET /api/drinks/reports/monthly`
- [x] `GET /api/charges/me`
- [x] `GET /api/charges`
- [x] `POST /api/charges`
- [x] `PUT /api/charges/:id`
- [x] `PATCH /api/charges/:id/status`
- [x] `GET /api/reports/attendance`
- [x] `GET /api/reports/drinks`
- [x] `GET /api/reports/charges`
- [x] `GET /api/reports/pool`

## Frontend Screens

- [x] Login by registered phone.
- [x] Home with current member, current Tuesday, attendance, pending charges, dinner team, notices, and shortcuts.
- [x] Attendance controls with dinner/football status and guest steppers.
- [x] Pool screen with championship, matches, pending approval, result submission, and ranking.
- [x] Drinks screen for admin/accountant with member totals, add/edit/remove, logs, and monthly summary.
- [x] Charges screen with member-only visibility and admin/accountant management.
- [x] Dinner teams screen with admin editor and member highlight.
- [x] Notices screen with active notices and admin editor.
- [x] Admin screen for member management and permissions.
- [x] Reports screen for attendance, drinks, charges, and pool.
- [x] Bottom mobile navigation and responsive desktop layout.

## Verification

- [x] `npm test`
- [x] Start local server.
- [x] Verify app shell responds from `/`.
- [x] Verify representative API endpoints return JSON.

## Requested Refinements

- [x] Generate at least 12 months of Tuesdays for future dinner-team scheduling.
- [x] Allow drink management for admins, accountants, and the dinner team assigned to the selected Tuesday.
- [x] Redesign drinks as one row per member with direct Agua/Refri and Cerveja click actions.
- [x] Show drink reports by person.
- [x] Normalize charge due dates to the first Tuesday of the selected month.
- [x] Show charge reports by person.
- [x] Allow admins to edit existing members.
- [x] Show weekly pool matches on the home screen.
- [x] Hide weekly pool matches after results are submitted.
- [x] Allow admins to edit or remove open weekly pool matches.
- [x] Make the home screen the main operational surface.
