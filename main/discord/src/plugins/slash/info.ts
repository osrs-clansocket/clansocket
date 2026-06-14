import { SlashCommandBuilder } from "discord.js";
import { EPHEMERAL } from "../../core/constants.js";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const SECONDS_PER_MINUTE = 60;
const MB_DECIMAL_PLACES = 2;
const COMMAND_NAME = "info";

export default {
    type: "slash",
    name: COMMAND_NAME,
    data: new SlashCommandBuilder().setName(COMMAND_NAME).setDescription("Get bot information"),

    async execute(interaction: any) {
        const uptime = process.uptime();
        const memory = process.memoryUsage().heapUsed / BYTES_PER_MB;

        await interaction.reply({
            content: `Bot Uptime: ${Math.floor(uptime / SECONDS_PER_MINUTE)}m ${Math.floor(uptime % SECONDS_PER_MINUTE)}s\nMemory: ${memory.toFixed(MB_DECIMAL_PLACES)}MB`,
            flags: EPHEMERAL,
        });
    },
};
