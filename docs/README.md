# Leish! — Documentation Set

Product & technical documentation for **Leish! Aesthetic Marketplace**, generated from the current codebase on 2026-10-08.

| # | Document | Purpose |
|---|---|---|
| 01 | [PRD](./01-prd.md) | Problem, personas, goals, epics & functional requirements, metrics, risks, release criteria |
| 02 | [TRD](./02-trd.md) | Architecture, stack, domain model, API contract, auth/security, AI integration, known defects, technical requirements (TR-1…TR-12) |
| 03 | [App Flow](./03-app-flow.md) | Navigation model, sitemap, actor states, 8 core user flows, cross-cutting states |
| 04 | [Design Brief](./04-design-brief.md) | Brand positioning, design principles, typography, color roles, components, motion, voice, accessibility |
| 05 | [Background Scheme](./05-background-scheme.md) | Espresso-gallery elevation ladder, gradients, glow orbs, scrims, CTA gradients, per-screen map, codification plan |
| 06 | [Implementation Plan](./06-implementation-plan.md) | 5 phases (32 eng-days), tasks with acceptance criteria, milestones, risks, definition of done |

**Reading order:** PRD → TRD → App Flow for product/tech; Design Brief → Background Scheme for visual; Implementation Plan last (it references everything).

**Critical finding at time of writing:** the core booking funnel is broken (server date regex), authenticated writes omit the JWT header (silent 401s), and production data is ephemeral (JSON file in `/tmp` on Vercel). Phase 0 of the implementation plan fixes these first.
