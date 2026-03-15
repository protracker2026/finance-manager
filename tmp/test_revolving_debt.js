
import { db } from '../src/db/database.js';
import { DebtModule } from '../src/modules/debts.js';
import { TransactionModule } from '../src/modules/transactions.js';

async function testRevolvingDebt() {
    console.log("Starting Revolving Debt Test...");

    // 1. Clear old data (if any)
    await db.debts.clear();
    await db.debtPayments.clear();
    await db.transactions.clear();

    // 2. Add a credit card
    const debtId = await DebtModule.add({
        name: "Test Credit Card",
        type: "credit_card",
        principal: 50000,
        currentBalance: 10000,
        annualRate: 16,
        startDate: "2026-03-01",
        interestType: "daily_accrual"
    });
    console.log("Added Credit Card, ID:", debtId);

    // 3. Add a spending transaction
    const spendId = await DebtModule.addSpending({
        debtId: debtId,
        amount: 5000,
        fee: 0,
        date: "2026-03-05",
        note: "Buy groceries"
    });
    console.log("Added spending, ID:", spendId);

    // 4. Verify balance and linked transaction
    const updatedDebt = await DebtModule.getById(debtId);
    console.log("Updated Balance:", updatedDebt.currentBalance); // 10000 + 5000 = 15000 (approx, depending on interest)
    
    const txns = await TransactionModule.getAll();
    console.log("All transactions:", txns.length);
    const linkedTxn = txns.find(t => t.note.includes("Buy groceries"));
    
    if (linkedTxn && linkedTxn.amount === 5000) {
        console.log("SUCCESS: Linked transaction found with correct amount.");
    } else {
        console.error("FAILURE: Linked transaction not found or incorrect.");
    }

    // 5. Test deletion
    if (linkedTxn) {
        await TransactionModule.delete(linkedTxn.id);
        const debtAfterDelete = await DebtModule.getById(debtId);
        console.log("Balance after deleting txn:", debtAfterDelete.currentBalance); // Should be back to 10000 (approx)
        if (Math.abs(debtAfterDelete.currentBalance - 10000) < 1) {
            console.log("SUCCESS: Deletion synced back to debt balance.");
        } else {
            console.error("FAILURE: Deletion sync failed.");
        }
    }

    console.log("Test Finished.");
}

// Since this is meant to be run in the browser environment (due to Dexie/IDB), 
// I'll suggest the user to check the UI which covers these cases.
// Or I can try to run it if I have a test harness.
// For now, I'll rely on browser verification.
