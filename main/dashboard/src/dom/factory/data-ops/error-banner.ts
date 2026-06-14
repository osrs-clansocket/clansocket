import { build } from "../core";
import type { Instance } from "../core";
import { icon, image } from "../content-ops/graphics/media.js";
import { heading, paragraph, pre } from "../content-ops/text.js";
import { button, BTN_VARIANT_BARE } from "../content-ops/button.js";
import { CODEBLOCK_CLASS } from "../../../shared/constants/codeblock-constants.js";
import {
    ERROR_BANNER_ACTION_CLASS,
    ERROR_BANNER_ACTION_DISMISS,
    ERROR_BANNER_ACTION_HOME,
    ERROR_BANNER_ACTION_NONE,
    ERROR_BANNER_ACTION_RELOAD,
    ERROR_BANNER_ACTIVE_CLASS,
    ERROR_BANNER_BACK_ICON,
    ERROR_BANNER_BACK_LABEL,
    ERROR_BANNER_BODY_CLASS,
    ERROR_BANNER_CLASS,
    ERROR_BANNER_COPIED_CLASS,
    ERROR_BANNER_COPIED_RESET_MS,
    ERROR_BANNER_COPY_CLASS,
    ERROR_BANNER_COPY_ICON,
    ERROR_BANNER_COPY_LABEL,
    ERROR_BANNER_DISMISS_ICON,
    ERROR_BANNER_DISMISS_LABEL,
    ERROR_BANNER_EXPANDED_CLASS,
    ERROR_BANNER_HOME_ICON,
    ERROR_BANNER_HOME_LABEL,
    ERROR_BANNER_HOME_PATH,
    ERROR_BANNER_ICONBTN_CLASS,
    ERROR_BANNER_INFO_CLASS,
    ERROR_BANNER_INFO_ICON,
    ERROR_BANNER_INFO_LABEL,
    ERROR_BANNER_LOGO_CLASS,
    ERROR_BANNER_LOGO_SRC,
    ERROR_BANNER_MESSAGE_CLASS,
    ERROR_BANNER_PATH_CLASS,
    ERROR_BANNER_RELOAD_ICON,
    ERROR_BANNER_RELOAD_LABEL,
    ERROR_BANNER_STACK_CLASS,
    ERROR_BANNER_STACK_WRAPPER_CLASS,
    ERROR_BANNER_TITLE_CLASS,
    ERROR_BANNER_TOP_CLASS,
    type ErrorBannerAction,
} from "../../../shared/constants/error-banner-constants.js";

interface ErrorBannerProps {
    title: string;
    message: string;
    path?: string;
    stack?: string;
    action?: ErrorBannerAction;
    onDismiss?: () => void;
}

const TAG_DIV = "div";

const ACTION_ICONS: Record<Exclude<ErrorBannerAction, "none">, string> = {
    dismiss: ERROR_BANNER_DISMISS_ICON,
    home: ERROR_BANNER_HOME_ICON,
    reload: ERROR_BANNER_RELOAD_ICON,
    back: ERROR_BANNER_BACK_ICON,
};

const ACTION_LABELS: Record<Exclude<ErrorBannerAction, "none">, string> = {
    dismiss: ERROR_BANNER_DISMISS_LABEL,
    home: ERROR_BANNER_HOME_LABEL,
    reload: ERROR_BANNER_RELOAD_LABEL,
    back: ERROR_BANNER_BACK_LABEL,
};

function buildActionHandler(
    action: Exclude<ErrorBannerAction, "none">,
    bannerEl: HTMLElement,
    onDismiss: (() => void) | undefined,
): () => void {
    if (action === ERROR_BANNER_ACTION_DISMISS) {
        return () => {
            if (onDismiss !== undefined) onDismiss();
            else bannerEl.remove();
        };
    }
    if (action === ERROR_BANNER_ACTION_HOME) {
        return () => {
            window.location.href = ERROR_BANNER_HOME_PATH;
        };
    }
    if (action === ERROR_BANNER_ACTION_RELOAD) {
        return () => {
            window.location.reload();
        };
    }
    return () => {
        window.history.back();
    };
}

function buildLogo(): Instance<HTMLImageElement> {
    return image({
        src: ERROR_BANNER_LOGO_SRC,
        alt: "",
        lazy: false,
        classes: [ERROR_BANNER_LOGO_CLASS],
        context: null,
        meta: null,
    });
}

function buildBody(props: ErrorBannerProps, messageRow: Instance<HTMLElement>): Instance<HTMLElement> {
    const titleInst = heading("h2", {
        classes: [ERROR_BANNER_TITLE_CLASS],
        context: null,
        meta: null,
        text: props.title,
    });
    const body = build({ tag: TAG_DIV, classes: [ERROR_BANNER_BODY_CLASS] });
    body.addChild(titleInst);
    if (props.path !== undefined && props.path !== "") {
        const pathInst = paragraph({
            classes: [ERROR_BANNER_PATH_CLASS],
            context: null,
            meta: null,
            text: props.path,
        });
        body.addChild(pathInst);
    }
    body.addChild(messageRow);
    return body;
}

function buildMessage(props: ErrorBannerProps, bannerEl: HTMLElement, hasStack: boolean): Instance<HTMLElement> {
    const messageInst = paragraph({
        classes: [ERROR_BANNER_MESSAGE_CLASS],
        context: null,
        meta: null,
        text: props.message,
    });
    if (!hasStack) return messageInst;

    let infoInst: Instance<HTMLButtonElement> | undefined;
    const onInfoClick = (): void => {
        const expanded = bannerEl.classList.toggle(ERROR_BANNER_EXPANDED_CLASS);
        infoInst?.el.classList.toggle(ERROR_BANNER_ACTIVE_CLASS, expanded);
    };
    const infoIconInst = icon({
        name: ERROR_BANNER_INFO_ICON,
        ariaHidden: true,
        context: null,
        meta: null,
    });
    infoInst = button(
        {
            classes: [ERROR_BANNER_ICONBTN_CLASS, ERROR_BANNER_INFO_CLASS],
            variant: BTN_VARIANT_BARE,
            ariaLabel: ERROR_BANNER_INFO_LABEL,
            context: null,
            meta: null,
            onClick: onInfoClick,
        },
        [infoIconInst],
    );
    messageInst.addChild(infoInst);
    return messageInst;
}

function buildStackWrapper(stack: string, path: string, message: string): Instance<HTMLElement> {
    const copyPayload = `${path}\n\n${message}\n\n${stack}`.trim();
    const stackInst = pre({
        classes: [CODEBLOCK_CLASS, ERROR_BANNER_STACK_CLASS],
        context: null,
        meta: null,
        text: stack,
    });
    let copyInst: Instance<HTMLButtonElement> | undefined;
    const onCopyClick = (): void => {
        const captured = copyInst;
        if (captured === undefined) return;
        void navigator.clipboard.writeText(copyPayload).then(() => {
            captured.el.classList.add(ERROR_BANNER_COPIED_CLASS);
            window.setTimeout(() => {
                captured.el.classList.remove(ERROR_BANNER_COPIED_CLASS);
            }, ERROR_BANNER_COPIED_RESET_MS);
        });
    };
    const copyIconInst = icon({
        name: ERROR_BANNER_COPY_ICON,
        ariaHidden: true,
        context: null,
        meta: null,
    });
    copyInst = button(
        {
            classes: [ERROR_BANNER_ICONBTN_CLASS, ERROR_BANNER_COPY_CLASS],
            variant: BTN_VARIANT_BARE,
            ariaLabel: ERROR_BANNER_COPY_LABEL,
            context: null,
            meta: null,
            onClick: onCopyClick,
        },
        [copyIconInst],
    );
    const wrapper = build({ tag: TAG_DIV, classes: [ERROR_BANNER_STACK_WRAPPER_CLASS] });
    wrapper.addChild(stackInst);
    wrapper.addChild(copyInst);
    return wrapper;
}

function buildActionButton(
    action: Exclude<ErrorBannerAction, "none">,
    bannerEl: HTMLElement,
    onDismiss: (() => void) | undefined,
): Instance<HTMLButtonElement> {
    const handler = buildActionHandler(action, bannerEl, onDismiss);
    const iconInst = icon({
        name: ACTION_ICONS[action],
        ariaHidden: true,
        context: null,
        meta: null,
    });
    return button(
        {
            classes: [ERROR_BANNER_ICONBTN_CLASS, ERROR_BANNER_ACTION_CLASS],
            variant: BTN_VARIANT_BARE,
            ariaLabel: ACTION_LABELS[action],
            context: null,
            meta: null,
            onClick: handler,
        },
        [iconInst],
    );
}

export function errorBanner(props: ErrorBannerProps): Instance<HTMLElement> {
    const action = props.action ?? ERROR_BANNER_ACTION_DISMISS;
    const stack = props.stack ?? "";
    const hasStack = stack !== "";
    const banner = build({ tag: TAG_DIV, classes: [ERROR_BANNER_CLASS] });

    if (action !== ERROR_BANNER_ACTION_NONE) {
        banner.addChild(buildActionButton(action, banner.el, props.onDismiss));
    }

    const message = buildMessage(props, banner.el, hasStack);
    const body = buildBody(props, message);
    const logo = buildLogo();
    const top = build({ tag: TAG_DIV, classes: [ERROR_BANNER_TOP_CLASS] });
    top.addChild(logo);
    top.addChild(body);
    banner.addChild(top);

    if (hasStack) {
        banner.addChild(buildStackWrapper(stack, props.path ?? "", props.message));
    }

    return banner;
}

export type { ErrorBannerProps };
