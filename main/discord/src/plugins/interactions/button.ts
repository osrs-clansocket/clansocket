import { EPHEMERAL } from "../../core/constants.js";

export default {
    type: "interaction",
    name: "button_handler",

    filter(interaction: any) {
        return interaction.isButton() && interaction.customId.startsWith("example_");
    },

    async execute(interaction: any) {
        const action = interaction.customId.split("_")[1];

        switch (action) {
            case "confirm":
                await interaction.reply({ content: "Confirmed!", flags: EPHEMERAL });
                break;
            case "cancel":
                await interaction.reply({ content: "Cancelled!", flags: EPHEMERAL });
                break;
        }
    },
};
