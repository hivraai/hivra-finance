// Turn stored Messages API history into what the chat shows: the user's words, the agent's text and
// which tools it used. Tool results and thinking stay server side.
import type Anthropic from '@anthropic-ai/sdk';

export type DisplayItem = { role: 'user' | 'assistant'; text: string; tools?: string[] };

export function displayItems(messages: Anthropic.MessageParam[]): DisplayItem[] {
    const out: DisplayItem[] = [];
    for (const m of messages) {
        if (m.role === 'user') {
            if (typeof m.content === 'string') out.push({ role: 'user', text: m.content.replace(/^\[The user is looking at [^\]]+\]\n/, '') });
            continue; // tool results
        }
        const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content } as Anthropic.TextBlockParam] : m.content;
        const text = blocks.filter((b): b is Anthropic.TextBlockParam => b.type === 'text').map((b) => b.text).join('');
        const tools = blocks.filter((b): b is Anthropic.ToolUseBlockParam => b.type === 'tool_use').map((b) => b.name);
        const last = out.at(-1);
        if (last?.role === 'assistant') { last.text += text; if (tools.length) last.tools = [...(last.tools ?? []), ...tools]; }
        else out.push({ role: 'assistant', text, tools: tools.length ? tools : undefined });
    }
    return out;
}
