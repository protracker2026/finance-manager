// Backup & Restore Module
import { db } from '../db/database.js';
import { Utils } from './utils.js';

export const BackupModule = {
    // Export all database tables to a JSON object
    async exportData() {
        try {
            const data = {
                metadata: {
                    version: '2.0',
                    exportDate: new Date().toISOString(),
                    app: 'Finance Manager'
                },
                debts: await db.debts.toArray(),
                transactions: await db.transactions.toArray(),
                debtPayments: await db.debtPayments.toArray(),
                categories: await db.categories.toArray()
            };

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `finance_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showToast('ส่งออกข้อมูลสำรองเรียบร้อยแล้ว', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            Utils.showToast('ไม่สามารถส่งออกข้อมูลได้', 'error');
        }
    },

    // Import data from a JSON string
    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Basic validation
            if (!data.debts || !data.transactions) {
                throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
            }

            // Confirm with user
            if (!confirm('การนำเข้าข้อมูลจะล้างข้อมูลปัจจุบันทั้งหมดในเครื่องนี้ คุณต้องการดำเนินการต่อหรือไม่?')) {
                return;
            }

            // Clear existing data
            await db.transaction('rw', db.debts, db.transactions, db.debtPayments, db.categories, async () => {
                await db.debts.clear();
                await db.transactions.clear();
                await db.debtPayments.clear();
                await db.categories.clear();

                // Add imported data
                if (data.categories && data.categories.length > 0) {
                    await db.categories.bulkAdd(data.categories);
                }
                if (data.debts && data.debts.length > 0) {
                    await db.debts.bulkAdd(data.debts);
                }
                if (data.transactions && data.transactions.length > 0) {
                    await db.transactions.bulkAdd(data.transactions);
                }
                if (data.debtPayments && data.debtPayments.length > 0) {
                    await db.debtPayments.bulkAdd(data.debtPayments);
                }
            });

            Utils.showToast('นำเข้าข้อมูลเรียบร้อยแล้ว แอปจะรีโหลดใหม่', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Import failed:', error);
            Utils.showToast('ไม่สามารถนำเข้าข้อมูลได้: ' + error.message, 'error');
        }
    }
};
