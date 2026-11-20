/*
 * Theme preview + editor (settings UI)
 *
 * Under the Theme dropdown, for every theme: a live preview built with the
 * plugin's own components. With "Custom" selected it also shows a color
 * picker + hex field for every element, so every change is visible instantly.
 */

import { useState } from "@webpack/common";

import { type FeatureFlags, parseMessage, type ParsedBlock } from "../parser";
import { settings } from "../settings";
import { COLOR_FIELDS, type ColorField, type CustomColors, isValidHex, resolveColors, toOverrides } from "../theme";
import { EnhancedContent } from "./Enhanced";
import { setColorSwatchesEnabled } from "./shared";

const PREVIEW_FLAGS: FeatureFlags = {
    enableTables: true,
    enableTaskLists: true,
    enableHeadings: true,
    enableHorizontalRules: true,
    enableFootnotes: true,
    enableNestedBlockquotes: true,
    enableMath: false,
    enableMermaid: true,
    enableColorSwatches: true,
};

const PREVIEW_MARKDOWN = [
    "# Heading 1",
    "## Heading 2",
    "### Heading 3",
    "#### Heading 4",
    "##### Heading 5",
    "###### Heading 6",
    "",
    "> Quote level 1",
    "> > Level 2",
    "> > > Level 3",
    "> > > > Level 4",
    "> > > > > Level 5",
    "> > > > > > Level 6",
    "",
    "| Name | Role | Status |",
    "|:-----|:----:|-------:|",
    "| Alice | Dev | Active |",
    "| Bob | PM | Away |",
    "| Carol | QA | Active |",
    "",
    "---",
    "",
    "- [x] Checked task",
    "- [ ] Pending task",
    "",
    "A footnote reference[^1], a color #FFA130 and",
    "-# a line of subtext",
    "",
    "[^1]: The footnote definition",
    "",
    "```js",
    "console.log(\"hello\");",
    "```",
    "",
    "```mermaid",
    "graph LR",
    "    A[Start] --> B{Choice}",
    "    B -->|Yes| C[Done]",
    "    B -->|No| D[Retry]",
    "```",
].join("\n");

let previewBlocks: ParsedBlock[] | null = null;
function getPreviewBlocks(): ParsedBlock[] {
    if (!previewBlocks) previewBlocks = parseMessage(PREVIEW_MARKDOWN, PREVIEW_FLAGS);
    return previewBlocks;
}

function ColorRow({ field, value, onChange }: {
    field: ColorField;
    value: string;
    onChange: (value: string) => void;
}) {
    // While typing a hex by hand, keep the draft until it's a valid color
    const [draft, setDraft] = useState<string | null>(null);
    const isDefault = value === field.default;
    // The picker only edits #rrggbb; keep the transparency (#rrggbbAA) the value already has
    const alpha = value.length === 9 ? value.slice(7) : "";

    return (
        <div className="bm-editor-row">
            <span className="bm-editor-label">{field.label}</span>
            <input
                type="color"
                className="bm-editor-color"
                value={value.slice(0, 7)}
                onChange={e => {
                    setDraft(null);
                    onChange(e.target.value.toLowerCase() + alpha);
                }}
            />
            <input
                type="text"
                className="bm-editor-hex"
                value={draft ?? value}
                maxLength={9}
                spellCheck={false}
                onChange={e => {
                    const v = e.target.value.trim();
                    setDraft(v);
                    if (isValidHex(v)) onChange(v.toLowerCase());
                }}
                onBlur={() => setDraft(null)}
            />
            <button
                type="button"
                className="bm-editor-reset"
                disabled={isDefault}
                title={`Reset to ${field.default}`}
                onClick={() => {
                    setDraft(null);
                    onChange(field.default);
                }}
            >
                ↺
            </button>
        </div>
    );
}

export function ThemeEditor() {
    const s = settings.use(["theme", "customColors"]);
    const isCustom = s.theme === "custom";

    const colors = resolveColors(s.customColors);
    // Only the colors that differ from the defaults are saved
    const update = (key: string, value: string) => {
        settings.store.customColors = toOverrides({ ...colors, [key]: value } as CustomColors);
    };

    // Field groups in the order they're declared
    const groups: string[] = [];
    for (const field of COLOR_FIELDS) if (!groups.includes(field.group)) groups.push(field.group);

    setColorSwatchesEnabled(true);

    return (
        <div className="bm-editor">
            {isCustom ? (
                <>
                    <div className="bm-editor-header">
                        <div>
                            <div className="bm-editor-title">Custom theme</div>
                            <div className="bm-editor-hint">
                                Pick a color for each element. The preview below updates as you change them.
                                Hex fields accept #rrggbb or #rrggbbaa (the last two digits are the transparency, 00 = invisible).
                            </div>
                        </div>
                        <button
                            type="button"
                            className="bm-editor-reset-all"
                            onClick={() => { settings.store.customColors = {}; }}
                        >
                            Reset all
                        </button>
                    </div>

                    <div className="bm-editor-groups">
                        {groups.map(group => (
                            <fieldset key={group} className="bm-editor-group">
                                <legend>{group}</legend>
                                {COLOR_FIELDS.filter(field => field.group === group).map(field => (
                                    <ColorRow
                                        key={field.key}
                                        field={field}
                                        value={colors[field.key]}
                                        onChange={value => update(field.key, value)}
                                    />
                                ))}
                            </fieldset>
                        ))}
                    </div>
                </>
            ) : (
                <div className="bm-editor-hint">
                    Preview of the selected theme. Choose "Custom" to edit the colors.
                </div>
            )}

            <div className="bm-editor-title">Live preview</div>
            <div className="bm-editor-preview">
                <EnhancedContent blocks={getPreviewBlocks()} />
            </div>
        </div>
    );
}
