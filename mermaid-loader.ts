/*
 * Mermaid CDN Loader
 *
 * Dynamically loads Mermaid JS from jsdelivr CDN.
 * Caches the loaded module so subsequent calls are instant.
 * Lazy-loaded on first encounter (Mermaid is heavier than KaTeX).
 * Provides cleanup for plugin stop lifecycle.
 */

import { hexToRgb, luminance, type MermaidPalette, mix, toHex, WHITE, BLACK } from "./theme";

const MERMAID_VERSION = "11";
const CDN_URL = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`;

/**
 * Mermaid config. With a palette (Neutron / Custom themes) it uses Mermaid's
 * "base" theme with colors derived from it; without one, the built-in dark theme.
 */
function buildConfig(palette: MermaidPalette | null): Record<string, any> {
    const base = {
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
    };
    if (!palette) return { ...base, theme: "dark" };

    const nodeBg = hexToRgb(palette.nodeBg);
    const border = hexToRgb(palette.nodeBorder);
    const cluster = hexToRgb(palette.cluster);
    const nodeLight = mix(nodeBg, WHITE, 0.45);
    const t = palette.text;

    return {
        ...base,
        theme: "base",
        themeVariables: {
            darkMode: luminance(nodeBg) < 0.5,
            fontFamily: getComputedStyle(document.body).fontFamily,
            background: palette.cluster,
            // Nodes
            primaryColor: palette.nodeBg,
            primaryTextColor: t,
            primaryBorderColor: palette.nodeBorder,
            secondaryColor: toHex(mix(border, cluster, 0.7)),
            secondaryTextColor: t,
            secondaryBorderColor: palette.nodeBorder,
            tertiaryColor: palette.cluster,
            tertiaryTextColor: t,
            tertiaryBorderColor: toHex(nodeLight),
            // Lines and labels
            lineColor: palette.line,
            textColor: t,
            edgeLabelBackground: palette.cluster,
            // Subgraphs
            clusterBkg: palette.cluster,
            clusterBorder: toHex(nodeLight),
            // Notes
            noteBkgColor: toHex(mix(border, cluster, 0.75)),
            noteTextColor: t,
            noteBorderColor: palette.nodeBorder,
            // Sequence diagrams
            actorBkg: palette.nodeBg,
            actorBorder: palette.nodeBorder,
            actorTextColor: t,
            actorLineColor: toHex(nodeLight),
            signalColor: palette.line,
            signalTextColor: t,
            labelBoxBkgColor: toHex(mix(nodeBg, cluster, 0.5)),
            labelBoxBorderColor: palette.nodeBorder,
            labelTextColor: t,
            loopTextColor: t,
            activationBkgColor: toHex(mix(border, cluster, 0.6)),
            activationBorderColor: palette.nodeBorder,
            // Pie charts
            pie1: palette.nodeBorder,
            pie2: toHex(nodeLight),
            pie3: toHex(mix(border, WHITE, 0.4)),
            pie4: palette.nodeBg,
            pie5: toHex(mix(border, BLACK, 0.35)),
            pie6: toHex(mix(nodeBg, WHITE, 0.7)),
            pieTitleTextColor: t,
            pieSectionTextColor: palette.cluster,
            pieLegendTextColor: t,
            pieStrokeColor: palette.cluster,
        },
    };
}

let mermaidModule: any = null;
let loadPromise: Promise<any> | null = null;
let initialized = false;

export async function loadMermaid(): Promise<any> {
    if (mermaidModule) return mermaidModule;
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = CDN_URL;
        script.onload = () => {
            mermaidModule = (window as any).mermaid;
            if (!initialized && mermaidModule) {
                mermaidModule.initialize(buildConfig(null));
                initialized = true;
            }
            resolve(mermaidModule);
        };
        script.onerror = () => reject(new Error("Failed to load Mermaid"));
        document.head.appendChild(script);
    });

    return loadPromise;
}

export function isMermaidLoaded(): boolean {
    return mermaidModule != null;
}

export async function renderDiagram(
    id: string,
    code: string,
    palette: MermaidPalette | null = null
): Promise<string> {
    const mermaid = await loadMermaid();
    // Re-initialize so the colors follow the plugin's theme
    mermaid.initialize(buildConfig(palette));
    const { svg } = await mermaid.render(id, code);
    return svg;
}

export function cleanup(): void {
    const scripts = document.querySelectorAll(`script[src*="mermaid"]`);
    scripts.forEach(s => s.remove());
    mermaidModule = null;
    loadPromise = null;
    initialized = false;
    delete (window as any).mermaid;
}
