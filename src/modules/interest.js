// Interest Calculation Engine
// สูตรคำนวณดอกเบี้ยลดต้นลดดอก & ดอกเบี้ยเดินรายวัน

export const InterestEngine = {

    // === ลดต้นลดดอก (Reducing Balance) ===
    // ดอกเบี้ยรายเดือน = ยอดคงเหลือ × (อัตราดอกเบี้ยต่อปี / 12)
    reducingBalanceMonthly(balance, annualRatePercent) {
        return balance * (annualRatePercent / 100 / 12);
    },

    // === ดอกเบี้ยเดินรายวัน (Daily Accrual) ===
    // ดอกเบี้ยรายวัน = ยอดคงเหลือ × (อัตราดอกเบี้ยต่อปี / 365)
    dailyInterest(balance, annualRatePercent) {
        return balance * (annualRatePercent / 100 / 365);
    },

    // ดอกเบี้ยสะสมรายวัน สำหรับจำนวนวัน
    dailyAccrual(balance, annualRatePercent, days) {
        return this.dailyInterest(balance, annualRatePercent) * days;
    },

    // จำนวนวันระหว่างสองวัน
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
    },

    // === ตารางผ่อนชำระ (Amortization Schedule) ===
    // สำหรับดอกเบี้ยลดต้นลดดอก
    generateAmortizationSchedule(principal, annualRatePercent, monthlyPayment, maxMonths = 600) {
        const schedule = [];
        let balance = principal;
        let month = 0;
        let totalInterest = 0;
        let totalPaid = 0;

        while (balance > 0.01 && month < maxMonths) {
            month++;
            const interest = this.reducingBalanceMonthly(balance, annualRatePercent);
            const payment = Math.min(monthlyPayment, balance + interest);
            const principalPart = payment - interest;
            balance = Math.max(0, balance - principalPart);
            totalInterest += interest;
            totalPaid += payment;

            schedule.push({
                month,
                payment: Math.round(payment * 100) / 100,
                interest: Math.round(interest * 100) / 100,
                principal: Math.round(principalPart * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                totalInterest: Math.round(totalInterest * 100) / 100,
                totalPaid: Math.round(totalPaid * 100) / 100
            });
        }

        return {
            schedule,
            totalMonths: month,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100
        };
    },

    // ตารางผ่อนแบบเดินรายวัน
    generateDailyAccrualSchedule(principal, annualRatePercent, monthlyPayment, startDate, maxMonths = 600) {
        const schedule = [];
        let balance = principal;
        let month = 0;
        let totalInterest = 0;
        let totalPaid = 0;
        let currentDate = new Date(startDate);

        while (balance > 0.01 && month < maxMonths) {
            month++;
            // Calculate days in this month
            const year = currentDate.getFullYear();
            const mon = currentDate.getMonth();
            const daysInMonth = new Date(year, mon + 1, 0).getDate();

            // Daily accrual for this month
            const monthInterest = this.dailyAccrual(balance, annualRatePercent, daysInMonth);
            const payment = Math.min(monthlyPayment, balance + monthInterest);
            const principalPart = payment - monthInterest;
            balance = Math.max(0, balance - principalPart);
            totalInterest += monthInterest;
            totalPaid += payment;

            schedule.push({
                month,
                date: `${year}-${String(mon + 1).padStart(2, '0')}`,
                daysInMonth,
                payment: Math.round(payment * 100) / 100,
                interest: Math.round(monthInterest * 100) / 100,
                principal: Math.round(principalPart * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                totalInterest: Math.round(totalInterest * 100) / 100,
                totalPaid: Math.round(totalPaid * 100) / 100
            });

            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return {
            schedule,
            totalMonths: month,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100
        };
    },

    // คำนวณค่างวดรายเดือน (PMT formula) สำหรับลดต้นลดดอก
    calculateMonthlyPayment(principal, annualRatePercent, termMonths) {
        const r = annualRatePercent / 100 / 12;
        if (r === 0) return principal / termMonths;
        return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
    },

    // เปรียบเทียบจ่ายขั้นต่ำ vs จ่ายเพิ่ม
    comparePayments(principal, annualRatePercent, minPayment, extraPayment, interestType = 'reducing_balance', startDate = null) {
        const genFn = interestType === 'daily_accrual'
            ? (p) => this.generateDailyAccrualSchedule(principal, annualRatePercent, p, startDate || new Date().toISOString().split('T')[0])
            : (p) => this.generateAmortizationSchedule(principal, annualRatePercent, p);

        const minResult = genFn(minPayment);
        const extraResult = genFn(minPayment + extraPayment);

        return {
            minPayment: {
                totalMonths: minResult.totalMonths,
                totalInterest: minResult.totalInterest,
                totalPaid: minResult.totalPaid
            },
            extraPayment: {
                totalMonths: extraResult.totalMonths,
                totalInterest: extraResult.totalInterest,
                totalPaid: extraResult.totalPaid
            },
            savings: {
                months: minResult.totalMonths - extraResult.totalMonths,
                interest: Math.round((minResult.totalInterest - extraResult.totalInterest) * 100) / 100,
                total: Math.round((minResult.totalPaid - extraResult.totalPaid) * 100) / 100
            }
        };
    }
};
