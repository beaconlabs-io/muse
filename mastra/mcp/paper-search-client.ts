import { MCPClient } from "@mastra/mcp";

/**
 * MCPClient for paper-search-mcp (https://github.com/openags/paper-search-mcp)
 *
 * Connects via stdio transport to the Python MCP server using `uv run`.
 * Provides tools: search_pubmed, search_arxiv, search_google_scholar, search_biorxiv, search_medrxiv
 *
 * Prerequisites (development only):
 * - Python 3.10+ installed
 * - uv installed: curl -LsSf https://astral.sh/uv/install.sh | sh
 *
 * @see https://mastra.ai/docs/mcp/overview
 */
export const paperSearchClient = new MCPClient({
  id: "paper-search-mcp",
  servers: {
    paperSearch: {
      command: "uv",
      args: ["run", "--with", "paper-search-mcp", "-m", "paper_search_mcp.server"],
      env: {},
    },
  },
  timeout: 30000,
});
