/*
 * Code Block Component
 *
 * Renders ``` blocks with Discord's own markdown parser (block mode), so they
 * look exactly like native code blocks: syntax highlighting, same styling.
 *
 * Discord's native copy button doesn't work outside its own message renderer
 * (it's wired up by the message container, not by the block itself), so we
 * hide it and add our own working one in the top-right corner.
 */

import { findByPropsLazy } from "@webpack";
import { Parser, useEffect, useRef, useState } from "@webpack/common";

import { type NativeCodeStyle, readNativeCodeStyle, sameNativeStyle } from "./nativeCodeStyle";

// The CSS module that has both "markup" and "codeActions" is the one that
// styles code blocks; plain "markup" is only a fallback.
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
 * Pull the code out of the raw ``` fences (language tag and fences removed).
 * If the range holds several blocks, they're joined with a blank line.
 */
function extractCode(raw: string): string {
    const out: string[] = [];
    let inBlock = false;
    let current: string[] = [];

    for (const line of raw.split("\n")) {
        const idx = line.indexOf("```");
        if (!inBlock) {
            if (idx === -1) continue; // text outside the block
            const end = line.indexOf("```", idx + 3);
            if (end !== -1) {
                // Single-line block: ```text```
                out.push(line.slice(idx + 3, end).trim());
                continue;
            }
            inBlock = true;
            current = [];
        } else if (idx !== -1) {
            // Closing fence (keep anything written before it on the same line)
            const before = line.slice(0, idx);
            if (before.trim()) current.push(before);
            out.push(current.join("\n"));
            inBlock = false;
        } else {
            current.push(line);
        }
    }
    if (inBlock) out.push(current.join("\n")); // unclosed block

    return out.join("\n\n");
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

async function copyText(text: string): Promise<boolean> {
    try {
        const native = (window as any).DiscordNative?.clipboard;
        if (native?.copy) {
            native.copy(text);
            return true;
        }
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
);

const FailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
);

export function CodeBlock({ raw }: { raw: string; }) {
    const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    async function handleCopy(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        const ok = await copyText(extractCode(raw));
        setStatus(ok ? "ok" : "fail");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus("idle"), 1500);
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
            <button
                type="button"
                className={`bm-cb-btn${status === "ok" ? " bm-cb-btn-done" : status === "fail" ? " bm-cb-btn-fail" : ""}`}
                onClick={handleCopy}
                aria-label="Copy code"
                title={status === "ok" ? "Copied!" : status === "fail" ? "Failed to copy" : "Copy code"}
            >
                {status === "ok" ? <CheckIcon /> : status === "fail" ? <FailIcon /> : <CopyIcon />}
            </button>
        </div>
    );
}
