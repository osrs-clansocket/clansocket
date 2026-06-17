import { type Instance } from "../../../factory";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import { updateDiscordRole, type DiscordRole, type DiscordRoleState } from "../../../../state/discord/client.js";
import { roleStateOf } from "../../../../state/discord/roles/mappers/state-mapper.js";
import {
    buildEditableCheckSection,
    buildEditableColorSection,
    buildEditableTextSection,
    buildImageUrlReadonlySection,
    buildPermissionsBitfieldSection,
    buildReadonlySection,
} from "../builders/section-builder.js";

const HEX_PADDING = 6;
const HEX_RADIX = 16;

function intToHex(n: number): string {
    return `#${n.toString(HEX_RADIX).padStart(HEX_PADDING, "0")}`;
}

async function saveRolePatch(role: DiscordRole, patch: Partial<DiscordRoleState>): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;
    const before = roleStateOf(role);
    const after: DiscordRoleState = { ...before, ...patch };
    await updateDiscordRole(role.guild_id, role.role_id, {
        userId: session.id,
        before,
        after,
    });
}

export function roleSections(role: DiscordRole): Instance[] {
    const editable = !role.managed;
    const sections: Instance[] = [];
    if (editable) {
        sections.push(buildEditableTextSection("Name", role.name, (next) => void saveRolePatch(role, { name: next })));
    } else {
        sections.push(buildReadonlySection({ title: "Name", value: role.name }));
    }
    sections.push(buildReadonlySection({ title: "ID", value: role.role_id }));
    if (editable) {
        sections.push(
            buildEditableColorSection("Color", intToHex(role.color), (nextHex) => {
                const colorInt = parseInt(nextHex.replace("#", ""), HEX_RADIX);
                if (Number.isNaN(colorInt)) return;
                void saveRolePatch(role, { color: colorInt });
            }),
        );
    } else {
        sections.push(buildReadonlySection({ title: "Color", value: intToHex(role.color) }));
    }
    sections.push(buildReadonlySection({ title: "Position", value: String(role.position) }));
    sections.push(
        buildPermissionsBitfieldSection(
            "Permissions",
            role.permissions,
            editable,
            (next) => void saveRolePatch(role, { permissions: next }),
        ),
    );
    if (editable) {
        sections.push(
            buildEditableCheckSection(
                "Display separately",
                role.hoist,
                (next) => void saveRolePatch(role, { hoist: next }),
            ),
        );
        sections.push(
            buildEditableCheckSection(
                "Mentionable",
                role.mentionable,
                (next) => void saveRolePatch(role, { mentionable: next }),
            ),
        );
    } else {
        sections.push(buildReadonlySection({ title: "Display separately", value: role.hoist ? "yes" : "no" }));
        sections.push(buildReadonlySection({ title: "Mentionable", value: role.mentionable ? "yes" : "no" }));
    }
    sections.push(buildReadonlySection({ title: "Managed", value: role.managed ? "yes" : "no" }));
    sections.push(buildImageUrlReadonlySection("Role icon URL", role.icon_url));
    sections.push(buildReadonlySection({ title: "Unicode emoji icon", value: role.unicode_emoji ?? "—" }));
    return sections;
}
