export class EmbedBuilder {
    constructor() {
        this.embed = {
            fields: [],
        };
    }

    setTitle(title) {
        this.embed.title = title;
        return this;
    }

    setDescription(description) {
        this.embed.description = description;
        return this;
    }

    setColor(color) {
        this.embed.color = color;
        return this;
    }

    setThumbnail(url) {
        this.embed.thumbnail = { url };
        return this;
    }

    setImage(url) {
        this.embed.image = { url };
        return this;
    }

    setAuthor(name, url = null, iconUrl = null) {
        this.embed.author = { name };
        if (url) {
            this.embed.author.url = url;
        }
        if (iconUrl) {
            this.embed.author.icon_url = iconUrl;
        }
        return this;
    }

    setFooter(text, iconUrl = null) {
        this.embed.footer = { text };
        if (iconUrl) {
            this.embed.footer.icon_url = iconUrl;
        }
        return this;
    }

    setTimestamp(timestamp = new Date()) {
        this.embed.timestamp = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
        return this;
    }

    setUrl(url) {
        this.embed.url = url;
        return this;
    }

    addField(name, value, inline = false) {
        this.embed.fields.push({ name, value, inline });
        return this;
    }

    addFields(fields) {
        fields.forEach((field) => this.addField(field.name, field.value, field.inline));
        return this;
    }

    build() {
        return this.embed;
    }
}
