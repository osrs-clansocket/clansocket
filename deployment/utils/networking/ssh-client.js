import fs from "node:fs";
import path from "node:path";
import { NodeSSH } from "node-ssh";
import { SSH_CONSTANTS } from "../../constants/index.js";

export class SSHClient {
    constructor() {
        this.ssh = new NodeSSH();
        this.connected = false;
    }

    async connect() {
        const keyPath = path.resolve(SSH_CONSTANTS.KEY_PATH);

        const sshConfig = {
            host: SSH_CONSTANTS.HOST,
            username: SSH_CONSTANTS.USER,
            privateKey: fs.readFileSync(keyPath, "utf8"),
        };

        if (SSH_CONSTANTS.PASSPHRASE) {
            sshConfig.passphrase = SSH_CONSTANTS.PASSPHRASE;
        }

        await this.ssh.connect(sshConfig);
        this.connected = true;
    }

    async execCommand(command) {
        if (!this.connected) {
            throw new Error("SSH not connected. Call connect() first.");
        }
        return this.ssh.execCommand(command);
    }

    async putFile(localPath, remotePath) {
        if (!this.connected) {
            throw new Error("SSH not connected. Call connect() first.");
        }
        return this.ssh.putFile(localPath, remotePath);
    }

    async getFile(localPath, remotePath) {
        if (!this.connected) {
            throw new Error("SSH not connected. Call connect() first.");
        }
        return this.ssh.getFile(localPath, remotePath);
    }

    async putDirectory(localPath, remotePath, options) {
        if (!this.connected) {
            throw new Error("SSH not connected. Call connect() first.");
        }
        return this.ssh.putDirectory(localPath, remotePath, options);
    }

    dispose() {
        if (this.connected) {
            this.ssh.dispose();
            this.connected = false;
        }
    }
}
