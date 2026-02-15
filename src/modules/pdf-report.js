// PDF Report Generator using jsPDF
import { TransactionModule } from './transactions.js';
import { DebtModule } from './debts.js';
import { InterestEngine } from './interest.js';
import { Utils } from './utils.js';

export const PDFReport = {
    async generate(type, startDate, endDate) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Register Thai font support - use default with UTF-8
        doc.setFont('helvetica');

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = 20;

        // Header
        const addHeader = (title) => {
            doc.setFontSize(18);
            doc.setTextColor(108, 92, 231);
            doc.text(title, pageWidth / 2, y, { align: 'center' });
            y += 8;
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 140);
            doc.text(`Generated: ${new Date().toLocaleString('th-TH')}`, pageWidth / 2, y, { align: 'center' });
            y += 4;
            if (startDate && endDate) {
                doc.text(`Period: ${startDate} to ${endDate}`, pageWidth / 2, y, { align: 'center' });
                y += 4;
            }
            doc.setDrawColor(42, 42, 68);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;
        };

        const addSectionTitle = (title) => {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(13);
            doc.setTextColor(162, 155, 254);
            doc.text(title, margin, y);
            y += 7;
        };

        const checkPage = (needed = 20) => {
            if (y + needed > 280) { doc.addPage(); y = 20; }
        };

        const fmtNum = (n) => {
            return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
        };

        // Generate based on type
        if (type === 'income_expense' || type === 'full_report') {
            addHeader('Income & Expense Report');

            const summary = await TransactionModule.getSummary(startDate, endDate);
            const txns = await TransactionModule.getAll({ startDate, endDate });

            // Summary box
            addSectionTitle('Summary');
            const summaryData = [
                ['Income', fmtNum(summary.income) + ' THB'],
                ['Expense', fmtNum(summary.expense) + ' THB'],
                ['Balance', fmtNum(summary.balance) + ' THB'],
                ['Total Transactions', summary.count.toString()]
            ];

            doc.autoTable({
                startY: y,
                head: [['Item', 'Amount']],
                body: summaryData,
                margin: { left: margin, right: margin },
                theme: 'grid',
                headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 3 },
                alternateRowStyles: { fillColor: [245, 245, 250] }
            });
            y = doc.lastAutoTable.finalY + 10;

            // Category breakdown
            if (Object.keys(summary.byCategory).length > 0) {
                checkPage(30);
                addSectionTitle('By Category');
                const catData = Object.entries(summary.byCategory).map(([cat, vals]) => [
                    cat, fmtNum(vals.income), fmtNum(vals.expense)
                ]);

                doc.autoTable({
                    startY: y,
                    head: [['Category', 'Income (THB)', 'Expense (THB)']],
                    body: catData,
                    margin: { left: margin, right: margin },
                    theme: 'grid',
                    headStyles: { fillColor: [108, 92, 231], textColor: 255 },
                    styles: { fontSize: 9, cellPadding: 2.5 },
                    alternateRowStyles: { fillColor: [245, 245, 250] },
                    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
                });
                y = doc.lastAutoTable.finalY + 10;
            }

            // Transaction list
            if (txns.length > 0) {
                checkPage(30);
                addSectionTitle('All Transactions');
                const txnData = txns.map(t => [
                    t.date,
                    t.type === 'income' ? 'Income' : 'Expense',
                    t.category,
                    t.note || '-',
                    (t.type === 'income' ? '+' : '-') + fmtNum(t.amount)
                ]);

                doc.autoTable({
                    startY: y,
                    head: [['Date', 'Type', 'Category', 'Note', 'Amount (THB)']],
                    body: txnData,
                    margin: { left: margin, right: margin },
                    theme: 'striped',
                    headStyles: { fillColor: [108, 92, 231], textColor: 255 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    columnStyles: { 4: { halign: 'right' } }
                });
                y = doc.lastAutoTable.finalY + 10;
            }

            if (type === 'full_report') { doc.addPage(); y = 20; }
        }

        if (type === 'debt_summary' || type === 'full_report') {
            if (type !== 'full_report') addHeader('Debt Summary Report');
            else addSectionTitle('=== Debt Summary ===');

            const debtSummary = await DebtModule.getDebtSummary();

            addSectionTitle('Overview');
            const overviewData = [
                ['Total Original Principal', fmtNum(debtSummary.totalOriginal) + ' THB'],
                ['Current Outstanding', fmtNum(debtSummary.totalDebt) + ' THB'],
                ['Total Interest Paid', fmtNum(debtSummary.totalInterestPaid) + ' THB'],
                ['Total Amount Paid', fmtNum(debtSummary.totalPaid) + ' THB'],
                ['Active Debts', debtSummary.activeCount.toString()],
                ['Paid Off Debts', debtSummary.paidCount.toString()]
            ];

            doc.autoTable({
                startY: y,
                head: [['Item', 'Value']],
                body: overviewData,
                margin: { left: margin, right: margin },
                theme: 'grid',
                headStyles: { fillColor: [108, 92, 231], textColor: 255 },
                styles: { fontSize: 10, cellPadding: 3 },
                alternateRowStyles: { fillColor: [245, 245, 250] }
            });
            y = doc.lastAutoTable.finalY + 10;

            // Individual debts
            for (const debt of debtSummary.debts) {
                checkPage(50);
                addSectionTitle(`${debt.name}`);

                const debtInfo = [
                    ['Type', debt.type === 'credit_card' ? 'Credit Card' : 'Personal Loan'],
                    ['Interest Type', debt.interestType === 'reducing_balance' ? 'Reducing Balance' : 'Daily Accrual'],
                    ['Annual Rate', debt.annualRate + '%'],
                    ['Original Principal', fmtNum(debt.principal) + ' THB'],
                    ['Current Balance', fmtNum(debt.currentBalance) + ' THB'],
                    ['Monthly Payment', fmtNum(debt.monthlyPayment || 0) + ' THB'],
                    ['Minimum Payment', fmtNum(debt.minPayment || 0) + ' THB'],
                    ['Total Interest Paid', fmtNum(debt.totalInterestPaid || 0) + ' THB'],
                    ['Start Date', debt.startDate],
                    ['Status', debt.status === 'paid' ? 'Paid Off' : 'Active']
                ];

                doc.autoTable({
                    startY: y,
                    body: debtInfo,
                    margin: { left: margin, right: margin },
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: 2 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
                });
                y = doc.lastAutoTable.finalY + 5;

                // Amortization schedule if applicable
                if (debt.monthlyPayment > 0 && debt.currentBalance > 0) {
                    let result;
                    if (debt.interestType === 'daily_accrual') {
                        result = InterestEngine.generateDailyAccrualSchedule(
                            debt.currentBalance, debt.annualRate, debt.monthlyPayment, debt.startDate);
                    } else {
                        result = InterestEngine.generateAmortizationSchedule(
                            debt.currentBalance, debt.annualRate, debt.monthlyPayment);
                    }

                    checkPage(30);
                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 100);
                    doc.text(`Projected payoff: ${result.totalMonths} months | Total interest: ${fmtNum(result.totalInterest)} THB`, margin, y);
                    y += 6;

                    const schedData = result.schedule.map(s => [
                        s.month.toString(),
                        fmtNum(s.payment),
                        fmtNum(s.interest),
                        fmtNum(s.principal),
                        fmtNum(s.balance)
                    ]);

                    doc.autoTable({
                        startY: y,
                        head: [['Month', 'Payment', 'Interest', 'Principal', 'Balance']],
                        body: schedData,
                        margin: { left: margin, right: margin },
                        theme: 'striped',
                        headStyles: { fillColor: [0, 184, 148], textColor: 255, fontSize: 8 },
                        styles: { fontSize: 7, cellPadding: 1.5, halign: 'right' },
                        columnStyles: { 0: { halign: 'center' } }
                    });
                    y = doc.lastAutoTable.finalY + 10;
                }
            }

            if (type === 'full_report') { doc.addPage(); y = 20; }
        }

        if (type === 'debt_payments' || type === 'full_report') {
            if (type !== 'full_report') addHeader('Debt Payment History');
            else addSectionTitle('=== Payment History ===');

            const payments = await DebtModule.getAllPayments();
            const filtered = payments.filter(p => (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate));
            const debts = await DebtModule.getAll();
            const debtMap = {};
            debts.forEach(d => debtMap[d.id] = d.name);

            if (filtered.length > 0) {
                const payData = filtered.map(p => [
                    p.date,
                    debtMap[p.debtId] || 'N/A',
                    fmtNum(p.amount),
                    fmtNum(p.interestPortion),
                    fmtNum(p.principalPortion),
                    fmtNum(p.balanceAfter)
                ]);

                // Summary
                const totalPaid = filtered.reduce((s, p) => s + p.amount, 0);
                const totalInt = filtered.reduce((s, p) => s + p.interestPortion, 0);
                const totalPrin = filtered.reduce((s, p) => s + p.principalPortion, 0);

                doc.setFontSize(10);
                doc.setTextColor(80, 80, 100);
                doc.text(`Total Payments: ${filtered.length} | Total: ${fmtNum(totalPaid)} THB | Interest: ${fmtNum(totalInt)} THB | Principal: ${fmtNum(totalPrin)} THB`, margin, y);
                y += 7;

                doc.autoTable({
                    startY: y,
                    head: [['Date', 'Debt', 'Amount', 'Interest', 'Principal', 'Balance After']],
                    body: payData,
                    margin: { left: margin, right: margin },
                    theme: 'striped',
                    headStyles: { fillColor: [108, 92, 231], textColor: 255 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
                });
            } else {
                doc.setFontSize(10);
                doc.setTextColor(120, 120, 140);
                doc.text('No payments recorded in this period.', margin, y);
            }
        }

        // Footer on all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 170);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
            doc.text('Finance & Debt Manager', margin, 290);
        }

        // Download
        const typeNames = {
            income_expense: 'Income_Expense',
            debt_summary: 'Debt_Summary',
            debt_payments: 'Debt_Payments',
            full_report: 'Full_Financial_Report'
        };
        doc.save(`${typeNames[type]}_${startDate}_${endDate}.pdf`);
    }
};
