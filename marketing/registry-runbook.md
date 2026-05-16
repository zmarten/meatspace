# MCP Registry Submission — Runbook

Two commands. Three minutes. Run them when you're ready.

## Status of prep work
- ✅ `mcp-publisher.exe` installed at `~/bin/mcp-publisher.exe` (version 1.7.8)
- ✅ `server.json` validates against the live registry schema (`io.github.zmarten/meatspace`)
- ✅ Repo is public at `github.com/zmarten/meatspace` (required for GitHub-OAuth namespace)
- ⚠️ `server.json` references `https://meatspace.run/icon.png` which currently 404s. `icons` is an optional field in the schema and validate passed, so this won't block submission — but worth fixing later for nicer display.

## The two commands you need to run

From a terminal in the repo root (`D:\my-project\projects\hitl`):

```bash
# 1. Authenticate. Opens a browser tab to GitHub's device-code flow.
~/bin/mcp-publisher.exe login github

# 2. Publish to the live registry.
~/bin/mcp-publisher.exe publish
```

(Or add `~/bin` to PATH first and just run `mcp-publisher login github` / `mcp-publisher publish`.)

## Verify

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=meatspace" | jq .
```

Should return a single result with `name: io.github.zmarten/meatspace`.

## If something goes wrong

- **`login github` fails with "device flow timeout"** — re-run; the device code expires after ~15 min.
- **`publish` rejects with namespace error** — confirms the repo `zmarten/meatspace` is no longer public. Re-check on GitHub.
- **Want to publish a new version later** — bump `version` in `server.json`, run `publish` again. No re-login needed (token cached).
