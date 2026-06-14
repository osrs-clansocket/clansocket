let authed = false;

export const authState = {
    isAuthed: (): boolean => authed,
    set: (value: boolean): void => {
        authed = value;
    },
};
