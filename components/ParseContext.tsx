/*
 * Parse context
 *
 * Discord's markdown parser needs to know what the text belongs to: which
 * channel and message (to find the server, and from it its roles and member
 * names) and whether links are allowed. Without that, a role mention shows as
 * "@unknown-role" and [text](url) links aren't rendered.
 *
 * EnhancedContent provides this state for the message it draws and every block
 * (text, headings, tables, tasks, footnotes, quotes...) reads it through
 * renderInline(), so no component has to pass it around.
 */

import { React } from "@webpack/common";

export type ParseState = Record<string, any>;

/** Without a message (the settings preview): no channel to resolve mentions in, but links work. */
export const DEFAULT_PARSE_STATE: ParseState = { allowLinks: true };

/** The state Discord's parser is given for the text of `message`. */
export function makeParseState(message?: { id?: string; channel_id?: string; mentionChannels?: unknown; } | null): ParseState {
    if (!message) return DEFAULT_PARSE_STATE;
    return {
        allowLinks: true,
        channelId: message.channel_id,
        messageId: message.id,
        mentionChannels: message.mentionChannels,
    };
}

// Created on first use: `React` isn't available yet when this module is loaded
let Context: React.Context<ParseState> | null = null;
function getContext(): React.Context<ParseState> {
    if (!Context) Context = React.createContext<ParseState>(DEFAULT_PARSE_STATE);
    return Context;
}

export function ParseProvider({ value, children }: { value: ParseState; children?: React.ReactNode; }) {
    const Ctx = getContext();
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParseState(): ParseState {
    return React.useContext(getContext());
}
