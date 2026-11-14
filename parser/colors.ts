/*
 * Hex Color Detection
 *
 * Matches #RGB, #RRGGBB and #RRGGBBAA. To avoid false positives:
 *  - not preceded by a word character, "&", "/" or "#" (HTML entities,
 *    URL fragments, "##")
 *  - not followed by a word character (so #F7F6F3a isn't a color)
 *  - 3-digit values must contain at least one letter a-f, so issue numbers
 *    like "#123" aren't treated as colors
 */

export const HEX_COLOR_SOURCE =
    "(?<![\\w&/#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?!\\w)";

export function isValidHexColor(value: string): boolean {
    if (value.length === 4) return /[a-fA-F]/.test(value);
    return true;
}

export function detectHexColor(text: string): boolean {
    const re = new RegExp(HEX_COLOR_SOURCE, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (isValidHexColor(m[0])) return true;
    }
    return false;
}
