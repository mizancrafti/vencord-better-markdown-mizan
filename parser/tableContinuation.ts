/*
 * Tables split across several messages
 *
 * Long tables get cut into several messages (Discord's 2000-char limit), and
 * people also post a table piece by piece. These helpers complete the pieces
 * so each message renders as a normal table:
 *
 *   header + separator in one message, rows in the next ones
 *       -> the rows get the header + separator in front
 *   header row in one message, "|---|---|---|" (+ rows) in the next one
 *       -> the second message gets the header row in front
 *   a message that is only a header row (or header + separator, no rows)
 *       -> header-only table
 *   separator + rows with no header to be found
 *       -> table without header (an empty header row keeps the alignment)
 */

function isRowLine(line: string): boolean {
    return line.trim().startsWith("|");
}

function splitCells(line: string): string[] {
    let t = line.trim();
    if (t.startsWith("|")) t = t.slice(1);
    if (t.endsWith("|")) t = t.slice(0, -1);
    return t.split("|");
}

/** `|---|:---:|` style separator row. */
function isSeparatorLine(line: string): boolean {
    if (!isRowLine(line)) return false;
    return splitCells(line).every(cell => /^\s*:?-{3,}:?\s*$/.test(cell));
}

/** A real data/header row: pipes at both ends and at least two columns. */
function isRealRow(line: string): boolean {
    const t = line.trim();
    return t.startsWith("|") && t.endsWith("|") && !isSeparatorLine(t) && splitCells(t).length >= 2;
}

function nonEmptyLines(content: string): string[] {
    return content.split("\n").filter(l => l.trim() !== "");
}

function makeSeparator(columns: number): string {
    return "|" + Array(columns).fill("---").join("|") + "|";
}

/** A header row with empty cells: renders no header but keeps the separator's alignment. */
function makeEmptyHeader(columns: number): string {
    return "|" + Array(columns).fill("  ").join("|") + "|";
}

/** The message starts with a separator row (its header is in the previous message). */
export function startsWithSeparator(content: string): boolean {
    const lines = nonEmptyLines(content);
    return lines.length > 0 && isSeparatorLine(lines[0]);
}

/** The message is exactly one header-looking row. */
export function isLoneHeaderRow(content: string): boolean {
    const lines = nonEmptyLines(content);
    return lines.length === 1 && isRealRow(lines[0]);
}

/**
 * True when the message starts with table rows but has NO header/separator
 * of its own, i.e. it looks like the continuation of a table.
 */
export function isTableContinuation(content: string): boolean {
    const lines = nonEmptyLines(content);
    if (lines.length === 0 || !isRowLine(lines[0])) return false;
    if (isSeparatorLine(lines[0])) return false;
    if (lines.length > 1 && isSeparatorLine(lines[1])) return false;
    return true;
}

/**
 * The row at the very end of a message, if it stands alone there (the line
 * above isn't a table line): that's a header whose separator is still to come.
 */
function lastLoneRow(content: string): string | null {
    const lines = content.split("\n");
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    if (lines.length === 0) return null;
    const last = lines[lines.length - 1];
    if (!isRealRow(last)) return null;
    if (lines.length > 1 && isRowLine(lines[lines.length - 2])) return null;
    return last.trim();
}

/**
 * Header + separator lines of the table that `content` ends with.
 * "rows-only" = it ends with table lines but no header of its own.
 */
function headerOfTrailingTable(content: string): [string, string] | "no-table" | "rows-only" {
    const lines = content.split("\n");
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();

    // Contiguous pipe lines at the end of the message
    const block: string[] = [];
    for (let i = lines.length - 1; i >= 0 && isRowLine(lines[i]); i--) block.unshift(lines[i]);
    if (block.length === 0) return "no-table";

    for (let k = block.length - 1; k >= 1; k--) {
        if (isSeparatorLine(block[k]) && !isSeparatorLine(block[k - 1])) {
            return [block[k - 1].trim(), block[k].trim()];
        }
    }
    return "rows-only"; // only rows: it was a continuation itself
}

/**
 * Given the contents of the previous messages by the same author
 * (nearest first), return the header + separator lines of the table being
 * continued, or null if the previous messages don't hold one.
 */
export function resolveContinuationHeader(previousContents: string[]): [string, string] | null {
    for (let i = 0; i < previousContents.length; i++) {
        const content = previousContents[i];
        const result = headerOfTrailingTable(content);
        if (result === "no-table") return null;
        if (result !== "rows-only") return result;

        // Rows only. If this message starts with the separator, the header is the
        // lone row at the end of the message before it (header and separator were
        // posted in different messages).
        if (startsWithSeparator(content)) {
            const separator = nonEmptyLines(content)[0].trim();
            const header = i + 1 < previousContents.length ? lastLoneRow(previousContents[i + 1]) : null;
            if (header && splitCells(header).length === splitCells(separator).length) return [header, separator];
            return null;
        }
    }
    return null;
}

/** A message that starts with the separator: join it to its header, or render it without one. */
function completeSeparatorMessage(content: string, previous: string[]): string | null {
    const lines = content.split("\n");
    const start = lines.findIndex(l => l.trim() !== "");
    const body = lines.slice(start).join("\n");
    const columns = splitCells(lines[start]).length;

    const header = previous.length ? lastLoneRow(previous[0]) : null;
    if (header && splitCells(header).length === columns) return `${header}\n${body}`;

    // No header to be found: with rows, render them as a table without header
    const hasRows = nonEmptyLines(body).length > 1;
    return hasRows ? `${makeEmptyHeader(columns)}\n${body}` : null;
}

/**
 * Completes a message that is a piece of a table. `getPrevious` returns the
 * contents of the previous messages by the same author (nearest first) and is
 * only called when it's needed. Returns the content unchanged if the message
 * isn't a piece of a table.
 */
export function completeSplitTable(content: string, getPrevious: () => string[]): string {
    const separatorFirst = startsWithSeparator(content);
    if (!separatorFirst && !isTableContinuation(content)) return content;

    const previous = getPrevious();

    if (separatorFirst) return completeSeparatorMessage(content, previous) ?? content;

    // Rows only: take the header from the previous messages...
    const header = resolveContinuationHeader(previous);
    if (header) return `${header[0]}\n${header[1]}\n${content}`;

    // ...or, if the whole message is a single row, it is a header-only table
    if (isLoneHeaderRow(content)) {
        return `${content.trim()}\n${makeSeparator(splitCells(content.trim()).length)}`;
    }
    return content;
}
