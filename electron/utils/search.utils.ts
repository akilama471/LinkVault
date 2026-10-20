/**
 * Set of column names supported in bookmarks_fts table.
 */
export const VALID_FTS_COLUMNS = new Set([
  'title',
  'url',
  'description',
  'notes',
  'tags',
  'domain'
]);

export interface ParsedSearchClause {
  type: 'clause' | 'operator';
  value: string;
}

/**
 * Sanitizes and tokenizes an arbitrary user search query into a safe SQLite FTS5 MATCH expression.
 * Prevents syntax crashes from special characters (e.g. c++, *, quotes, parentheses, colon, AND/OR/NOT).
 * Supports #tags, @domains, column filters (e.g. title:react), quoted phrases, and boolean operators.
 */
export function sanitizeFtsQuery(rawQuery: string): string {
  if (!rawQuery) return '';
  const trimmed = rawQuery.trim();
  if (!trimmed) return '';

  // Extract raw tokens: column prefixes, quoted phrases, or words
  const rawTokens: Array<{ type: 'phrase' | 'term' | 'operator'; value: string; column?: string }> = [];
  const regex = /(?:([a-zA-Z]+):)?(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([^\s"]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(trimmed)) !== null) {
    const rawCol = match[1]?.toLowerCase();
    const isColValid = rawCol ? VALID_FTS_COLUMNS.has(rawCol) : false;
    const targetCol = isColValid ? rawCol : undefined;

    if (match[2] !== undefined) {
      // Quoted phrase
      const phrase = match[2].replace(/""/g, '"').trim();
      if (phrase) {
        if (!isColValid && rawCol) {
          // If column was invalid (e.g. foo:"bar"), include prefix in phrase
          rawTokens.push({ type: 'phrase', value: `${match[1]}:${phrase}` });
        } else {
          rawTokens.push({ type: 'phrase', value: phrase, column: targetCol });
        }
      }
    } else if (match[3] !== undefined) {
      let text = match[3];
      if (!isColValid && rawCol) {
        text = `${match[1]}:${text}`;
      }

      if (text === 'AND' || text === 'OR' || text === 'NOT') {
        rawTokens.push({ type: 'operator', value: text });
      } else {
        rawTokens.push({ type: 'term', value: text, column: targetCol });
      }
    }
  }

  if (rawTokens.length === 0) return '';

  const parsedClauses: ParsedSearchClause[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const item = rawTokens[i];

    if (item.type === 'operator') {
      // An operator is only valid if preceded by a clause and followed by a non-operator token
      if (
        parsedClauses.length > 0 &&
        parsedClauses[parsedClauses.length - 1].type !== 'operator' &&
        i + 1 < rawTokens.length &&
        rawTokens[i + 1].type !== 'operator'
      ) {
        parsedClauses.push({ type: 'operator', value: item.value });
      } else {
        // Dangling operator: treat as literal word match
        parsedClauses.push({
          type: 'clause',
          value: `"${item.value}"*`
        });
      }
      continue;
    }

    if (item.type === 'phrase') {
      const escaped = item.value.replace(/"/g, '""');
      const clause = item.column ? `${item.column}: "${escaped}"` : `"${escaped}"`;
      parsedClauses.push({
        type: 'clause',
        value: clause
      });
      continue;
    }

    // item.type === 'term'
    let text = item.value;
    let targetCol = item.column || null;

    // Check for #tag shortcut
    if (text.startsWith('#') && text.length > 1) {
      targetCol = 'tags';
      text = text.slice(1);
    } else if (text.startsWith('@') && text.length > 1) {
      // Check for @domain shortcut
      targetCol = 'domain';
      text = text.slice(1);
    }

    // Strip wrapping punctuation like parentheses, brackets, or trailing punctuation (except c++, c#)
    text = text.replace(/^[([<{]+/u, '');
    text = text.replace(/[)\]>}!?,;.]+$/u, '');

    // Strip leading/trailing asterisks or double quotes to prevent syntax corruption
    text = text.replace(/^\*+|\*+$/g, '').replace(/"/g, '');

    // Skip tokens with no letters or numbers
    if (!text || !/[\p{L}\p{N}]/u.test(text)) {
      continue;
    }

    const isPrefixMatch = /[\p{L}\p{N}]$/u.test(text);
    const escaped = text.replace(/"/g, '""');
    const quoted = `"${escaped}"${isPrefixMatch ? '*' : ''}`;
    const ftsClause = targetCol ? `${targetCol}: ${quoted}` : quoted;
    parsedClauses.push({
      type: 'clause',
      value: ftsClause
    });
  }

  // Remove leading or trailing operators
  while (parsedClauses.length > 0 && parsedClauses[0].type === 'operator') {
    parsedClauses.shift();
  }
  while (parsedClauses.length > 0 && parsedClauses[parsedClauses.length - 1].type === 'operator') {
    parsedClauses.pop();
  }

  if (parsedClauses.length === 0) return '';

  // Combine clauses using AND as default separator between consecutive non-operator clauses
  const resultParts: string[] = [];
  for (let i = 0; i < parsedClauses.length; i++) {
    const cur = parsedClauses[i];
    if (cur.type === 'operator') {
      resultParts.push(cur.value);
    } else {
      if (
        resultParts.length > 0 &&
        resultParts[resultParts.length - 1] !== 'AND' &&
        resultParts[resultParts.length - 1] !== 'OR' &&
        resultParts[resultParts.length - 1] !== 'NOT'
      ) {
        resultParts.push('AND');
      }
      resultParts.push(cur.value);
    }
  }

  return resultParts.join(' ');
}
