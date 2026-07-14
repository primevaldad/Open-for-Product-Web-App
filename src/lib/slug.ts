/**
 * Helper utilities for generating and parsing hybrid slug-ID URLs.
 * Hybrid URL format: /[prefix]/[id]-[slug]
 */

/**
 * Convert a display name to a URL-safe slug, e.g. "Open for Product Web App" → "open-for-product-web-app"
 */
export function toSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')   // remove non-word chars except spaces and hyphens
        .replace(/[\s_-]+/g, '-')    // replace spaces, underscores, and multiple hyphens with a single hyphen
        .replace(/^-+|-+$/g, '');    // trim leading/trailing hyphens
}

/**
 * Build a hybrid ID-slug URL.
 * Example: buildHybridUrl('/projects', 'cfp4u8pI1d339Wg54fuS', 'Open for Product') 
 * Returns: "/projects/cfp4u8pI1d339Wg54fuS-open-for-product"
 */
export function buildHybridUrl(prefix: string, id: string, name: string): string {
    const slug = toSlug(name);
    return slug ? `${prefix}/${id}-${slug}` : `${prefix}/${id}`;
}

/**
 * Extract the unique document ID from a hybrid slug-ID parameter.
 * Example: extractId("cfp4u8pI1d339Wg54fuS-open-for-product")
 * Returns: "cfp4u8pI1d339Wg54fuS"
 */
export function extractId(param: string): string {
    if (!param) return '';
    const dashIndex = param.indexOf('-');
    if (dashIndex === -1) return param;
    return param.substring(0, dashIndex);
}
