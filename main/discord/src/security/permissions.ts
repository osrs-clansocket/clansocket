import { DISCORD_PERMISSIONS } from "../core/constants.js";
import { getUserPermissions as fetchPermissions, setUserPermissions as pushPermissions } from "../core/api-client.js";
import logger from "@clansocket/logger";

const DEFAULT_ROLE_POSITION = 0;
const EMPTY_PERMISSIONS: any[] = [];

function isAdmin(perms: any) {
    return Array.isArray(perms) && perms.includes(DISCORD_PERMISSIONS.ADMINISTRATOR);
}

function hasPermission(userPermissions: any, requiredPermission: any) {
    if (!Array.isArray(userPermissions)) {
        return 0;
    }
    if (!requiredPermission || isAdmin(userPermissions)) {
        return 1;
    }
    return userPermissions.includes(requiredPermission) ? 1 : 0;
}

function checkAgainstAdmin(targetPermissions: any, requiredPermissions: any, method: any) {
    if (!Array.isArray(targetPermissions) || !Array.isArray(requiredPermissions)) {
        return 0;
    }
    if (isAdmin(targetPermissions)) {
        return 1;
    }
    return requiredPermissions[method]((p: any) => targetPermissions.includes(p)) ? 1 : 0;
}

function makePermissionCheck(method: any) {
    return (userPermissions: any, requiredPermissions: any) =>
        checkAgainstAdmin(userPermissions, requiredPermissions, method);
}

const hasAnyPermission = makePermissionCheck("some");
const hasAllPermissions = makePermissionCheck("every");

function checkRoleHierarchy(userRoles: any, targetRole: any) {
    if (!Array.isArray(userRoles) || !targetRole) {
        return 0;
    }
    const highestUserRole = Math.max(...userRoles.map((role: any) => role.position || DEFAULT_ROLE_POSITION));
    return highestUserRole > (targetRole.position || DEFAULT_ROLE_POSITION) ? 1 : 0;
}

async function getUserPermissions(userId: any, guildId: any) {
    try {
        return await fetchPermissions(userId, guildId);
    } catch (permError: any) {
        logger.error("Error getting user permissions:", { error: permError.message });
        return EMPTY_PERMISSIONS;
    }
}

async function setUserPermissions(userId: any, guildId: any, permissions: any) {
    try {
        return await pushPermissions(userId, guildId, permissions);
    } catch (permError: any) {
        logger.error("Error setting user permissions:", { error: permError.message });
        return 0;
    }
}

function validateBotPermissions(botMember: any, requiredPermissions: any) {
    return botMember ? checkAgainstAdmin(botMember.permissions.toArray(), requiredPermissions, "every") : 0;
}

async function checkCommandPermission(userId: any, guildId: any, requiredPermission: any) {
    if (!requiredPermission) {
        return 1;
    }
    try {
        const userPermissions = await getUserPermissions(userId, guildId);
        return hasPermission(userPermissions, requiredPermission);
    } catch (permError: any) {
        logger.error("Error checking command permission:", { error: permError.message });
        return 0;
    }
}

export {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkRoleHierarchy,
    getUserPermissions,
    setUserPermissions,
    validateBotPermissions,
    checkCommandPermission,
};
