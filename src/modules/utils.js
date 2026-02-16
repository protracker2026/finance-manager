// Utility functions
export const Utils = {
    formatCurrency(amount) {
        return this.formatNumber(amount) + ' ฿';
    },

    formatNumber(amount) {
        return new Intl.NumberFormat('th-TH', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    },

    formatDateShort(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    },

    formatDateTimeShort(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hour}:${min}`;
    },

    today() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    },

    getMonthRange(offset = 0) {
        const now = new Date();
        now.setMonth(now.getMonth() + offset);
        const y = now.getFullYear();
        const m = now.getMonth();
        const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const end = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
        return { start, end, year: y, month: m + 1 };
    },

    getTodayRange() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const today = `${y}-${m}-${d}`;
        return { start: today, end: today };
    },

    getWeekRange() {
        const now = new Date();
        const day = now.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = (day === 0 ? -6 : 1) - day; // Adjust so Monday is day 1

        const startParams = new Date(now);
        startParams.setDate(now.getDate() + diff);
        const y1 = startParams.getFullYear();
        const m1 = String(startParams.getMonth() + 1).padStart(2, '0');
        const d1 = String(startParams.getDate()).padStart(2, '0');

        const endParams = new Date(now);
        endParams.setDate(now.getDate() + diff + 6);
        const y2 = endParams.getFullYear();
        const m2 = String(endParams.getMonth() + 1).padStart(2, '0');
        const d2 = String(endParams.getDate()).padStart(2, '0');

        return { start: `${y1}-${m1}-${d1}`, end: `${y2}-${m2}-${d2}` };
    },

    getMonthName(monthNum) {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return months[monthNum - 1] || '';
    },

    getFullMonthName(monthNum) {
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        return months[monthNum - 1] || '';
    },

    debtTypeName(type) {
        const map = { credit_card: 'บัตรเครดิต', personal_loan: 'สินเชื่อส่วนบุคคล', personal_loan_vehicle: 'สินเชื่อ (ทะเบียนรถค้ำ)' };
        return map[type] || type;
    },

    interestTypeName(type) {
        const map = { reducing_balance: 'ลดต้นลดดอก', daily_accrual: 'เดินรายวัน', fixed_rate: 'ดอกเบี้ยคงที่ (Flat Rate)' };
        return map[type] || type;
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    percentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 10000) / 100;
    },

    addMonths(date, months) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d;
    },

    formatMonthYear(date) {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return `${months[date.getMonth()]} ${date.getFullYear() + 543}`;
    },

    async exportToReceiptPDF(txns, startDate, endDate) {
        const { jsPDF } = window.jspdf;

        const receiptEl = document.createElement('div');
        // Clean off-white background - Scaled to A4 width (800px)
        receiptEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:800px;padding:60px 50px;background:#fafafa;color:#000;font-size:16px;line-height:1.5;';
        receiptEl.style.fontFamily = "'Courier Prime', 'Inconsolata', 'Space Mono', monospace";

        // --- Compute data ---
        let totalIncome = 0;
        let totalExpense = 0;
        const byCategory = {};

        txns.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
            const cat = t.category || 'other';
            if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };
            byCategory[cat][t.type] += t.amount;
        });

        const net = totalIncome - totalExpense;
        const totalAll = totalIncome + totalExpense;
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const printDate = `${day}/${month}/${year}`;
        const rangeStr = (startDate && endDate) ? `${this.formatDateShort(startDate)} - ${this.formatDateShort(endDate)}` : '-';
        const fmt = (v) => this.formatCurrency(v).replace(' \u0e3f', '');

        const dash = '--------------------------------------';
        const dblDash = '======================================';

        // --- Category summary rows ---
        let catRows = '';
        Object.entries(byCategory).forEach(([cat, vals]) => {
            const amount = vals.expense || vals.income;
            const pct = totalAll > 0 ? ((amount / totalAll) * 100).toFixed(1) : '0.0';
            catRows += '<div style="display:flex;align-items:baseline;margin-bottom:8px;font-size:15px;">'
                + '<span style="flex-shrink:0;">' + cat + '</span>'
                + '<div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div>'
                + '<span style="width:120px;text-align:right;font-weight:bold;flex-shrink:0;">' + fmt(amount) + '</span>'
                + '<span style="width:70px;text-align:right;opacity:0.7;flex-shrink:0;">' + pct + '%</span>'
                + '</div>';
        });

        // --- Detail rows ---
        let detailRows = '';
        txns.forEach(t => {
            const d = this.formatDateTimeShort(t.date);
            const sign = t.type === 'income' ? '+' : '-';
            const desc = t.note || '';
            detailRows += '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px;font-size:14px;padding-bottom:6px;">'
                + '<span style="width:150px;flex-shrink:0;">' + d + '</span>'
                + '<span style="flex-shrink:0;">' + (t.category || '-') + '</span>'
                + '<div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div>'
                + '<span style="width:130px;text-align:right;flex-shrink:0;font-weight:bold;color:' + (t.type === 'income' ? '#2e7d32' : '#c62828') + ';">' + sign + fmt(t.amount) + '</span>'
                + '</div>';
            if (desc) {
                detailRows += `<div style="font-size:13px;color:#666;margin-left:152px;margin-top:-4px;margin-bottom:8px;">(${desc})</div>`;
            }
        });

        // --- Build HTML ---
        receiptEl.innerHTML = ''
            // HEADER
            + '<div style="text-align:center;margin-bottom:30px;">'
            + '<div style="font-size:28px;font-weight:bold;letter-spacing:2px;color:#000;">FINANCIAL REPORT</div>'
            + '<div style="font-size:14px;margin-top:10px;color:#999;">' + dash + dash + '</div>'
            + '<div style="font-size:16px;margin-top:5px;">Date: ' + printDate + '</div>'
            + '<div style="font-size:16px;">Range: ' + rangeStr + '</div>'
            + '<div style="font-size:14px;margin-top:5px;color:#999;">' + dash + dash + '</div>'
            + '</div>'

            // MONTHLY SUMMARY
            + '<div style="margin-bottom:25px; background:rgba(0,0,0,0.02); padding:20px; border-radius:8px; border:1px solid rgba(0,0,0,0.05);">'
            + '<div style="font-weight:bold;font-size:18px;margin-bottom:12px;border-bottom:2px solid #999;padding-bottom:5px;">[ Monthly Summary ]</div>'
            + '<div style="display:flex;align-items:baseline;margin-bottom:8px;font-size:18px;"><span>Income</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span style="color:#2a7;font-weight:bold;">' + fmt(totalIncome) + '</span></div>'
            + '<div style="display:flex;align-items:baseline;margin-bottom:8px;font-size:18px;"><span>Expense</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span style="color:#d44;font-weight:bold;">' + fmt(totalExpense) + '</span></div>'
            + '<div style="font-size:14px;margin:10px 0;color:#ddd;">' + dash + dash + '</div>'
            + '<div style="display:flex;align-items:baseline;font-weight:bold;font-size:22px;"><span>Saving</span><div style="flex:1;border-bottom:2px dotted #ccc;margin:0 8px;position:relative;top:-5px;"></div><span>' + fmt(net) + '</span></div>'
            + '</div>'

            + '<div style="font-size:9px;text-align:center;">' + dblDash + '</div>'

            // CATEGORY SUMMARY
            + '<div style="margin:25px 0;">'
            + '<div style="font-weight:bold;font-size:18px;margin-bottom:12px;border-bottom:2px solid #999;padding-bottom:5px;">[ Category Summary ]</div>'
            + '<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-weight:bold;font-size:15px;color:#666;text-transform:uppercase;">'
            + '<span style="flex:1;">Category</span>'
            + '<span style="width:120px;text-align:right;">Amount</span>'
            + '<span style="width:80px;text-align:right;">%</span>'
            + '</div>'
            + catRows
            + '</div>'

            + '<div style="font-size:9px;text-align:center;">' + dblDash + '</div>'

            // DETAILS
            + '<div style="margin-top:25px;">'
            + '<div style="font-weight:bold;font-size:18px;margin-bottom:12px;border-bottom:2px solid #999;padding-bottom:5px;">[ Details ]</div>'
            + '<div style="display:flex;gap:12px;margin-bottom:10px;font-weight:bold;font-size:15px;color:#666;text-transform:uppercase;">'
            + '<span style="width:140px;flex-shrink:0;">Date</span>'
            + '<span style="flex:1;">Category</span>'
            + '<span style="width:120px;text-align:right;flex-shrink:0;">Amount</span>'
            + '</div>'
            + detailRows
            + '</div>'

            + '<div style="font-size:14px;text-align:center;margin-top:30px;color:#999;">' + dash + dash + '</div>'
            + '<div style="text-align:center;margin-top:12px;font-size:16px;font-weight:bold;">Total: ' + txns.length + ' items</div>'
            + '<div style="text-align:center;margin-top:8px;font-size:14px;">*** END OF REPORT ***</div>';

        document.body.appendChild(receiptEl);

        try {
            const canvas = await html2canvas(receiptEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 Width
            const pageHeight = (canvas.height * imgWidth) / canvas.width;

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [210, pageHeight]
            });

            doc.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
            doc.save('receipt_' + new Date().toISOString().slice(0, 10) + '.pdf');
        } catch (err) {
            console.error('PDF Export Error:', err);
            this.showToast('PDF export failed', 'error');
        } finally {
            document.body.removeChild(receiptEl);
        }
    },

    async exportDebtsToPDF(summary) {
        const { jsPDF } = window.jspdf;
        const fmt = (v) => this.formatCurrency(v).replace(' \u0e3f', '');
        const dash = '--------------------------------------';
        const dblDash = '======================================';
        const now = new Date();
        const printDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const receiptEl = document.createElement('div');
        // Clean off-white background - Scaled to A4 width (800px)
        receiptEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:800px;padding:60px 50px;background:#fafafa;color:#000;font-size:16px;line-height:1.5;';
        receiptEl.style.fontFamily = "'Courier Prime', 'Inconsolata', 'Space Mono', monospace";

        // --- Debt Rows ---
        let debtRows = '';
        summary.debts.forEach(d => {
            const paid = d.principal - d.currentBalance;
            const paidPct = d.principal > 0 ? this.percentage(paid, d.principal).toFixed(0) : '100';
            const statusIcon = d.status === 'paid' ? '[v]' : '[ ]';

            // Payment History for this debt
            let historyTable = '';
            if (d.payments && d.payments.length > 0) {
                historyTable = `
                <div style="margin: 20px 0; border-top: 2px solid #ddd; border-bottom: 2px solid #ddd; padding: 15px 0;">
                    <div style="text-align:center; font-weight:bold; font-size:18px; margin-bottom: 12px;">รายการชำระเงิน</div>
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #999;">
                                <th style="text-align:left; padding:8px;">วันที่</th>
                                <th style="text-align:right; padding:8px;">ยอดชำระ</th>
                                <th style="text-align:right; padding:8px;">ดอกเบี้ย</th>
                                <th style="text-align:right; padding:8px;">เงินต้น</th>
                                <th style="text-align:right; padding:8px;">คงเหลือ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${d.payments.map(p => `
                                <tr>
                                    <td style="padding:8px; border-bottom:1px solid #eee;">${this.formatDateShort(p.date)}</td>
                                    <td style="text-align:right; padding:8px; border-bottom:1px solid #eee;">${fmt(p.amount)}</td>
                                    <td style="text-align:right; padding:8px; color:#c62828; border-bottom:1px solid #eee;">${fmt(p.interestPortion)}</td>
                                    <td style="text-align:right; padding:8px; color:#2e7d32; border-bottom:1px solid #eee;">${fmt(p.principalPortion)}</td>
                                    <td style="text-align:right; padding:8px; border-bottom:1px solid #eee;">${fmt(p.balanceAfter)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="text-align:center; font-size:12px; margin-top:10px; opacity:0.7;">*** จบประวัติการชำระ ***</div>
                </div>`;
            }

            debtRows += '<div style="margin-bottom:30px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom:20px;">'
                + '<div style="display:flex;align-items:baseline;font-weight:bold; font-size:20px; margin-bottom:8px;">'
                + '<span style="flex-shrink:0;">' + statusIcon + ' ' + d.name + '</span>'
                + '<div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-5px;"></div>'
                + '<span style="flex-shrink:0;">' + fmt(d.currentBalance) + '</span>'
                + '</div>'
                + '<div style="display:flex;justify-content:space-between;font-size:16px;color:#444;">'
                + '<span>Rate: ' + d.annualRate + '% | Paid: ' + paidPct + '%</span>'
                + '<span>Original: ' + fmt(d.principal) + '</span>'
                + '</div>'
                + (d.status !== 'paid' ? '<div style="height:4px;background:rgba(0,0,0,0.05);margin-top:4px;"><div style="height:100%;background:#333;width:' + paidPct + '%;"></div></div>' : '')
                + historyTable
                + '</div>';
        });

        receiptEl.innerHTML = ''
            + '<div style="text-align:center;margin-bottom:30px;">'
            + '<div style="font-size:28px;font-weight:bold;letter-spacing:2px;color:#000;">DEBT SUMMARY REPORT</div>'
            + '<div style="font-size:14px;margin-top:10px;color:#999;">' + dblDash + dblDash + '</div>'
            + '<div style="font-size:16px;margin-top:5px;">Generated: ' + printDate + '</div>'
            + '<div style="font-size:14px;margin-top:5px;color:#999;">' + dblDash + dblDash + '</div>'
            + '</div>'

            + '<div style="margin-bottom:25px; background:rgba(0,0,0,0.02); padding:20px; border-radius:8px; border:1px solid rgba(0,0,0,0.05);">'
            + '<div style="font-weight:bold;font-size:18px;margin-bottom:12px;border-bottom:2px solid #999;padding-bottom:5px;">[ Overall Stats ]</div>'
            + '<div style="display:flex;align-items:baseline;margin-bottom:8px;font-size:18px;"><span>Total Active Debt</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span style="color:#c62828; font-weight:bold;">' + fmt(summary.totalDebt) + '</span></div>'
            + '<div style="display:flex;align-items:baseline;margin-bottom:8px;font-size:18px;"><span>Interest Paid</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span style="color:#b45309;">' + fmt(summary.totalInterestPaid) + '</span></div>'
            + '<div style="display:flex;align-items:baseline;margin-bottom:8px;font-size:18px;"><span>Total Principal Paid</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span style="color:#2e7d32;">' + fmt(summary.totalPaid) + '</span></div>'
            + '<div style="font-size:14px;margin:10px 0;color:#ddd;">' + dash + dash + '</div>'
            + '<div style="display:flex;align-items:baseline; font-size:16px; margin-bottom:4px;"><span>Active Accounts</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span>' + summary.activeCount + '</span></div>'
            + '<div style="display:flex;align-items:baseline; font-size:16px;"><span>Paid Accounts</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span>' + summary.paidCount + '</span></div>'
            + '</div>'

            + '<div style="margin-top:25px;">'
            + '<div style="font-weight:bold;font-size:18px;margin-bottom:15px;text-align:center;border-bottom:2px solid #999;padding-bottom:10px;">[ Detailed Listings ]</div>'
            + debtRows
            + '</div>'

            + '<div style="font-size:14px;text-align:center;margin-top:30px;color:#999;">' + dash + dash + '</div>'
            + '<div style="text-align:center;margin-top:12px;font-size:16px;font-weight:bold;">*** END OF REPORT ***</div>'
            + '<div style="text-align:center;margin-top:6px;font-size:12px;opacity:0.6;">Finance Manager v2.0 (A4 Desktop Version)</div>';

        document.body.appendChild(receiptEl);

        try {
            const canvas = await html2canvas(receiptEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 Width
            const pageHeight = (canvas.height * imgWidth) / canvas.width;

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [210, pageHeight]
            });

            doc.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
            doc.save('debt_summary_' + new Date().toISOString().slice(0, 10) + '.pdf');
            this.showToast('Debt report exported', 'success');
        } catch (err) {
            console.error('PDF Export Error:', err);
            this.showToast('PDF export failed', 'error');
        } finally {
            document.body.removeChild(receiptEl);
        }
    },
    async exportSingleDebtToPDF(debt, schedule = null) {
        const { jsPDF } = window.jspdf;
        const fmt = (v) => this.formatCurrency(v).replace(' \u0e3f', '');
        const dash = '--------------------------------------';
        const dblDash = '======================================';
        const now = new Date();
        const printDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const receiptEl = document.createElement('div');
        // Clean off-white background - Scaled to A4 width roughly
        receiptEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:800px;padding:60px 50px;background:#fafafa;color:#000;font-size:16px;line-height:1.5;';
        receiptEl.style.fontFamily = "'Courier Prime', 'Inconsolata', 'Space Mono', monospace";

        const paid = debt.principal - debt.currentBalance;
        const paidPct = debt.principal > 0 ? this.percentage(paid, debt.principal).toFixed(0) : '100';

        let historyTable = '';
        if (debt.payments && debt.payments.length > 0) {
            historyTable = `
            <div style="margin: 30px 0;">
                <div style="text-align:center; font-weight:bold; font-size:18px; margin-bottom: 12px; border-bottom:2px solid #ddd; padding-bottom:8px;">ประวัติการชำระเงิน</div>
                <table style="width:100%; border-collapse:collapse; font-size:14px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #999;">
                            <th style="text-align:left; padding:8px;">วันที่</th>
                            <th style="text-align:right; padding:8px;">ยอดชำระ</th>
                            <th style="text-align:right; padding:8px;">ดอกเบี้ย</th>
                            <th style="text-align:right; padding:8px;">เงินต้น</th>
                            <th style="text-align:right; padding:8px;">คงเหลือ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${debt.payments.map(p => `
                            <tr>
                                <td style="padding:8px; border-bottom:1px solid #eee;">${this.formatDateShort(p.date)}</td>
                                <td style="text-align:right; padding:8px; border-bottom:1px solid #eee;">${fmt(p.amount)}</td>
                                <td style="text-align:right; padding:8px; color:#c62828; border-bottom:1px solid #eee;">${fmt(p.interestPortion)}</td>
                                <td style="text-align:right; padding:8px; color:#2e7d32; border-bottom:1px solid #eee;">${fmt(p.principalPortion)}</td>
                                <td style="text-align:right; padding:8px; border-bottom:1px solid #eee;">${fmt(p.balanceAfter)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align:center; font-size:12px; margin-top:10px; opacity:0.7;">*** จบประวัติการชำระ ***</div>
            </div>`;
        }

        let scheduleTable = '';
        if (schedule && schedule.schedule && schedule.schedule.length > 0) {
            const rows = schedule.schedule.slice(0, 48); // Slightly more for A4
            scheduleTable = `
            <div style="margin: 30px 0; background:rgba(0,0,0,0.02); padding:20px; border-radius:8px; border:1px solid #eee;">
                <div style="text-align:center; font-weight:bold; font-size:18px; margin-bottom: 12px; border-bottom:2px solid #ddd; padding-bottom:8px;">ตารางผ่อนชำระ (คาดการณ์)</div>
                <div style="display:flex; justify-content:space-between; font-size:15px; margin-bottom:12px;">
                    <span>คาดว่าหมดหนี้ใน: <b style="color:#2e7d32;">${schedule.totalMonths} เดือน</b></span>
                    <span>ดอกเบี้ยรวมทั้งหมด: <b style="color:#c62828;">${fmt(schedule.totalInterest)}</b></span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:14px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #999;">
                            <th style="text-align:center; padding:8px;">งวด</th>
                            <th style="text-align:right; padding:8px;">ค่างวด</th>
                            <th style="text-align:right; padding:8px;">ดอกเบี้ย</th>
                            <th style="text-align:right; padding:8px;">เงินต้น</th>
                            <th style="text-align:right; padding:8px;">คงเหลือ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(s => `
                            <tr>
                                <td style="text-align:center; padding:8px; border-bottom:1px solid #eee;">${s.month}</td>
                                <td style="text-align:right; padding:8px; border-bottom:1px solid #eee;">${fmt(s.payment)}</td>
                                <td style="text-align:right; padding:8px; color:#c62828; border-bottom:1px solid #eee;">${fmt(s.interest)}</td>
                                <td style="text-align:right; padding:8px; color:#2e7d32; border-bottom:1px solid #eee;">${fmt(s.principal)}</td>
                                <td style="text-align:right; padding:8px; border-bottom:1px solid #eee;">${fmt(s.balance)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${schedule.schedule.length > 48 ? `<div style="text-align:center; font-size:12px; margin-top:10px; opacity:0.6;">... แสดงเพียง 48 งวดแรก ...</div>` : ''}
                <div style="text-align:center; font-size:12px; margin-top:10px; opacity:0.7;">*** จบตารางคาดการณ์ ***</div>
            </div>`;
        }

        receiptEl.innerHTML = `
            <div style="text-align:center;margin-bottom:30px;">
                <div style="font-size:28px;font-weight:bold;letter-spacing:2px;color:#000;">DEBT ACCOUNT REPORT</div>
                <div style="font-size:20px;font-weight:bold;margin-top:8px;color:#444;">${debt.name.toUpperCase()}</div>
                <div style="font-size:14px;margin-top:10px; color:#999;">${dblDash}${dblDash}</div>
                <div style="font-size:14px; margin-top:5px;">Generated: ${printDate}</div>
                <div style="font-size:14px;margin-top:5px; color:#999;">${dblDash}${dblDash}</div>
            </div>

            <div style="margin-bottom:25px; background:rgba(0,0,0,0.02); padding:20px; border-radius:8px; border:1px solid rgba(0,0,0,0.05);">
                <div style="font-weight:bold;font-size:18px;margin-bottom:12px;border-bottom:2px solid #999; padding-bottom:5px;">[ Account Profile ]</div>
                <div style="display:flex;align-items:baseline;margin-bottom:8px;"><span>Type</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span>${this.debtTypeName(debt.type)}</span></div>
                <div style="display:flex;align-items:baseline;margin-bottom:8px;"><span>Interest Rate</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span>${debt.annualRate}% (${this.interestTypeName(debt.interestType)})</span></div>
                <div style="display:flex;align-items:baseline;margin-bottom:8px;"><span>Original Principal</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span>${fmt(debt.principal)}</span></div>
                <div style="font-size:14px; margin:10px 0; color:#ddd;">${dash}${dash}</div>
                <div style="display:flex;align-items:baseline;font-weight:bold; font-size:20px; margin-bottom:8px;"><span>Current Balance</span><div style="flex:1;border-bottom:2px dotted #ccc;margin:0 8px;position:relative;top:-5px;"></div><span style="color:#c62828;">${fmt(debt.currentBalance)}</span></div>
                <div style="display:flex;align-items:baseline; font-size:18px; margin-bottom:6px;"><span>Total Paid</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span style="color:#2e7d32;">${fmt(debt.totalPaid || 0)}</span></div>
                <div style="display:flex;align-items:baseline;"><span>Paid Percentage</span><div style="flex:1;border-bottom:1px dotted #ccc;margin:0 8px;position:relative;top:-4px;"></div><span>${paidPct}%</span></div>
            </div>

            ${historyTable}
            
            ${scheduleTable}

            <div style="font-size:14px;text-align:center;margin-top:30px; color:#999;">${dash}${dash}</div>
            <div style="text-align:center;margin-top:12px;font-size:16px;font-weight:bold;">*** END OF REPORT ***</div>
        `;

        document.body.appendChild(receiptEl);

        try {
            const canvas = await html2canvas(receiptEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 Width
            const pageHeight = (canvas.height * imgWidth) / canvas.width;

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [210, pageHeight]
            });

            doc.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
            doc.save(`debt_report_${debt.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
            this.showToast('Account report exported', 'success');
        } catch (err) {
            console.error('PDF Export Error:', err);
            this.showToast('PDF export failed', 'error');
        } finally {
            document.body.removeChild(receiptEl);
        }
    }
};

