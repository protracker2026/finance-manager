// Dashboard Page
import { TransactionModule } from '../modules/transactions.js';
import { DebtModule } from '../modules/debts.js';
import { Utils } from '../modules/utils.js';

export async function renderDashboard(container) {
    const { start, end, year, month } = Utils.getMonthRange();
    const summary = await TransactionModule.getSummary(start, end);
    const debtSummary = await DebtModule.getDebtSummary();

    container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>แดชบอร์ด</h2>
        <p class="subtitle">${Utils.getFullMonthName(month)} ${year + 543} — ภาพรวมการเงินของคุณ</p>
      </div>
    </div>

    <!-- สรุปตัวเลข -->
    <div class="stats-grid">
      <div class="stat-card income">
        <div class="stat-label">รายรับเดือนนี้</div>
        <div class="stat-value positive">${Utils.formatCurrency(summary.income)}</div>
      </div>
      <div class="stat-card expense">
        <div class="stat-label">รายจ่ายเดือนนี้</div>
        <div class="stat-value negative">${Utils.formatCurrency(summary.expense)}</div>
      </div>
      <div class="stat-card balance">
        <div class="stat-label">คงเหลือ</div>
        <div class="stat-value ${summary.balance >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrency(summary.balance)}</div>
      </div>
      <div class="stat-card debt">
        <div class="stat-label">หนี้สินคงค้าง</div>
        <div class="stat-value accent">${Utils.formatCurrency(debtSummary.totalDebt)}</div>
      </div>
    </div>

    <!-- กราฟ -->
    <div class="charts-grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">รายรับ vs รายจ่าย (6 เดือน)</span>
        </div>
        <div class="chart-container">
          <canvas id="incomeExpenseChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">รายจ่ายตามหมวดหมู่</span>
        </div>
        <div class="chart-container">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>
    </div>

    <!-- สรุปหนี้สิน -->
    <div class="card" style="margin-bottom: var(--space-xl);">
      <div class="card-header">
        <span class="card-title">สรุปหนี้สิน</span>
        <span class="badge badge-active">${debtSummary.activeCount} รายการ</span>
      </div>
      <div class="stats-grid" style="margin-bottom:0;">
        <div>
          <div class="summary-row">
            <span class="label">เงินต้นรวม</span>
            <span class="value">${Utils.formatCurrency(debtSummary.totalOriginal)}</span>
          </div>
          <div class="summary-row">
            <span class="label">ชำระแล้ว</span>
            <span class="value" style="color:var(--text-success)">${Utils.formatCurrency(debtSummary.totalPaid)}</span>
          </div>
        </div>
        <div>
          <div class="summary-row">
            <span class="label">ดอกเบี้ยรวมที่จ่าย</span>
            <span class="value" style="color:var(--text-warning)">${Utils.formatCurrency(debtSummary.totalInterestPaid)}</span>
          </div>
          <div class="summary-row">
            <span class="label">คงค้าง</span>
            <span class="value" style="color:var(--text-danger)">${Utils.formatCurrency(debtSummary.totalDebt)}</span>
          </div>
        </div>
      </div>
      ${debtSummary.totalOriginal > 0 ? `
      <div style="margin-top: var(--space-md);">
        <div class="progress-bar">
          <div class="progress-fill success" style="width: ${Utils.percentage(debtSummary.totalOriginal - debtSummary.totalDebt, debtSummary.totalOriginal)}%"></div>
        </div>
        <div class="progress-info">
          <span>ชำระแล้ว ${Utils.percentage(debtSummary.totalOriginal - debtSummary.totalDebt, debtSummary.totalOriginal)}%</span>
          <span>คงเหลือ ${Utils.percentage(debtSummary.totalDebt, debtSummary.totalOriginal)}%</span>
        </div>
      </div>` : ''}
    </div>

    <!-- รายการล่าสุด -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">รายการล่าสุด</span>
      </div>
      <div id="recentTransactions"></div>
    </div>
  `;

    // Render recent transactions
    const recent = await TransactionModule.getAll({});
    const recentSlice = recent.slice(0, 8);
    const recentEl = document.getElementById('recentTransactions');

    if (recentSlice.length === 0) {
        recentEl.innerHTML = `<div class="empty-state"><p>ยังไม่มีรายการ — เริ่มบันทึกรายรับ-รายจ่ายของคุณ</p></div>`;
    } else {
        recentEl.innerHTML = `
      <table class="data-table">
        <thead><tr><th>วันที่</th><th>หมวดหมู่</th><th>หมายเหตุ</th><th style="text-align:right">จำนวน</th></tr></thead>
        <tbody>
          ${recentSlice.map(t => `
            <tr>
              <td>${Utils.formatDateShort(t.date)}</td>
              <td><span class="badge badge-${t.type}">${t.category}</span></td>
              <td>${t.note || '-'}</td>
              <td class="amount ${t.type}" style="text-align:right">${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    }

    // Render Charts
    await renderCharts(year, month);
}

async function renderCharts(currentYear, currentMonth) {
    // Income vs Expense - last 6 months
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 5; i >= 0; i--) {
        const { start, end, year, month } = Utils.getMonthRange(-i);
        const s = await TransactionModule.getSummary(start, end);
        labels.push(Utils.getMonthName(month));
        incomeData.push(s.income);
        expenseData.push(s.expense);
    }

    const ctx1 = document.getElementById('incomeExpenseChart');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'รายรับ',
                        data: incomeData,
                        backgroundColor: 'rgba(0, 184, 148, 0.7)',
                        borderColor: 'rgba(0, 184, 148, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                    },
                    {
                        label: 'รายจ่าย',
                        data: expenseData,
                        backgroundColor: 'rgba(225, 112, 85, 0.7)',
                        borderColor: 'rgba(225, 112, 85, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#a0a0b8', font: { family: 'Inter' } } }
                },
                scales: {
                    x: { ticks: { color: '#6c6c88' }, grid: { color: 'rgba(42,42,68,0.3)' } },
                    y: { ticks: { color: '#6c6c88' }, grid: { color: 'rgba(42,42,68,0.3)' } }
                }
            }
        });
    }

    // Category breakdown
    const { start, end } = Utils.getMonthRange();
    const summary = await TransactionModule.getSummary(start, end);
    const catLabels = [];
    const catData = [];
    const catColors = [
        '#6c5ce7', '#00cec9', '#e17055', '#fdcb6e', '#74b9ff',
        '#a29bfe', '#55efc4', '#ff7675', '#ffeaa7', '#81ecec',
        '#fab1a0', '#dfe6e9', '#00b894', '#0984e3', '#d63031'
    ];

    Object.entries(summary.byCategory).forEach(([cat, vals]) => {
        if (vals.expense > 0) {
            catLabels.push(cat);
            catData.push(vals.expense);
        }
    });

    const ctx2 = document.getElementById('categoryChart');
    if (ctx2 && catData.length > 0) {
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: catColors.slice(0, catData.length),
                    borderWidth: 0,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#a0a0b8', font: { family: 'Inter', size: 11 }, padding: 12 }
                    }
                }
            }
        });
    } else if (ctx2) {
        ctx2.parentElement.innerHTML = '<div class="empty-state"><p>ยังไม่มีข้อมูลรายจ่าย</p></div>';
    }
}
