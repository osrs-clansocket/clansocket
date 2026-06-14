export function promptPrefixes(): string {
    return [
        "## prompt id prefixes",
        "",
        "content prompts group by prefix. compose `prefix-<slug>` urself when u know what u want (confirm in `prompt-index` before reading):",
        "",
        "- `clan-*` — tenant clan lore (profile, history, rituals, key-events, ranks, recruitment) authored by each clan via the tenant management surface.",
        "",
        "game-strategy content (relic specifics, optimal builds, pact-tree routing, etc.) is NOT a prompt domain here — those questions get a deflect per the platform mandate, not a chain-to-read.",
    ].join("\n");
}
