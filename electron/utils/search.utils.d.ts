/**
 * Set of column names supported in bookmarks_fts table.
 */
export declare const VALID_FTS_COLUMNS: Set<string>;
export interface ParsedSearchClause {
    type: 'clause' | 'operator';
    value: string;
}
/**
 * Sanitizes and tokenizes an arbitrary user search query into a safe SQLite FTS5 MATCH expression.
 * Prevents syntax crashes from special characters (e.g. c++, *, quotes, parentheses, colon, AND/OR/NOT).
 * Supports #tags, @domains, column filters (e.g. title:react), quoted phrases, and boolean operators.
 */
export declare function sanitizeFtsQuery(rawQuery: string): string;
