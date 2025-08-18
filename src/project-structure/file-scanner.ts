import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

/**
 * Get all TypeScript and JavaScript files from a directory and its subdirectories
 */
async function getCodeFiles(dirPath: string): Promise<string[]> {
    // Ensure path is absolute
    const absolutePath = path.isAbsolute(dirPath)
        ? dirPath
        : path.resolve(process.cwd(), dirPath)

    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Directory not found: ${absolutePath}`)
    }

    // Find all .ts, .tsx, .js, and .jsx files using glob
    const codeFiles = await glob('**/*.{ts,tsx,js,jsx}', {
        cwd: absolutePath,
        ignore: [
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
        ],
        absolute: true
    })

    return codeFiles
}

export { getCodeFiles } 