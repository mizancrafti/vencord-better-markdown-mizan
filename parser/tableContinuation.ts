/*
 * Table Continuation (tables split across several messages)
 *
 * Long tables get cut into several messages (Discord's 2000-char limit).
 * Only the first message has the header + separator; the next ones are just
 * rows. These helpers find the header in the previous messages so the
 * continuation can be rendered as a normal table.
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

/**
 * True when the message starts with table rows but has NO header/separator
 * of its own, i.e. it looks like the continuation of a table.
 */
export function isTableContinuation(content: string): boolean {
    const lines = content.split("\n").filter(l => l.trim() !== "");
    if (lines.length === 0 || !isRowLine(lines[0])) return false;
    if (isSeparatorLine(lines[0])) return false;
    if (lines.length > 1 && isSeparatorLine(lines[1])) return false;
    return true;
}

/**
 * Header + separator lines of the table that `content` ends with,
 * or null if it has no table header at its end.
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
            return [block[k - 1], block[k]];
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
    for (const content of previousContents) {
        const result = headerOfTrailingTable(content);
        if (result === "no-table") return null;
        if (result !== "rows-only") return result;
    }
    return null;
}
