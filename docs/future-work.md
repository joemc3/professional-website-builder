# Future Work

A running list of work that's been deliberately deferred. Each item names *why* it's not being done now and *what would trigger* picking it up. When an item becomes real, it graduates into `docs/superpowers/specs/` and goes through the normal brainstorm → spec → plan → implement cycle.

This file is the canonical list. If the repo ever goes public, anything worth surfacing can be mirrored into GitHub Issues, but this file stays as the source of truth.

## Security & Access

### Open public registration
- **Why deferred:** Phase 3e-B (deployment) launches Vitae for a small invited group. Public sign-up needs invite codes (or email verification), rate limiting on `/api/auth/register`, captcha or proof-of-work, abuse monitoring, and a story for cleaning up dormant or hostile accounts. None of that is built.
- **Today's behavior:** `REGISTRATION_ENABLED=false` in prod `.env`. `/api/auth/register` returns 403. Accounts are created via the `create_user` CLI on the VPS.
- **Trigger to pick up:** Ready to invite strangers, or wanting a true "anyone can try Vitae" demo URL.
- **Rough scope:** Invite-code flow (tables + API + admin UI for issuing codes), or email-verification flow (SMTP integration + verification tokens); rate limiting middleware on auth endpoints; account deletion/cooldown policy; admin view for managing users.

### Hide "Create one" link in the UI when registration is disabled
- **Why deferred:** Cosmetic. The API correctly returns 403, so clicking the link from the sign-in page just produces an error — no functional risk, just a poor UX touch on a prod instance that won't accept sign-ups.
- **Today's behavior:** `src-ui/src/pages/SignIn.tsx` (or equivalent) renders an unconditional "Don't have an account? Create one" link. Anyone landing on the login page sees an option that will fail.
- **Trigger to pick up:** Bundled with the public-registration work above, OR earlier if you want the prod sign-in page to look clean before sharing the URL.
- **Rough scope:** Expose `REGISTRATION_ENABLED` as a public flag via a small `/api/config` endpoint (or read at build time and bake in); conditional render of the link + the standalone `/register` route.

## Observability

### Log shipping + metrics
- **Why deferred:** Phase 3e-B explicitly punts. At current scale, `docker compose logs -f` on the VPS is sufficient for debugging.
- **Trigger to pick up:** More than ~10 active users, or any incident where post-mortem would have benefited from historical metrics or aggregated logs.
- **Rough scope:** Pick a stack (Loki + Grafana, or a hosted option like Better Stack / Axiom); ship API + worker logs with structured JSON; surface job durations, queue depth, generation success rate, LLM token usage; uptime checks on `/api/health` and the public site root.

## Data

### Automated backups (Postgres + uploads)
- **Why deferred:** Small invited group can tolerate data loss; the cost of building it now outweighs the risk. A manual `make backup` target gives an escape hatch.
- **Today's behavior:** `make backup` runs `pg_dump` + tarballs the uploads volume locally on the VPS. User-driven.
- **Trigger to pick up:** First real user we'd hate to lose data for, or first time the manual backup gets forgotten and something goes wrong.
- **Rough scope:** Nightly cron container running `pg_dump` + uploads tar, encrypted with `age` or `gpg`, shipped to S3/R2/Backblaze with 30-day retention; documented restore procedure; periodic restore test.

## Infrastructure

### Pangolin / Traefik / Gerbil reboot fragility
- **Why deferred:** This is VPS-level infrastructure (Pangolin's own stack, not Vitae's), but it affects Vitae because Vitae sits behind Pangolin. Diagnosis is unfinished — restart policies are already `unless-stopped`, so the real cause is something else (Docker startup ordering when traefik joins gerbil's netns, plus stale iptables NAT state surviving daemon restarts).
- **Today's behavior:** Every Docker daemon restart or VPS reboot has a non-trivial chance of leaving `gerbil` and `traefik` exited with no automatic recovery. Manual reset is: `docker ps -q | xargs docker stop && sleep 3 && docker start gerbil traefik <other-stack-containers>`. Until that's done, no Pangolin-fronted service is reachable (Vitae included).
- **Trigger to pick up:** Next time it happens (which it will), spend an hour actually diagnosing. Or sooner if the prod stack matters enough that a 5-minute outage post-reboot is unacceptable.
- **Rough scope:** Investigate exit reasons in `journalctl -u docker` after a reboot; check whether Pangolin's compose file has a `depends_on` ordering for gerbil → traefik that's actually respected on daemon restart; possibly add a systemd unit that runs `docker compose up -d` against Pangolin's stack on boot as a backstop; or pin gerbil's port mappings to a known-stable host IP. This affects every Pangolin-fronted service on the VPS, not just Vitae.

### vitae-ui container shows "(unhealthy)" despite working
- **Why deferred:** Cosmetic — the container serves traffic fine; only `docker ps` reports unhealthy. Pangolin doesn't gate on the Docker healthcheck.
- **Today's behavior:** `src-ui/Dockerfile` defines a HEALTHCHECK that probably hits an endpoint the prod nginx config doesn't serve (or hits it with wrong headers). Result: container is forever "(unhealthy)" even though `curl http://vitae-ui/` works.
- **Trigger to pick up:** Adding container-level health gating anywhere (e.g. orchestrator with healthcheck-aware routing), or just wanting clean `docker ps` output.
- **Rough scope:** Read `src-ui/Dockerfile`'s HEALTHCHECK directive; either point it at a path nginx will return 200 for (e.g. `/`), or remove it and rely on Pangolin's health probes. ~5-line change.

### Staging environment
- **Why deferred:** Single VPS, single user iterating. Push-to-main → prod is the workflow. Local dev compose serves as "staging."
- **Trigger to pick up:** First time a bad deploy breaks invited users badly enough to need pre-flight validation, or the user base grows beyond people who tolerate breakage.
- **Rough scope:** Either a second VPS (clean separation, cost), or a sibling stack on the same VPS (`vitae-staging-*` containers, separate Postgres volume, `staging.vitae.2524.cloud` host, branch-triggered deploys from a `staging` branch).

## Quality

### Phase 4 — End-to-end testing
- **Why deferred:** Scope already documented in `docs/superpowers/specs/phase4-e2e-testing-scope.md`. Unit + integration coverage is strong; full-stack browser-driven flows are nice-to-have but not blocking.
- **Trigger to pick up:** Repeated regressions in flows that unit/integration tests don't catch, or before opening to public signup.
- **Rough scope:** See `phase4-e2e-testing-scope.md`.
