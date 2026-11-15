/*
 * Enhanced content
 *
 * renderBlock(): turns a parsed block into its React component.
 * EnhancedContent: the wrapper rendered for each message (and for the live
 * preview in the settings). It subscribes to the theme settings, so changing
 * the theme or a custom color updates every visible enhanced message live.
 */

import type { ParsedBlock } from "../parser";
import { parseSubtext } from "../parser/heading";
import { settings } from "../settings";
import { colorsToVars, type CustomColors, resolveColors, type ThemeName } from "../theme";
import { Blockquote } from "./Blockquote";
import { CodeBlock } from "./CodeBlock";
import { FootnoteSection } from "./Footnote";
import { Heading, Subtext } from "./Heading";
import { Hr } from "./Hr";
import { MathBlock } from "./Math";
import { MermaidBlock } from "./Mermaid";
import { renderInline } from "./shared";
import { Table } from "./Table";
import { TaskList } from "./TaskList";

export function themeClass(theme: ThemeName): string {
    switch (theme) {
        case "github": return "bm-theme-github";
        case "light": return "bm-theme-light";
        // "bm-themed" = rules shared by the variable-driven themes (Neutron, Custom)
        case "neutron": return "bm-themed bm-theme-neutron";
        case "custom": return "bm-themed bm-theme-custom";
        default: return "";
    }
}

/**
 * Render a text block using Discord's markdown parser for inline formatting.
 * Handles {{MATH:...}} and {{FN:...}} placeholders via shared.tsx's renderInline().
 * Preserves bold, italic, code, spoilers, emoji, mentions, etc.
 */
export function renderTextBlock(text: string, key: number): React.ReactNode {
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

/**
 * Render a single parsed block as a React component.
 */
export function renderBlock(
    block: ParsedBlock,
    key: number,
    theme: ThemeName,
    colors: CustomColors
): React.ReactNode {
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
            return <MermaidBlock key={key} code={block.content.code} theme={theme} colors={colors} />;
        case "codeBlock":
            return <CodeBlock key={key} raw={block.content.raw} />;
        case "text":
            return renderTextBlock(block.content, key);
        default:
            return null;
    }
}

export function EnhancedContent({ blocks, messageId }: { blocks: ParsedBlock[]; messageId?: string; }) {
    // Re-render when the theme or the custom colors change
    const s = settings.use(["theme", "customColors"]);
    const theme = (s.theme ?? "dark") as ThemeName;
    const colors = resolveColors(s.customColors);

    // Hide ONLY this message's own original content, by id. A global
    // ":has(.bm-enhanced-content) [id^=message-content-]" rule also hid the
    // text of messages that merely CONTAIN another rendered message
    // (e.g. MessageLinkEmbeds), since the embedded one is nested inside.
    const safeId = messageId ? String(messageId).replace(/[^\w-]/g, "") : null;

    return (
        <div
            className={`bm-enhanced-content ${themeClass(theme)}`.trim()}
            style={theme === "custom" ? colorsToVars(colors) as React.CSSProperties : undefined}
            data-bm-message-id={messageId}
        >
            {safeId && <style>{`#message-content-${safeId}{display:none}`}</style>}
            {blocks.map((block, i) => renderBlock(block, i, theme, colors))}
        </div>
    );
}
