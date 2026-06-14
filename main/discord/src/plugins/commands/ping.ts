export default {
    type: "command",
    name: "ping",
    description: "Responds with pong and latency",
    permission: null,

    async execute(message: any, _args: any) {
        const sent = await message.reply("Pinging...");
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`Pong! Latency: ${latency}ms`);
    },
};
