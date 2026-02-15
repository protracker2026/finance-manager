// Transaction Module - CRUD & Summaries
import { db } from '../db/database.js';

export const TransactionModule = {
    async getAll(filters = {}) {
        let collection = db.transactions.orderBy('date').reverse();
        let results = await collection.toArray();

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
            results = results.filter(t => t.date <= filters.endDate);
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
        return await db.transactions.add({
            ...transaction,
            amount: parseFloat(transaction.amount),
            createdAt: new Date().toISOString()
        });
    },

    async update(id, data) {
        return await db.transactions.update(id, {
            ...data,
            amount: parseFloat(data.amount),
            updatedAt: new Date().toISOString()
        });
    },

    async delete(id) {
        return await db.transactions.delete(id);
    },

    async getSummary(startDate, endDate) {
        let txns = await db.transactions.toArray();
        if (startDate) txns = txns.filter(t => t.date >= startDate);
        if (endDate) txns = txns.filter(t => t.date <= endDate);

        const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        const byCategory = {};
        txns.forEach(t => {
            if (!byCategory[t.category]) {
                byCategory[t.category] = { income: 0, expense: 0 };
            }
            byCategory[t.category][t.type] += t.amount;
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
        return await db.categories.add(cat);
    },

    async deleteCategory(id) {
        return await db.categories.delete(id);
    }
};
