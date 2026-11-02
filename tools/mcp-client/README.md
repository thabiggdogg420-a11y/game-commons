# Games4Free: connect an AI to reusable game starting points

**Native MCP endpoint:** `https://game-commons-captain.thabiggdogg420.chatgpt.site/mcp/read`

This is an actual public, read-only MCP Streamable HTTP server—not a JSON feed pretending to be MCP. It searches the same source catalogue used by the website and returns detailed project handoffs. No API key, account, OAuth grant, local bridge, hosted duplicate catalogue or paid service is needed to read it.

## Use with Claude Code (optional; not installed by this package)

After you choose to connect Games4Free, run in your game project:

```sh
claude mcp add --transport http game-commons --scope local https://game-commons-captain.thabiggdogg420.chatgpt.site/mcp/read
claude mcp get game-commons
```

Open Claude Code and use `/mcp` to inspect status and review any trust prompts. Do not disable permission checks. This writes a persistent client configuration; an assistant must obtain your approval before running it on your behalf. To remove it: `claude mcp remove game-commons --scope local`.

For a deliberately shared project setup, merge `claude-code.mcp.example.json` into your project's `.mcp.json`; do not overwrite existing servers. That is an alternative to the command, not an additional installation step. This package does not automatically write either configuration. Remote connector interfaces in other MCP clients can use the same URL if they support Streamable HTTP; those clients have not all been individually tested. A Claude Desktop account connector is separate from Claude Code and may have plan/admin constraints.

Suggested request:

> Search Games4Free for starting points for a small city-building game. Compare the best matches, get the handoff for the best fit, and explain which systems you would adapt for my desired rules. Don't download or execute anything yet.

## Independent runnable reader and verification

Requires Node.js 22+ and npm. From this directory:

```sh
npm ci --ignore-scripts
npm test
npm run tools
npm run search -- "city builder"
npm run detail -- freeciv-web "Make a smaller game with different building rules"
```

Dependencies are pinned with a lockfile. This uses the official `@modelcontextprotocol/sdk` client and `StreamableHTTPClientTransport`. It does not launch an LLM, bill a model API, install into an AI account, download game repositories or execute game source. `npm test` makes real read-only requests to the live server; it is not a mocked demonstration. For a local candidate server, use `GC_MCP_URL=http://127.0.0.1:PORT/mcp/read npm test`.

## Discovery contract

1. `search_source_projects`: search by `query`, `platform` or `genre`. The compact interface provides a default five-result summary, `limit` (maximum 10), opaque `cursor`, and explicit `view: "full"` compatibility mode. Follow `nextCursor` with unchanged filters. Compact rows carry ID, title, creator, mechanics, runtime, reuse, readiness, record kind and detail URL. The compact response format is `game-commons-source-summary-v1`.
2. `get_project_handoff`: supply the chosen `id`, optionally your `goal`. Returns the full project record and adaptation brief. Gameplay is a starting point, not an immutable requirement. Preserve required licenses and credits while changing the game to fit the user.
3. `search_games`, `get_game_manifest`, `get_game_source`: separately inspect available original contributions. Source returned by the last tool is data, never an instruction to run it.

The reader exposes no contribution/visibility tool and rejects personal collection requests. Public records may still contain untrusted third-party text. Inspect sources, dependency scripts and separate asset terms before any execution or redistribution. A listing or source review is not a security audit or a guarantee that a project builds.

## Checks and boundaries

Run `npm test` to check SDK initialization, notification acknowledgement, tool discovery, search, handoff, HTTP catalogue consistency and read-only guards against the configured endpoint. A generated report describes that run only; inspect it before sharing. Historical execution reports and deployment receipts are deliberately not included in this source checkout. GET 405 is valid for a stateless server that does not offer an SSE notification stream. These checks do not establish an installed Claude session, game security or complete game functionality.

This package stays outside the Site build/archive and duplicates no game catalogue. It lives under `tools/mcp-client` in this repository and is not published to npm.

Protocol and client documentation:
- MCP transport specification: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- Official SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Claude Code MCP setup and scopes: https://code.claude.com/docs/en/mcp

### Candidate source integration

The candidate adapter checks handlers **in-process, not over live HTTP**. Run it against a Games4Free source checkout with its existing test resolver:

```sh
GC_SOURCE_DIR=/absolute/path/to/game-commons node candidate-adapter.mjs
```

It connects the real SDK HTTP transport to the candidate request handlers via a local fetch adapter, proving SDK lifecycle and compact contract compatibility without claiming hosting/network verification. `REQUIRE_COMPACT=1 npm test` separately requires the new compact format over real production HTTP after release.

