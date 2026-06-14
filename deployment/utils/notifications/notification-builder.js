import { DiscordClient } from "./discord-client.js";
import { EmbedBuilder } from "./embed-builder.js";

export class NotificationBuilder {
    constructor(webhookUrl) {
        this.client = new DiscordClient(webhookUrl);
        this.config = {
            content: null,
            embeds: [],
            username: null,
            avatarUrl: null,
            files: [],
        };
    }

    setContent(content) {
        this.config.content = content;
        return this;
    }

    setUsername(username) {
        this.config.username = username;
        return this;
    }

    setAvatarUrl(avatarUrl) {
        this.config.avatarUrl = avatarUrl;
        return this;
    }

    addEmbed(embedConfig) {
        const builder = new EmbedBuilder();

        if (embedConfig.title) {
            builder.setTitle(embedConfig.title);
        }
        if (embedConfig.description) {
            builder.setDescription(embedConfig.description);
        }
        if (embedConfig.color) {
            builder.setColor(embedConfig.color);
        }
        if (embedConfig.thumbnail) {
            builder.setThumbnail(embedConfig.thumbnail);
        }
        if (embedConfig.image) {
            builder.setImage(embedConfig.image);
        }
        if (embedConfig.url) {
            builder.setUrl(embedConfig.url);
        }
        if (embedConfig.author) {
            builder.setAuthor(embedConfig.author.name, embedConfig.author.url, embedConfig.author.iconUrl);
        }
        if (embedConfig.footer) {
            builder.setFooter(embedConfig.footer.text, embedConfig.footer.iconUrl);
        }
        if (embedConfig.timestamp !== false) {
            builder.setTimestamp(embedConfig.timestamp || new Date());
        }
        if (embedConfig.fields) {
            embedConfig.fields.forEach((field) => {
                builder.addField(field.name, field.value, field.inline);
            });
        }

        this.config.embeds.push(builder.build());
        return this;
    }

    addFile(content, name, type = "text/plain") {
        this.config.files.push({ content, name, type });
        return this;
    }

    async send() {
        return this.client.send(this.config);
    }
}
