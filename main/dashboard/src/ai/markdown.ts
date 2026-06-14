import { marked, type Tokens } from "marked";
import { markedHighlight } from "marked-highlight";
import { Prism } from "./prism-setup";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";
import { isValidDataKey, missingRef, tryCloneByKey, visitPagePlaceholder } from "../dom/factory/data-ops";

let currentDeepLink: string | null = null;

const AI_CLONE_DELIM = "Δ";
const AI_CLONE_TOKEN = "aiClone";

interface AiCloneToken extends Tokens.Generic {
    type: typeof AI_CLONE_TOKEN;
    raw: string;
    key: string;
}

const PUNCT_OPEN = '<span class="token punctuation">{</span>';
const PUNCT_CLOSE = '<span class="token punctuation">}</span>';
const BRACE_OPEN = '<span class="token punctuation brace">{</span>';
const BRACE_CLOSE = '<span class="token punctuation brace">}</span>';

function tagBraces(html: string): string {
    return html.split(PUNCT_OPEN).join(BRACE_OPEN).split(PUNCT_CLOSE).join(BRACE_CLOSE);
}

marked.use(
    markedHighlight({
        langPrefix: "language-",
        highlight(code, lang) {
            const language = lang && Prism.languages[lang] ? lang : "plain";
            const grammar = Prism.languages[language];
            return grammar ? tagBraces(Prism.highlight(code, grammar, language)) : code;
        },
    }),
);

marked.use({
    extensions: [
        {
            name: AI_CLONE_TOKEN,
            level: "inline",
            start(src: string): number | undefined {
                const idx = src.indexOf(AI_CLONE_DELIM);
                return idx === -1 ? undefined : idx;
            },
            tokenizer(src: string): AiCloneToken | undefined {
                if (!src.startsWith(AI_CLONE_DELIM)) return undefined;
                const close = src.indexOf(AI_CLONE_DELIM, AI_CLONE_DELIM.length);
                if (close === -1) return undefined;
                const key = src.slice(AI_CLONE_DELIM.length, close);
                if (!isValidDataKey(key)) return undefined;
                return {
                    type: AI_CLONE_TOKEN,
                    raw: src.slice(0, close + AI_CLONE_DELIM.length),
                    key,
                };
            },
            renderer(token: Tokens.Generic): string {
                const key = (token as AiCloneToken).key;
                const clone = tryCloneByKey(key);
                if (clone !== null) return clone;
                if (currentDeepLink !== null && currentDeepLink !== window.location.pathname) {
                    return visitPagePlaceholder(currentDeepLink, key);
                }
                return missingRef(key);
            },
        },
    ],
});

function renderMarkdown(text: string, deepLink: string | null = null): string {
    currentDeepLink = deepLink;
    try {
        return marked.parse(text, { async: false }) as string;
    } finally {
        currentDeepLink = null;
    }
}

function highlightCode(code: string, lang: string): string {
    const grammar = Prism.languages[lang];
    return grammar ? tagBraces(Prism.highlight(code, grammar, lang)) : code;
}

function stripCodeFences(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith("```")) {
        const firstNewline = trimmed.indexOf("\n");
        if (firstNewline < 0) return trimmed;
        const body = trimmed.slice(firstNewline + 1);
        const lastFence = body.lastIndexOf("```");
        return (lastFence < 0 ? body : body.slice(0, lastFence)).trim();
    }
    return trimmed;
}

export { renderMarkdown, highlightCode, stripCodeFences };
