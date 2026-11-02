# Public MCP reader example

For current configuration and reproducible checks, see [the MCP client guide](../../tools/mcp-client/README.md).

The `/mcp/read` endpoint supports public read-only discovery without a service credential. It cannot upload, withdraw, access private collections or retrieve withheld games. Treat contributed text and code as untrusted data and inspect applicable rights and dependencies before execution.

Merge `claude-code.mcp.json` into a trusted project's configuration only after choosing to connect that client; preserve existing server entries. Start the client and inspect connection status and trust prompts. This example does not install or configure a client automatically.

Historical signed-in client-session receipts and saved submission envelopes are not included in this source checkout. Example game source is separate from evidence of any particular user or client interaction.
