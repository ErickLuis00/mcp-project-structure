#!/usr/bin/env node

import * as path from 'path';
import { getCodeFiles } from './file-scanner.js';
import { parseFile, FunctionSignature, TypeSignature } from './parser.js';
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
 * Group type signatures by file path
 */
function groupTypesByFile(types: TypeSignature[]): Record<string, TypeSignature[]> {
    const grouped: Record<string, TypeSignature[]> = {};

    for (const type of types) {
        if (!grouped[type.filePath]) {
            grouped[type.filePath] = [];
        }

        grouped[type.filePath].push(type);
    }

    return grouped;
}

/**
 * Generate the markdown content from function signatures and type signatures
 */
function generateMarkdown(
    signatures: FunctionSignature[], 
    types: TypeSignature[], 
    exportedOnly: boolean, 
    inputDir: string
): string {
    const header = '# Function Signatures, tRPC Procedures, and Types';
    
    if (signatures.length === 0 && types.length === 0) {
        return `${header}\n\nNo functions, procedures, or types found.`;
    }

    // Filter signatures if exportedOnly is true (less relevant for procedures)
    const filteredSignatures = exportedOnly
        ? signatures.filter(sig => sig.isExported || sig.isTrpcProcedure) // Keep procedures regardless of export
        : signatures;

    const filteredTypes = exportedOnly
        ? types.filter(t => t.isExported)
        : types;

    // Group by file
    const groupedFunctionsByFile = groupSignaturesByFile(filteredSignatures);
    const groupedTypesByFile = groupTypesByFile(filteredTypes);

    // Collect all unique file paths
    const allFilePaths = new Set([
        ...Object.keys(groupedFunctionsByFile),
        ...Object.keys(groupedTypesByFile)
    ]);

    // Generate markdown with file structure
    let markdown = `${header}\n\n`;

    // Sort files by path
    const sortedFiles = Array.from(allFilePaths).sort();

    for (const filePath of sortedFiles) {
        const fileSignatures = groupedFunctionsByFile[filePath] || [];
        const fileTypes = groupedTypesByFile[filePath] || [];
        const relativePath = path.relative(inputDir, filePath);

        markdown += `## ${relativePath}\n\n`;

        // Add types first (interfaces, type aliases, enums, classes, namespaces, modules)
        if (fileTypes.length > 0) {
            const interfaces = fileTypes.filter(t => t.kind === 'interface');
            const typeAliases = fileTypes.filter(t => t.kind === 'type');
            const enums = fileTypes.filter(t => t.kind === 'enum');
            const classes = fileTypes.filter(t => t.kind === 'class');
            const namespaces = fileTypes.filter(t => t.kind === 'namespace');
            const modules = fileTypes.filter(t => t.kind === 'module');

            if (classes.length > 0) {
                markdown += '### Classes\n';
                markdown += classes.map(t => `- ${t.fullSignature}`).join('\n') + '\n\n';
            }

            if (interfaces.length > 0) {
                markdown += '### Interfaces\n';
                markdown += interfaces.map(t => `- ${t.fullSignature}`).join('\n') + '\n\n';
            }

            if (typeAliases.length > 0) {
                markdown += '### Types\n';
                markdown += typeAliases.map(t => `- ${t.fullSignature}`).join('\n') + '\n\n';
            }

            if (enums.length > 0) {
                markdown += '### Enums\n';
                markdown += enums.map(t => `- ${t.fullSignature}`).join('\n') + '\n\n';
            }

            if (namespaces.length > 0) {
                markdown += '### Namespaces\n';
                markdown += namespaces.map(t => `- ${t.fullSignature}`).join('\n') + '\n\n';
            }

            if (modules.length > 0) {
                markdown += '### Declare Modules\n';
                markdown += modules.map(t => `- ${t.fullSignature}`).join('\n') + '\n\n';
            }
        }

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
            if (Object.keys(groupedProcedures).length > 0 || fileTypes.length > 0) {
                markdown += '### Functions\n';
            }
            markdown += regularFunctions.map(sig => sig.fullSignature).join('\n') + '\n\n';
        }
    }

    return markdown.trim() + '\n'; // Trim trailing whitespace and ensure single newline at end
}

// Register the structure.md generator tool
server.tool(
    "get-project-structure",
    "Extracts function signatures and type definitions (interfaces, types, enums, classes, namespaces, declare modules) from JavaScript/TypeScript for better understanding of the project. You should always use this tool before starting any coding session after user asks for something",
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
            const allTypes: TypeSignature[] = [];

            for (const file of files) {
                try {
                    // Get signatures and types
                    const { functions, types } = parseFile(file);
                    if (functions.length > 0) {
                        allSignatures.push(...functions);
                    }
                    if (types.length > 0) {
                        allTypes.push(...types);
                    }
                } catch (error) {
                    // Log parsing errors to the main server console
                    console.error(`Error parsing file ${file}:`, error);
                }
            }

            // Generate markdown content
            const markdownContent = generateMarkdown(allSignatures, allTypes, exportedOnly, inputDir);

            // Prepare summary information
            const filesWithFunctions = Object.keys(groupSignaturesByFile(allSignatures)).length;
            const filesWithTypes = Object.keys(groupTypesByFile(allTypes)).length;
            const procedureCount = allSignatures.filter(sig => sig.isTrpcProcedure).length;
            const functionCount = allSignatures.length - procedureCount;
            
            // Type counts
            const interfaceCount = allTypes.filter(t => t.kind === 'interface').length;
            const typeAliasCount = allTypes.filter(t => t.kind === 'type').length;
            const enumCount = allTypes.filter(t => t.kind === 'enum').length;
            const classCount = allTypes.filter(t => t.kind === 'class').length;
            const namespaceCount = allTypes.filter(t => t.kind === 'namespace').length;
            const moduleCount = allTypes.filter(t => t.kind === 'module').length;

            // Create summary text
            const blacklistInfo = blacklist.length > 0 
                ? `- Scan Patterns Blacklisted: ${blacklist.join(', ')}` 
                : '';
            
            // Build type summary parts
            const typeParts: string[] = [];
            if (interfaceCount > 0) typeParts.push(`${interfaceCount} interfaces`);
            if (typeAliasCount > 0) typeParts.push(`${typeAliasCount} types`);
            if (enumCount > 0) typeParts.push(`${enumCount} enums`);
            if (classCount > 0) typeParts.push(`${classCount} classes`);
            if (namespaceCount > 0) typeParts.push(`${namespaceCount} namespaces`);
            if (moduleCount > 0) typeParts.push(`${moduleCount} declare modules`);
            
            const typesSummary = allTypes.length > 0 
                ? `- Found ${allTypes.length} type definitions (${typeParts.join(', ')}) in ${filesWithTypes} files`
                : '';
            
            const summaryText = `
Generated structure document:

Summary:
- Scanned ${files.length} code files
- Found ${functionCount} function signatures and ${procedureCount} tRPC procedures in ${filesWithFunctions} files
${typesSummary}
${exportedOnly ? `- Displaying only exported functions, procedures, and types` : ''}
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




