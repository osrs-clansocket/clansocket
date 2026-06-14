import { EVENT_BOOSTS, EVENT_LEVEL_UP, EVENT_SLAYER, EVENT_STATS, EVENT_XP_GAINED } from "../../event-types.js";
import { ANSI, color } from "../ansi.js";
import { formatNumber } from "../format.js";

type Formatter = (data: any) => string;

export const SKILL_FORMATTERS: Record<string, Formatter> = {
    [EVENT_XP_GAINED]: (data) =>
        `${ANSI.green}+${formatNumber(data.delta)}${ANSI.reset} ${ANSI.bold}${data.skill}${ANSI.reset}  total=${formatNumber(data.xp)}`,
    [EVENT_LEVEL_UP]: (data) =>
        `${ANSI.bold}${data.skill}${ANSI.reset} ${ANSI.brightGreen}→ lvl ${data.level}${ANSI.reset}`,
    [EVENT_STATS]: (data) => {
        const skills: { name: string; level: number; boosted: number; xp: number }[] = Array.isArray(data.skills)
            ? data.skills
            : [];
        if (skills.length === 0) return color("dim", "(empty)");
        const totalLevel = skills.reduce((a, s) => a + s.level, 0);
        const totalXp = skills.reduce((a, s) => a + s.xp, 0);
        const summary = `${skills.length} skills  total=${color("bold", String(totalLevel))}  xp=${formatNumber(totalXp)}`;
        const nameWidth = Math.max(...skills.map((s) => s.name.length));
        const rows = skills.map((s) => {
            const name = s.name.padEnd(nameWidth);
            const boost = s.boosted !== s.level ? color("dim", `(${s.boosted})`) : "";
            return `  ${name}  lvl=${String(s.level).padStart(3)}${boost}  xp=${formatNumber(s.xp)}`;
        });
        return summary + "\n" + rows.join("\n");
    },
    [EVENT_BOOSTS]: (data) => {
        const entries: { skill: string; diff: number }[] = Array.isArray(data.boosts) ? data.boosts : [];
        if (entries.length === 0) return color("dim", "(all clear)");
        return entries.map((e) => `${e.skill}${e.diff > 0 ? "+" : ""}${e.diff}`).join(" ");
    },
    [EVENT_SLAYER]: (data) => {
        const boss = data.bossId > 0 ? color("dim", ` boss=${data.bossId}`) : "";
        return `count=${data.count}/${data.countOriginal}  target=${data.target}  area=${data.area}  master=${data.master}${boss}  points=${formatNumber(data.points)}  streak=${data.tasksCompleted}${data.wildyTasksCompleted > 0 ? color("dim", ` wildy=${data.wildyTasksCompleted}`) : ""}`;
    },
};
