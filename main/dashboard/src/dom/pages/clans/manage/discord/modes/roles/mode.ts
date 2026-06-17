import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import {
    button,
    div,
    icon,
    inlineConfirm,
    paragraph,
    treeView,
    BTN_VARIANT_BARE,
    TREE_ICON_CLASS,
    type Instance,
    type TreeNode,
} from "../../../../../../factory";
import { createRolesFeed } from "../../../../../../../state/discord/roles/roles-feed.js";
import { roleStateOf } from "../../../../../../../state/discord/roles/mappers/state-mapper.js";
import {
    createDiscordRole,
    deleteDiscordRole,
    updateDiscordRole,
    type DiscordRole,
} from "../../../../../../../state/discord/client.js";
import { selectDiscordItem } from "../../../../../../../state/discord/inspector-selection.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";

const EMPTY_TEXT = "No roles in this guild yet.";
const ROLE_ICON = "shield";
const MANAGED_ICON = "robot";
const EMPTY_CLASS = "clans-manage__discord-roles-empty";
const TOOLBAR_CLASS = "clans-manage__discord-channels-toolbar";
const TOOLBAR_BTN_CLASS = "clans-manage__discord-toolbar-btn";
const MODE_HOST_CLASS = "clans-manage__discord-mode";
const CREATE_BTN_TEXT = "+ Create role";
const NEW_ROLE_NAME = "new role";

function iconForRole(role: DiscordRole): Instance {
    return icon({
        name: role.managed ? MANAGED_ICON : ROLE_ICON,
        classes: [TREE_ICON_CLASS],
        context: null,
        meta: null,
    });
}

function roleRenameHandler(role: DiscordRole, guildId: string): (next: string) => Promise<boolean> {
    return async (next) => {
        const session = identityStore.session$();
        if (session === null) return false;
        const before = roleStateOf(role);
        return updateDiscordRole(guildId, role.role_id, {
            userId: session.id,
            before,
            after: { ...before, name: next },
        });
    };
}

async function confirmAndDeleteRole(host: Instance, role: DiscordRole, guildId: string): Promise<void> {
    const ok = await inlineConfirm(host, {
        cancelLabel: "Cancel",
        confirmLabel: "Delete",
        danger: true,
        cancelContext: `keep role "${role.name}"`,
        confirmContext: `confirm deleting role "${role.name}"`,
    });
    if (!ok) return;
    const session = identityStore.session$();
    if (session === null) return;
    await deleteDiscordRole(guildId, role.role_id, {
        userId: session.id,
        roleName: role.name,
    });
}

function leafFor(role: DiscordRole, guildId: string, host: Instance): TreeNode {
    return {
        kind: "leaf",
        key: role.role_id,
        label: role.name,
        icon: iconForRole(role),
        title: `position ${role.position}`,
        onClick: () => selectDiscordItem({ kind: "role", data: role }),
        onLabelEdit: role.managed ? undefined : roleRenameHandler(role, guildId),
        actions: role.managed
            ? undefined
            : [
                  {
                      iconName: "trash",
                      title: `Delete ${role.name}`,
                      onClick: () => void confirmAndDeleteRole(host, role, guildId),
                      danger: true,
                  },
              ],
    };
}

function buildTreeNodes(roles: readonly DiscordRole[], guildId: string, host: Instance): TreeNode[] {
    return [...roles].sort((a, b) => b.position - a.position).map((r) => leafFor(r, guildId, host));
}

async function createRoleWithDefaults(guildId: string): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;
    await createDiscordRole(guildId, {
        userId: session.id,
        name: NEW_ROLE_NAME,
    });
}

function buildToolbar(guildId: string): Instance {
    void identityStore.refresh();
    const createBtn = button({
        classes: [TOOLBAR_BTN_CLASS],
        variant: BTN_VARIANT_BARE,
        text: CREATE_BTN_TEXT,
        context: "create a new role with default values",
        meta: ["action"],
        onClick: () => void createRoleWithDefaults(guildId),
    });
    return div({ classes: [TOOLBAR_CLASS], context: null, meta: null }, [createBtn]);
}

export function buildRolesMode(guildId: string): Instance {
    const treeHost = div({ classes: [], context: null, meta: null });
    const empty = paragraph({
        classes: [EMPTY_CLASS],
        text: EMPTY_TEXT,
        hidden: "",
        context: null,
        meta: null,
    });
    let latest: readonly DiscordRole[] = [];

    function rerender(): void {
        if (latest.length === 0) {
            treeHost.clear();
            empty.el.hidden = false;
            return;
        }
        empty.el.hidden = true;
        treeHost.setChildren(treeView(buildTreeNodes(latest, guildId, treeHost)));
    }

    const feed = createRolesFeed(guildId);
    const unsubscribe = feed.source.subscribe(
        (snap) => {
            latest = snap.rows as DiscordRole[];
            rerender();
        },
        (batch) => {
            const byKey = new Map(latest.map((r) => [r.role_id, r]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordRole);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            latest = [...byKey.values()];
            rerender();
        },
    );

    const modeHost = div({ classes: [MODE_HOST_CLASS], context: null, meta: null }, [
        buildToolbar(guildId),
        treeHost,
        empty,
    ]);
    modeHost.trackDispose({ dispose: () => unsubscribe() });
    return modeHost;
}
