import { ApiError, EXIT_CODES, CliError } from "./error-handler.js"

/**
 * Known Supermemory API error types for better formatting
 */
const API_ERROR_MESSAGES: Record<number, string> = {
    400: "Invalid request",
    401: "Invalid or expired API key",
    403: "Access denied to this resource",
    404: "Resource not found",
    429: "Rate limit exceeded. Please wait and try again",
    500: "Supermemory server error. Please try again later",
    502: "Supermemory service temporarily unavailable",
    503: "Supermemory service is under maintenance",
}

/**
 * Parse and format Supermemory SDK errors for better CLI UX.
 * Extracts useful information from API responses and provides
 * user-friendly error messages.
 *
 * @param error - The caught error from SDK calls
 * @returns Formatted CliError with appropriate exit code
 */
export function formatApiError(error: unknown): CliError {
    // Handle non-Error objects
    if (!(error instanceof Error)) {
        return new CliError(
            "An unexpected error occurred",
            EXIT_CODES.API_ERROR,
        )
    }

    // Try to extract status code from error
    const statusCode = extractStatusCode(error)
    const originalMessage = error.message

    // Build user-friendly message
    let userMessage: string

    if (statusCode && API_ERROR_MESSAGES[statusCode]) {
        userMessage = API_ERROR_MESSAGES[statusCode]

        // Append original message if it provides additional context
        const cleanedOriginal = cleanErrorMessage(originalMessage)
        if (cleanedOriginal && !userMessage.includes(cleanedOriginal)) {
            userMessage = `${userMessage}: ${cleanedOriginal}`
        }
    } else {
        userMessage = cleanErrorMessage(originalMessage) || "API request failed"
    }

    // Create appropriate error type
    if (statusCode === 401 || statusCode === 403) {
        return new ApiError(userMessage, statusCode, error)
    }

    return new ApiError(userMessage, statusCode, error)
}

/**
 * Extract HTTP status code from various error formats
 */
function extractStatusCode(error: Error): number | undefined {
    // Check for status property (common in HTTP libraries)
    if ("status" in error && typeof error.status === "number") {
        return error.status
    }

    // Check for statusCode property
    if ("statusCode" in error && typeof error.statusCode === "number") {
        return error.statusCode
    }

    // Check for response.status (axios-style)
    if (
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "status" in error.response &&
        typeof error.response.status === "number"
    ) {
        return error.response.status
    }

    // Try to parse from message
    const statusMatch = error.message.match(/\b([45]\d{2})\b/)
    if (statusMatch) {
        return Number.parseInt(statusMatch[1], 10)
    }

    return undefined
}

/**
 * Clean up error message for display
 */
function cleanErrorMessage(message: string): string {
    // Remove common prefixes
    let cleaned = message
        .replace(/^Error:\s*/i, "")
        .replace(/^APIError:\s*/i, "")
        .replace(/^Request failed:\s*/i, "")
        .trim()

    // Remove stack trace if accidentally included
    const stackIndex = cleaned.indexOf("\n    at ")
    if (stackIndex > 0) {
        cleaned = cleaned.slice(0, stackIndex).trim()
    }

    return cleaned
}
