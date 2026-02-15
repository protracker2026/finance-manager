// Utility functions
export const Utils = {
    formatCurrency(amount) {
        return new Intl.NumberFormat('th-TH', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' ฿';
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateShort(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
    },

    today() {
        return new Date().toISOString().split('T')[0];
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
        const map = { credit_card: 'บัตรเครดิต', personal_loan: 'สินเชื่อส่วนบุคคล' };
        return map[type] || type;
    },

    interestTypeName(type) {
        const map = { reducing_balance: 'ลดต้นลดดอก', daily_accrual: 'เดินรายวัน' };
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
    }
};
