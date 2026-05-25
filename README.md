# Clube das Tercas

Single-page web app for managing Clube das Tercas activities around each Tuesday: member access, attendance, guests, pool championship, drinks, charges, dinner teams, notices, reports, and audit logs for drinks.

## Run Locally

```bash
npm start
```

Open `http://localhost:3000`.

Seed phones:

- Admin: `54999990001`
- Accountant: `54999990002`
- Member: `54999990003`
- Player: `54999990004`

## Test

```bash
npm test
```

## GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that publishes the static SPA from `public/` on pushes to `main`.

For a deployed backend, set the repository variable `CDT_API_BASE` to the public API origin, for example `https://api.example.com`. If it is empty, the SPA calls `/api/*` on the same origin, which is correct for local Node hosting but not enough for GitHub Pages by itself.

Configure it in GitHub at `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`. GitHub Pages cannot run the Node API, so login and all `/api/*` actions require that backend URL.

## Implementation Notes

- The app is dependency-free for the first local implementation and runs on Node.js 22+.
- The backend serves `/api/*` and the static SPA from `public/`.
- Local data persists to `data/app-state.json`.
- Core business rules live in `src/domain/model.js`.
- HTTP routing lives in `src/server/app.js`.
- The MySQL schema for a production database is documented in `docs/database-schema.sql`.
- Dinner teams can be scheduled across the generated Tuesday calendar for the next 12 months.
- Drinks can be managed by admins, accountants, and the dinner team assigned to that Tuesday.
- Charge due dates are normalized to the first Tuesday of the selected month.
- Weekly pool matches are shown on the home screen and disappear from the weekly list after a result is submitted.

## Production Path

The current code is structured so the JSON store can be replaced by Prisma/MySQL later. GitHub Pages can host the static frontend, while the Node API still needs a public backend host.
