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
        // If it's a card, we don't default currentBalance to principal because limit != debt
        const isCard = (debt.type === 'credit_card' || debt.type === 'cash_card');
        const currentBalance = (debt.currentBalance !== undefined && debt.currentBalance !== '')
            ? parseFloat(debt.currentBalance)
            : (isCard ? 0 : principal);

        // Auto-calculate minPayment สำหรับบัตรเครดิตและบัตรกดเงินสด
        let minPayment = parseFloat(debt.minPayment || 0);
        if (isCard && minPayment === 0) {
            minPayment = InterestEngine.calculateMinPayment(currentBalance, debt.type);
        }

        const data = {
            name: debt.name,
            type: debt.type, // 'credit_card' | 'personal_loan' | 'personal_loan_vehicle'
            interestType: interestType, // 'reducing_balance' | 'daily_accrual'
            principal: principal, // For credit cards, this is the credit limit. For loans, the original loan amount.
            currentBalance: currentBalance,
            startingBalance: currentBalance, // Baseline for payoff progress, especially for revolving debt
            annualRate: parseFloat(debt.annualRate),
            monthlyPayment: parseFloat(debt.monthlyPayment || 0),
            minPayment: Math.round(minPayment * 100) / 100,
            termMonths: parseInt(debt.termMonths) || 0,
            isInstallment: !!debt.isInstallment,
            allowOverpayment: debt.allowOverpayment !== false,
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
        if (debt.addToIncome && currentBalance > 0) {
            const txnId = await TransactionModule.add({
                type: 'income',
                amount: currentBalance, // Use actually borrowed amount, NOT the credit limit!
                date: debt.startDate,
                category: 'เงินกู้/เงินสดจากบัตร',
                note: `รับเงินสดจาก: ${debt.name}`
            });
            // Link the transaction ID to the debt record for later cleanup
            await db.debts.update(id, { linkedIncomeTxnId: txnId });
        }

        SyncModule.notifyDataChange();
        window.dispatchEvent(new Event('refresh-transactions')); // Ensure other pages refresh immediately
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
        await this.recalculateDebt(id);
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

    async addSpending(data) {
        const debtId = data.debtId;
        const debt = await db.debts.get(debtId);
        if (!debt) return;

        const amount = parseFloat(data.amount);
        const fee = parseFloat(data.fee || 0);
        const totalAmount = amount + fee;

        // Create a linked expense transaction
        const txnId = await TransactionModule.add({
            type: 'expense',
            amount: totalAmount,
            date: data.date,
            category: 'ใช้จ่ายผ่านบัตร',
            note: `${debt.name}: ${data.note || 'รูดบัตร/กดเงินสด'}${fee > 0 ? ` (รวมค่าธรรมเนียม ${fee})` : ''}`
        });

        const activity = {
            debtId: debtId,
            type: 'spend',
            amount: amount,
            fee: fee,
            date: data.date,
            note: data.note || '',
            isCashAdvance: !!data.isCashAdvance,
            transactionId: txnId, // Link to the expense transaction
            createdAt: new Date().toISOString()
        };

        const activityId = await db.debtPayments.add(activity);

        // [FIX] Restore Income tracking: If checked, add this amount to Income too
        if (data.addToIncome) {
            const incomeTxnId = await TransactionModule.add({
                type: 'income',
                amount: amount, // The actual cash received
                date: data.date,
                category: 'เงินกู้/เงินสดจากบัตร',
                note: `รับเงินสดจาก: ${debt.name} (${data.note || 'กดเงินสด'})`
            });
            // Update the activity with the income transaction link
            await db.debtPayments.update(activityId, { incomeTransactionId: incomeTxnId });
        }
        await this.recalculateDebt(debtId);
        SyncModule.notifyDataChange();
        window.dispatchEvent(new Event('refresh-transactions')); // Ensure other pages refresh immediately
        return activityId;
    },

    async recalculateDebt(debtId) {
        const debt = await db.debts.get(debtId);
        if (!debt) return;

        const payments = await this.getPayments(debtId);

        // Reset debt state to start
        const isCard = (debt.type === 'credit_card' || debt.type === 'cash_card');
        // REVOLVING DEBT FIX: Start from startingBalance, not principal (which is the limit)
        let currentBalance = debt.startingBalance !== undefined ? debt.startingBalance : (isCard ? 0 : debt.principal);
        let totalInterestPaid = 0;
        let totalPaid = 0;
        let accruedInterest = 0;
        let lastInterestDate = debt.startDate;

        for (let act of payments) {
            const amount = parseFloat(act.amount);
            const fee = parseFloat(act.fee || 0);
            const isSpend = act.type === 'spend';

            const daysSinceLast = InterestEngine.daysBetween(lastInterestDate, act.date);
            let interestAccruedInPeriod = 0;

            if (debt.interestType === 'fixed_rate') {
                const dailyFixed = (debt.annualRate / 100 * debt.principal) / 365;
                interestAccruedInPeriod = dailyFixed * daysSinceLast;
            } else {
                const dailyRate = debt.annualRate / 100 / 365;
                interestAccruedInPeriod = currentBalance * dailyRate * daysSinceLast;
            }

            accruedInterest += interestAccruedInPeriod;

            if (isSpend) {
                // Spending increases balance
                currentBalance += amount + fee;
                // Spending activity doesn't "pay" interest, it just adds to principal
                await db.debtPayments.update(act.id, {
                    balanceAfter: Math.round(currentBalance * 100) / 100
                });
            } else {
                // Payment pays interest first, then principal
                const paymentAmount = amount;
                const interestPortion = Math.min(paymentAmount, accruedInterest);
                const principalPortion = paymentAmount - interestPortion;

                accruedInterest = Math.max(0, accruedInterest - interestPortion);
                currentBalance = Math.max(0, currentBalance - principalPortion);

                totalInterestPaid += interestPortion;
                totalPaid += paymentAmount;

                // Update payment record with calculated values
                await db.debtPayments.update(act.id, {
                    interestPortion: Math.round(interestPortion * 100) / 100,
                    principalPortion: Math.round(principalPortion * 100) / 100,
                    balanceAfter: Math.round(currentBalance * 100) / 100
                });
            }

            lastInterestDate = act.date;
        }

        // Always auto-calculate min payment for revolving debts based on current balance
        // This ensures minPayment reflects the true bank minimum based on BOT rules.
        const newMinPayment = isCard
            ? InterestEngine.calculateMinPayment(currentBalance, debt.type)
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

    async getHistory(debtId) {
        return this.getPayments(debtId);
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
            totalOriginal: debts.reduce((s, d) => {
                const isCard = (d.type === 'credit_card' || d.type === 'cash_card');
                const baseline = isCard ? Math.max(d.startingBalance || 0, d.currentBalance) : d.principal;
                return s + baseline;
            }, 0),
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
    const linkedRecord = allPayments.find(p => String(p.transactionId) === String(txnId));

    if (linkedRecord) {
        console.log(`[DebtModule] Linked transaction ${txnId} deleted. Reverting debt record ${linkedRecord.id}...`);

        // Delete the debt record (can be payment or spend)
        await db.debtPayments.delete(linkedRecord.id);

        // Recalculate the debt to restore the balance
        await DebtModule.recalculateDebt(linkedRecord.debtId);

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
