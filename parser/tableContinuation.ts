/*
 * Tables split across several messages
 *
 * Long tables get cut into several messages (Discord's 2000-char limit), and
 * people also post a table piece by piece. The cut can fall between two lines
 * or in the MIDDLE of a line (even inside a word). These helpers complete the
 * pieces so each message renders as a normal table:
 *
 *   header + separator in one message, rows in the next ones
 *       -> the rows get the header + separator in front
 *   header row in one message, "|---|---|---|" (+ rows) in the next one
 *       -> the second message gets the header row in front
 *   a message that is only a header row, or header + separator with no rows
 *       -> header-only table
 *   separator + rows with no header to be found
 *       -> table without header (an empty header row keeps the alignment)
 *   a line cut between two messages (header, separator or a row)
 *       -> the two halves are joined and the second message renders the whole table
 *   a header followed by the start of a cut separator ("|---")
 *       -> that message renders as a header-only table
 *
 * Messages are completed one after the other from the oldest, so a table cut
 * in three or more messages works too.
 */

import { splitRow as splitCells } from "./table";

const SEPARATOR_CHARS = /^[\s:|-]+$/;

function isRowLine(line: string): boolean {
    return line.trim().startsWith("|");
}

function cellCount(line: string): number {
    return splitCells(line).length;
}

/** `|---|:---:|` style separator row. */
function isSeparatorLine(line: string): boolean {
    if (!isRowLine(line)) return false;
    return splitCells(line).every(cell => /^\s*:?-{3,}:?\s*$/.test(cell));
}

/** A real data/header row: pipes at both ends and at least two columns. */
function isRealRow(line: string): boolean {
    const t = line.trim();
    return t.startsWith("|") && t.endsWith("|") && !isSeparatorLine(t) && cellCount(t) >= 2;
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
 * Given the (already completed) contents of the previous messages by the same
 * author, nearest first, return the header + separator lines of the table
 * being continued, or null if the previous messages don't hold one.
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
            if (header && cellCount(header) === cellCount(separator)) return [header, separator];
            return null;
        }
    }
    return null;
}

/* ---------------------------------------------------------------
 * Lines cut between two messages
 * --------------------------------------------------------------- */

/**
 * Drops the empty cells at the end of a row and keeps the closing pipe of the
 * last cell that has text: "| a | b |      |" -> "| a | b |". Null if there are none.
 * (A row whose last cell is empty because its text went to the next message.)
 */
function stripTrailingEmptyCells(line: string): string | null {
    let s = line.trimEnd();
    let stripped = false;
    while (s.endsWith("|")) {
        const last = s.length - 1;
        const prev = s.lastIndexOf("|", last - 1);
        if (prev < 0 || s.slice(prev + 1, last).trim() !== "") break;
        s = s.slice(0, last).trimEnd();
        stripped = true;
    }
    return stripped && s.length > 1 ? s : null;
}

/**
 * Ways to glue the end of the previous message (`a`) to the start of this one
 * (`b`). Discord trims the whitespace at the cut, so it's a plain concatenation.
 * Two complete table lines (a ends with a pipe and b starts with one) are two
 * lines, not one cut line.
 */
function joinCandidates(a: string, b: string): string[] {
    const variants = [a.trim()];
    const stripped = stripTrailingEmptyCells(a);
    if (stripped) variants.push(stripped.trim());
    return variants.filter(v => !(v.endsWith("|") && b.startsWith("|"))).map(v => v + b);
}

/**
 * The first line of this message is the rest of the last line of the previous
 * one. Returns the content with both halves joined (and the header in front
 * when it came from the previous message), or null if it isn't that.
 */
function tryJoinMidLine(content: string, olderRaw: string[], olderEff: string[]): string | null {
    if (olderRaw.length === 0) return null;

    const lines = content.split("\n");
    const start = lines.findIndex(l => l.trim() !== "");
    if (start === -1) return null;
    const b = lines[start].trim();
    const after = lines.slice(start + 1);

    const prevLines = nonEmptyLines(olderRaw[0]).map(l => l.trimEnd());
    if (prevLines.length === 0) return null;
    const a = prevLines[prevLines.length - 1];
    if (!a.trim().startsWith("|")) return null; // the previous message doesn't end in a table line

    const withRest = (...head: string[]) => [...head, ...after].join("\n");

    // 1) The SEPARATOR was cut: the previous message ends with a complete header
    //    row and the beginning of the separator; this one starts with its rest.
    if (prevLines.length >= 2 && SEPARATOR_CHARS.test(b) && /^\|[\s:|-]*$/.test(a.trim())) {
        const header = prevLines[prevLines.length - 2].trim();
        if (isRealRow(header)) {
            const separator = a.trim() + b;
            if (isSeparatorLine(separator) && cellCount(separator) === cellCount(header)) {
                return withRest(header, separator);
            }
        }
    }

    // 2) The HEADER was cut: this message starts with its rest, followed by the separator.
    const nextIndex = after.findIndex(l => l.trim() !== "");
    if (nextIndex !== -1 && isSeparatorLine(after[nextIndex])) {
        const columns = cellCount(after[nextIndex]);
        for (const joined of joinCandidates(a, b)) {
            if (joined.startsWith("|") && joined.endsWith("|") && cellCount(joined) === columns) {
                return [joined, ...after.slice(nextIndex)].join("\n");
            }
        }
    }

    // 3) A ROW was cut: the header comes from the previous messages.
    const header = resolveContinuationHeader(olderEff);
    if (header) {
        const columns = cellCount(header[0]);
        for (const joined of joinCandidates(a, b)) {
            if (joined.startsWith("|") && joined.endsWith("|") && cellCount(joined) === columns) {
                return `${header[0]}\n${header[1]}\n${withRest(joined)}`;
            }
        }
    }

    return null;
}

/* ---------------------------------------------------------------
 * Completing a message
 * --------------------------------------------------------------- */

/**
 * A header row followed by the BEGINNING of a separator that was cut ("|-------"):
 * complete it so the message renders as a header-only table (the table detector
 * needs a closed separator). The next message holds the rest of the separator.
 */
function closePartialSeparatorTail(content: string): string {
    const lines = content.split("\n");
    let last = lines.length - 1;
    while (last >= 0 && lines[last].trim() === "") last--;
    if (last < 1) return content;

    const header = lines[last - 1].trim();
    const tail = lines[last].trim();
    if (!isRealRow(header) || !/^\|[\s:|-]*$/.test(tail)) return content;
    // The row must be where the table STARTS: after a data row, a lone "|" is
    // just the beginning of the next row
    if (last >= 2 && isRowLine(lines[last - 2])) return content;

    const columns = cellCount(header);
    if (isSeparatorLine(tail) && tail.endsWith("|") && cellCount(tail) >= columns) return content; // already complete
    lines[last] = makeSeparator(columns);
    return lines.join("\n");
}

/** A message that starts with the separator: join it to its header, or render it without one. */
function completeSeparatorMessage(content: string, previous: string[]): string | null {
    const lines = content.split("\n");
    const start = lines.findIndex(l => l.trim() !== "");
    const body = lines.slice(start).join("\n");
    const columns = cellCount(lines[start]);

    const header = previous.length ? lastLoneRow(previous[0]) : null;
    if (header && cellCount(header) === columns) return `${header}\n${body}`;

    // No header to be found: with rows, render them as a table without header
    const hasRows = nonEmptyLines(body).length > 1;
    return hasRows ? `${makeEmptyHeader(columns)}\n${body}` : null;
}

/** Could this message be a piece of a table (so the previous messages are worth looking at)? */
function needsPrevious(content: string): boolean {
    const first = nonEmptyLines(content)[0];
    if (!first) return false;
    if (startsWithSeparator(content) || isTableContinuation(content)) return true;
    // A line that continues one cut from the previous message: it holds pipes
    // or is only separator characters
    return first.includes("|") || SEPARATOR_CHARS.test(first);
}

/**
 * `asContext`: the content is a PREVIOUS message being completed only to look for a
 * header in it. A lone header row stays as it is there: it's rendered as a header-only
 * table in its own message, but it must not capture the rows that follow it.
 */
function completeWith(content: string, olderRaw: string[], olderEff: string[], asContext = false): string {
    const joined = tryJoinMidLine(content, olderRaw, olderEff);
    if (joined) return joined;

    if (startsWithSeparator(content)) return completeSeparatorMessage(content, olderRaw) ?? content;
    if (!isTableContinuation(content)) return content;

    // Rows only: take the header from the previous messages...
    const header = resolveContinuationHeader(olderEff);
    if (header) return `${header[0]}\n${header[1]}\n${content}`;

    // ...or, if the whole message is a single row, it is a header-only table
    if (!asContext && isLoneHeaderRow(content)) {
        return `${content.trim()}\n${makeSeparator(cellCount(content.trim()))}`;
    }
    return content;
}

/** Completes every previous message, oldest first, so a header can be found through a chain. */
function completeAll(raw: string[]): string[] {
    const completed: string[] = new Array(raw.length);
    for (let i = raw.length - 1; i >= 0; i--) {
        completed[i] = closePartialSeparatorTail(needsPrevious(raw[i])
            ? completeWith(raw[i], raw.slice(i + 1), completed.slice(i + 1), true)
            : raw[i]);
    }
    return completed;
}

/**
 * Completes a message that is a piece of a table. `getPrevious` returns the
 * raw contents of the previous messages by the same author (nearest first) and
 * is only called when it's needed. Returns the content unchanged if the
 * message isn't a piece of a table.
 */
export function completeSplitTable(content: string, getPrevious: () => string[]): string {
    if (!needsPrevious(content)) return closePartialSeparatorTail(content);
    const raw = getPrevious();
    return closePartialSeparatorTail(completeWith(content, raw, completeAll(raw)));
}
