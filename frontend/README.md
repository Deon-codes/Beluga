# SONAR-AI Frontend

This directory will contain the **Next.js 16 + Tailwind CSS 4** frontend application.

See `docs/02_FRONTEND_SPEC.md` for the full design specification.

## Status

🚧 **Not yet initialized.** This directory marks the boundary for the future frontend.

## Planned Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- React Query (or Next.js built-in fetch)
- Inter / Geist font

## Pages (from spec)

- `/dashboard` — KPI strip + recent surveys
- `/surveys` — history table
- `/surveys/new` — upload sonar image
- `/surveys/[id]` — detection overlay + processing stepper
- `/detections` — all detections, filterable table
- `/reports` — list + preview + download

## API Contract

The frontend communicates with the backend via REST endpoints defined in
`docs/03_REPO_AND_INTEGRATION.md` §2. All API calls should go through a
single `services/api.ts` module.
