// DEPRECATED: Sync logic has moved to src/db/database.js
// This file exists only to prevent import errors in legacy code.

export const SyncModule = {
    init: () => true,
    isConnected: () => true,
    syncNow: async () => { },
    saveConfig: () => true,
    notifyDataChange: () => { },
    config: {
        syncId: 'global_default_user'
    }
};
