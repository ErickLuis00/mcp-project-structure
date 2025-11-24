import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

/**
 * Get all TypeScript and JavaScript files from a directory and its subdirectories
 * @param dirPath - The directory path to scan
 * @param blacklist - Optional array of file/folder patterns to exclude (glob patterns)
 */
async function getCodeFiles(dirPath: string, blacklist: string[] = []): Promise<string[]> {
    // Ensure path is absolute
    const absolutePath = path.isAbsolute(dirPath)
        ? dirPath
        : path.resolve(process.cwd(), dirPath)

    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Directory not found: ${absolutePath}`)
    }

    // Base ignore patterns
    const baseIgnore = [
        '**/src/components/ui/**', // ShadCN components, can be ignored because they add too much types.
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/.turbo/**',
        '**/.cache/**',
        '**/.yarn/**',
        '**/.pnpm/**',
        '**/.eslintcache/**',
        '**/.vite/**',
        '**/.output/**',
        '**/.vercel/**',
        '**/.firebase/**',
        '**/.aws-sam/**',
        '**/.serverless/**',
        '**/.tmp/**',
        '**/.temp/**',
        '**/.env*/**',
        '**/.idea/**',
        '**/.vscode/**',
        '**/.history/**',
        '**/.git/**',
        '**/.husky/**',
        '**/.storybook/**',
        '**/.config/**',
        '**/.settings/**',
        '**/.local/**',
        '**/.DS_Store/**',
        '**/.coverage/**',
        '**/.nyc_output/**',
        '**/.svelte-kit/**',
        '**/.expo/**',
        '**/.expo-shared/**',
        '**/.firebase/**',
        '**/.cypress/**',
        '**/.playwright/**',
        '**/.test/**',
        '**/.test-results/**',
        '**/.reports/**',
        '**/.snapshots/**',
        '**/.mocks/**',
        '**/.cache-loader/**'
    ]

    // Normalize blacklist patterns to glob format
    const normalizedBlacklist = blacklist.map(pattern => {
        // If pattern doesn't start with **/, add it for folder patterns
        // If it's a file pattern, ensure it matches files at any depth
        if (pattern.includes('*') || pattern.startsWith('**/')) {
            return pattern
        }
        // If it ends with / or doesn't have an extension, treat as folder
        if (pattern.endsWith('/') || !pattern.includes('.')) {
            return `**/${pattern}**`
        }
        // Otherwise, treat as file pattern
        return `**/${pattern}`
    })

    // Merge base ignore patterns with blacklist
    const ignorePatterns = [...baseIgnore, ...normalizedBlacklist]

    // Find all .ts, .tsx, .js, and .jsx files using glob
    const codeFiles = await glob('**/*.{ts,tsx,js,jsx}', {
        cwd: absolutePath,
        ignore: ignorePatterns,
        absolute: true
    })

    return codeFiles
}

export { getCodeFiles } 