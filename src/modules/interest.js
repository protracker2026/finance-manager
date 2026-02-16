// Interest Calculation Engine
// ระบบคำนวณดอกเบี้ยตามหลักธนาคารแห่งประเทศไทย (ธปท.)

export const InterestEngine = {

    // === ค่าคงที่ตามประกาศ ธปท. ===
    BOT_RATES: {
        credit_card: {
            maxRate: 16,           // เพดานดอกเบี้ยสูงสุด 16% ต่อปี
            minPaymentPct: 8,      // ชำระขั้นต่ำ 8% ของยอดค้างชำระ (ปี 2567)
            minPaymentFloor: 200,  // ขั้นต่ำสุดของยอดชำระขั้นต่ำ 200 บาท
            method: 'daily_accrual',
            label: 'บัตรเครดิต',
            description: 'ดอกเบี้ยเดินรายวัน คิดจากยอดคงค้าง × (อัตรา / 365)'
        },
        personal_loan: {
            maxRate: 25,           // เพดาน 25% (ไม่มีหลักประกัน)
            method: 'reducing_balance',
            label: 'สินเชื่อส่วนบุคคล',
            description: 'ดอกเบี้ยลดต้นลดดอก คิดจากยอดคงค้าง × (อัตรา / 12)'
        },
        personal_loan_vehicle: {
            maxRate: 24,           // เพดาน 24% (มีทะเบียนรถ)
            method: 'reducing_balance',
            label: 'สินเชื่อ (มีทะเบียนรถค้ำ)',
            description: 'ดอกเบี้ยลดต้นลดดอก คิดจากยอดคงค้าง × (อัตรา / 12)'
        },
        fixed_rate: {
            maxRate: 25,           // สมมติเพดานเดียวกับสินเชื่อบุคคล
            method: 'fixed_rate',
            label: 'ดอกเบี้ยคงที่ (Flat Rate)',
            description: 'ดอกเบี้ยคงที่ คิดจากเงินต้น × (อัตรา / 12) ตลอดอายุสัญญา'
        }
    },

    // === ดึงค่าเพดาน/วิธีคิดดอกเบี้ยตามประเภทหนี้ ===
    getBOTConfig(debtType) {
        return this.BOT_RATES[debtType] || this.BOT_RATES.personal_loan;
    },

    // === ตรวจสอบอัตราดอกเบี้ยเกินเพดาน ธปท. ===
    validateRate(rate, debtType) {
        const config = this.getBOTConfig(debtType);
        return {
            isOverLimit: rate > config.maxRate,
            maxRate: config.maxRate,
            currentRate: rate,
            message: rate > config.maxRate
                ? `⚠️ อัตราดอกเบี้ย ${rate}% เกินเพดาน ธปท. (สูงสุด ${config.maxRate}%)`
                : `✅ อัตราดอกเบี้ย ${rate}% อยู่ภายในเพดาน ธปท.`
        };
    },

    // === คำนวณยอดชำระขั้นต่ำ (สำหรับบัตรเครดิต) ===
    // ชำระขั้นต่ำ = max(8% × ยอดคงค้าง, 200 บาท)
    // ถ้ายอดคงค้างน้อยกว่า 200 บาท → ชำระทั้งหมด
    calculateMinPayment(balance, debtType = 'credit_card') {
        const config = this.getBOTConfig(debtType);
        if (!config.minPaymentPct) return 0; // ไม่ใช่บัตรเครดิต

        const calculated = balance * (config.minPaymentPct / 100);
        if (balance <= config.minPaymentFloor) return balance;
        return Math.max(calculated, config.minPaymentFloor);
    },

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

    // === ตารางผ่อนชำระ ลดต้นลดดอก (Amortization Schedule) ===
    // สำหรับสินเชื่อส่วนบุคคล
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

    // === ตารางผ่อนดอกเบี้ยคงที่ (Fixed Rate / Flat Rate) ===
    // ดอกเบี้ยคงที่ตลอดสัญญา คิดจากเงินต้นตั้งต้น (ในที่นี้ใช้ principal ที่ส่งเข้ามา)
    generateFixedRateSchedule(principal, annualRatePercent, monthlyPayment, maxMonths = 600) {
        const schedule = [];
        let balance = principal;
        let month = 0;
        let totalInterest = 0;
        let totalPaid = 0;

        // Fixed interest amount per month based on initial principal
        // Note: This relies on 'principal' being the original amount for accurate Flat Rate calculation.
        // If used with remaining balance, it projects as if refined from now.
        const fixedMonthlyInterest = principal * (annualRatePercent / 100) / 12;

        while (balance > 0.01 && month < maxMonths) {
            month++;
            const interest = fixedMonthlyInterest;
            const payment = Math.min(monthlyPayment, balance + interest);

            // For Flat Rate, generally payment is fixed.
            // Principal part = Payment - Interest
            const principalPart = payment - interest;

            // If payment is less than interest, balance grows (which shouldn't happen in flat rate usually)
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

    // === ตารางผ่อนบัตรเครดิต (Credit Card Schedule) ===
    // ดอกเบี้ยเดินรายวัน + ชำระขั้นต่ำลดลงตามยอด
    // ตามหลัก ธปท.: ชำระขั้นต่ำ = max(8% × ยอดคงค้าง, 200 บาท)
    generateCreditCardSchedule(principal, annualRatePercent, paymentAmount, startDate, maxMonths = 600) {
        const schedule = [];
        let balance = principal;
        let month = 0;
        let totalInterest = 0;
        let totalPaid = 0;
        let currentDate = new Date(startDate);
        const useMinPayment = !paymentAmount || paymentAmount <= 0;

        while (balance > 0.01 && month < maxMonths) {
            month++;
            // คำนวณจำนวนวันในรอบบิล (ใช้จำนวนวันจริงของเดือน)
            const year = currentDate.getFullYear();
            const mon = currentDate.getMonth();
            const daysInMonth = new Date(year, mon + 1, 0).getDate();

            // ดอกเบี้ยรายวัน × จำนวนวัน
            const monthInterest = this.dailyAccrual(balance, annualRatePercent, daysInMonth);

            // ยอดชำระ: ใช้ค่าที่กรอก หรือคำนวณขั้นต่ำตาม ธปท.
            let payment;
            if (useMinPayment) {
                const minPay = this.calculateMinPayment(balance + monthInterest, 'credit_card');
                payment = Math.min(minPay, balance + monthInterest);
            } else {
                payment = Math.min(paymentAmount, balance + monthInterest);
            }

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
                minPayment: Math.round(this.calculateMinPayment(balance, 'credit_card') * 100) / 100,
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

    // === ตารางผ่อนแบบเดินรายวัน (สำหรับกรณีทั่วไป) ===
    generateDailyAccrualSchedule(principal, annualRatePercent, monthlyPayment, startDate, maxMonths = 600) {
        const schedule = [];
        let balance = principal;
        let month = 0;
        let totalInterest = 0;
        let totalPaid = 0;
        let currentDate = new Date(startDate);

        while (balance > 0.01 && month < maxMonths) {
            month++;
            const year = currentDate.getFullYear();
            const mon = currentDate.getMonth();
            const daysInMonth = new Date(year, mon + 1, 0).getDate();

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

    // === คำนวณค่างวดรายเดือน (PMT formula) ===
    // สำหรับสินเชื่อส่วนบุคคลแบบลดต้นลดดอก
    calculateMonthlyPayment(principal, annualRatePercent, termMonths) {
        const r = annualRatePercent / 100 / 12;
        if (r === 0) return principal / termMonths;
        return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
    },

    // === เปรียบเทียบจ่ายขั้นต่ำ vs จ่ายเพิ่ม ===
    comparePayments(principal, annualRatePercent, minPayment, extraPayment, debtType = 'personal_loan', startDate = null) {
        let genFn;
        if (debtType === 'credit_card') {
            genFn = (p) => this.generateCreditCardSchedule(
                principal, annualRatePercent, p,
                startDate || new Date().toISOString().split('T')[0]
            );
        } else {
            const config = this.getBOTConfig(debtType);
            genFn = config.method === 'daily_accrual'
                ? (p) => this.generateDailyAccrualSchedule(principal, annualRatePercent, p, startDate || new Date().toISOString().split('T')[0])
                : (p) => this.generateAmortizationSchedule(principal, annualRatePercent, p);
        }

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
