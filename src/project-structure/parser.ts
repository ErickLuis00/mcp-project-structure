import * as ts from 'typescript'
import * as fs from 'fs'

export interface FunctionSignature {
    name: string
    parameters: Array<{
        name: string
        type: string
    }>
    returnType: string
    fullSignature: string
    filePath: string
    isExported: boolean
    parentName?: string
    isTrpcProcedure?: boolean
    procedureType?: 'query' | 'mutation'
    hasInput?: boolean
    inputSchemaName?: string
    inputSchemaText?: string
}

/**
 * Parse a TypeScript/JavaScript file and extract function signatures and tRPC procedures
 */
export function parseFile(filePath: string): FunctionSignature[] {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.Latest,
        true
    )
    const signatures: FunctionSignature[] = []
    let currentRouterName: string | undefined = undefined;

    function visit(node: ts.Node) {
        // Reset router name if we leave a variable statement potentially defining one
        if (currentRouterName && ts.isVariableStatement(node)) {
            const declaration = node.declarationList.declarations[0];
            if (declaration?.name.getText() === currentRouterName) {
                // Check if we are actually leaving the scope, simplistic check
                // A more robust check would involve scope analysis
            }
            // Simple reset, might need refinement
            // currentRouterName = undefined;
        }


        // Detect Router Definition (e.g., export const deliveryRouter = createTRPCRouter({ ... }))
        if (ts.isVariableStatement(node) && node.declarationList.declarations.length > 0) {
            const declaration = node.declarationList.declarations[0];
            if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
                const callExpr = declaration.initializer;
                const expressionText = callExpr.expression.getText(sourceFile);
                if (expressionText === 'createTRPCRouter' && ts.isIdentifier(declaration.name)) {
                    currentRouterName = declaration.name.text; // Store the router name
                    // console.log(`Entering Router: ${currentRouterName}`); // Debug log
                }
            }
        }


        // Standard Function/Method Detection
        if (
            ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node)
        ) {
            // Avoid double-counting procedures parsed within the router
            if (!isInsideTrpcProcedureChain(node)) {
                const signature = extractFunctionSignature(node, filePath, sourceFile, currentRouterName)
                if (signature) {
                    signatures.push(signature)
                }
            }
        }

        // tRPC Router Procedure Detection
        if (currentRouterName && ts.isObjectLiteralExpression(node) && node.parent && ts.isCallExpression(node.parent) && node.parent.expression.getText(sourceFile) === 'createTRPCRouter') {
            // console.log(`Found Object Literal for Router: ${currentRouterName}`); // Debug log
            node.properties.forEach(prop => {
                if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                    // Remove logs array and pass sourceFile
                    const procedureResult = extractTrpcProcedureSignature(prop, filePath, currentRouterName!, sourceFile);
                    if (procedureResult) {
                        signatures.push(procedureResult);
                    }
                }
            });
            // Reset router name after processing its definition
            // console.log(`Exiting Router: ${currentRouterName}`); // Debug log
            currentRouterName = undefined;
        }


        ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return signatures; // Return only signatures
}


// Helper to check if a function/arrow func is part of the tRPC chain directly
function isInsideTrpcProcedureChain(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent) {
        if (ts.isCallExpression(parent)) {
            const exprText = parent.expression.getText();
            // Check for common tRPC method names
            if (exprText.endsWith('.query') || exprText.endsWith('.mutation') || exprText.endsWith('.input') || exprText.endsWith('.use') || exprText.includes('Procedure')) {
                return true;
            }
            // Check if it's the main router creation call
            if (exprText === 'createTRPCRouter') {
                return true; // Part of the router definition structure
            }
        }
        // Check if it's the direct initializer of a property assignment in the router object
        if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
            let objLitParent = parent.parent;
            if (objLitParent && ts.isObjectLiteralExpression(objLitParent) && objLitParent.parent && ts.isCallExpression(objLitParent.parent)) {
                if (objLitParent.parent.expression.getText() === 'createTRPCRouter') {
                    return true;
                }
            }
        }


        parent = parent.parent;
    }
    return false;
}


/**
 * Extract signature for a tRPC procedure
 */
function extractTrpcProcedureSignature(
    node: ts.PropertyAssignment,
    filePath: string,
    routerName: string,
    sourceFile: ts.SourceFile
): FunctionSignature | null {
    if (!ts.isIdentifier(node.name)) return null;

    const procedureName = node.name.text;
    // logs.push(`[Parser Debug] Processing procedure: ${routerName}.${procedureName}`); // Removed log

    let currentExpr: ts.Expression = node.initializer;
    let finalProcedureType: 'query' | 'mutation' | undefined = undefined;
    let hasInput = false;
    let inputSchemaName: string | undefined = undefined;
    let inputSchemaText: string | undefined = undefined;
    const chainParts: string[] = []; // To reconstruct the chain for debugging if needed

    // Traverse the entire call chain upwards
    while (currentExpr) {
        chainParts.push(currentExpr.getText().substring(0, 50)); // Log part of the chain

        if (ts.isCallExpression(currentExpr)) {
            const expression = currentExpr.expression;
            if (ts.isPropertyAccessExpression(expression)) {
                const methodName = expression.name.text;

                // Record the *last* query/mutation encountered
                if (methodName === 'query') {
                    finalProcedureType = 'query';
                } else if (methodName === 'mutation') {
                    finalProcedureType = 'mutation';
                }

                // Check for input call specifically
                if (methodName === 'input') {
                    hasInput = true;
                    // logs.push(`[Parser Debug]   Found .input() for ${procedureName}`); // Removed log
                    if (currentExpr.arguments.length > 0 && ts.isIdentifier(currentExpr.arguments[0])) {
                        inputSchemaName = currentExpr.arguments[0].text;
                        // logs.push(`[Parser Debug]     Input schema identifier: ${inputSchemaName}`); // Removed log
                    } else if (currentExpr.arguments.length > 0) {
                        inputSchemaText = currentExpr.arguments[0].getText(sourceFile).replace(/\s+/g, ' ');
                        // logs.push(`[Parser Debug]     Input argument is not simple Identifier: kind=${kindString}, text=${inputSchemaText.substring(0, 50)}...`); // Removed log
                    }
                }
                // Move up the chain
                currentExpr = expression.expression;
                continue; // Continue to next level up
            }
        }
        // If not a CallExpression with PropertyAccess, we've likely reached the base (e.g., publicProcedure)
        break;
    }

    // Use the final procedure type found
    if (!finalProcedureType) {
        // logs.push(`[Parser Warning] Could not determine procedure type for ${routerName}.${procedureName}. Chain: ${chainParts.reverse().join(' <- ')}. Skipping.`); // Removed log
        return null;
    }

    // Build the signature string
    let inputPart = '';
    if (hasInput) {
        if (inputSchemaName) {
            inputPart = ` (input: ${inputSchemaName})`;
        } else if (inputSchemaText) {
            inputPart = ` (input: ${inputSchemaText})`; // Use full text if available
        } else {
            inputPart = ' (input)'; // Fallback
        }
    }
    const fullSignature = `${routerName}.${procedureName}: ${finalProcedureType}${inputPart}`;
    // logs.push(`[Parser Debug]   Generated Signature: ${fullSignature}`); // Removed log

    return {
        name: procedureName,
        parameters: [],
        returnType: 'unknown',
        fullSignature: fullSignature,
        filePath: filePath,
        isExported: false,
        parentName: routerName,
        isTrpcProcedure: true,
        procedureType: finalProcedureType,
        hasInput: hasInput,
        inputSchemaName: inputSchemaName,
        inputSchemaText: inputSchemaText,
    };
}


/**
 * Check if a node has export modifiers
 */
function isNodeExported(node: ts.Node): boolean {
    // Check for explicit export keyword on declarations that support it
    if (('modifiers' in node) && ts.canHaveModifiers(node)) {
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            return true;
        }
        // Check for default export on declarations that support it
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
            return true;
        }
    }

    // Check if it's part of an export declaration (e.g., export { myFunction };)
    if (node.parent && ts.isExportSpecifier(node.parent)) {
        return true;
    }
    // Check if it's a variable declaration in an exported variable statement
    if (ts.isVariableDeclaration(node) && node.parent && ts.isVariableDeclarationList(node.parent) && node.parent.parent && ts.isVariableStatement(node.parent.parent)) {
        return isNodeExported(node.parent.parent);
    }
    // Check if it's a function declaration directly exported
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) return true;
        // Check for default export
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) return true;


    }


    // Check if parent is SourceFile (top-level declarations without 'export' are not exported by default in modules)
    // This logic might need refinement depending on module system context, but generally explicit 'export' is needed.
    // return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
    // Simplified check focusing on explicit exports or top-level var statement exports
    let ancestor: ts.Node | undefined = node;
    while (ancestor && !ts.isSourceFile(ancestor)) {
        if (ts.isVariableStatement(ancestor) || ts.isFunctionDeclaration(ancestor) || ts.isClassDeclaration(ancestor)) {
            if (ancestor.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword || m.kind === ts.SyntaxKind.DefaultKeyword)) {
                return true;
            }
        }
        // Stop if we hit a block that isn't exportable itself
        if (ts.isBlock(ancestor) || ts.isModuleBlock(ancestor)) break;


        ancestor = ancestor.parent;
    }
    return false;
}


/**
 * Find parent class or object name for a method
 */
function findParentName(node: ts.Node): string | undefined {
    let parent = node.parent;
    while (parent) {
        // For methods in classes
        if (ts.isClassDeclaration(parent) && parent.name) {
            return parent.name.text;
        }
        // For methods in object literals assigned to a variable/const
        if (ts.isPropertyAssignment(parent) && ts.isObjectLiteralExpression(parent.parent)) {
            let objLit = parent.parent;
            if (objLit.parent && ts.isVariableDeclaration(objLit.parent) && ts.isIdentifier(objLit.parent.name)) {
                return objLit.parent.name.text;
            }
        }
        // For functions assigned directly to object properties
        if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name) && parent.initializer === node) {
            // Try to find the object name further up
            let objParent = parent.parent?.parent; // Up from ObjectLiteralExpression
            if (objParent && ts.isVariableDeclaration(objParent) && ts.isIdentifier(objParent.name)) {
                return objParent.name.text;
            }
        }


        parent = parent.parent;
    }


    return undefined;
}


/**
 * Extract function signature from a TypeScript AST node
 */
function extractFunctionSignature(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration,
    filePath: string,
    sourceFile: ts.SourceFile,
    currentRouterName?: string
): FunctionSignature | null {
    let functionName = ''
    let isExported = false
    let parentName: string | undefined = currentRouterName; // Default to router name if inside one


    // Handle different node types to extract name
    if (ts.isFunctionDeclaration(node) && node.name) {
        functionName = node.name.text
        isExported = isNodeExported(node)
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
        functionName = node.name.text
        // Prefer specific class/object parent over router name if found
        parentName = findParentName(node) || parentName;
    } else if (ts.isFunctionExpression(node) && node.name) {
        // Named function expression (less common)
        functionName = node.name.text;
        parentName = findParentName(node) || parentName;
    } else if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
        // For arrow functions or function expressions assigned to variables (const myFunc = () => {})
        functionName = node.parent.name.text
        isExported = isNodeExported(node.parent) // Check export on the VariableDeclaration
        parentName = findParentName(node) || parentName;
    } else if (ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name) && node.parent.initializer === node) {
        // For functions assigned directly as object properties ( myObj = { myFunc: () => {} } )
        functionName = node.parent.name.text;
        // Export status determined by the parent object/variable
        parentName = findParentName(node) || parentName; // Find the object's name
        // Determine export status based on the containing variable/object
        let assignmentParent = node.parent.parent?.parent; // VariableDeclaration?
        if (assignmentParent && ts.isVariableDeclaration(assignmentParent)) {
            isExported = isNodeExported(assignmentParent);
        }


    } else {
        // Try to infer name for anonymous functions if they are assigned or declared in specific ways
        parentName = findParentName(node) || parentName;
        // If no name, might be an anonymous callback, IIFE, etc. - skip it
        return null
    }


    // Extract parameters
    const parameters = node.parameters.map(param => {
        const paramName = param.name.getText(sourceFile) || '_'; // Use sourceFile for accuracy
        const paramType = param.type ? param.type.getText(sourceFile) : 'any'
        return {
            name: paramName,
            type: paramType.replace(/\n\s*/g, ' ') // Clean up multi-line types
        }
    })

    // Extract return type
    let returnType = 'void' // Default
    if (node.type) {
        returnType = node.type.getText(sourceFile)
    } else if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        // Infer return type for concise arrow functions (e.g., () => value)
        // This is complex, TS inference is better. Defaulting to 'unknown' or 'any' might be safer.
        // Let's keep 'void' as default if no explicit type.
        returnType = 'inferred' // Placeholder
    } else {
        // Try to infer return type for React components
        if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
            const hasJsxReturn = inferReactComponentReturnType(node, sourceFile);
            if (hasJsxReturn) {
                returnType = 'React.JSX.Element'
            }
        }
    }


    // Build the full signature
    const paramString = parameters
        .map(p => `${p.name}: ${p.type}`)
        .join(', ')


    const fullName = parentName ? `${parentName}.${functionName}` : functionName
    const fullSignature = `${fullName}(${paramString}): ${returnType}`


    return {
        name: functionName,
        parameters,
        returnType,
        fullSignature,
        filePath,
        isExported,
        parentName,
        isTrpcProcedure: false // Mark as not a tRPC procedure
    }
}

/**
 * Check if a function is likely a React component by examining its return value or name convention
 */
function inferReactComponentReturnType(node: ts.FunctionLikeDeclaration, _sourceFile: ts.SourceFile): boolean {
    let hasJsxReturn = false;

    // 1. Check Function Name Convention (PascalCase)
    let funcName = '';
    if (ts.isFunctionDeclaration(node) && node.name) {
        funcName = node.name.text;
    } else if (node.parent && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
        funcName = node.parent.name.text;
    }
    if (funcName && funcName[0] === funcName[0].toUpperCase() && funcName[0] !== funcName[0].toLowerCase()) {
        // console.log(`Inferred React component by name: ${funcName}`);
        return true; // Strong indicator
    }


    // 2. Check for JSX return statement inside the function body
    if (node.body && ts.isBlock(node.body)) {
        ts.forEachChild(node.body, function checkReturn(child) {
            if (ts.isReturnStatement(child) && child.expression) {
                if (ts.isJsxElement(child.expression) || ts.isJsxSelfClosingElement(child.expression) || ts.isJsxFragment(child.expression)) {
                    hasJsxReturn = true;
                    // console.log(`Found JSX return in ${funcName || 'anonymous function'}`);
                }
                // Also check for parenthesized JSX
                else if (ts.isParenthesizedExpression(child.expression) &&
                    (ts.isJsxElement(child.expression.expression) ||
                        ts.isJsxSelfClosingElement(child.expression.expression) ||
                        ts.isJsxFragment(child.expression.expression))) {
                    hasJsxReturn = true;
                    // console.log(`Found Parenthesized JSX return in ${funcName || 'anonymous function'}`);
                }
            }
            // Don't recurse into nested functions/blocks deeply for performance?
            // if (!hasJsxReturn) ts.forEachChild(child, checkReturn);
        });
    }
    // 3. Check for concise arrow function returning JSX
    else if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        const body = node.body;
        if (ts.isJsxElement(body) || ts.isJsxSelfClosingElement(body) || ts.isJsxFragment(body)) {
            hasJsxReturn = true;
            // console.log(`Found concise JSX return in ${funcName || 'anonymous function'}`);
        }
        // Also check for parenthesized JSX
        else if (ts.isParenthesizedExpression(body) &&
            (ts.isJsxElement(body.expression) ||
                ts.isJsxSelfClosingElement(body.expression) ||
                ts.isJsxFragment(body.expression))) {
            hasJsxReturn = true;
            // console.log(`Found concise Parenthesized JSX return in ${funcName || 'anonymous function'}`);
        }
    }


    return hasJsxReturn;
} 