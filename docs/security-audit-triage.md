# Security audit triage

Last checked while preparing launch-readiness repo work: `npm audit --audit-level=moderate --cache /tmp/npm-cache-meatspace`.

## Current status

The dependency refresh reduces audit findings from 12 to 9, but it does **not** fully clear the audit.

Remaining audit counts:

- Critical: 0
- High: 2
- Moderate: 6
- Low: 1

## Remaining findings

| Package | Severity | Scope / likely exposure | Notes |
|---|---:|---|---|
| `next` | High | Production dependency | Most findings are fixed in Next `15.5.x+`; npm reports the available fix as a semver-major upgrade to Next 16. This should be handled as a focused framework upgrade PR, not hidden in a docs/manifest cleanup. |
| `next/node_modules/postcss` | Moderate | Transitive production dependency | Comes through the installed Next 14 line. Resolved by upgrading Next. |
| `@cloudflare/next-on-pages` | Moderate | Build/deploy tooling | Deprecated package; no direct fix available. Cloudflare recommends moving to OpenNext for Cloudflare. |
| `wrangler` / `miniflare` / `undici` / `ws` / `esbuild` | Moderate–High | Local preview/dev/build tooling | Latest Wrangler currently requires Node `>=22`; this repo was verified under Node `20.19.2`, so Wrangler was kept at `4.80.0` for compatibility. Upgrade path should coordinate Node 22 and Cloudflare adapter changes. |
| `cookie` | Low | Transitive tooling dependency | No direct fix available from current dependency graph. |

## Recommended follow-up PRs

1. **Framework security upgrade**: upgrade Next from 14 to a fixed 15.x/16.x line, run full build/tests, and verify Cloudflare deployment behavior.
2. **Cloudflare adapter migration**: replace deprecated `@cloudflare/next-on-pages` with OpenNext for Cloudflare.
3. **Runtime baseline**: decide whether production/deploy tooling should move from Node 20 to Node 22 before upgrading Wrangler beyond `4.80.0`.

## Verification from this cleanup branch

- `npm test` — passing
- `npx tsc --noEmit` — passing
- `npm run build` — passing

Do not treat the current dependency refresh as a complete security remediation. It is a launch-readiness cleanup plus explicit triage of the remaining audit surface.
