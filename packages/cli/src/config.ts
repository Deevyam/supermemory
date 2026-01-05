import Conf from "conf"

interface CliConfig {
    apiKey?: string
    baseUrl?: string
    defaultProject?: string
}

/**
 * CLI Configuration Module
 *
 * SECURITY NOTE: The `conf` package stores configuration in plain text on disk.
 * For sensitive environments (CI/CD, shared systems), use the environment variable
 * SUPERMEMORY_API_KEY instead of storing the key via `sm auth`.
 *
 * Storage locations:
 * - Windows: %APPDATA%\supermemory-cli\config.json
 * - macOS: ~/Library/Preferences/supermemory-cli/config.json
 * - Linux: ~/.config/supermemory-cli/config.json
 */

const config = new Conf<CliConfig>({
    projectName: "supermemory-cli",
    schema: {
        apiKey: {
            type: "string",
        },
        baseUrl: {
            type: "string",
            default: "https://api.supermemory.ai",
        },
        defaultProject: {
            type: "string",
        },
    },
})

export function getApiKey(): string | undefined {
    return process.env.SUPERMEMORY_API_KEY || config.get("apiKey")
}

/**
 * Check if API key is being loaded from environment variable (more secure)
 */
export function isUsingEnvKey(): boolean {
    return !!process.env.SUPERMEMORY_API_KEY
}

/**
 * Get a security notice about API key storage
 */
export function getSecurityNotice(): string {
    if (isUsingEnvKey()) {
        return "Using API key from SUPERMEMORY_API_KEY environment variable (recommended)"
    }
    return "API key stored in plain text config file. For sensitive environments, use SUPERMEMORY_API_KEY env var instead."
}

export function setApiKey(key: string): void {
    config.set("apiKey", key)
}

export function clearApiKey(): void {
    config.delete("apiKey")
}

export function getBaseUrl(): string {
    return config.get("baseUrl") || "https://api.supermemory.ai"
}

export function setBaseUrl(url: string): void {
    config.set("baseUrl", url)
}

export function getDefaultProject(): string | undefined {
    return config.get("defaultProject")
}

export function setDefaultProject(project: string): void {
    config.set("defaultProject", project)
}

export function clearConfig(): void {
    config.clear()
}

export function getConfigPath(): string {
    return config.path
}

export { config }
