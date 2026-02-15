// Debt Management Module
import { db } from '../db/database.js';
import { InterestEngine } from './interest.js';

export const DebtModule = {
    async getAll() {
        return await db.debts.orderBy('name').toArray();
    },

    async getById(id) {
        return await db.debts.get(id);
    },

    async add(debt) {
        const data = {
            name: debt.name,
            type: debt.type, // 'credit_card' | 'personal_loan'
            interestType: debt.interestType, // 'reducing_balance' | 'daily_accrual'
            principal: parseFloat(debt.principal),
            currentBalance: parseFloat(debt.currentBalance || debt.principal),
            annualRate: parseFloat(debt.annualRate),
            monthlyPayment: parseFloat(debt.monthlyPayment || 0),
            minPayment: parseFloat(debt.minPayment || 0),
            termMonths: parseInt(debt.termMonths) || 0,
            startDate: debt.startDate,
            note: debt.note || '',
            status: 'active', // 'active' | 'paid'
            totalInterestPaid: 0,
            totalPaid: 0,
            accruedInterest: 0,
            lastInterestDate: debt.startDate,
            createdAt: new Date().toISOString()
        };
        return await db.debts.add(data);
    },

    async update(id, data) {
        if (data.principal) data.principal = parseFloat(data.principal);
        if (data.currentBalance) data.currentBalance = parseFloat(data.currentBalance);
        if (data.annualRate) data.annualRate = parseFloat(data.annualRate);
        if (data.monthlyPayment) data.monthlyPayment = parseFloat(data.monthlyPayment);
        if (data.minPayment) data.minPayment = parseFloat(data.minPayment);
        data.updatedAt = new Date().toISOString();
        return await db.debts.update(id, data);
    },

    async delete(id) {
        await db.debtPayments.where('debtId').equals(id).delete();
        return await db.debts.delete(id);
    },

    async recordPayment(debtId, payment) {
        const debt = await this.getById(debtId);
        if (!debt) throw new Error('ไม่พบข้อมูลหนี้');

        // Calculate interest accrued up to payment date
        let interestPortion = 0;
        let principalPortion = 0;
        const paymentAmount = parseFloat(payment.amount);

        if (debt.interestType === 'daily_accrual') {
            // Calculate daily accrued interest from last interest date to payment date
            const daysDiff = InterestEngine.daysBetween(debt.lastInterestDate, payment.date);
            const accruedNew = InterestEngine.dailyAccrual(debt.currentBalance, debt.annualRate, daysDiff);
            const totalAccrued = (debt.accruedInterest || 0) + accruedNew;

            interestPortion = Math.min(paymentAmount, totalAccrued);
            principalPortion = paymentAmount - interestPortion;

            await this.update(debtId, {
                currentBalance: Math.max(0, debt.currentBalance - principalPortion),
                accruedInterest: Math.max(0, totalAccrued - interestPortion),
                totalInterestPaid: (debt.totalInterestPaid || 0) + interestPortion,
                totalPaid: (debt.totalPaid || 0) + paymentAmount,
                lastInterestDate: payment.date,
                status: (debt.currentBalance - principalPortion) <= 0.01 ? 'paid' : 'active'
            });
        } else {
            // Reducing balance - monthly interest
            const monthlyInterest = InterestEngine.reducingBalanceMonthly(debt.currentBalance, debt.annualRate);
            interestPortion = Math.min(paymentAmount, monthlyInterest);
            principalPortion = paymentAmount - interestPortion;

            await this.update(debtId, {
                currentBalance: Math.max(0, debt.currentBalance - principalPortion),
                totalInterestPaid: (debt.totalInterestPaid || 0) + interestPortion,
                totalPaid: (debt.totalPaid || 0) + paymentAmount,
                status: (debt.currentBalance - principalPortion) <= 0.01 ? 'paid' : 'active'
            });
        }

        return await db.debtPayments.add({
            debtId,
            date: payment.date,
            amount: paymentAmount,
            interestPortion,
            principalPortion,
            balanceAfter: Math.max(0, debt.currentBalance - principalPortion),
            note: payment.note || '',
            createdAt: new Date().toISOString()
        });
    },

    async getPayments(debtId) {
        return await db.debtPayments.where('debtId').equals(debtId).sortBy('date');
    },

    async getAllPayments() {
        return await db.debtPayments.orderBy('date').reverse().toArray();
    },

    async getTotalDebt() {
        const debts = await this.getAll();
        return debts.filter(d => d.status === 'active').reduce((s, d) => s + d.currentBalance, 0);
    },

    async getDebtSummary() {
        const debts = await this.getAll();
        const active = debts.filter(d => d.status === 'active');
        const paid = debts.filter(d => d.status === 'paid');

        return {
            totalDebt: active.reduce((s, d) => s + d.currentBalance, 0),
            totalOriginal: debts.reduce((s, d) => s + d.principal, 0),
            totalInterestPaid: debts.reduce((s, d) => s + (d.totalInterestPaid || 0), 0),
            totalPaid: debts.reduce((s, d) => s + (d.totalPaid || 0), 0),
            activeCount: active.length,
            paidCount: paid.length,
            debts
        };
    }
};
