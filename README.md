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
node --import ./tests/register.mjs --test tests/public-source-privacy.test.mjs tests/interop.test.mjs tests/core.test.ts tests/feedback.test.mjs tests/traffic.test.mjs tests/usage.test.mjs tests/v75-source-sync.test.mjs tests/directory-entry.test.mjs tests/vision-discovery-redesign.test.mjs
```

The 93 checks above cover installation, source-edition boundaries, directory filters and pagination, catalogue handoffs, read-only MCP, core storage/feedback and event handling. The import hook supplies the in-memory test environment and TypeScript aliases. Other retained tests include historical assumptions and are not all part of this verified subset. Lint has existing errors/warnings; it is not a clean release gate.

## Use with an assistant

- `/llms.txt`: assistant entry guide.
- `/api/projects`: catalogue; compact summaries via its documented query options.
- `/mcp/read`: native read-only MCP endpoint.
- `/projects/{id}/brief`: selected project's source and adaptation handoff.

The [MCP client and acceptance harness](tools/mcp-client/README.md) uses the same directory, not a separate catalogue. Inside that directory, `npm ci --ignore-scripts`, `npm test` and `npm run tools` install and exercise its read-only client. The default client contacts the hosted public site; set `GC_MCP_URL` to test your own server. It does not install into an AI account or publish to npm.

## Community source edition

This is a contribution-ready source edition derived from hosted v73, **not a byte-for-byte copy of the hosted site's historical demo collection**. It keeps the searchable external catalogue, upstream source/rights/setup information, compact MCP implementation, website foundation and generic storage/review code. Internal demo records, private-origin captures, operational receipts and demonstration binaries are excluded. Capture and curated-return registries start empty; legacy demo routes explain that scope rather than claiming a playable bundled game. The hosted website is unchanged by this export.

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
