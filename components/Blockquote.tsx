/*
 * Nested Blockquote Component
 *
 * Renders blockquotes with visual nesting: cascading left borders
 * with depth-varying colors. Each nesting level gets a distinct
 * border color and slight indentation.
 */

import { type BlockquoteNode, type BlockquoteData } from "../parser/blockquote";
import { parseHeading, parseSubtext } from "../parser/heading";
import { CodeBlock } from "./CodeBlock";
import { Heading, Subtext } from "./Heading";
import { renderInline } from "./shared";

// Colors cycle through these for nested levels
const DEPTH_COLORS = [
    "var(--text-muted)",           // depth 1: default Discord quote color
    "var(--brand-500, #5865f2)",   // depth 2: blurple
    "var(--green-360, #2dc770)",   // depth 3: green
    "var(--yellow-300, #faa61a)",  // depth 4: yellow
    "var(--red-400, #ed4245)",     // depth 5: red
    "var(--brand-360, #7289da)",   // depth 6+: light blurple
];

function getDepthColor(depth: number): string {
    return DEPTH_COLORS[(depth - 1) % DEPTH_COLORS.length];
}

/**
 * Render a single line inside a blockquote.
 * Lines that are headings (`# text` ... `###### text`) are rendered with
 * the Heading component, `-# text` lines become subtext; everything else
 * goes through the inline parser.
 */
function QuoteLine({ line }: { line: string }) {
    const heading = parseHeading(line);
    if (heading) return <Heading data={heading} />;
    const subtext = parseSubtext(line);
    if (subtext) return <Subtext text={subtext} />;
    return <>{renderInline(line) || "\u00A0"}</>;
}

/**
 * Render the lines of a quote. Fenced code (```) is grouped into a single
 * CodeBlock (Discord's own renderer); everything else is rendered line by line.
 */
function renderQuoteLines(lines: string[]) {
    const out: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const fenceCount = (lines[i].match(/```/g) || []).length;

        if (fenceCount > 0) {
            // Block that opens and closes on the same line
            if (fenceCount % 2 === 0) {
                out.push(<CodeBlock key={i} raw={lines[i]} />);
                i++;
                continue;
            }
            // Find the closing fence; if there isn't one, it's just text
            let j = i + 1;
            while (j < lines.length && !lines[j].includes("```")) j++;
            if (j < lines.length) {
                out.push(<CodeBlock key={i} raw={lines.slice(i, j + 1).join("\n")} />);
                i = j + 1;
                continue;
            }
        }

        out.push(<div key={i}><QuoteLine line={lines[i]} /></div>);
        i++;
    }

    return out;
}

function QuoteNode({ node }: { node: BlockquoteNode }) {
    return (
        <blockquote
            className={`bm-blockquote bm-blockquote-depth-${Math.min(node.depth, 6)}`}
            style={{
                borderLeftColor: getDepthColor(node.depth),
            }}
        >
            {node.lines.length > 0 && (
                <div className="bm-blockquote-content">
                    {renderQuoteLines(node.lines)}
                </div>
            )}
            {node.children.map((child, i) => (
                <QuoteNode key={i} node={child} />
            ))}
        </blockquote>
    );
}

export function Blockquote({ data }: { data: BlockquoteData }) {
    return (
        <div className="bm-blockquote-wrapper">
            {data.root.children.map((child, i) => (
                <QuoteNode key={i} node={child} />
            ))}
            {data.root.lines.length > 0 && (
                <div className="bm-blockquote-root-text">
                    {renderQuoteLines(data.root.lines)}
                </div>
            )}
        </div>
    );
}
