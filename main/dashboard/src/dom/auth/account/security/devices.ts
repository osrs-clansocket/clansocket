import {
    BTN_VARIANT_OUTLINE,
    button,
    createInstance,
    div,
    effect,
    heading,
    INLINE_CONFIRM_HOST_CLASS,
    inlineConfirm,
    input,
    paragraph,
    span,
    type Instance,
} from "../../../factory/index.js";
import { isPasskeyError, passkeyClient, type PasskeyDevice } from "../../../../state/passkey/client/index.js";
import { devicesStore } from "../../../../state/passkey/stores/devices-store.js";
import {
    ACCOUNT_CLAN_PANEL_CLASS,
    ACCOUNT_DEVICE_ROW_CLASS,
    ACCOUNT_EMPTY_CLASS,
    ACCOUNT_LIST_CLASS,
    ACCOUNT_PANEL_BODY_CLASS,
    ACCOUNT_PANEL_FOOTER_CLASS,
    ACCOUNT_PANEL_TITLE_CLASS,
    ACCOUNT_ROW_META_CLASS,
    ACCOUNT_ROW_PRIMARY_CLASS,
    ACCOUNT_TOKEN_REVOKE_CLASS,
} from "../../../../shared/constants/account-constants.js";
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "../../../../state/time-units.js";
import { setStatus } from "../../status-line.js";
import { FORM_FORM_ROW, FORM_HINT, FORM_INPUT } from "../../../forms/form-classes.js";

function fmtRelative(ms: number | null | undefined): string {
    if (typeof ms !== "number" || ms <= 0) return "—";
    const diff = Date.now() - ms;
    if (diff < MS_PER_MINUTE) return "now";
    if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m`;
    if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h`;
    return `${Math.floor(diff / MS_PER_DAY)}d`;
}

function buildDeviceRow(d: PasskeyDevice, onRevoked: (msg: string | null) => void): Instance {
    const revokeHost = div({ classes: [INLINE_CONFIRM_HOST_CLASS], context: null, meta: null });
    const deviceLabel = d.deviceName ?? "(unnamed)";
    const revokeBtn = button({
        classes: [ACCOUNT_TOKEN_REVOKE_CLASS],
        text: "Revoke",
        context: "revoke this sign-in device",
        meta: ["destructive", "device"],
        onClick: async () => {
            const confirmed = await inlineConfirm(revokeHost, {
                cancelLabel: "Cancel",
                confirmLabel: "Revoke",
                danger: true,
                cancelContext: `keep passkey "${deviceLabel}" active`,
                confirmContext: `confirm revoking passkey "${deviceLabel}"`,
            });
            if (!confirmed) return;
            const res = await passkeyClient.revokeDevice(d.id);
            if (isPasskeyError(res)) {
                onRevoked(`revoke failed: ${res.message ?? res.error}`);
                return;
            }
            onRevoked(null);
        },
    });
    revokeHost.addChild(revokeBtn);
    return div({ classes: [ACCOUNT_DEVICE_ROW_CLASS], context: null, meta: null }, [
        span({ classes: [ACCOUNT_ROW_PRIMARY_CLASS], text: deviceLabel, context: null, meta: null }),
        span({
            classes: [ACCOUNT_ROW_META_CLASS],
            text: `Used ${fmtRelative(d.lastUsedAt)}`,
            context: null,
            meta: null,
        }),
        revokeHost,
    ]);
}

interface DevicesRenderer {
    render: (devices: PasskeyDevice[]) => void;
}

function createDevicesRenderer(host: Instance, onRevoked: (msg: string | null) => void): DevicesRenderer {
    const rowPool = new Map<string, Instance>();
    let emptyInst: Instance | null = null;

    function placeChildren(children: readonly Instance[]): void {
        let nextEl: ChildNode | null = host.el.firstChild;
        for (const child of children) {
            if (child.el === nextEl) nextEl = nextEl?.nextSibling ?? null;
            else host.addBefore(child, nextEl);
        }
        while (nextEl !== null) {
            const drop = nextEl;
            nextEl = nextEl.nextSibling;
            createInstance(drop as HTMLElement).detach();
        }
    }

    function render(devices: PasskeyDevice[]): void {
        if (devices.length === 0) {
            for (const inst of rowPool.values()) inst.destroy();
            rowPool.clear();
            if (emptyInst === null) {
                emptyInst = paragraph({ classes: [ACCOUNT_EMPTY_CLASS], text: "None.", context: null, meta: null });
            }
            placeChildren([emptyInst]);
            return;
        }
        if (emptyInst !== null) {
            emptyInst.destroy();
            emptyInst = null;
        }
        const live = new Set<string>();
        for (const d of devices) {
            live.add(d.id);
            if (!rowPool.has(d.id)) rowPool.set(d.id, buildDeviceRow(d, onRevoked));
        }
        for (const [id, inst] of rowPool) {
            if (!live.has(id)) {
                inst.destroy();
                rowPool.delete(id);
            }
        }
        const ordered: Instance[] = [];
        for (const d of devices) {
            const inst = rowPool.get(d.id);
            if (inst !== undefined) ordered.push(inst);
        }
        placeChildren(ordered);
    }

    return { render };
}

function buildDevicesFooter(refresh: () => void, status: Instance): Instance {
    const deviceInput = input({
        classes: [FORM_INPUT],
        ariaLabel: "This device name",
        type: "text",
        placeholder: "This device name",
        autocomplete: "off",
        maxlength: "64",
        context: "name for this device when registering a passkey",
        meta: ["input", "device"],
    });
    const addBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Add",
        context: "register a passkey on this device",
        meta: ["action", "device"],
        onClick: async () => {
            setStatus(status, "Waiting for browser passkey prompt…");
            addBtn.el.disabled = true;
            const result = await passkeyClient.attachPasskeyToCurrentAccount(deviceInput.el.value.trim() || null);
            addBtn.el.disabled = false;
            if (isPasskeyError(result)) {
                setStatus(status, `Failed: ${result.message ?? result.error}`);
                return;
            }
            setStatus(status, "Passkey registered.");
            deviceInput.el.value = "";
            refresh();
        },
    });
    const linkBtn = button({
        variant: BTN_VARIANT_OUTLINE,
        compact: true,
        text: "Link",
        context: "generate a device-link code to add another device",
        meta: ["action", "device"],
        onClick: async () => {
            linkBtn.el.disabled = true;
            const res = await passkeyClient.createLinkCode();
            linkBtn.el.disabled = false;
            setStatus(
                status,
                isPasskeyError(res) ? `failed: ${res.message ?? res.error}` : `code: ${res.code} (5 min)`,
            );
        },
    });
    return div({ classes: [FORM_FORM_ROW], context: null, meta: null }, [deviceInput, addBtn, linkBtn]);
}

export function buildDevicesPanel(): HTMLElement {
    const devicesHost = div({ classes: [ACCOUNT_LIST_CLASS], context: null, meta: null });
    const status = paragraph({ classes: [FORM_HINT], text: "", context: null, meta: null });
    status.el.hidden = true;
    const onRevoked = (msg: string | null): void => {
        if (msg !== null) {
            setStatus(status, msg);
            return;
        }
        setStatus(status, "");
        void devicesStore.refresh();
    };
    const root = div({ classes: [ACCOUNT_CLAN_PANEL_CLASS], context: null, meta: null }, [
        heading("h3", { classes: [ACCOUNT_PANEL_TITLE_CLASS], text: "Sign-in devices", context: null, meta: null }),
        div({ classes: [ACCOUNT_PANEL_BODY_CLASS], context: null, meta: null }, [devicesHost, status]),
        div({ classes: [ACCOUNT_PANEL_FOOTER_CLASS], context: null, meta: null }, [
            buildDevicesFooter(() => void devicesStore.refresh(), status),
        ]),
    ]);
    const renderer = createDevicesRenderer(devicesHost, onRevoked);
    root.trackDispose(effect(() => renderer.render(devicesStore.list$())));
    return root.el;
}
