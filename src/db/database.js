// Database Layer using Dexie.js
const db = new Dexie('FinanceDB');

db.version(1).stores({
    transactions: '++id, date, type, category, amount',
    debts: '++id, name, type, interestType, status',
    debtPayments: '++id, debtId, date, amount',
    categories: '++id, name, type'
});

// Seed default categories
async function seedCategories() {
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
    }
}

export { db, seedCategories };
