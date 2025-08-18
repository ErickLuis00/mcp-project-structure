# MCP Project Structure Server

[![npm version](https://img.shields.io/npm/v/mcp-project-structure.svg)](https://www.npmjs.com/package/mcp-project-structure)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A powerful **Model Context Protocol (MCP)** server that provides intelligent project structure analysis and code understanding capabilities. This server extracts function signatures, tRPC procedures, and project architecture from JavaScript/TypeScript codebases, making it easier for AI assistants to understand and work with your projects.

## 🚀 Features

- **🔍 Intelligent Code Analysis**: Automatically scans and parses JavaScript/TypeScript files
- **📊 Function Signature Extraction**: Extracts detailed function signatures with parameters and return types
- **🔄 tRPC Procedure Detection**: Specialized support for tRPC router procedures
- **📁 Project Structure Mapping**: Organizes code by file structure for better context
- **🎯 Export-Aware Filtering**: Option to focus on exported functions only
- **⚡ Fast Performance**: Efficient AST parsing and file scanning
- **🔧 MCP Integration**: Seamlessly integrates with any MCP-compatible client

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **TypeScript** 5.0.0 or higher (peer dependency)
- **MCP-compatible client** (like Cursor, Claude Desktop, etc.)

## 🛠️ Installation


```bash
pnpm install -g mcp-project-structure
```

### Option 2: Install from source

```bash
git clone https://github.com/yourusername/mcp-project-structure.git
cd mcp-project-structure
pnpm install
pnpm run build
```




###  MCP Client Configuration

Add this to your MCP client configuration (e.g., `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mcp-project-structure": {
      "command": "npx",
      "args": ["-y", "mcp-project-structure", "--workspace", "."],
      "env": {}
    }
  }
}
```

### For Cursor IDE Users

Create or update `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mcp-project-structure": {
      "command": "npx",
      "args": ["-y", "mcp-project-structure", "--workspace", "."],
      "env": {}
    }
  }
}
```

### For Development/Testing

When developing or testing the MCP server locally, you can use this configuration:

```json
{
  "mcpServers": {
    "mcp-project-structure-dev": {
      "command": "node",
      "args": [
        "<FULL_PATH_TO_YOUR_PROJECT>/dist/index.js",
        "--workspace",
        "."
      ],
      "env": {}
    }
  }
}
```

**Note**: Replace `<FULL_PATH_TO_YOUR_PROJECT>` with the actual absolute path to your project's `dist/index.js` file. For example:
- Windows: `"C:\\CodeProjects_Insync\\_MadeInCursor\\mcp-vectordb-search-docs\\dist\\index.js"`
- macOS/Linux: `"/Users/username/projects/mcp-project-structure/dist/index.js"`

This allows you to test changes to the MCP server without publishing to npm first.

## 📖 Usage Examples

### Example 1: Basic Project Analysis

```typescript
// The server will automatically scan your project and provide:
// - Function signatures from all TypeScript/JavaScript files
// - tRPC procedure definitions
// - Project structure organized by file paths
// - Export status for each function
```

### Example 2: tRPC Router Analysis

```typescript
// Input: tRPC router file
export const userRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.user.findUnique({ where: { id: input.id } });
    }),
  
  createUser: publicProcedure
    .input(z.object({ name: z.string(), email: z.string() }))
    .mutation(async ({ input }) => {
      return await db.user.create({ data: input });
    })
});

// Output: The server will detect and document:
// - Router: userRouter
//   - getUser(input: { id: string }) => Promise<User>
//   - createUser(input: { name: string, email: string }) => Promise<User>
```

### Example 3: React Component Analysis

```typescript
// Input: React component file
export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const { data: user } = useUser(userId);
  
  return (
    <div className="user-profile">
      <h1>{user?.name}</h1>
      <button onClick={() => onUpdate(user)}>Update</button>
    </div>
  );
}

// Output: The server will detect:
// - UserProfile(props: UserProfileProps) => JSX.Element
```


## 📊 Output Format

The server generates structured markdown output:

```markdown
# Function Signatures and tRPC Procedures

Summary:
- Scanned 15 code files
- Found 23 function signatures and 8 tRPC procedures in 12 files

## src/routers/user.ts

### Router: userRouter
- getUser(input: { id: string }) => Promise<User>
- createUser(input: { name: string, email: string }) => Promise<User>

### Other Functions
- validateUserInput(data: unknown) => UserInput
```

## 🏗️ Architecture

```
src/
├── index.ts              # Main MCP server entry point
├── tools.ts              # Tool registration and initialization
└── project-structure/    # Core analysis functionality
    ├── init.ts           # MCP tool registration and markdown generation
    ├── parser.ts         # TypeScript AST parsing and signature extraction
    ├── file-scanner.ts   # File discovery and filtering
    └── test-sample.ts    # Example functions for testing
```

## 🔍 How It Works

1. **File Discovery**: Scans the workspace for `.ts`, `.tsx`, `.js`, `.jsx` files
2. **AST Parsing**: Uses TypeScript compiler API to parse each file
3. **Signature Extraction**: Extracts function signatures, parameters, and return types
4. **tRPC Detection**: Identifies tRPC procedures and their router context
5. **Structure Generation**: Organizes findings into a hierarchical markdown document
6. **MCP Integration**: Exposes the analysis as an MCP tool for AI assistants

## 🧪 Testing

```bash
# Build the project
pnpm run build

# Run in development mode
pnpm run dev

# Start the server
pnpm start
```


### Development Setup

```bash
git clone https://github.com/yourusername/mcp-project-structure.git
cd mcp-project-structure
pnpm install
pnpm run dev
```


## 🙏 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
- Powered by TypeScript compiler API
- Inspired by the need for better AI code understanding
