# Games4Free

Part of [**Free4AllHub**](https://free4allhub.thabiggdogg420.chatgpt.site), alongside **Plan4Free** and **Learn4Free**. The product was formerly Game Commons; the `thabiggdogg420-a11y/game-commons` repository URL stays unchanged for compatibility.

**Point your AI at Games4Free, find a useful starting point, and adapt it into the game you want.**

One game-source directory, two entrances: a website for people and a compact read-only MCP interface for assistants. Listings credit original creators, link upstream source/setup instructions, and distinguish source-linked projects from play-only references.

## Run locally

Use Node.js 24 and pnpm 11.25.0:

```sh
pnpm run install:ci
pnpm run dev
```

Open the local address printed by the server. The installer uses the pinned lockfile; clean checkouts use the portable profile. Local bindings contain no production project identifier. Do not connect a development checkout to production storage.

```sh
pnpm run build
node --test tests/portable-install.test.mjs tests/source-export.test.mjs tests/source-only-media.test.mjs
node --import ./tests/register.mjs --test --test-concurrency=1 tests/public-source-privacy.test.mjs tests/interop.test.mjs tests/core.test.ts tests/feedback.test.mjs tests/traffic.test.mjs tests/usage.test.mjs tests/v75-source-sync.test.mjs tests/directory-entry.test.mjs tests/vision-discovery-redesign.test.mjs
```

The 93 baseline checks above cover installation, source-edition boundaries, directory filters and pagination, catalogue handoffs, read-only MCP, core storage/feedback and event handling. The import hook supplies the in-memory test environment and TypeScript aliases. Other retained tests include historical assumptions and are not all part of this verified subset. Lint has existing errors/warnings; it is not a clean release gate.

## Use with an assistant

- `/llms.txt`: assistant entry guide.
- `/api/projects`: catalogue; compact summaries via its documented query options.
- `/mcp/read`: seven native read-only MCP tools, including broad catalogue search/detail.
- `/api/external-catalogue`: broad metadata discovery with independent access-price and original-content facets.
- `/projects/{id}/brief`: selected project's source and adaptation handoff.

The [MCP client and acceptance harness](tools/mcp-client/README.md) uses the same directory, not a separate catalogue. Inside that directory, `npm ci --ignore-scripts`, `npm test` and `npm run tools` install and exercise its read-only client. The default client contacts the hosted public site; set `GC_MCP_URL` to test your own server. It does not install into an AI account or publish to npm.

## Community source edition

This is a contribution-ready source edition derived from hosted v81, **not a byte-for-byte copy of the hosted site's historical demo collection**. It keeps the searchable external catalogue, upstream source/rights/setup information, compact MCP implementation, website foundation and generic storage/review code. Internal demo records, private-origin captures, operational receipts and demonstration binaries are excluded. Capture and curated-return registries start empty; legacy demo routes explain that scope rather than claiming a playable bundled game. The hosted website is unchanged by this export.

## Project map

- `app/`, `components/`, `lib/`: website, catalogue, APIs and MCP.
- `tests/`: runnable regression tests; see the verified subset above.
- `scripts/`, `build/`: installation/build source. `build/` contains maintained source, not disposable output.
- `public/projects/`: upstream catalogue and image-credit/source references (no raster files).
- `drizzle/`, `db/`: schema/migration source, not production data.
- `tools/mcp-client/`: standalone read-only client and checks.

## Help wanted

Reproduce upstream setup instructions, improve search relevance and concise handoffs, test keyboard/mobile accessibility, or demonstrate a focused adaptation with reproducible source and real checks. Read [CONTRIBUTING.md](CONTRIBUTING.md) before starting.

Original independent platform code is MIT. Dependencies and credited external media keep their own terms; see [LICENSING.md](LICENSING.md). A source link is not a security audit, build guarantee or blanket asset-reuse licence.

## Source-only media scope

This repository intentionally includes no raster images. Homepage and directory cards use text-only previews, and social metadata does not request absent artwork. Creator credits and upstream image-source links remain for reference under their own terms; they are not a blanket image redistribution grant. There is no automatic asset download, remote-image proxy or install-time fetch. Visit a game’s original site to see its media. The catalogue, search, source handoffs and read-only MCP work without these images. The hosted website is unchanged.

## Broad catalogue dependency and local storage

The 26 selected originals remain bundled as source/rights metadata. Broad discovery reads an immutable public **metadata-only** snapshot of 6,706 listings when no active local D1 import exists. It is not 6,706 hosted or gameplay-tested games. Runtime reads may contact:

`https://free4allhub.com/catalogues/games4free/e1bff498c5f0f2341e7d06d9cfbe58ee60b203cdd75af76153c6b08397375da8.compact.json`

The reader enforces 2,025,219 bytes and SHA-256 `e1bff498c5f0f2341e7d06d9cfbe58ee60b203cdd75af76153c6b08397375da8`; original normalized metadata SHA-256 is `f21714e7bf30bc670e75384db5907f8c66e2363a8e33dc3bc259a3b88e92aa10`. Per-record catalogue attribution, upstream URL/revision/date and metadata licence are retained in API detail. The snapshot credits Open Source Game Clones contributors and the freeitchgames.win catalogue by poli0981 (SkullMute), with CC BY 4.0 retained where declared; independently compiled factual link metadata grants no game rights. Metadata licences do not license game code or artwork. Keep these notices if redistributing metadata. Price reports, content requirements, warnings and known limitations must remain distinct from verified playability or remix rights. The service defaults to 1,044 upstream free/open-content reports; `content=all` exposes all records, and `content=all&access=free-reported` exposes 4,197 upstream free-access reports. Snapshot failure is explicit; selected originals remain available.

A clone contains **no production D1 binding, active import or privileged identity**. Local development uses the portable local database and included migrations; tests use an isolated in-memory SQLite adapter. Migration `0011` adds bounded staging/import tables. An authorized deployment must provision its own binding, apply migrations and configure its own existing moderator identities before private imports work. `scripts/prepare-external-import.mjs` only converts a reviewed local JSONL file into staged request files; it does not upload or activate them. Never spoof identity headers or connect this checkout to the original site's storage.

Optional snapshot integration tests require explicit public metadata download (not game assets):

```sh
node scripts/fetch-external-test-fixture.mjs
node --import ./tests/register.mjs --test --test-concurrency=1 tests/external-catalogue.test.mjs tests/external-compact-codec.test.mjs tests/external-compact-parity.test.mjs tests/external-import-auth.test.mjs tests/external-import-recovery.test.mjs tests/external-snapshot.test.mjs tests/featured-games.test.mjs tests/server-css-dedupe.test.mjs tests/external-catalogue-additions.test.mjs tests/external-play-only.test.mjs
```

The fixture goes to ignored `.cache/`; alternatively set `GC_SNAPSHOT_FIXTURE` to the exact pinned compact file outside the checkout. No dataset, private import state, operational receipts or hosted-game binaries are included in this repository. Featured rating cards cite dated public store aggregates, not independent gameplay testing; the source edition uses text previews only.

The documented baseline plus optional integration suites currently total **127 passing checks**. The entire retained legacy suite is not a clean gate: old hosted-demo, image-byte and historical-handoff assumptions remain in tests outside this subset. Do not interpret those historical fixtures as bundled content.
