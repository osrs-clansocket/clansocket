import { LIGHT, MEME, q, SERIOUS, type QuipSet } from "./core/quip-types.js";

export const VAULT_NO_KEY_QUIPS: QuipSet = [
    q(SERIOUS, "Vault unlocked. Add an AI provider key to start chatting with Varez."),
    q(SERIOUS, "No AI key saved yet. Pick a provider (OpenAI, Anthropic, etc.) and add a key."),
    q(SERIOUS, "Vault is open but empty. Add an API key to enable Varez."),

    q(LIGHT, "Vault is unlocked. Varez is still mute until you feed him an API key."),
    q(LIGHT, "An empty vault is still a vault. Just not a useful one."),
    q(LIGHT, "Vault opened, nothing inside. Like opening your bank to find only burnt shrimp."),
    q(LIGHT, "An API key is required for AI requests. It's right there in the name."),
    q(LIGHT, "Varez waits patiently for a key. He has nothing else going on."),
    q(LIGHT, "Vault unlocked successfully. Vault also contains nothing. Both true."),
    q(LIGHT, "Keys go in the vault. Then the vault has keys. Then things work."),

    q(MEME, "A vault with no keys is a fancy storage container holding zero things."),
    q(MEME, "API keys are like quest items — required to proceed."),
    q(MEME, "Adding an API key takes 30 seconds. Less if you've pre-copied it."),
    q(
        MEME,
        "An unlocked vault containing nothing is the digital equivalent of opening your bank to find a flatpack table.",
    ),
    q(MEME, "Without an API key, Varez is just sitting here. Vibing, but not helpful."),
    q(MEME, "The vault accepts API keys from any major provider. It's not picky."),
    q(MEME, "An API key is what turns the vault from 'art piece' into 'productivity tool'."),
    q(MEME, "Empty vaults are technically secure. There's nothing inside to steal."),
    q(
        MEME,
        "Varez has been polling the vault for keys. Vault says: still zero. Has been zero. Will be zero until you add one.",
    ),
    q(MEME, "API keys are like prayer potions — you need them to do the cool stuff."),
    q(MEME, "Free tier? Trial credits? Local llama? Varez accepts all. He just needs a key."),
    q(
        MEME,
        "Putting an API key in the vault is the same energy as withdrawing law runes for a teleport. One small action enables the trip.",
    ),
    q(MEME, "An empty vault keeps secrets perfectly. It also keeps nothing. The duality."),
    q(MEME, "Adding an API key is the shortest quest in Gielinor. Single objective. Single click."),
    q(MEME, "Vault accepts keys via the obvious mechanism: typing them in. Innovation."),
    q(
        MEME,
        "The vault has more capacity than a bank tab. It currently has fewer items than a bank tab. Math checks out.",
    ),
];
