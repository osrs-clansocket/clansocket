import { registerChannelHandlers } from "./channels/index.js";
import { registerMemberHandlers } from "./members/index.js";
import { registerRoleHandlers } from "./roles/index.js";

export function registerAllPublishHandlers(): void {
    registerChannelHandlers();
    registerRoleHandlers();
    registerMemberHandlers();
}
