#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create server instance
export const server = new McpServer({
    name: "mcp-project-structure",
    version: "1.0.0",
});

// Start the server
async function main() {
    // Import tools after server initialization
    await import("./tools.js");

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Project Structure MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
