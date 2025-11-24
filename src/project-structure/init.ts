#!/usr/bin/env node

import * as path from 'path';
import { getCodeFiles } from './file-scanner.js';
import { parseFile, FunctionSignature } from './parser.js';
import { server } from "../index.js";
import * as fs from 'fs';

/**
 * Group signatures by file path
 */
function groupSignaturesByFile(signatures: FunctionSignature[]): Record<string, FunctionSignature[]> {
    const grouped: Record<string, FunctionSignature[]> = {};

    for (const signature of signatures) {
        if (!grouped[signature.filePath]) {
            grouped[signature.filePath] = [];
        }

        grouped[signature.filePath].push(signature);
    }

    return grouped;
}

/**
 * Generate the markdown content from function signatures
 */
function generateMarkdown(signatures: FunctionSignature[], exportedOnly: boolean, inputDir: string): string {
    const header = '# Function Signatures and tRPC Procedures';
    if (signatures.length === 0) {
        return `${header}\n\nNo functions or procedures found.`;
    }

    // Filter signatures if exportedOnly is true (less relevant for procedures)
    const filteredSignatures = exportedOnly
        ? signatures.filter(sig => sig.isExported || sig.isTrpcProcedure) // Keep procedures regardless of export
        : signatures;

    if (filteredSignatures.length === 0) {
        return `${header}\n\nNo exported functions or procedures found.`;
    }

    // Group by file
    const groupedByFile = groupSignaturesByFile(filteredSignatures);

    // Generate markdown with file structure
    let markdown = `${header}\n\n`;

    // Sort files by path
    const sortedFiles = Object.keys(groupedByFile).sort();

    for (const filePath of sortedFiles) {
        const fileSignatures = groupedByFile[filePath];
        const relativePath = path.relative(inputDir, filePath);

        markdown += `## ${relativePath}\n\n`;

        // Separate procedures and regular functions
        const trpcProcedures = fileSignatures.filter(sig => sig.isTrpcProcedure);
        const regularFunctions = fileSignatures.filter(sig => !sig.isTrpcProcedure);

        // Group procedures by router name (parentName)
        const groupedProcedures: Record<string, FunctionSignature[]> = {};
        for (const proc of trpcProcedures) {
            const routerName = proc.parentName || 'Unknown Router';
            if (!groupedProcedures[routerName]) {
                groupedProcedures[routerName] = [];
            }
            groupedProcedures[routerName].push(proc);
        }

        // Add grouped procedures to markdown
        for (const routerName in groupedProcedures) {
            markdown += `### Router: ${routerName}\n`;
            markdown += groupedProcedures[routerName]
                .map(proc => `- ${proc.fullSignature}`) // Use the enhanced fullSignature
                .join('\n');
            markdown += '\n\n';
        }

        // Add regular functions to markdown
        if (regularFunctions.length > 0) {
            if (Object.keys(groupedProcedures).length > 0) {
                markdown += '### Other Functions\n'; // Add header if procedures were listed
            }
            markdown += regularFunctions.map(sig => sig.fullSignature).join('\n') + '\n\n';
        }
    }

    return markdown.trim() + '\n'; // Trim trailing whitespace and ensure single newline at end
}

// Register the structure.md generator tool
server.tool(
    "get-project-structure",
    "Extracts function signatures from JavaScript/TypeScript for better understanding of the project. You should always use this tool before starting any coding session after user asks for something",
    {
    },
    async () => {
        let exportedOnly = false;
        // Determine inputDir from ENV or process args
        let inputDir = process.env.WORKSPACE_FOLDER_PATHS
        if (!inputDir || !path.isAbsolute(inputDir) || !fs.existsSync(inputDir)) {
            // Try to get from process args (e.g., --workspace)
            const workspaceArgIndex = process.argv.findIndex(arg => arg === '--workspace')
            if (workspaceArgIndex !== -1 && process.argv[workspaceArgIndex + 1]) {
                const candidatePath = process.argv[workspaceArgIndex + 1]
                if (path.isAbsolute(candidatePath) && fs.existsSync(candidatePath)) {
                    inputDir = candidatePath
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Error: The --workspace path provided is invalid. Please fix the path and try again."
                            }
                        ],
                    }
                }
            } else {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: WORKSPACE_FOLDER_PATHS env variable or --workspace argument is missing or invalid. Please set a valid absolute path."
                        }
                    ],
                }
            }
        }

        // Parse blacklist argument
        const blacklist: string[] = []
        const blacklistArgIndex = process.argv.findIndex(arg => arg === '--blacklist')
        if (blacklistArgIndex !== -1 && process.argv[blacklistArgIndex + 1]) {
            const blacklistValue = process.argv[blacklistArgIndex + 1]
            // Support comma-separated values
            const blacklistItems = blacklistValue.split(',').map(item => item.trim()).filter(item => item.length > 0)
            blacklist.push(...blacklistItems)
        }

        console.error(`Scanning directory: ${inputDir}`);
        if (blacklist.length > 0) {
            console.error(`Blacklist patterns: ${blacklist.join(', ')}`);
        }

        try {
            // Check if inputDir is an absolute path


            // Find all matching code files
            const files = await getCodeFiles(inputDir, blacklist);

            if (files.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No code files found."
                        }
                    ],
                };
            }

            // Parse all files and collect signatures
            const allSignatures: FunctionSignature[] = [];

            for (const file of files) {
                try {
                    // Get signatures (only)
                    const fileSignatures = parseFile(file);
                    if (fileSignatures.length > 0) {
                        allSignatures.push(...fileSignatures);
                    }
                } catch (error) {
                    // Log parsing errors to the main server console
                    console.error(`Error parsing file ${file}:`, error);
                }
            }

            // Generate markdown content
            const markdownContent = generateMarkdown(allSignatures, exportedOnly, inputDir);

            // Prepare summary information
            const totalCount = allSignatures.length;
            const filesWithFunctions = Object.keys(groupSignaturesByFile(allSignatures)).length;
            const procedureCount = allSignatures.filter(sig => sig.isTrpcProcedure).length;
            const functionCount = totalCount - procedureCount;

            // Create summary text
            const blacklistInfo = blacklist.length > 0 
                ? `- Scan Patterns Blacklisted: ${blacklist.join(', ')}` 
                : '';
            
            const summaryText = `
Generated structure document:

Summary:
- Scanned ${files.length} code files
- Found ${functionCount} function signatures and ${procedureCount} tRPC procedures in ${filesWithFunctions} files
${exportedOnly ? `- Displaying only exported functions and all procedures` : ''}
${blacklistInfo}

Full document:
----------------

${markdownContent}`;

            return {
                content: [
                    {
                        type: "text",
                        text: summaryText
                    }
                ],
            };
        } catch (error: any) {
            console.error("Error generating structure document:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error generating structure document: ${error.message}`
                    }
                ],
            };
        }
    },
);

// THE "." and the WORKSPACE_FOLDER_PATHS WORKS THE SAME.
// THE "." and the WORKSPACE_FOLDER_PATHS WORKS THE SAME.
// THE "." and the WORKSPACE_FOLDER_PATHS WORKS THE SAME.

// // Register the get current workspace tool
// server.tool(
//     "get-current-workspace",
//     "Gets the current workspace path that was passed as the --workspace parameter to the bun executable, and also returns WORKSPACE_FOLDER_PATHS from env if available",
//     {},
//     async () => {
//         try {
//             const args = process.argv
//             let workspacePath: string | null = null

//             for (let i = 0; i < args.length; i++)
//                 if (args[i] === '--workspace' && i + 1 < args.length)
//                     workspacePath = args[i + 1]

//             const workspaceFolderPaths = process.env.WORKSPACE_FOLDER_PATHS

//             let text = ''
//             if (workspacePath)
//                 text += `Workspace path from --workspace parameter: ${workspacePath}\n`
//             else
//                 text += 'No --workspace parameter found in command line arguments\n'

//             if (workspaceFolderPaths)
//                 text += `WORKSPACE_FOLDER_PATHS from env: ${workspaceFolderPaths}`
//             else
//                 text += 'No WORKSPACE_FOLDER_PATHS found in environment variables'

//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text
//                     }
//                 ],
//             }
//         } catch (error: any) {
//             console.error("Error getting workspace parameter:", error)
//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text: `Error getting workspace parameter: ${error.message}`
//                     }
//                 ],
//             }
//         }
//     },
// )




