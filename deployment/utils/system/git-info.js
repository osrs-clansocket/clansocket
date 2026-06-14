import { execSync } from "node:child_process";
import { TEXT_LIMITS } from "../../constants/index.js";

export class GitInfo {
    static exec(command) {
        try {
            return execSync(command, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
        } catch {
            return null;
        }
    }

    static getBranch() {
        return this.exec("git rev-parse --abbrev-ref HEAD");
    }

    static getCommitHash(short = true) {
        return this.exec(short ? "git rev-parse --short HEAD" : "git rev-parse HEAD");
    }

    static getCommitMessage() {
        return this.exec("git log -1 --pretty=%B");
    }

    static getAuthor() {
        return this.exec("git log -1 --pretty=%an");
    }

    static hasUncommittedChanges() {
        const status = this.exec("git status --porcelain");
        return status && status.length > 0;
    }

    static getTag() {
        return this.exec("git describe --tags --exact-match 2>/dev/null");
    }

    static formatForDiscord() {
        const branch = this.getBranch();
        if (!branch) {
            return "• **Git:** Not a git repository";
        }

        const lines = [`• **Branch:** \`${branch}\``];

        const tag = this.getTag();
        if (tag) {
            lines.push(`• **Tag:** \`${tag}\``);
        }

        const commit = this.getCommitHash(true);
        if (commit) {
            lines.push(`• **Commit:** \`${commit}\``);
        }

        const message = this.getCommitMessage();
        if (message) {
            const shortMessage =
                message.length > TEXT_LIMITS.GIT_MESSAGE_MAX_LENGTH
                    ? `${message.substring(0, TEXT_LIMITS.GIT_MESSAGE_TRUNCATE_LENGTH)}...`
                    : message;
            lines.push(`• **Message:** ${shortMessage}`);
        }

        const author = this.getAuthor();
        if (author) {
            lines.push(`• **Author:** ${author}`);
        }

        if (this.hasUncommittedChanges()) {
            lines.push(`• **Status:** ⚠️ Uncommitted changes`);
        }

        return lines.join("\n");
    }
}
