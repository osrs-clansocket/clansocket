import { GatewayIntentBits } from "discord.js";

export function resolveIntents(bitfield: number): number[] {
    const out: number[] = [];
    const allValues = Object.values(GatewayIntentBits).filter((v): v is number => typeof v === "number");
    for (const v of allValues) {
        if ((bitfield & v) === v) out.push(v);
    }
    return out;
}
