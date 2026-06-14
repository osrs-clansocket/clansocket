import { File, FormData } from "formdata-node";
import fetch from "node-fetch";

export class DiscordClient {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    async send({ content = null, embeds = [], username = null, avatarUrl = null, files = [] }) {
        if (!this.webhookUrl) {
            throw new Error("Discord webhook URL is not configured");
        }

        const payload = {};
        if (content) {
            payload.content = content;
        }
        if (embeds.length > 0) {
            payload.embeds = embeds;
        }
        if (username) {
            payload.username = username;
        }
        if (avatarUrl) {
            payload.avatar_url = avatarUrl;
        }

        let response;

        if (files.length > 0) {
            const formData = new FormData();
            formData.append("payload_json", JSON.stringify(payload));

            files.forEach((file, index) => {
                const fileBlob = new File([file.content], file.name, { type: file.type || "text/plain" });
                formData.append(`files[${index}]`, fileBlob);
            });

            response = await fetch(this.webhookUrl, {
                method: "POST",
                body: formData,
            });
        } else {
            response = await fetch(this.webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
        }

        if (!response.ok) {
            throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
        }

        return response;
    }
}
