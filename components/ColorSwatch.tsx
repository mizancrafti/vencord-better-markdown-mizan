/*
 * Color Swatch
 *
 * Adds a small filled square after every hex color (#RRGGBB) found in the
 * text that Discord's parser returns. Works on the React tree: strings are
 * split around colors, other elements are cloned with their new children.
 */

import { React } from "@webpack/common";
import { HEX_COLOR_SOURCE, isValidHexColor } from "../parser/colors";

export function ColorSwatch({ color }: { color: string; }) {
    return (
        <span
            className="bm-color-swatch"
            style={{ backgroundColor: color }}
            title={color}
        />
    );
}

function splitHex(text: string): React.ReactNode {
    const re = new RegExp(HEX_COLOR_SOURCE, "g");
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
        if (!isValidHexColor(m[0])) continue;
        const end = m.index + m[0].length;
        parts.push(text.slice(last, end));
        parts.push(<ColorSwatch key={`bm-sw-${m.index}`} color={m[0]} />);
        last = end;
    }

    if (parts.length === 0) return text;
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}

/**
 * Walk a React node tree and put a swatch after each hex color.
 * Returns the same reference when nothing changed. Links are left alone
 * (a "#fff" in a URL fragment isn't a color).
 */
export function swatchify(node: React.ReactNode): React.ReactNode {
    if (typeof node === "string") return splitHex(node);

    if (Array.isArray(node)) {
        let changed = false;
        const mapped = node.map(child => {
            const result = swatchify(child);
            if (result !== child) changed = true;
            return result;
        });
        return changed ? mapped : node;
    }

    if (React.isValidElement(node)) {
        const el = node as React.ReactElement<any>;
        if (el.type === "a") return node;

        const children = el.props?.children;
        if (children == null || typeof children === "function") return node;

        const next = swatchify(children);
        return next === children ? node : React.cloneElement(el, undefined, next);
    }

    return node;
}
