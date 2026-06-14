export function modeKey(worldTypes: string[], activity: string | undefined): string {
    const act = (activity ?? "").trim().toLowerCase();

    if (worldTypes.includes("SEASONAL")) {
        if (act.startsWith("leagues ")) {
            let name = act.substring("leagues ".length).trim();
            const sep = name.indexOf(" - ");
            if (sep !== -1) name = name.substring(0, sep).trim();
            name = name
                .split(" ")
                .filter((s) => s.length > 0)
                .join("-");
            return `seasonal-leagues-${name}`;
        }
        if (act.startsWith("deadman")) {
            return "seasonal-deadman";
        }
        return "seasonal-unknown";
    }

    if (worldTypes.includes("DEADMAN")) return "deadman";
    if (worldTypes.includes("BETA_WORLD")) return "beta";
    if (worldTypes.includes("QUEST_SPEEDRUNNING")) return "speedrunning";
    if (worldTypes.includes("FRESH_START_WORLD")) return "fresh-start";
    if (worldTypes.includes("LAST_MAN_STANDING")) return "lms";
    if (worldTypes.includes("TOURNAMENT_WORLD")) return "tournament";

    return "main";
}
