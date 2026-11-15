/*
 * BetterMarkdown — Vencord Userplugin
 *
 * Enhances Discord's markdown rendering with full GFM support:
 * tables, task lists, proper headings, horizontal rules,
 * footnotes, nested blockquotes, KaTeX math, and Mermaid diagrams.
 *
 * Architecture: MessageAccessory + CSS content hiding.
 * Uses Vencord's renderMessageAccessory API to render enhanced
 * components. The original message content is hidden by a per-message
 * CSS rule — no raw DOM manipulation or webpack patches needed.
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

import { EnhancedContent } from "./components/Enhanced";
import { setColorSwatchesEnabled } from "./components/shared";
import { cleanup as cleanupKaTeX, loadKaTeX } from "./katex-loader";
import { cleanup as cleanupMermaid } from "./mermaid-loader";
import { type FeatureFlags, hasGfmPatterns, parseMessage } from "./parser";
import { detectHexColor } from "./parser/colors";
import { isTableContinuation, resolveContinuationHeader } from "./parser/tableContinuation";
import { settings } from "./settings";

import "./style.css";

const MessageStore = findByPropsLazy("getMessages", "getMessage");

/**
 * If the message is the continuation of a table split across messages
 * (rows only, no header), prepend the header + separator of the table from
 * the previous messages by the same author, so it renders as a normal table.
 * Returns the content unchanged if it isn't a continuation.
 */
function withTableContinuation(message: any, flags: FeatureFlags): string {
    const content: string = message.content;
    if (!flags.enableTables || !isTableContinuation(content)) return content;

    try {
        const collection = MessageStore.getMessages(message.channel_id);
        const all: any[] = collection?.toArray?.() ?? collection?._array;
        if (!Array.isArray(all)) return content;

        const index = all.findIndex(m => m.id === message.id);
        if (index <= 0) return content;

        // Previous messages by the same author, nearest first
        const previous: string[] = [];
        for (let i = index - 1; i >= 0 && previous.length < 20; i--) {
            if (all[i].author?.id !== message.author?.id) break;
            previous.push(all[i].content ?? "");
        }

        const header = resolveContinuationHeader(previous);
        return header ? `${header[0]}\n${header[1]}\n${content}` : content;
    } catch {
        return content;
    }
}

function getFeatureFlags(): FeatureFlags {
    return {
        enableTables: settings.store.enableTables,
        enableTaskLists: settings.store.enableTaskLists,
        enableHeadings: settings.store.enableHeadings,
        enableHorizontalRules: settings.store.enableHorizontalRules,
        enableFootnotes: settings.store.enableFootnotes,
        enableNestedBlockquotes: settings.store.enableNestedBlockquotes,
        enableMath: settings.store.enableMath,
        enableMermaid: settings.store.enableMermaid,
        enableColorSwatches: settings.store.enableColorSwatches,
    };
}

export default definePlugin({
    name: "BetterMarkdown",
    description: "Enhanced markdown: GFM tables, task lists, headings, HR, footnotes, blockquotes, KaTeX math, Mermaid diagrams",
    authors: [{ name: "Rei", id: 0n }],
    settings,

    // No patches needed — we use renderMessageAccessory (Vencord API) to add
    // enhanced content, and CSS :has() to hide the original message content.
    // This avoids both raw DOM manipulation and fragile webpack patches.

    start() {
        if (settings.store.enableMath) {
            loadKaTeX().catch(() => {
                // Silently fail — KaTeX will retry on first render
            });
        }
    },

    stop() {
        cleanupKaTeX();
        cleanupMermaid();
    },

    /**
     * Render enhanced markdown as a message accessory.
     * The original content is hidden by a per-message <style> rule rendered
     * by EnhancedContent (see components/Enhanced.tsx).
     */
    renderMessageAccessory(props: { message: any; }) {
        try {
            if (!props.message?.content || typeof props.message.content !== "string") return null;

            const flags = getFeatureFlags();
            const content = withTableContinuation(props.message, flags);
            setColorSwatchesEnabled(flags.enableColorSwatches);
            if (!hasGfmPatterns(content, flags)) return null;

            const blocks = parseMessage(content, flags);

            // If parsing produced only plain text with no enhanced placeholders,
            // no enhancement needed.
            if (blocks.length === 1 && blocks[0].type === "text") {
                const text = blocks[0].content;
                const needsRender =
                    text.includes("{{MATH:") ||
                    text.includes("{{FN:") ||
                    (flags.enableColorSwatches && detectHexColor(text));
                if (!needsRender) return null;
            }

            return <EnhancedContent blocks={blocks} messageId={props.message.id} />;
        } catch (e) {
            console.error("[BetterMarkdown] Error enhancing content:", e);
            return null;
        }
    },

    /**
     * Check if a message should have enhanced rendering.
     * Exported for potential use by other plugins.
     */
    shouldEnhance(content: string): boolean {
        if (!content || typeof content !== "string") return false;
        return hasGfmPatterns(content, getFeatureFlags());
    },
});
