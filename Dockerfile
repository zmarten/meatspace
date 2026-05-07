FROM ghcr.io/sparfenyuk/mcp-proxy:v0.3.2-alpine

ENTRYPOINT ["mcp-proxy", "--transport", "streamablehttp", "https://meatspace.run/api/mcp"]
