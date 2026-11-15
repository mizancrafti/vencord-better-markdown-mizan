/*
 * Theme definitions (no Vencord/webpack imports: pure TypeScript + DOM)
 *
 * - ThemeName: the presets selectable in the plugin settings.
 * - COLOR_FIELDS: every color the "Custom" theme lets you edit. Each one maps
 *   to a CSS variable (--bm-*) consumed by the rules in style.css, which are
 *   shared by the "Neutron" and "Custom" themes.
 * - Color helpers also used by the Mermaid loader.
 */

export type ThemeName = "dark" | "light" | "github" | "neutron" | "custom";

export interface ColorField {
    key: string;
    label: string;
    group: string;
    cssVar: string;
    default: string;
}

export type CustomColors = Record<string, string>;

const f = (group: string, key: string, label: string, cssVar: string, def: string): ColorField =>
    ({ group, key, label, cssVar, default: def });

// Defaults reproduce the "Discord Dark" theme. Fields that are transparent
// in Discord have an alpha channel (#rrggbbaa).
export const COLOR_FIELDS: ColorField[] = [
    f("Headings", "heading1", "Heading 1", "--bm-h-1", "#f2f3f5"),
    f("Headings", "heading2", "Heading 2", "--bm-h-2", "#f2f3f5"),
    f("Headings", "heading3", "Heading 3", "--bm-h-3", "#f2f3f5"),
    f("Headings", "heading4", "Heading 4", "--bm-h-4", "#f2f3f5"),
    f("Headings", "heading5", "Heading 5", "--bm-h-5", "#949ba4"),
    f("Headings", "heading6", "Heading 6", "--bm-h-6", "#949ba4"),
    f("Headings", "headingLine", "Heading 1–2 underline", "--bm-h-line", "#4f545c7a"),

    f("Blockquotes", "quote1", "Level 1 border", "--bm-bq-1", "#949ba4"),
    f("Blockquotes", "quote2", "Level 2 border", "--bm-bq-2", "#5865f2"),
    f("Blockquotes", "quote3", "Level 3 border", "--bm-bq-3", "#2dc770"),
    f("Blockquotes", "quote4", "Level 4 border", "--bm-bq-4", "#faa61a"),
    f("Blockquotes", "quote5", "Level 5 border", "--bm-bq-5", "#ed4245"),
    f("Blockquotes", "quote6", "Level 6 border", "--bm-bq-6", "#7289da"),
    f("Blockquotes", "quoteBg", "Background", "--bm-bq-bg", "#00000000"),

    f("Tables", "tableHeaderBg", "Header background", "--bm-table-header-bg", "#2b2d31"),
    f("Tables", "tableHeaderText", "Header text", "--bm-table-header-text", "#f2f3f5"),
    f("Tables", "tableHeaderLine", "Header underline", "--bm-table-header-line", "#4f545c7a"),
    f("Tables", "tableBorder", "Outer border", "--bm-table-border", "#00000000"),
    f("Tables", "tableRowLine", "Row lines", "--bm-table-row-line", "#4f545c3d"),
    f("Tables", "tableRowAlt", "Alternate rows", "--bm-table-row-alt", "#232428"),

    f("Divider", "hrStart", "Line start", "--bm-hr-start", "#4f545c7a"),
    f("Divider", "hrEnd", "Line end", "--bm-hr-end", "#4f545c7a"),

    f("Task lists", "taskChecked", "Checked box", "--bm-task-checked", "#5865f2"),

    f("Footnotes", "footnoteLink", "Links", "--bm-footnote", "#5865f2"),

    f("Code blocks (copy button)", "copyBg", "Background", "--bm-copy-bg", "#2b2d31"),
    f("Code blocks (copy button)", "copyBorder", "Border", "--bm-copy-border", "#ffffff1f"),
    f("Code blocks (copy button)", "copyIcon", "Icon", "--bm-copy-icon", "#b5bac1"),

    // Mermaid defaults are the values of Mermaid's own built-in dark theme
    f("Mermaid diagrams", "mermaidBg", "Background", "--bm-mermaid-bg", "#2b2d31"),
    f("Mermaid diagrams", "mermaidBorder", "Frame", "--bm-mermaid-border", "#00000000"),
    f("Mermaid diagrams", "mermaidNodeBg", "Node fill", "--bm-mermaid-node-bg", "#1f2020"),
    f("Mermaid diagrams", "mermaidNodeBorder", "Node border", "--bm-mermaid-node-border", "#cccccc"),
    f("Mermaid diagrams", "mermaidLine", "Lines and arrows", "--bm-mermaid-line", "#d3d3d3"),
    f("Mermaid diagrams", "mermaidText", "Text", "--bm-mermaid-text", "#e0dfdf"),
    f("Mermaid diagrams", "mermaidCluster", "Group background", "--bm-mermaid-cluster", "#474949"),
];

export const DEFAULT_COLORS: CustomColors = Object.fromEntries(
    COLOR_FIELDS.map(field => [field.key, field.default])
);

/** #rrggbb or #rrggbbaa */
export function isValidHex(value: unknown): value is string {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value);
}

// Defaults of the previous versions of the Custom theme (the Neutron palette).
// A saved value equal to one of these was never really customized (the editor
// used to save every color on the first edit), so it follows the new defaults.
const LEGACY_DEFAULTS: Record<string, string> = {
    heading1: "#ffa130", heading2: "#ffa130", heading3: "#a0b4c7", heading4: "#a0b4c7",
    quote1: "#ffa130", quote2: "#a0b4c7", quote3: "#ffc783", quote4: "#2c5882", quote5: "#a6691f", quote6: "#c6d2dd",
    quoteBg: "#000000", tableHeaderBg: "#000000", tableHeaderText: "#ffa130", tableHeaderLine: "#ffa130",
    tableBorder: "#2c5882", tableRowAlt: "#2c5882", hrStart: "#ffa130", hrEnd: "#2c5882",
    taskChecked: "#ffa130", footnoteLink: "#ffa130", copyBg: "#000000", copyBorder: "#2c5882", copyIcon: "#ffa130",
    mermaidBg: "#000000", mermaidBorder: "#2c5882", mermaidNodeBg: "#264d75", mermaidNodeBorder: "#ffa130",
    mermaidLine: "#ffa130", mermaidText: "#e6edf7", mermaidCluster: "#0e2644",
};

// Colors saved before headings had one color per level (1–2 and 3–4 were shared)
const LEGACY_KEYS: Record<string, string> = {
    heading1: "headingMain",
    heading2: "headingMain",
    heading3: "headingSub",
    heading4: "headingSub",
};

/** Saved colors merged over the defaults; anything invalid falls back to the default. */
export function resolveColors(saved: CustomColors | undefined | null): CustomColors {
    const out: CustomColors = {};
    for (const field of COLOR_FIELDS) {
        let v = saved?.[field.key];
        if (!isValidHex(v) && LEGACY_KEYS[field.key]) v = saved?.[LEGACY_KEYS[field.key]];
        const lower = isValidHex(v) ? v.toLowerCase() : null;
        out[field.key] = lower && lower !== LEGACY_DEFAULTS[field.key] ? lower : field.default;
    }
    return out;
}

/** Only the colors that differ from the defaults: that's what gets saved. */
export function toOverrides(colors: CustomColors): CustomColors {
    const out: CustomColors = {};
    for (const field of COLOR_FIELDS) {
        const v = colors[field.key];
        if (isValidHex(v) && v.toLowerCase() !== field.default) out[field.key] = v.toLowerCase();
    }
    return out;
}

/** Inline CSS variables for the "Custom" theme (validated: only #rrggbb / #rrggbbaa gets through). */
export function colorsToVars(colors: CustomColors): Record<string, string> {
    const resolved = resolveColors(colors);
    const vars: Record<string, string> = {};
    for (const field of COLOR_FIELDS) vars[field.cssVar] = resolved[field.key];
    // Check mark inside the checked box: black or white, whichever reads better
    vars["--bm-task-mark"] = luminance(hexToRgb(resolved.taskChecked)) > 0.55 ? "#000000" : "#ffffff";
    return vars;
}

/* ---------------------------------------------------------------
 * Color helpers
 * --------------------------------------------------------------- */

export type RGB = [number, number, number];

export const WHITE: RGB = [255, 255, 255];
export const BLACK: RGB = [0, 0, 0];

export function hexToRgb(hex: string): RGB {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function toHex([r, g, b]: RGB): string {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** Mix `a` with `b`; amount = share of `b` (0..1). */
export function mix(a: RGB, b: RGB, amount: number): RGB {
    return [0, 1, 2].map(i => a[i] * (1 - amount) + b[i] * amount) as RGB;
}

/** Relative luminance, 0 (black) .. 1 (white). */
export function luminance([r, g, b]: RGB): number {
    const lin = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Resolve any CSS color (hex, rgb(), named...) to RGB through the DOM. */
export function cssColorToRgb(cssColor: string, fallback: RGB): RGB {
    try {
        const el = document.createElement("span");
        el.style.color = cssColor;
        if (!el.style.color) return fallback;
        document.body.appendChild(el);
        const resolved = getComputedStyle(el).color;
        el.remove();
        const m = resolved.match(/[\d.]+/g);
        if (!m || m.length < 3) return fallback;
        return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])];
    } catch {
        return fallback;
    }
}

/* ---------------------------------------------------------------
 * Mermaid palette
 * --------------------------------------------------------------- */

export interface MermaidPalette {
    nodeBg: string;
    nodeBorder: string;
    line: string;
    text: string;
    cluster: string;
}

/** Palette for the "Neutron" preset: built from the theme's own variables. */
export function neutronMermaidPalette(): MermaidPalette {
    const root = getComputedStyle(document.documentElement);
    const accent = cssColorToRgb(root.getPropertyValue("--themeColor1").trim() || "#FFA130", [255, 161, 48]);
    const accent2 = cssColorToRgb(root.getPropertyValue("--themeColor2").trim() || "#2C5882", [44, 88, 130]);
    const bg: RGB = [1, 17, 42];
    return {
        nodeBg: toHex(mix(accent2, bg, 0.15)),
        nodeBorder: toHex(accent),
        line: toHex(accent),
        text: "#e6edf7",
        cluster: toHex(mix(accent2, bg, 0.7)),
    };
}

/** Palette for the "Custom" theme. */
export function customMermaidPalette(saved: CustomColors | undefined | null): MermaidPalette {
    const c = resolveColors(saved);
    const opaque = (hex: string) => hex.slice(0, 7); // Mermaid's color math has no alpha
    return {
        nodeBg: opaque(c.mermaidNodeBg),
        nodeBorder: opaque(c.mermaidNodeBorder),
        line: opaque(c.mermaidLine),
        text: opaque(c.mermaidText),
        cluster: opaque(c.mermaidCluster),
    };
}

/** null = keep Mermaid's built-in dark theme (dark / light / github presets). */
export function getMermaidPalette(theme: ThemeName, saved: CustomColors | undefined | null): MermaidPalette | null {
    if (theme === "neutron") return neutronMermaidPalette();
    if (theme === "custom") return customMermaidPalette(saved);
    return null;
}
