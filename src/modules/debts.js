// Debt Management Module
import { db } from '../db/database.js';
import { InterestEngine } from './interest.js';
import { SyncModule } from './sync.js';
import { TransactionModule } from './transactions.js';

export const DebtModule = {
    async getAll() {
        const debts = await db.debts.toArray();
        return debts.sort((a, b) => a.name.localeCompare(b.name));
    },

    async getById(id) {
        return await db.debts.get(id);
    },

    async add(debt) {
        // Auto-set interestType ตามประเภทหนี้ (ตามหลัก ธปท.)
        const botConfig = InterestEngine.getBOTConfig(debt.type);
        const interestType = debt.interestType || botConfig.method;

        const principal = parseFloat(debt.principal);
        const currentBalance = parseFloat(debt.currentBalance || debt.principal);

        // Auto-calculate minPayment สำหรับบัตรเครดิต
        let minPayment = parseFloat(debt.minPayment || 0);
        if (debt.type === 'credit_card' && minPayment === 0) {
            minPayment = InterestEngine.calculateMinPayment(currentBalance, 'credit_card');
        }

        const data = {
            name: debt.name,
            type: debt.type, // 'credit_card' | 'personal_loan' | 'personal_loan_vehicle'
            interestType: interestType, // 'reducing_balance' | 'daily_accrual'
            principal: principal,
            currentBalance: currentBalance,
            annualRate: parseFloat(debt.annualRate),
            monthlyPayment: parseFloat(debt.monthlyPayment || 0),
            minPayment: Math.round(minPayment * 100) / 100,
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
        const id = await db.debts.add(data);

        // Optional: Add to income transactions if requested
        if (debt.addToIncome) {
            const txnId = await TransactionModule.add({
                type: 'income',
                amount: principal,
                date: debt.startDate,
                category: 'เงินกู้/เงินสดจากบัตร',
                note: `รับเงินสดจาก: ${debt.name}`
            });
            // Link the transaction ID to the debt record for later cleanup
            await db.debts.update(id, { linkedIncomeTxnId: txnId });
        }

        SyncModule.notifyDataChange();
        return id;
    },

    async update(id, data) {
        if (data.principal) data.principal = parseFloat(data.principal);
        if (data.currentBalance) data.currentBalance = parseFloat(data.currentBalance);
        if (data.annualRate) data.annualRate = parseFloat(data.annualRate);
        if (data.monthlyPayment) data.monthlyPayment = parseFloat(data.monthlyPayment);
        if (data.minPayment) data.minPayment = parseFloat(data.minPayment);
        data.updatedAt = new Date().toISOString();
        const result = await db.debts.update(id, data);
        SyncModule.notifyDataChange();
        return result;
    },

    async delete(id) {
        const debt = await db.debts.get(id);
        
        // Find and delete related payments
        const payments = await db.debtPayments.toArray();
        const related = payments.filter(p => p.debtId === id);
        for (const p of related) {
            await db.debtPayments.delete(p.id);
            // Also delete linked transactions for payments (if any)
            if (p.transactionId) {
                await TransactionModule.delete(p.transactionId);
            }
        }

        // Delete linked income transaction if from a cash withdrawal
        if (debt && debt.linkedIncomeTxnId) {
            await TransactionModule.delete(debt.linkedIncomeTxnId);
        }

        const result = await db.debts.delete(id);
        SyncModule.notifyDataChange();
        return result;
    },
    async recordPayment(debtId, payment) {
        const paymentAmount = parseFloat(payment.amount);

        // Get debt info to create a helpful transaction note
        const debt = await db.debts.get(debtId);
        const debtName = debt ? debt.name : 'หนี้';

        // Create a linked expense transaction
        const txnId = await TransactionModule.add({
            type: 'expense',
            amount: paymentAmount,
            date: payment.date,
            category: 'ชำระหนี้',
            note: `ชำระหนี้: ${debtName}${payment.note ? ` (${payment.note})` : ''}`
        });

        await db.debtPayments.add({
            debtId,
            date: payment.date,
            amount: paymentAmount,
            interestPortion: 0,
            principalPortion: 0,
            balanceAfter: 0,
            transactionId: txnId, // Link to the transaction
            note: payment.note || '',
            createdAt: new Date().toISOString()
        });
        await this.recalculateDebt(debtId);
        SyncModule.notifyDataChange();
        return true;
    },

    async deletePayment(paymentId) {
        const p = await db.debtPayments.get(paymentId);
        if (!p) return;
        const debtId = p.debtId;

        // Delete linked transaction if exists
        if (p.transactionId) {
            await TransactionModule.delete(p.transactionId);
        }

        await db.debtPayments.delete(paymentId);
        await this.recalculateDebt(debtId);
        SyncModule.notifyDataChange();
    },

    async updatePayment(paymentId, data) {
        const p = await db.debtPayments.get(paymentId);
        if (!p) return;
        const debtId = p.debtId;
        await db.debtPayments.update(paymentId, data);
        await this.recalculateDebt(debtId);
        SyncModule.notifyDataChange();
    },

    async recalculateDebt(debtId) {
        const debt = await db.debts.get(debtId);
        if (!debt) return;

        const payments = await this.getPayments(debtId);

        // Reset debt state to start
        let currentBalance = debt.principal;
        let totalInterestPaid = 0;
        let totalPaid = 0;
        let accruedInterest = 0;
        let lastInterestDate = debt.startDate;

        for (let p of payments) {
            const paymentAmount = parseFloat(p.amount);
            let interestPortion = 0;
            let principalPortion = 0;

            const daysSinceLast = InterestEngine.daysBetween(lastInterestDate, p.date);

            if (debt.interestType === 'fixed_rate') {
                // Flat Rate: Interest based on ORIGINAL principal per day
                // (Rate/100 * OriginalPrincipal / 365) * days
                const dailyFixed = (debt.annualRate / 100 * debt.principal) / 365;
                const accruedNew = dailyFixed * daysSinceLast;
                const totalAccruedAtPayment = accruedInterest + accruedNew;

                interestPortion = Math.min(paymentAmount, totalAccruedAtPayment);
                principalPortion = paymentAmount - interestPortion;
                accruedInterest = Math.max(0, totalAccruedAtPayment - interestPortion);
            } else {
                // Reducing Balance OR Daily Accrual: Interest based on CURRENT balance per day
                // BOT Standard for Personal Loans and Credit Cards
                const dailyRate = debt.annualRate / 100 / 365;
                const accruedNew = currentBalance * dailyRate * daysSinceLast;
                const totalAccruedAtPayment = accruedInterest + accruedNew;

                interestPortion = Math.min(paymentAmount, totalAccruedAtPayment);
                principalPortion = paymentAmount - interestPortion;
                accruedInterest = Math.max(0, totalAccruedAtPayment - interestPortion);
            }

            currentBalance = Math.max(0, currentBalance - principalPortion);
            totalInterestPaid += interestPortion;
            totalPaid += paymentAmount;
            lastInterestDate = p.date;

            // Update payment record with calculated values
            await db.debtPayments.update(p.id, {
                interestPortion: Math.round(interestPortion * 100) / 100,
                principalPortion: Math.round(principalPortion * 100) / 100,
                balanceAfter: Math.round(currentBalance * 100) / 100
            });
        }

        // Final debt status & min payment for credit cards
        const newMinPayment = debt.type === 'credit_card'
            ? InterestEngine.calculateMinPayment(currentBalance, 'credit_card')
            : debt.minPayment;

        await db.debts.update(debtId, {
            currentBalance: Math.round(currentBalance * 100) / 100,
            accruedInterest: Math.round(accruedInterest * 100) / 100,
            totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100,
            lastInterestDate: lastInterestDate,
            minPayment: Math.round(newMinPayment * 100) / 100,
            status: currentBalance <= 0.01 ? 'paid' : 'active',
            updatedAt: new Date().toISOString()
        });
    },

    async getPayments(debtId) {
        const all = await db.debtPayments.toArray();
        return all
            .filter(p => p.debtId === debtId)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    async getAllPayments() {
        const all = await db.debtPayments.toArray();
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async getTotalDebt() {
        const debts = await this.getAll();
        return debts.filter(d => d.status === 'active').reduce((s, d) => s + d.currentBalance, 0);
    },

    async getDebtSummary() {
        const debts = await this.getAll();
        const active = debts.filter(d => d.status === 'active');
        const paid = debts.filter(d => d.status === 'paid');

        // Fetch payments for each debt
        for (let debt of debts) {
            debt.payments = await this.getPayments(debt.id);
        }

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

// Global listener for transaction deletions (Undo mechanism)
window.addEventListener('transaction-deleted', async (e) => {
    const txnId = e.detail.id;
    const allPayments = await db.debtPayments.toArray();
    const linkedPayment = allPayments.find(p => String(p.transactionId) === String(txnId));
    
    if (linkedPayment) {
        console.log(`[DebtModule] Linked transaction ${txnId} deleted. Reverting payment ${linkedPayment.id}...`);
        
        // Delete the debt payment record
        await db.debtPayments.delete(linkedPayment.id);
        
        // Recalculate the debt to restore the balance
        await DebtModule.recalculateDebt(linkedPayment.debtId);
        
        // Notify UI to refresh
        SyncModule.notifyDataChange();
        window.dispatchEvent(new Event('refresh-transactions'));
    }
});

// Global listener for transaction updates (Sync mechanism)
window.addEventListener('transaction-updated', async (e) => {
    const { id, data } = e.detail;
    const allPayments = await db.debtPayments.toArray();
    const linkedPayment = allPayments.find(p => String(p.transactionId) === String(id));
    
    if (linkedPayment) {
        console.log(`[DebtModule] Linked transaction ${id} updated. Syncing debt payment...`);
        
        // Sync the amount and date (recalculation will handle the rest)
        await db.debtPayments.update(linkedPayment.id, {
            amount: parseFloat(data.amount),
            date: data.date,
            note: data.note || linkedPayment.note
        });
        
        // Recalculate everything for this debt
        await DebtModule.recalculateDebt(linkedPayment.debtId);
        
        // Notify UI
        SyncModule.notifyDataChange();
        window.dispatchEvent(new Event('refresh-transactions'));
    }
});
