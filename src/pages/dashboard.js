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

    <!-- สรุปตัวเลข (Compact) -->
    <div class="debt-summary-compact">
      <div class="summary-main">
        <div class="label">คงเหลือ (เดือนนี้)</div>
        <div class="value-huge ${summary.balance >= 0 ? 'success' : 'danger'}" style="color: var(--text-${summary.balance >= 0 ? 'success' : 'danger'})">${Utils.formatCurrency(summary.balance)}</div>
        <div class="sub-label">สภาพคล่องสุทธิ</div>
      </div>
      
      <div class="summary-divider"></div>

      <div class="summary-metrics">
        <div class="metric-item">
          <span class="metric-label">รายรับ</span>
          <span class="metric-value success" style="color:var(--text-success)">${Utils.formatCurrency(summary.income)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">รายจ่าย</span>
          <span class="metric-value danger" style="color:var(--text-danger)">${Utils.formatCurrency(summary.expense)}</span>
        </div>
         <div class="metric-item">
          <span class="metric-label">หนี้สินคงค้าง</span>
          <span class="metric-value warning" style="color:var(--text-warning)">${Utils.formatCurrency(debtSummary.totalDebt)}</span>
        </div>
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

    <!-- รายการล่าสุด (Collapsible) -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <details class="dashboard-details">
        <summary style="padding: var(--space-lg); cursor: pointer; display: flex; align-items: center; justify-content: space-between; list-style: none;">
          <span class="card-title" style="margin-bottom: 0;">รายการล่าสุด</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </summary>
        <div id="recentTransactions" style="padding: 0 var(--space-lg) var(--space-lg);"></div>
      </details>
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
            backgroundColor: 'rgba(34, 197, 94, 0.7)', /* Green 500 */
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'รายจ่าย',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.7)', /* Red 500 */
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#a1a1aa', font: { family: 'Inter' } } }
        },
        scales: {
          x: { ticks: { color: '#71717a' }, grid: { color: 'rgba(63, 63, 70, 0.3)' } },
          y: { ticks: { color: '#71717a' }, grid: { color: 'rgba(63, 63, 70, 0.3)' } }
        }
      }
    });
  }

  // Category breakdown
  const { start, end } = Utils.getMonthRange();
  const summary = await TransactionModule.getSummary(start, end);
  const catLabels = [];
  const catData = [];
  // Muted/Pastel Palette
  const catColors = [
    '#94a3b8', '#cbd5e1', '#fca5a5', '#fdba74', '#fcd34d',
    '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd', '#f9a8d4',
    '#fda4af', '#d6d3d1', '#a8a29e', '#78716c', '#57534e'
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
