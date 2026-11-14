/*
 * BetterMarkdown — Vencord Userplugin
 *
 * Enhances Discord's markdown rendering with full GFM support:
 * tables, task lists, proper headings, horizontal rules,
 * footnotes, nested blockquotes, KaTeX math, and Mermaid diagrams.
 *
 * Architecture: MessageAccessory + CSS content hiding.
 * Uses Vencord's renderMessageAccessory API to render enhanced
 * components. Original message content is hidden via CSS :has()
 * selector — no raw DOM manipulation or webpack patches needed.
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { parseMessage, hasGfmPatterns, type ParsedBlock, type FeatureFlags } from "./parser";
import { Table } from "./components/Table";
import { TaskList } from "./components/TaskList";
import { findByPropsLazy } from "@webpack";
import { CodeBlock } from "./components/CodeBlock";
import { Heading, Subtext } from "./components/Heading";
import { parseSubtext } from "./parser/heading";
import { Hr } from "./components/Hr";
import { FootnoteSection } from "./components/Footnote";
import { Blockquote } from "./components/Blockquote";
import { MathBlock } from "./components/Math";
import { MermaidBlock } from "./components/Mermaid";
import { renderInline, setColorSwatchesEnabled } from "./components/shared";
import { detectHexColor } from "./parser/colors";
import { isTableContinuation, resolveContinuationHeader } from "./parser/tableContinuation";
import { loadKaTeX, cleanup as cleanupKaTeX } from "./katex-loader";
import { cleanup as cleanupMermaid } from "./mermaid-loader";

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

const settings = definePluginSettings({
    enableTables: {
        type: OptionType.BOOLEAN,
        description: "Render GFM tables",
        default: true,
        restartNeeded: false,
    },
    enableTaskLists: {
        type: OptionType.BOOLEAN,
        description: "Render task list checkboxes",
        default: true,
        restartNeeded: false,
    },
    enableHeadings: {
        type: OptionType.BOOLEAN,
        description: "Render heading hierarchy (h1–h6 with proper sizing)",
        default: true,
        restartNeeded: false,
    },
    enableHorizontalRules: {
        type: OptionType.BOOLEAN,
        description: "Render horizontal rules (---, ***, ___)",
        default: true,
        restartNeeded: false,
    },
    enableFootnotes: {
        type: OptionType.BOOLEAN,
        description: "Render footnotes with references and definitions",
        default: true,
        restartNeeded: false,
    },
    enableNestedBlockquotes: {
        type: OptionType.BOOLEAN,
        description: "Better nested blockquotes with visual depth",
        default: true,
        restartNeeded: false,
    },
    enableMath: {
        type: OptionType.BOOLEAN,
        description: "Render LaTeX math formulas via KaTeX ($...$ inline, $$...$$ block)",
        default: true,
        restartNeeded: false,
    },
    enableMermaid: {
        type: OptionType.BOOLEAN,
        description: "Render Mermaid diagrams from ```mermaid code blocks",
        default: true,
        restartNeeded: false,
    },
    enableColorSwatches: {
        type: OptionType.BOOLEAN,
        description: "Show a color square next to hex colors (#RGB, #RRGGBB, #RRGGBBAA)",
        default: true,
        restartNeeded: false,
    },
    theme: {
        type: OptionType.SELECT,
        description: "Visual theme for enhanced elements",
        options: [
            { label: "Discord Dark", value: "dark", default: true },
            { label: "Discord Light", value: "light" },
            { label: "GitHub", value: "github" },
        ],
        restartNeeded: false,
    },
});

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

function getThemeClass(): string {
    const theme = settings.store.theme;
    if (theme === "github") return "bm-theme-github";
    if (theme === "light") return "bm-theme-light";
    return "";
}

/**
 * Render a single parsed block as a React component.
 */
function renderBlock(block: ParsedBlock, key: number): React.ReactNode {
    switch (block.type) {
        case "table":
            return <Table key={key} data={block.content} />;
        case "taskList":
            return <TaskList key={key} data={block.content} />;
        case "heading":
            return <Heading key={key} data={block.content} />;
        case "hr":
            return <Hr key={key} />;
        case "footnoteSection":
            return <FootnoteSection key={key} data={block.content} />;
        case "blockquote":
            return <Blockquote key={key} data={block.content} />;
        case "mathBlock":
            return <MathBlock key={key} latex={block.content.latex} />;
        case "mermaidBlock":
            return <MermaidBlock key={key} code={block.content.code} />;
        case "codeBlock":
            return <CodeBlock key={key} raw={block.content.raw} />;
        case "text":
            return renderTextBlock(block.content, key);
        default:
            return null;
    }
}

/**
 * Render a text block using Discord's markdown parser for inline formatting.
 * Handles {{MATH:...}} and {{FN:...}} placeholders via shared.tsx's renderInline().
 * Preserves bold, italic, code, spoilers, emoji, mentions, etc.
 */
function renderTextBlock(text: string, key: number): React.ReactNode {
    return (
        <span key={key} className="bm-text-block">
            {text.split("\n").map((line, i, arr) => {
                const subtext = parseSubtext(line);
                if (subtext) return <Subtext key={i} text={subtext} />;
                return (
                    <span key={i}>
                        {renderInline(line)}
                        {i < arr.length - 1 && <br />}
                    </span>
                );
            })}
        </span>
    );
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
     * next to the enhanced content (see below).
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

            const themeClass = getThemeClass();

            // Hide ONLY this message's own original content, by id. A global
            // ":has(.bm-enhanced-content) [id^=message-content-]" rule also hid
            // the text of messages that merely CONTAIN another rendered message
            // (e.g. MessageLinkEmbeds), since the embedded one is nested inside.
            const safeId = String(props.message.id).replace(/[^\w-]/g, "");

            return (
                <div className={`bm-enhanced-content ${themeClass}`.trim()} data-bm-message-id={props.message.id}>
                    <style>{`#message-content-${safeId}{display:none}`}</style>
                    {blocks.map((block, i) => renderBlock(block, i))}
                </div>
            );
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
