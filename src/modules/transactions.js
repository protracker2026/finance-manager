// Transaction Module - CRUD & Summaries
import { db } from '../db/database.js';
import { SyncModule } from './sync.js';

export const TransactionModule = {
    async getAll(filters = {}) {
        let results = await db.transactions.toArray();
        // Safari compatibility: append seconds if missing
        results.forEach(t => {
            if (t.date && t.date.length === 16) t.date += ':00';
        });
        results.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filters.type) {
            results = results.filter(t => t.type === filters.type);
        }
        if (filters.category) {
            results = results.filter(t => t.category === filters.category);
        }
        if (filters.startDate) {
            results = results.filter(t => t.date >= filters.startDate);
        }
        if (filters.endDate) {
            // If endDate is just 'YYYY-MM-DD', append time to make it inclusive
            const end = filters.endDate.length === 10 ? filters.endDate + 'T23:59:59' : filters.endDate;
            results = results.filter(t => t.date <= end);
        }
        if (filters.search) {
            const s = filters.search.toLowerCase();
            results = results.filter(t =>
                (t.note && t.note.toLowerCase().includes(s)) ||
                (t.category && t.category.toLowerCase().includes(s))
            );
        }
        return results;
    },

    async add(transaction) {
        if (transaction.date && transaction.date.length === 16) transaction.date += ':00';
        const id = await db.transactions.add({
            ...transaction,
            amount: parseFloat(transaction.amount),
            createdAt: new Date().toISOString()
        });
        // SyncModule.notifyDataChange();
        return id;
    },

    async update(id, data) {
        if (data.date && data.date.length === 16) data.date += ':00';
        const result = await db.transactions.update(id, {
            ...data,
            amount: parseFloat(data.amount),
            updatedAt: new Date().toISOString()
        });
        
        // Notify other modules to sync linked data
        window.dispatchEvent(new CustomEvent('transaction-updated', { 
            detail: { id, data } 
        }));
        
        return result;
    },

    async delete(id) {
        const result = await db.transactions.delete(id);
        
        // Notify other modules (like DebtModule) to clean up linked data
        window.dispatchEvent(new CustomEvent('transaction-deleted', { 
            detail: { id } 
        }));
        
        return result;
    },

    async getSummary(startDate, endDate) {
        let txns = await db.transactions.toArray();
        if (startDate) txns = txns.filter(t => t.date >= startDate);
        if (endDate) {
            const end = endDate && endDate.length === 10 ? endDate + 'T23:59:59' : endDate;
            txns = txns.filter(t => t.date <= end);
        }

        const income = txns.filter(t => t.type?.toLowerCase() === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const expense = txns.filter(t => t.type?.toLowerCase() === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

        const byCategory = {};
        txns.forEach(t => {
            if (!t.category) return;
            if (!byCategory[t.category]) {
                byCategory[t.category] = { income: 0, expense: 0 };
            }
            const typeKey = t.type?.toLowerCase();
            if (typeKey === 'income' || typeKey === 'expense') {
                byCategory[t.category][typeKey] += (parseFloat(t.amount) || 0);
            }
        });

        return { income, expense, balance: income - expense, byCategory, count: txns.length };
    },

    async getMonthlySummary(year, month) {
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        return this.getSummary(start, end);
    },

    async getCategories(type) {
        let cats = await db.categories.toArray();
        if (type) cats = cats.filter(c => c.type === type);
        return cats;
    },

    async addCategory(cat) {
        const result = await db.categories.add(cat);
        // SyncModule.notifyDataChange();
        return result;
    },

    async updateCategory(id, data) {
        const result = await db.categories.update(id, data);
        SyncModule.notifyDataChange();
        return result;
    },

    async deleteCategory(id) {
        const result = await db.categories.delete(id);
        SyncModule.notifyDataChange();
        return result;
    }
};
