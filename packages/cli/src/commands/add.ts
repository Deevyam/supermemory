import * as fs from "node:fs"
import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import Supermemory from "supermemory"
import { getApiKey, getBaseUrl } from "../config.js"
import { AuthenticationError, CliError, EXIT_CODES } from "../utils/error-handler.js"
import { hasStdinData, readStdin } from "../utils/stdin.js"
import { resolvePath } from "../utils/platform.js"

// Maximum file size: 10MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

interface AddOptions {
    file?: boolean
    stdin?: boolean
    tags?: string
    project?: string
    metadata?: string
}

export function createAddCommand(): Command {
    const add = new Command("add")
        .description("Add a new memory to Supermemory")
        .argument("[content]", "Content to add (text or file path if --file is used)")
        .option("-f, --file", "Treat content as a file path to read")
        .option("--stdin", "Explicitly read content from stdin (recommended for piped input)")
        .option("-t, --tags <tags>", "Comma-separated container tags")
        .option("-p, --project <id>", "Project ID to add memory to")
        .option("-m, --metadata <json>", "JSON metadata object to attach")
        .action(async (content: string | undefined, options: AddOptions) => {
            const apiKey = getApiKey()
            if (!apiKey) {
                throw new AuthenticationError()
            }

            let memoryContent: string

            // Check for stdin input - use explicit flag if provided, otherwise detect
            const useStdin = options.stdin || (!options.file && !content && hasStdinData())
            if (useStdin) {
                const spinner = ora("Reading from stdin...").start()
                try {
                    memoryContent = await readStdin()
                    if (!memoryContent) {
                        spinner.fail("No data received from stdin")
                        throw new CliError(
                            "No data received from stdin. Pipe content or provide content argument.",
                            EXIT_CODES.INVALID_ARGUMENTS,
                        )
                    }
                    spinner.succeed("Read content from stdin")
                } catch (error) {
                    if (error instanceof CliError) throw error
                    spinner.fail("Failed to read from stdin")
                    throw new CliError(
                        `Failed to read from stdin: ${error instanceof Error ? error.message : "Unknown error"}`,
                        EXIT_CODES.GENERAL_ERROR,
                        error instanceof Error ? error : undefined,
                    )
                }
            } else if (options.file && content) {
                // Read from file
                const filePath = resolvePath(content)
                const spinner = ora(`Reading file: ${filePath}`).start()

                try {
                    if (!fs.existsSync(filePath)) {
                        spinner.fail("File not found")
                        throw new CliError(`File not found: ${filePath}`, EXIT_CODES.INVALID_ARGUMENTS)
                    }

                    // Issue #10: Check file size before reading
                    const stats = fs.statSync(filePath)
                    if (stats.size > MAX_FILE_SIZE_BYTES) {
                        spinner.fail("File too large")
                        const sizeMB = (stats.size / (1024 * 1024)).toFixed(1)
                        throw new CliError(
                            `File size (${sizeMB}MB) exceeds maximum allowed size of 10MB`,
                            EXIT_CODES.INVALID_ARGUMENTS,
                        )
                    }

                    memoryContent = fs.readFileSync(filePath, "utf-8")
                    spinner.succeed(`Read file: ${filePath}`)
                } catch (error) {
                    if (error instanceof CliError) throw error
                    spinner.fail("Failed to read file")
                    // Issue #4: Preserve original error context
                    const errorMessage = error instanceof Error ? error.message : "Unknown error"
                    throw new CliError(
                        `Failed to read file "${filePath}": ${errorMessage}`,
                        EXIT_CODES.GENERAL_ERROR,
                        error instanceof Error ? error : undefined,
                    )
                }
            } else if (content) {
                // Use content directly
                memoryContent = content
            } else {
                throw new CliError(
                    "No content provided. Usage: sm add <content> or sm add --file <path> or pipe content",
                    EXIT_CODES.INVALID_ARGUMENTS,
                )
            }

            if (!memoryContent.trim()) {
                throw new CliError("Content cannot be empty", EXIT_CODES.INVALID_ARGUMENTS)
            }

            // Parse metadata if provided
            let metadata: Record<string, string | number | boolean> | undefined
            if (options.metadata) {
                try {
                    const parsed = JSON.parse(options.metadata)
                    // Issue #3: Validate that metadata is a plain object
                    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                        throw new CliError(
                            "Metadata must be a JSON object (not an array or primitive)",
                            EXIT_CODES.INVALID_ARGUMENTS,
                        )
                    }
                    metadata = parsed as Record<string, string | number | boolean>
                } catch (error) {
                    if (error instanceof CliError) throw error
                    throw new CliError(
                        "Invalid metadata JSON format. Expected a JSON object like: '{\"key\": \"value\"}'",
                        EXIT_CODES.INVALID_ARGUMENTS,
                    )
                }
            }

            // Parse container tags
            const containerTags: string[] = []
            if (options.tags) {
                containerTags.push(...options.tags.split(",").map((t) => t.trim()))
            }
            if (options.project) {
                containerTags.push(`sm_project_${options.project}`)
            }

            const spinner = ora("Adding memory...").start()

            try {
                const client = new Supermemory({
                    apiKey,
                    baseURL: getBaseUrl(),
                })

                const result = await client.memories.add({
                    content: memoryContent,
                    ...(containerTags.length > 0 && { containerTags }),
                    ...(metadata && { metadata }),
                })

                spinner.succeed(chalk.green("Memory added successfully"))
                console.log(chalk.gray(`  ID: ${result.id}`))
                console.log(chalk.gray(`  Status: ${result.status}`))

                if (containerTags.length > 0) {
                    console.log(chalk.gray(`  Tags: ${containerTags.join(", ")}`))
                }
            } catch (error) {
                spinner.fail("Failed to add memory")
                throw new CliError(
                    error instanceof Error ? error.message : "Unknown error",
                    EXIT_CODES.API_ERROR,
                    error instanceof Error ? error : undefined,
                )
            }
        })

    return add
}
