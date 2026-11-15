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

// Defaults reproduce the Neutron look (orange accent + blue secondary)
export const COLOR_FIELDS: ColorField[] = [
    f("Headings", "headingMain", "Headings 1–2", "--bm-h-main", "#ffa130"),
    f("Headings", "headingSub", "Headings 3–4", "--bm-h-sub", "#a0b4c7"),

    f("Blockquotes", "quote1", "Level 1 border", "--bm-bq-1", "#ffa130"),
    f("Blockquotes", "quote2", "Level 2 border", "--bm-bq-2", "#a0b4c7"),
    f("Blockquotes", "quote3", "Level 3 border", "--bm-bq-3", "#ffc783"),
    f("Blockquotes", "quote4", "Level 4 border", "--bm-bq-4", "#2c5882"),
    f("Blockquotes", "quote5", "Level 5 border", "--bm-bq-5", "#a6691f"),
    f("Blockquotes", "quote6", "Level 6 border", "--bm-bq-6", "#c6d2dd"),
    f("Blockquotes", "quoteBg", "Background", "--bm-bq-bg", "#000000"),

    f("Tables", "tableHeaderBg", "Header background", "--bm-table-header-bg", "#000000"),
    f("Tables", "tableHeaderText", "Header text", "--bm-table-header-text", "#ffa130"),
    f("Tables", "tableHeaderLine", "Header underline", "--bm-table-header-line", "#ffa130"),
    f("Tables", "tableBorder", "Border", "--bm-table-border", "#2c5882"),
    f("Tables", "tableRowAlt", "Alternate rows", "--bm-table-row-alt", "#2c5882"),

    f("Divider", "hrStart", "Line start", "--bm-hr-start", "#ffa130"),
    f("Divider", "hrEnd", "Line end", "--bm-hr-end", "#2c5882"),

    f("Task lists", "taskChecked", "Checked box", "--bm-task-checked", "#ffa130"),

    f("Footnotes", "footnoteLink", "Links", "--bm-footnote", "#ffa130"),

    f("Code blocks (copy button)", "copyBg", "Background", "--bm-copy-bg", "#000000"),
    f("Code blocks (copy button)", "copyBorder", "Border", "--bm-copy-border", "#2c5882"),
    f("Code blocks (copy button)", "copyIcon", "Icon", "--bm-copy-icon", "#ffa130"),

    f("Mermaid diagrams", "mermaidBg", "Background", "--bm-mermaid-bg", "#000000"),
    f("Mermaid diagrams", "mermaidBorder", "Frame", "--bm-mermaid-border", "#2c5882"),
    f("Mermaid diagrams", "mermaidNodeBg", "Node fill", "--bm-mermaid-node-bg", "#264d75"),
    f("Mermaid diagrams", "mermaidNodeBorder", "Node border", "--bm-mermaid-node-border", "#ffa130"),
    f("Mermaid diagrams", "mermaidLine", "Lines and arrows", "--bm-mermaid-line", "#ffa130"),
    f("Mermaid diagrams", "mermaidText", "Text", "--bm-mermaid-text", "#e6edf7"),
    f("Mermaid diagrams", "mermaidCluster", "Group background", "--bm-mermaid-cluster", "#0e2644"),
];

export const DEFAULT_COLORS: CustomColors = Object.fromEntries(
    COLOR_FIELDS.map(field => [field.key, field.default])
);

export function isValidHex(value: unknown): value is string {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Saved colors merged over the defaults; anything invalid falls back to the default. */
export function resolveColors(saved: CustomColors | undefined | null): CustomColors {
    const out: CustomColors = {};
    for (const field of COLOR_FIELDS) {
        const v = saved?.[field.key];
        out[field.key] = isValidHex(v) ? v.toLowerCase() : field.default;
    }
    return out;
}

/** Inline CSS variables for the "Custom" theme (validated: only #rrggbb gets through). */
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
    return {
        nodeBg: c.mermaidNodeBg,
        nodeBorder: c.mermaidNodeBorder,
        line: c.mermaidLine,
        text: c.mermaidText,
        cluster: c.mermaidCluster,
    };
}

/** null = keep Mermaid's built-in dark theme (dark / light / github presets). */
export function getMermaidPalette(theme: ThemeName, saved: CustomColors | undefined | null): MermaidPalette | null {
    if (theme === "neutron") return neutronMermaidPalette();
    if (theme === "custom") return customMermaidPalette(saved);
    return null;
}
