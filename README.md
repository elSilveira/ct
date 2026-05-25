# Clube das Tercas

Single-page static app for Clube das Tercas. It runs on GitHub Pages without a backend, database, or server process.

## Static Data Mode

- Initial data lives in `public/data/app-state.json`.
- Runtime changes are saved in the browser `localStorage`.
- Member mobile numbers are not stored in plain text in the public JSON.
- Login compares `SHA-256(phone + app salt)` in the browser.
- Admin users can export/import a JSON backup from the Admin screen.

This mode is practical for a simple GitHub Pages deployment, but it is not a real synchronized multi-user database. Each browser keeps its own live copy until an admin imports a backup.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` publishes the `public/` folder on pushes to `main`.

No GitHub secret or database variable is required.

## Run Locally

```bash
npm start
```

Open `http://localhost:3000`.

The local Node server also uses `public/data/app-state.json` by default. The
path is resolved from the repository root, so the JSON database stays in Git
instead of depending on the process working directory. Server-side saves mask
phone numbers and store only `phoneHash` for login lookup.

Seed phones:

- Admin: `54999990001`
- Accountant: `54999990002`
- Member: `54999990003`
- Player: `54999990004`

## Test

```bash
npm test
```

## Implementation Notes

- UI lives in `public/app.js` and `public/styles.css`.
- Static client-side API lives in `public/client-api.js`.
- Shared business rules are copied to `public/domain/model.js` for browser execution.
- Server files under `src/server/` remain only for local static serving and tests.
