/*
 * Plugin settings
 *
 * Lives in its own module so the theme editor and the enhanced-content
 * component can read it too (they use settings.use() to re-render live).
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { ThemeEditor } from "./components/ThemeEditor";
import { type CustomColors, DEFAULT_COLORS } from "./theme";

export const settings = definePluginSettings({
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
            { label: "Neutron / Jaya Abadi (mizan's theme)", value: "neutron" },
            { label: "Custom (edit every color below)", value: "custom" },
        ],
        restartNeeded: false,
    },
    // Colors of the "Custom" theme (no UI of its own: edited in the panel below)
    customColors: {
        type: OptionType.CUSTOM,
        default: { ...DEFAULT_COLORS } as CustomColors,
    },
    // Color editor + live preview, only visible when the theme is "Custom"
    themeEditor: {
        type: OptionType.COMPONENT,
        component: () => <ThemeEditor />,
    },
});
