type Params = Record<string, string | undefined>;
type EnterFn = (params: Params) => void | Promise<void>;
type LeaveFn = () => void | Promise<void>;

interface DeepLinkRoute {
    pattern: string;
    onEnter: EnterFn;
    onLeave?: LeaveFn;
}

const KIND_LITERAL = "literal";
const KIND_PARAM = "param";
type SegmentKind = typeof KIND_LITERAL | typeof KIND_PARAM;

interface PatternSegment {
    kind: SegmentKind;
    value: string;
    optional: boolean;
}

interface CompiledRoute {
    segments: PatternSegment[];
    route: DeepLinkRoute;
}

interface ActiveRoute {
    route: CompiledRoute;
    params: Params;
    path: string;
}

interface NavigateOptions {
    replace?: boolean;
    silent?: boolean;
}

const PARAM_PREFIX = ":";
const OPTIONAL_SUFFIX = "?";
const ROOT = "/";
const EVT_POPSTATE = "popstate";
const NONE = null;
const registered: CompiledRoute[] = [];
let active: ActiveRoute | null = NONE;
let started = false;

function splitPath(path: string): string[] {
    return path.split("/").filter((s) => s.length > 0);
}

function compilePattern(pattern: string): PatternSegment[] {
    return splitPath(pattern).map((seg) => {
        const isParam = seg.startsWith(PARAM_PREFIX);
        const isOptional = seg.endsWith(OPTIONAL_SUFFIX);
        const raw = isParam ? seg.slice(1) : seg;
        const value = isOptional ? raw.slice(0, -1) : raw;
        return { kind: isParam ? KIND_PARAM : KIND_LITERAL, value, optional: isOptional };
    });
}

function matchSegment(seg: PatternSegment, part: string | undefined, params: Params): boolean {
    if (part === undefined) return seg.optional;
    if (seg.kind === KIND_LITERAL) return seg.value === part;
    params[seg.value] = decodeURIComponent(part);
    return true;
}

function matchRoute(segments: PatternSegment[], parts: string[]): Params | null {
    if (parts.length > segments.length) return NONE;
    const params: Params = {};
    for (let i = 0; i < segments.length; i++) {
        if (!matchSegment(segments[i]!, parts[i], params)) return NONE;
    }
    return params;
}

function findMatch(path: string): ActiveRoute | null {
    const parts = splitPath(path);
    for (const candidate of registered) {
        const params = matchRoute(candidate.segments, parts);
        if (params) return { route: candidate, params, path };
    }
    return NONE;
}

async function applyTransition(next: ActiveRoute | null): Promise<void> {
    const prev = active;
    active = next;
    if (prev && (!next || prev.route !== next.route)) {
        await prev.route.route.onLeave?.();
    }
    if (next && (!prev || next.route !== prev.route || next.path !== prev.path)) {
        await next.route.route.onEnter(next.params);
    }
}

function resolvePath(path: string): void {
    void applyTransition(findMatch(path));
}

function register(route: DeepLinkRoute): () => void {
    const compiled: CompiledRoute = { segments: compilePattern(route.pattern), route };
    registered.push(compiled);
    if (started) resolvePath(window.location.pathname);
    return () => {
        const idx = registered.indexOf(compiled);
        if (idx >= 0) registered.splice(idx, 1);
    };
}

function navigate(path: string, opts: NavigateOptions = {}): void {
    const method = opts.replace ? history.replaceState.bind(history) : history.pushState.bind(history);
    method(NONE, "", path);
    if (opts.silent) active = findMatch(path);
    else resolvePath(path);
}

function start(): void {
    if (started) return;
    started = true;
    window.addEventListener(EVT_POPSTATE, () => resolvePath(window.location.pathname));
    resolvePath(window.location.pathname);
}

function current(): ActiveRoute | null {
    return active;
}

const deepLink = { register, navigate, start, current, ROOT };

export { deepLink };
export type { DeepLinkRoute, Params, NavigateOptions };
