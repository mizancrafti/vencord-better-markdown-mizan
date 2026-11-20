/*
 * Code Block Component
 *
 * Renders ``` blocks with Discord's own markdown parser (block mode), so they
 * look and behave like native code blocks: syntax highlighting, the same
 * styling and Discord's own copy button.
 *
 * The block is drawn outside the element where Discord draws its native ones,
 * so its width and look are copied from the original message
 * (see nativeCodeStyle.ts).
 */

import { findByPropsLazy } from "@webpack";
import { Parser, useEffect, useRef, useState } from "@webpack/common";

import { type NativeCodeStyle, readNativeCodeStyle, sameNativeStyle } from "./nativeCodeStyle";

const MarkupClasses = findByPropsLazy("markup");
let markupClass: string | null = null;

// Fallback (e.g. the settings preview, where there's no original message to
// copy from): Discord scopes its code block styles under its "markup" class.
function getMarkupClass(): string {
    if (markupClass !== null) return markupClass;
    try {
        markupClass = MarkupClasses?.markup ?? "";
    } catch {
        markupClass = "";
    }
    return markupClass as string;
}

/**
 * Discord's block-level parser can leave blank text nodes (a trailing "\n")
 * around the code block. Inside the message markup (which keeps line breaks)
 * that shows up as an empty line under the block, so drop them.
 */
export function trimBlankNodes(nodes: React.ReactNode): React.ReactNode {
    if (!Array.isArray(nodes)) return nodes;
    const isBlank = (n: React.ReactNode) => n == null || n === false || (typeof n === "string" && n.trim() === "");
    let start = 0;
    let end = nodes.length;
    while (start < end && isBlank(nodes[start])) start++;
    while (end > start && isBlank(nodes[end - 1])) end--;
    return nodes.slice(start, end);
}

export function CodeBlock({ raw }: { raw: string; }) {
    const wrapper = useRef<HTMLDivElement>(null);
    const [native, setNative] = useState<NativeCodeStyle | null>(null);

    // Copy the look and width of the native code block of the original message,
    // and keep them in sync when the chat is resized
    useEffect(() => {
        const el = wrapper.current;
        if (!el) return;

        let last: NativeCodeStyle | null = null;
        const sync = () => {
            try {
                const next = readNativeCodeStyle(el);
                if (!sameNativeStyle(last, next)) {
                    last = next;
                    setNative(next);
                }
            } catch {
                // Keep the fallback look
            }
        };

        sync();
        const container = el.closest('[id^="message-accessories-"]') ?? el.parentElement;
        if (!container || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(sync);
        observer.observe(container);
        return () => observer.disconnect();
    }, [raw]);

    let rendered: React.ReactNode = null;
    try {
        // inline = false → block-level rules (code blocks) are enabled
        rendered = trimBlankNodes(Parser.parse(raw, false));
    } catch {
        rendered = <pre><code>{raw}</code></pre>;
    }

    return (
        <div
            ref={wrapper}
            className={`bm-code-block ${native?.className || getMarkupClass()}`.trim()}
            data-bm-synced={native && Object.keys(native.vars).length ? "" : undefined}
            style={native ? {
                ...native.vars,
                width: native.width ? `${native.width}px` : undefined,
                maxWidth: "100%",
            } as React.CSSProperties : undefined}
        >
            {rendered}
        </div>
    );
}
