import { signal, type ReadSignal } from "../../../dom/factory/reactive";
import { getSiteOwnerStatus } from "../../site/site-client.js";

const isOwner$ = signal<boolean>(false);
let started = false;

function ensure(): void {
    if (started) return;
    started = true;
    void getSiteOwnerStatus().then((s) => {
        isOwner$.set(s.isOwner);
    });
}

export const siteOwnerStore = {
    get isOwner$(): ReadSignal<boolean> {
        ensure();
        return isOwner$;
    },
};
