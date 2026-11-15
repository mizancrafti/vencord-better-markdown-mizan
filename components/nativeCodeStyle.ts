/*
 * Native code block style
 *
 * Code blocks drawn by the plugin live in the message's accessories, outside
 * the element where Discord draws them natively, so Discord's / the user's
 * theme's CSS (which is scoped to that element) doesn't reach them: they came
 * out black and full width.
 *
 * Discord still renders the ORIGINAL message (we only hide it), including its
 * code blocks. So instead of guessing class names and widths, we read the
 * real thing from it: the "markup" classes, the width of the native block
 * and the computed look of its <code> (background, border, font...). That
 * works with any theme and survives Discord renaming its CSS classes.
 */

const ACCESSORIES_PREFIX = "message-accessories-";

export interface NativeCodeStyle {
    /** "markup…" classes of the original message content. */
    className: string;
    /** Width in px of the native code block (null if it couldn't be measured). */
    width: number | null;
    /** Computed look of the native <code>, as CSS variables. */
    vars: Record<string, string>;
}

/** The original (hidden) message content that belongs to the message this element is in. */
function findOriginalContent(el: HTMLElement): HTMLElement | null {
    const accessories = el.closest(`[id^="${ACCESSORIES_PREFIX}"]`);
    if (!accessories) return null;
    return document.getElementById("message-content-" + accessories.id.slice(ACCESSORIES_PREFIX.length));
}

/**
 * Width of the first native code block. The original content is hidden
 * (display: none), so it's shown for an instant to measure it and restored
 * right away, synchronously: nothing is painted in between.
 */
function measureNativeWidth(original: HTMLElement, pre: HTMLElement): number | null {
    const previousStyle = original.getAttribute("style");
    try {
        original.style.setProperty("display", "block", "important");
        original.style.setProperty("visibility", "hidden", "important");
        const width = pre.getBoundingClientRect().width;
        return width > 0 ? Math.round(width) : null;
    } finally {
        if (previousStyle === null) original.removeAttribute("style");
        else original.setAttribute("style", previousStyle);
    }
}

export function readNativeCodeStyle(el: HTMLElement): NativeCodeStyle | null {
    const original = findOriginalContent(el);
    if (!original) return null;

    const className = Array.from(original.classList).filter(c => c.startsWith("markup")).join(" ");

    const pre = original.querySelector("pre") as HTMLElement | null;
    const width = pre ? measureNativeWidth(original, pre) : null;

    const vars: Record<string, string> = {};
    const code = (original.querySelector("pre code") ?? original.querySelector("code")) as HTMLElement | null;
    if (code) {
        // Computed (not used) values are available even while display: none
        const cs = getComputedStyle(code);
        vars["--bm-n-bg"] = cs.backgroundColor;
        vars["--bm-n-color"] = cs.color;
        vars["--bm-n-border"] = `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`;
        vars["--bm-n-radius"] = cs.borderTopLeftRadius;
        vars["--bm-n-padding"] = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
        vars["--bm-n-font"] = cs.fontFamily;
        vars["--bm-n-size"] = cs.fontSize;
        vars["--bm-n-line"] = cs.lineHeight;
    }

    return { className, width, vars };
}

export function sameNativeStyle(a: NativeCodeStyle | null, b: NativeCodeStyle | null): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
