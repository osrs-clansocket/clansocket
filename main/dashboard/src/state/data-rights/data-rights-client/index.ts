import { browse, deleteRange, deleteRow, listScopes } from "./browse.js";
import { deleteMyData, exportClanData, exportMyData, getMyDataStats } from "./export.js";
import { openWritesStream } from "./streams/writes-stream.js";

export type {
    BrowseResponse,
    DataRightsError,
    DeleteResponse,
    Scope,
    ScopeKind,
    ScopeListItem,
    ScopeListTable,
    UserDataStats,
    WritesStreamEvent,
    WritesStreamKind,
} from "./types.js";

export const dataRightsClient = {
    listScopes,
    browse,
    deleteRow,
    deleteRange,
    openWritesStream,
    getMyDataStats,
    exportMyData,
    deleteMyData,
    exportClanData,
};
