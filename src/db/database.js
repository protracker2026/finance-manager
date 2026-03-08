import { firebaseConfig } from '../modules/firebase-config.js';

class MemoryCollection {
    constructor(db, name) {
        this.db = db;
        this.name = name;
        this.data = [];
    }

    async add(item) {
        if (!this.db.dbRef) await this.db.ensureInit();

        // Push to Firebase to generate ID
        const ref = this.db.dbRef.child(this.name).push();
        const newItem = { ...item, id: ref.key };

        // Optimistic update
        this.data.push(newItem);

        // Save content
        await ref.set(newItem);

        return newItem.id;
    }

    async update(id, changes) {
        if (!this.db.dbRef) await this.db.ensureInit();

        console.log('[DB] update id:', id, 'in collection:', this.name);

        // Always write to Firebase first — do NOT rely on memory cache lookup
        await this.db.dbRef.child(this.name).child(id).update(changes);
        console.log('[DB] Firebase update complete');

        // Also update memory optimistically
        const idx = this.data.findIndex(x => String(x.id) === String(id));
        if (idx !== -1) {
            this.data[idx] = { ...this.data[idx], ...changes };
        }
        return 1;
    }

    async delete(id) {
        if (!this.db.dbRef) await this.db.ensureInit();

        console.log('[DB] delete id:', id, 'in collection:', this.name);

        // Always write to Firebase first — do NOT rely on memory cache lookup
        await this.db.dbRef.child(this.name).child(id).remove();
        console.log('[DB] Firebase remove complete');

        // Also remove from memory
        const idx = this.data.findIndex(x => String(x.id) === String(id));
        if (idx !== -1) {
            this.data.splice(idx, 1);
        }
    }

    async get(id) {
        return this.data.find(x => x.id === id);
    }

    async toArray() {
        // Return a copy to avoid mutation reference issues
        return [...this.data];
    }

    // Helper to support legacy Dexie checks
    async count() {
        return this.data.length;
    }

    async bulkAdd(items) {
        if (!this.db.dbRef) await this.db.ensureInit();

        const updates = {};
        items.forEach(item => {
            const ref = this.db.dbRef.child(this.name).push();
            const newItem = { ...item, id: ref.key };
            updates[`${this.name}/${ref.key}`] = newItem;
            this.data.push(newItem);
        });

        // Atomic update for bulk add
        await this.db.dbRef.update(updates);
    }

    // Dummy methods to prevent crash if old code calls them
    orderBy(field) {
        console.warn('orderBy is deprecated in FirebaseDB adapter. Use array sort.');
        return this;
    }
    reverse() {
        return this;
    }
}

class FirebaseDB {
    constructor() {
        this.app = null;
        this.database = null;
        this.dbRef = null;
        this.initialized = false;
        this.initPromise = null;
        this.currentUid = null;

        this.transactions = new MemoryCollection(this, 'transactions');
        this.debts = new MemoryCollection(this, 'debts');
        this.debtPayments = new MemoryCollection(this, 'debtPayments');
        this.categories = new MemoryCollection(this, 'categories');
    }

    async init() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.log('Initializing Firebase Adapter...');

            // Wait for Firebase global
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }

            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.database = firebase.database();
            this.initialized = true;
            console.log('Firebase Adapter Ready');
        })();

        return this.initPromise;
    }

    // Called when user logs in
    async setUser(uid) {
        if (!uid) return;

        await this.ensureInit();
        this.currentUid = uid;

        // Update Ref to User's private path
        const userPath = `users/${uid}/data`;
        console.log(`Setting DB path to: ${userPath}`);

        // Remove old listener if exists
        if (this.dbRef) {
            this.dbRef.off();
        }

        this.dbRef = this.database.ref(userPath);

        // Load initial data
        await this.loadFromCloud();

        // Setup Realtime Listener
        this.dbRef.on('value', (snapshot) => {
            this.updateLocalCache(snapshot.val());
            window.dispatchEvent(new Event('data-synced'));
        });
    }

    // Called when user logs out
    clearData() {
        this.currentUid = null;
        if (this.dbRef) {
            this.dbRef.off(); // Detach listener
            this.dbRef = null;
        }

        // Clear local memory
        this.transactions.data = [];
        this.debts.data = [];
        this.debtPayments.data = [];
        this.categories.data = [];

        window.dispatchEvent(new Event('data-synced'));
        console.log('Database cleared (Logout)');
    }

    async ensureInit() {
        if (!this.initialized) await this.init();
    }

    async loadFromCloud() {
        if (!this.dbRef) return;
        const snapshot = await this.dbRef.once('value');
        this.updateLocalCache(snapshot.val());
    }

    updateLocalCache(dataObj) {
        dataObj = dataObj || {};
        this.populate(this.transactions, dataObj.transactions);
        this.populate(this.debts, dataObj.debts);
        this.populate(this.debtPayments, dataObj.debtPayments);
        this.populate(this.categories, dataObj.categories);
    }

    populate(collection, sourceData) {
        collection.data = [];
        if (sourceData) {
            // Use entries to ensure we have access to the key (ID)
            Object.entries(sourceData).forEach(([key, item]) => {
                collection.data.push({
                    ...item,
                    id: key // Always set ID from the key
                });
            });
        }
    }
}

export const db = new FirebaseDB();

export async function seedCategories() {
    await db.ensureInit();

    // Check if user already completed the initial setup phase
    if (db.currentUid && db.dbRef) {
        const configRef = db.database.ref(`users/${db.currentUid}/config`);
        const configSnap = await configRef.once('value');
        const configData = configSnap.val() || {};

        if (configData.hasInitConfig) {
            // User has been initialized before. Even if categories count is 0,
            // they may have intentionally deleted them. Do NOT re-seed.
            return;
        }

        // Proceed to check count and seed since this is their first time
        const count = await db.categories.count();
        if (count === 0) {
            await db.categories.bulkAdd([
                // รายรับ
                { name: 'เงินเดือน', type: 'income', icon: '💰' },
                { name: 'โบนัส', type: 'income', icon: '🎁' },
                { name: 'งานฟรีแลนซ์', type: 'income', icon: '💻' },
                { name: 'ดอกเบี้ยรับ', type: 'income', icon: '🏦' },
                { name: 'รายได้อื่นๆ', type: 'income', icon: '📈' },
                // รายจ่าย
                { name: 'อาหาร', type: 'expense', icon: '🍜' },
                { name: 'ขนม/ของหวาน', type: 'expense', icon: '🍰' },
                { name: 'ค่าเดินทาง', type: 'expense', icon: '🚗' },
                { name: 'ค่าที่พัก', type: 'expense', icon: '🏠' },
                { name: 'ค่าน้ำ-ไฟ', type: 'expense', icon: '💡' },
                { name: 'ค่ามือถือ/เน็ต', type: 'expense', icon: '📱' },
                { name: 'ค่ารักษาพยาบาล', type: 'expense', icon: '🏥' },
                { name: 'ช้อปปิ้ง', type: 'expense', icon: '🛍️' },
                { name: 'ความบันเทิง', type: 'expense', icon: '🎬' },
                { name: 'การศึกษา', type: 'expense', icon: '📚' },
                { name: 'ชำระหนี้', type: 'expense', icon: '💳' },
                { name: 'อื่นๆ', type: 'expense', icon: '📋' },
            ]);

            // Mark user as initialized so we don't seed again
            await configRef.update({ hasInitConfig: true });
        }
    }
}
