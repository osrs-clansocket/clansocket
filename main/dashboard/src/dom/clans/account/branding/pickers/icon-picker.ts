import {
    button,
    div,
    effect,
    icon as iconFactory,
    input,
    paragraph,
    signal,
    snapshot,
    type Instance,
} from "../../../../factory/index.js";
import { loadAllIconEntries, resolveIcon, type IconEntry } from "../../../../../icons/providers.js";
import type { BrandingController } from "../branding-controller/index.js";
import { setupLazyRender, type LazyRenderHandles } from "./icon-picker-lazy.js";
import { FORM_HINT } from "../../../../forms/form-classes.js";
import {
    ACCOUNT_BRANDING_GRID_CLASS,
    ACCOUNT_BRANDING_ICON_ACTIVE_CLASS,
    ACCOUNT_BRANDING_ICON_CLASS,
    ACCOUNT_BRANDING_SEARCH_CLASS,
    ACCOUNT_BRANDING_SENTINEL_CLASS,
} from "../../../../../shared/constants/account-constants.js";

const SEARCH_DEBOUNCE_MS = 80;
const MIN_SEARCH_LEN = 1;
const DATA_KEY_ICON_KEY = "icon-key";
const ATTR_KEY = `data-${DATA_KEY_ICON_KEY}`;

let allKeys: readonly string[] | null = null;
let entriesPromise: Promise<readonly string[]> | null = null;
let lastFilter: { needle: string; matches: readonly string[] } = { needle: "", matches: [] };

function entriesToKeys(entries: readonly IconEntry[]): readonly string[] {
    const out: string[] = new Array(entries.length);
    for (let i = 0; i < entries.length; i += 1) {
        const e = entries[i]!;
        out[i] = `${e.provider}-${e.name}`;
    }
    return out;
}

function filterKeys(needle: string): readonly string[] {
    const keys = allKeys ?? [];
    if (needle === lastFilter.needle && lastFilter.matches.length > 0) return lastFilter.matches;
    if (needle.length < MIN_SEARCH_LEN) {
        lastFilter = { needle, matches: keys };
        return keys;
    }
    const lower = needle.toLowerCase();
    const matches: string[] = [];
    for (const k of keys) if (k.includes(lower)) matches.push(k);
    lastFilter = { needle, matches };
    return matches;
}

async function ensureEntries(): Promise<readonly string[]> {
    if (allKeys) return allKeys;
    if (entriesPromise) return entriesPromise;
    entriesPromise = loadAllIconEntries().then((entries) => {
        const keys = entriesToKeys(entries);
        allKeys = keys;
        lastFilter = { needle: "", matches: keys };
        return keys;
    });
    return entriesPromise;
}

function buildIconButton(key: string): Instance<HTMLButtonElement> {
    const { provider, name } = resolveIcon(key);
    return button(
        {
            key,
            classes: [ACCOUNT_BRANDING_ICON_CLASS],
            ariaLabel: snapshot(name),
            title: snapshot(name),
            data: { [DATA_KEY_ICON_KEY]: snapshot(key) },
            context: "select this icon for the clan",
            meta: ["choice", "clan"],
        },
        [iconFactory({ provider, name, context: null, meta: null })],
    );
}

function initialActiveKey(ctrl: BrandingController): string | null {
    if (ctrl.kind !== "builtin" || !ctrl.value) return null;
    const { provider, name } = resolveIcon(ctrl.value);
    return `${provider}-${name}`;
}

function handleGridClick(
    e: MouseEvent,
    activeKey$: { set(next: string | null): void },
    ctrl: BrandingController,
): void {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(`[${ATTR_KEY}]`);
    if (!btn) return;
    const key = btn.getAttribute(ATTR_KEY);
    if (!key) return;
    activeKey$.set(key);
    void ctrl.persist("builtin", key);
}

function bindActiveSync(
    gridEl: HTMLElement,
    activeKey$: () => string | null,
    current: { el: HTMLElement | null },
): void {
    effect(() => {
        const k = activeKey$();
        if (current.el) current.el.classList.remove(ACCOUNT_BRANDING_ICON_ACTIVE_CLASS);
        if (!k) {
            current.el = null;
            return;
        }
        const next = gridEl.querySelector<HTMLElement>(`[${ATTR_KEY}="${k}"]`);
        if (next) next.classList.add(ACCOUNT_BRANDING_ICON_ACTIVE_CLASS);
        current.el = next;
    });
}

function makeSearchHandler(searchEl: HTMLInputElement, handles: LazyRenderHandles): () => void {
    return () => {
        if (handles.debounceHandle !== null) window.clearTimeout(handles.debounceHandle);
        handles.debounceHandle = window.setTimeout(() => {
            handles.debounceHandle = null;
            handles.applyFilter(filterKeys(searchEl.value.trim()));
        }, SEARCH_DEBOUNCE_MS);
    };
}

export function buildIconPicker(ctrl: BrandingController): { search: Instance; grid: Instance } {
    const activeKey$ = signal<string | null>(initialActiveKey(ctrl));
    const sentinel = div({ classes: [ACCOUNT_BRANDING_SENTINEL_CLASS], ariaHidden: "true", context: null, meta: null });
    const loadingMsg = paragraph({ classes: [FORM_HINT], text: "Loading icons…", context: null, meta: null });
    const grid = div(
        {
            classes: [ACCOUNT_BRANDING_GRID_CLASS],
            context: null,
            meta: null,
            onClick: (e) => handleGridClick(e, activeKey$, ctrl),
        },
        [loadingMsg, sentinel],
    );
    const handles = setupLazyRender(grid, sentinel, loadingMsg, buildIconButton);
    const search = input({
        classes: [ACCOUNT_BRANDING_SEARCH_CLASS],
        type: "text",
        placeholder: "Filter icons…",
        autocomplete: "off",
        ariaLabel: "Filter icons",
        context: "filter the icon list by name",
        meta: ["input"],
        onInput: () => searchHandler(),
    });
    const searchHandler = makeSearchHandler(search.el, handles);
    bindActiveSync(grid.el, activeKey$, { el: null });
    grid.trackDispose({ dispose: handles.dispose });
    void ensureEntries().then((keys) => handles.applyFilter(keys));
    return { search, grid };
}
