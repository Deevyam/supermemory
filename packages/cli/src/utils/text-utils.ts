/**
 * Truncate a string safely for UTF-8 multi-byte characters.
 * Uses Array.from() to iterate by Unicode code points instead of byte indices,
 * preventing corruption of emoji, CJK, and other multi-byte characters.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters (code points)
 * @param suffix - String to append when truncated (default: "...")
 * @returns Truncated string with suffix if it was shortened
 */
export function truncateUtf8Safe(
    text: string,
    maxLength: number,
    suffix = "...",
): string {
    // Convert to array of code points for safe slicing
    const chars = Array.from(text)

    if (chars.length <= maxLength) {
        return text
    }

    // Account for suffix length in the truncation
    const truncateAt = Math.max(0, maxLength - suffix.length)
    return chars.slice(0, truncateAt).join("") + suffix
}

/**
 * Truncate text without adding a suffix.
 * Useful when you need exact character count control.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters (code points)
 * @returns Truncated string
 */
export function truncateUtf8Exact(text: string, maxLength: number): string {
    const chars = Array.from(text)
    if (chars.length <= maxLength) {
        return text
    }
    return chars.slice(0, maxLength).join("")
}
