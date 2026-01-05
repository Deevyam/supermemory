#!/usr/bin/env node
/**
 * Postbuild script to add shebang to the built CLI entry point.
 * Uses ES modules to be compatible with "type": "module" in package.json.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const distFile = join(__dirname, "..", "dist", "index.js")

try {
    const content = readFileSync(distFile, "utf-8")
    const shebang = "#!/usr/bin/env node\n"

    // Only add shebang if not already present
    if (!content.startsWith("#!")) {
        writeFileSync(distFile, shebang + content)
        console.log("✅ Added shebang to dist/index.js")
    } else {
        console.log("ℹ️ Shebang already present in dist/index.js")
    }
} catch (error) {
    console.error("❌ Failed to add shebang:", error.message)
    process.exit(1)
}
