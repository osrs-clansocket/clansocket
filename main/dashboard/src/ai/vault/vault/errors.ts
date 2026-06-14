export class VaultPassphraseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "VaultPassphraseError";
    }
}

export class VaultMissingError extends Error {
    constructor() {
        super("vault not set up");
        this.name = "VaultMissingError";
    }
}

export class VaultDecryptError extends Error {
    constructor() {
        super("decrypt failed — passphrase likely incorrect");
        this.name = "VaultDecryptError";
    }
}
