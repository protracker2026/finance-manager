import { db } from '../db/database.js';
import { Utils } from './utils.js';
import { firebaseConfig } from './firebase-config.js';

export const SyncModule = {
    app: null,
    database: null,
    dbRef: null,
    unsubscribe: null, // Listener unsubscriber

    config: {
        ...firebaseConfig,

        // GLOBAL SYNC ID (Everyone sees the same data)
        syncId: 'global_default_user'
    },

    init() {
        if (this.config.apiKey && this.config.databaseURL) {
            try {
                if (!firebase.apps.length) {
                    this.app = firebase.initializeApp(this.config);
                } else {
                    this.app = firebase.app(); // Use existing app if already initialized
                }

                this.database = firebase.database();
                this.dbRef = this.database.ref('users/' + this.config.syncId);

                this.listenForChanges();
                return true;
            } catch (e) {
                console.error('Firebase init failed', e);
                return false;
            }
        }
        return false;
    },

    saveConfig(syncId) {
        this.config.syncId = syncId;
        localStorage.setItem('sync_user_id', syncId);
        return this.init();
    },

    isConnected() {
        return !!this.database;
    },

    // Real-time listener
    listenForChanges() {
        if (!this.isConnected()) return;

        // Turn off existing listener if any
        if (this.dbRef) {
            this.dbRef.off();
        }

        this.dbRef.child('data').on('value', async (snapshot) => {
            const cloudData = snapshot.val();
            if (cloudData) {
                // Check if this update came from THIS device to avoid infinite loop
                // (In a simple implementation, we might just re-import. 
                // Ideally, we compare timestamps or checksums, but for now we'll do a simple check 
                // or just let it overwrite local if it's newer/different)

                // For simplicity in this version: We just overwrite local data when cloud changes.
                // This gives us "Real-time Sync" benefit: Change on Device A -> Device B updates instantly.
                // NOTE: This might cause a UI refresh while user is typing if not careful, 
                // but for this app it's acceptable.

                console.log('Received data from cloud...', cloudData);
                await this.importData(cloudData);
            }
        });
    },

    async importData(cloudData) {
        try {
            await db.transaction('rw', db.transactions, db.debts, db.debtPayments, db.categories, async () => {
                await db.transactions.clear();
                await db.debts.clear();
                await db.debtPayments.clear();
                await db.categories.clear();

                await db.transactions.bulkAdd(cloudData.transactions || []);
                await db.debts.bulkAdd(cloudData.debts || []);
                await db.debtPayments.bulkAdd(cloudData.debtPayments || []);
                await db.categories.bulkAdd(cloudData.categories || []);
            });
            // Optional: Notify UI to refresh? 
            // Since we don't have a global event bus, we might rely on page reloads or specific UI hooks.
            // For now, let's just log it. A page reload might be jarring.
            // Maybe dispatch a custom event?
            window.dispatchEvent(new Event('data-synced'));

        } catch (e) {
            console.error('Error importing cloud data', e);
        }
    },

    async syncNow(silent = false) {
        if (!this.isConnected()) return false;

        try {
            if (!silent) Utils.showToast('🚀 เริ่มต้นการซิงค์ข้อมูล...', 'info');

            // 1. Force push local to cloud (One-way sync for "Save" action)
            // Or should syncNow be "Pull"? 
            // Usually "Sync Now" implies ensuring cloud matches local or vice versa.
            // Let's make it PUSH local -> cloud for this button, 
            // because PULL happens automatically via listener.

            await this.pushToCloud();

            if (!silent) Utils.showToast('✅ ซิงค์ข้อมูลขึ้นคลาวด์สำเร็จ', 'success');
            return true;
        } catch (error) {
            console.error('Sync error:', error);
            if (!silent) Utils.showToast('❌ การซิงค์ล้มเหลว: ' + error.message, 'error');
            return false;
        }
    },

    // Debounce timer
    _pushTimer: null,

    // Background push when data changes
    async notifyDataChange() {
        if (!this.isConnected()) return;

        // Debounce: Wait 2 seconds after last change before pushing
        if (this._pushTimer) clearTimeout(this._pushTimer);

        this._pushTimer = setTimeout(async () => {
            try {
                await this.pushToCloud();
                console.log('Auto-pushed to cloud');
            } catch (e) {
                console.warn('Silent push failed', e);
            }
        }, 2000);
    },

    async pushToCloud() {
        if (!this.isConnected()) return;

        const data = {
            transactions: await db.transactions.toArray(),
            debts: await db.debts.toArray(),
            debtPayments: await db.debtPayments.toArray(),
            categories: await db.categories.toArray(),
        };

        const updatePayload = {
            data: data,
            meta: {
                lastUpdated: new Date().toISOString(),
                agent: navigator.userAgent
            }
        };

        await this.dbRef.set(updatePayload);
    }
};
