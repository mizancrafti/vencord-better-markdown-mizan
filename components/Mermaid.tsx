/*
 * Mermaid Diagram Component
 *
 * Renders mermaid diagram source as SVG.
 * Loads Mermaid asynchronously and shows loading/error states.
 * On error, falls back to displaying the raw mermaid code.
 */

import { useState, useEffect, useRef } from "@webpack/common";
import { renderDiagram } from "../mermaid-loader";
import { type CustomColors, getMermaidPalette, type ThemeName } from "../theme";

let idCounter = 0;

export function MermaidBlock({ code, theme = "dark", colors }: { code: string; theme?: ThemeName; colors?: CustomColors; }) {
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const idRef = useRef(`bm-mermaid-${Date.now()}-${idCounter++}`);
    const renderCount = useRef(0);

    // Only the colors Mermaid uses matter for re-rendering
    const paletteKey = JSON.stringify(getMermaidPalette(theme === "custom" ? "custom" : "dark", colors));

    useEffect(() => {
        let cancelled = false;

        // The old diagram stays visible until the new one is ready (no flicker
        // while colors are being edited). A fresh id per render avoids clashes.
        const id = `${idRef.current}-${renderCount.current++}`;
        renderDiagram(id, code, getMermaidPalette(theme, colors))
            .then(result => {
                if (cancelled) return;
                setError(false);
                setSvg(result);
            })
            .catch(() => {
                if (cancelled) return;
                setError(true);
            });

        return () => { cancelled = true; };
    }, [code, theme, paletteKey]);

    if (error) {
        return (
            <div className="bm-mermaid-wrapper bm-mermaid-error">
                <pre><code>{code}</code></pre>
            </div>
        );
    }

    if (svg === null) {
        return (
            <div className="bm-mermaid-wrapper bm-mermaid-loading">
                <span>Rendering diagram…</span>
            </div>
        );
    }

    return (
        <div
            className="bm-mermaid-wrapper"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
