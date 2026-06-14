export interface BackupCodeFileArgs {
    siteAccountId: string;
    displayName: string;
    codes: string[];
    devices: Array<{ deviceName: string | null; createdAt: number }>;
}

function fileHeader(args: BackupCodeFileArgs): string[] {
    return [
        "ClanSocket account backup",
        "=========================",
        "",
        `Account ID:   ${args.siteAccountId}`,
        `Display name: ${args.displayName}`,
        `Generated:    ${new Date().toISOString()}`,
        "",
        "If you lose access to every device linked to this account, paste one of the",
        "backup codes below on the 'Recover account' page. Each code works exactly once.",
        "",
    ];
}

function codeBlock(codes: string[]): string[] {
    const out: string[] = ["Backup codes:"];
    for (let i = 0; i < codes.length; i += 1) {
        out.push(`  ${(i + 1).toString().padStart(2, " ")}. ${codes[i]}`);
    }
    out.push("");
    return out;
}

function deviceBlock(devices: BackupCodeFileArgs["devices"]): string[] {
    const out: string[] = ["Devices linked at time of generation:"];
    if (devices.length === 0) {
        out.push("  (none yet)");
        return out;
    }
    for (const d of devices) {
        const name = d.deviceName ?? "(unnamed)";
        const when = new Date(d.createdAt).toISOString();
        out.push(`  - ${name} (added ${when})`);
    }
    return out;
}

const FILE_FOOTER: readonly string[] = [
    "",
    "Regenerate this set anytime from Profile -> Backup codes.",
    "Regenerating invalidates the previous set.",
    "",
];

export function buildBackupCodeFile(args: BackupCodeFileArgs): string {
    return [...fileHeader(args), ...codeBlock(args.codes), ...deviceBlock(args.devices), ...FILE_FOOTER].join("\n");
}
