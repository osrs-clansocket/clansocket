import type { TokenSource } from "./render-template.js";

export interface RenderContext {
    rsn: string;
    clanName: string | null;
    botId: string;
}

export interface RenderedBody {
    username: string;
    content: string;
    embed: object | null;
    tokens: TokenSource;
}

export interface RendererInput {
    payload: object;
    context: RenderContext;
}

export type Renderer = (input: RendererInput) => RenderedBody;
