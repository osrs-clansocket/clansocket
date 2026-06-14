import { createPublicKey, verify } from "node:crypto";

const ED25519_DER_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyEd25519(signatureHex: string, timestamp: string, body: Buffer, publicKeyHex: string): boolean {
    try {
        const publicKey = createPublicKey({
            key: Buffer.concat([ED25519_DER_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
            format: "der",
            type: "spki",
        });
        const message = Buffer.concat([Buffer.from(timestamp, "utf-8"), body]);
        return verify(null, message, publicKey, Buffer.from(signatureHex, "hex"));
    } catch {
        return false;
    }
}
