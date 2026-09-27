# Cloudflare Pages + anonymous blind-box statistics

The VitePress site remains a static site. Optional Pages Functions at
`functions/api/blind-box.js` provide `/api/blind-box`, backed by the D1 binding
**`BLIND_BOX_DB`**. Without that binding (or when D1 is unavailable), the API
returns JSON with HTTP 503. The scene must remain usable without statistics.
A VitePress-only dev/preview server or another static host does not run Functions.

## Current dashboard setup

The production Pages project `huangdihd-blog` is connected to GitHub `main`.
D1 database `huangdihd-blind-box` has the table and index from
`migrations/0001_blind_box.sql`, created through the dashboard. Its production
binding is `BLIND_BOX_DB`. Binding changes take effect on the next deployment.
Preview bindings have not been configured, to avoid mixing preview choices with production.

`docs/public/_routes.json` limits Functions invocation to `/api/blind-box`.
The scene submits open/skip choices anonymously and displays totals at the end.
Random item outcomes are not collected. Fictional weighted outcomes are defined in `docs/.vitepress/components/blindBoxOdds.mjs`
and disclosed below the scene. Breakfast: poor 65%, fine 5%, feces 30%. Gift shop:
clock 30%, diamond 3%, feces 27%, gun 15%, fake notes 25%. Street stall: medal 5%,
lock 35%, feces 30%, gun 10%, fake notes 20%. Draws are independent, with no pity
mechanism. Advertising deliberately does not reflect the outcome distribution.
The final stall disappears after either choice; restarting restores it.
Skipping is final within a playthrough.

## Free-tier setup

A Cloudflare account, Pages project, and D1 database are required. Pages Functions
use Workers quotas; D1 has separate read/write/storage quotas. Small personal-site
usage can fit the free tiers, but this is not an unlimited or guaranteed-free
service. Check current quotas in the Cloudflare dashboard before enabling it.
No paid service or new application dependency is required by this implementation.
Wrangler below is invoked on demand through `npx`.

1. Connect this repository to Cloudflare Pages (project root is the repository
   root). Set build command to `npm run docs:build`, output directory to
   `docs/.vitepress/dist`, and use a supported Node release (Node 22+ recommended).
   Keep `functions/` at repository root; do not copy it into VitePress source.
2. Authenticate and create a database (commands are for the operator to run):

   ```sh
   npx wrangler login
   npx wrangler d1 create blind-box
   ```

3. Create a local `wrangler.toml` with the database ID returned above, or merge
   these entries into an existing configuration. Do not commit credentials.

   ```toml
   name = "YOUR-PAGES-PROJECT"
   pages_build_output_dir = "docs/.vitepress/dist"
   compatibility_date = "2026-01-01"

   [[d1_databases]]
   binding = "BLIND_BOX_DB"
   database_name = "blind-box"
   database_id = "YOUR-DATABASE-ID"
   migrations_dir = "migrations"
   ```

4. Apply the schema before serving production traffic:

   ```sh
   npx wrangler d1 migrations apply blind-box --remote
   ```

5. In Pages → project → Settings → Bindings, add a D1 binding named
   `BLIND_BOX_DB` pointing at this database. Redeploy after changing bindings.
   Use a **separate database for preview deployments** so test clicks do not
   contaminate production. Configure/apply its schema independently. When
   deploying using Wrangler configuration, ensure its database ID and binding
   match the intended environment; do not accidentally override isolation.
6. Deploy via the connected Git build or, explicitly when ready:

   ```sh
   npm run docs:build
   npx wrangler pages deploy docs/.vitepress/dist
   ```

Dashboard drag-and-drop of only the static output does not package these
Functions. No deployment is performed by adding these files.

## Local verification

```sh
# Unit/API/schema tests, Node 22.13+ (node:sqlite may emit an experimental warning)
node --test migrations/tests/blind-box.test.mjs

# Actual Pages runtime using local, not remote, D1
npm run docs:build
npx wrangler d1 execute BLIND_BOX_DB --local --config wrangler.local.toml --file migrations/0001_blind_box.sql
npx wrangler pages dev docs/.vitepress/dist --d1 BLIND_BOX_DB=00000000-0000-0000-0000-000000000000 --ip 127.0.0.1 --port 8788
# Open http://127.0.0.1:8788/essays/blind-box
# Local data persists in .wrangler/ (gitignored).
# wrangler.local.toml uses a dummy database ID; never deploy with this config.
```

The tests load the Pages ESM module from source because the root package is
CommonJS. They execute the real migration and SQL in built-in SQLite behind a
small D1 adapter. They do not claim to test Cloudflare's runtime or deployment.

For a deployed or local Pages URL:

```sh
curl https://YOUR-SITE/api/blind-box
curl https://YOUR-SITE/api/blind-box \
  -H 'Origin: https://YOUR-SITE' \
  -H 'Content-Type: application/json' \
  --data '{"session":"12345678-1234-4234-9234-123456789abc","stall":0,"choice":"open"}'
```

Replace the URL **and Origin** together (include the port for local Pages).
This POST writes a real choice: use the preview/local database for smoke tests.

## API contract

- `GET /api/blind-box` returns HTTP 200:
  `{"stats":[{"stall":0,"opened":0,"skipped":0},{"stall":1,"opened":0,"skipped":0},{"stall":2,"opened":0,"skipped":0}]}`.
  All three stalls are returned, ordered 0–2, including zero counts.
- `POST /api/blind-box` accepts only JSON with `session` (a standard UUID,
  preferably `crypto.randomUUID()`), integer `stall` (0–2), and `choice`
  (`"open"` or `"skip"`). Unknown fields are rejected. UUID case is normalized.
  Reuse the same random session token for retries and the desired browser
  session lifetime; do not derive it from an account or device identity.
- A successful POST returns HTTP 200 with the same aggregate shape. The **first
  choice wins** per `(session, stall)`; retries, even with a different choice,
  are successful no-ops. Each session can contribute once to each of three stalls.
  Uniqueness is enforced by SQLite, not a racy application-side lookup. D1 batches
  the insert and aggregate read transactionally.
- POST requires an exact same-origin `Origin` header; missing and `null` origins
  are rejected (403). No CORS access is granted. This works with custom domains
  and previews because comparison uses the request URL's origin.
- Bodies are limited to 1,024 bytes (both declared length and streamed bytes).
  Invalid input is 400, oversized input 413, wrong media type 415, unsupported
  methods 405 (`Allow: GET, POST`), and unavailable/uninitialized D1 is 503.
  All responses are JSON with `Cache-Control: no-store`; failures have an
  `error` string. No private database details are returned.

## Privacy, interpretation, and abuse limits

These are **counts of choices, not people or unique visitors**. A random session
UUID is a deduplication token, not an authenticated user identity. Reload/session
reset, another browser, or a forged UUID can add more choices. A choice on one
stall does not count as opening/skipping every other stall.

The application stores only `session`, `stall`, and `choice`. It does **not**
collect names, account IDs, IP addresses, user agents, or timestamps, and it does
not log request bodies or database errors. The server retains random session
UUIDs for deduplication; this is pseudonymous storage, not proof of complete
anonymity. Cloudflare may process network metadata in its own infrastructure;
review its logging/privacy settings separately. Records have no automatic expiry.
Deleting records resets their counts and also removes their retry protection.

Same-origin checking protects against ordinary cross-site browser submissions,
**not bots**: non-browser clients can forge Origin and mint unlimited UUIDs.
There is no authentication, CAPTCHA, per-IP tracking, or rate limiting here.
Do not present these numbers as a representative poll or trust them for money,
access control, or rewards. If abused, disable the binding or use suitable
Cloudflare-level protections after reviewing cost/privacy tradeoffs.

The primary key efficiently deduplicates session/stall pairs; the covering
`(stall, choice)` index supports grouped totals without reading session payloads.
Each aggregate still scans all recorded choices, so D1 rows-read and storage
usage grow over time. The free-tier design is intended for low-volume use. At
higher volume, consider maintained counters and caching in a separate change.
