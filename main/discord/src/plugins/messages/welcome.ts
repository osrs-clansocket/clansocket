const GUILD_MEMBER_JOIN = 7;

export default {
    type: "message",
    name: "welcome",
    description: "Welcomes new members",

    filter(message: any) {
        return message.type === GUILD_MEMBER_JOIN;
    },

    async execute(message: any) {
        await message.channel.send(`Welcome ${message.author}!`);
    },
};
