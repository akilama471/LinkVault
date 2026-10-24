export interface NormalizedUrlResult {
    rawUrl: string;
    normalizedUrl: string;
    cleanHost: string;
    cleanPath: string;
    removedTrackingParams: string[];
    protocol: string;
    hadTrailingSlash: boolean;
    hadWww: boolean;
}
/**
 * Normalizes a URL by:
 * - Stripping protocol differences (treats http and https equivalently for comparison)
 * - Removing 'www.' prefix from hostnames
 * - Removing default ports (:80, :443)
 * - Removing trailing slashes and collapsing consecutive slashes
 * - Stripping marketing and tracking parameters (UTM, fbclid, gclid, etc.)
 * - Alphabetizing remaining query parameters
 * - Stripping hash fragments
 */
export declare function normalizeUrl(rawUrl: string): NormalizedUrlResult;
/**
 * Compares two URLs and returns human-readable reasons why they are considered duplicates
 */
export declare function compareDuplicateReasons(urlA: string, urlB: string): string[];
