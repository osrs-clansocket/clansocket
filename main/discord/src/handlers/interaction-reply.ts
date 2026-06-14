import { EPHEMERAL } from "../core/constants.js";

function ephemeralReply(content: any) {
    return { content, flags: EPHEMERAL };
}

async function replyOrEdit(interaction: any, reply: any) {
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
    } else {
        await interaction.reply(reply);
    }
}

function makeReplySender(target: any, wrap: any = (x: any) => x) {
    return (msg: any) => target.reply(wrap(msg));
}

export { ephemeralReply, replyOrEdit, makeReplySender };
