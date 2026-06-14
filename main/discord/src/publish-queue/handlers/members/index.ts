import { registerPublisher } from "../../dispatcher.js";
import { createMemberHandler } from "./create.js";
import { deleteMemberHandler } from "./delete.js";
import { updateMemberHandler } from "./update.js";

const TARGET_KIND = "discord_member";

export function registerMemberHandlers(): void {
    registerPublisher("create", TARGET_KIND, { handler: createMemberHandler });
    registerPublisher("update", TARGET_KIND, { handler: updateMemberHandler });
    registerPublisher("delete", TARGET_KIND, { handler: deleteMemberHandler });
}
