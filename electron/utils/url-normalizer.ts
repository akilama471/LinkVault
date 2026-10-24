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

const TRACKING_PARAMS = new Set([
  // UTM parameters
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_cid', 'utm_reader', 'utm_name', 'utm_pubreferrer', 'utm_swu',
  // Social & ad click IDs
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'zanpid', 'igshid',
  'mc_cid', 'mc_eid', 'yclid', '_hsenc', '_hsmi', 'mkt_tok', 'twclid',
  // Referrer & source identifiers
  'ref', 'ref_src', 'ref_url', 'source', 'origin', 'feature', 'si', 'spm',
  'aff_id', 'affiliate_id', 'click_id'
]);

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
export function normalizeUrl(rawUrl: string): NormalizedUrlResult {
  let urlStr = (rawUrl || '').trim();
  let hadTrailingSlash = false;
  let hadWww = false;
  let protocol = 'https:';
  const removedTrackingParams: string[] = [];

  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = 'https://' + urlStr;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
    protocol = parsed.protocol;
  } catch {
    return {
      rawUrl,
      normalizedUrl: rawUrl.trim().toLowerCase(),
      cleanHost: '',
      cleanPath: '',
      removedTrackingParams: [],
      protocol: 'unknown',
      hadTrailingSlash: false,
      hadWww: false
    };
  }

  // 1. Hostname normalization
  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
    hadWww = true;
  }

  // Remove default ports
  let port = parsed.port;
  if ((parsed.protocol === 'http:' && port === '80') || (parsed.protocol === 'https:' && port === '443')) {
    port = '';
  }
  const hostWithPort = port ? `${hostname}:${port}` : hostname;

  // 2. Path normalization
  let pathname = parsed.pathname || '/';
  // Collapse duplicate slashes
  pathname = pathname.replace(/\/+/g, '/');
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
    hadTrailingSlash = true;
  }

  // 3. Query string normalization (strip UTM and tracking parameters)
  const searchParams = new URLSearchParams(parsed.search);
  const remainingParams: [string, string][] = [];

  for (const [key, value] of searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
      removedTrackingParams.push(key);
    } else {
      remainingParams.push([key, value]);
    }
  }

  // Sort remaining parameters alphabetically
  remainingParams.sort((a, b) => a[0].localeCompare(b[0]));

  let queryString = '';
  if (remainingParams.length > 0) {
    const sortedSearch = new URLSearchParams();
    remainingParams.forEach(([k, v]) => sortedSearch.append(k, v));
    queryString = '?' + sortedSearch.toString();
  }

  // The canonical normalized representation (protocol-agnostic, www-agnostic)
  const normalizedUrl = `${hostWithPort}${pathname}${queryString}`.toLowerCase();

  return {
    rawUrl,
    normalizedUrl,
    cleanHost: hostWithPort,
    cleanPath: pathname,
    removedTrackingParams,
    protocol,
    hadTrailingSlash,
    hadWww
  };
}

/**
 * Compares two URLs and returns human-readable reasons why they are considered duplicates
 */
export function compareDuplicateReasons(urlA: string, urlB: string): string[] {
  if (urlA.trim() === urlB.trim()) {
    return ['Exact identical URL string'];
  }

  const reasons: string[] = [];
  const normA = normalizeUrl(urlA);
  const normB = normalizeUrl(urlB);

  if (normA.protocol !== normB.protocol) {
    reasons.push('Protocol difference (http vs https)');
  }

  if (normA.hadWww !== normB.hadWww) {
    reasons.push('www. domain prefix difference');
  }

  if (normA.hadTrailingSlash !== normB.hadTrailingSlash) {
    reasons.push('Trailing slash difference (e.g. /path/ vs /path)');
  }

  if (normA.removedTrackingParams.length > 0 || normB.removedTrackingParams.length > 0) {
    const allTrackers = Array.from(new Set([...normA.removedTrackingParams, ...normB.removedTrackingParams]));
    reasons.push(`Tracking parameters stripped (${allTrackers.slice(0, 3).join(', ')}${allTrackers.length > 3 ? '...' : ''})`);
  }

  if (reasons.length === 0) {
    reasons.push('Case sensitivity or parameter order difference');
  }

  return reasons;
}
