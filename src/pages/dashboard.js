// Dashboard Page
import { TransactionModule } from '../modules/transactions.js';
import { DebtModule } from '../modules/debts.js';
import { InterestEngine } from '../modules/interest.js';
import { Utils } from '../modules/utils.js';

export async function renderDashboard(container) {
  const { start, end, year, month } = Utils.getMonthRange();
  const summary = await TransactionModule.getSummary(start, end);
  const debtSummary = await DebtModule.getDebtSummary();

  container.innerHTML = `
    <div class="page-header" style="margin-bottom: var(--space-md); display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%;">
      <p class="subtitle" style="font-size: var(--font-size-base); color: var(--text-secondary); margin: 0 0 12px 0; font-weight: 500;">
        สรุปภาพรวมการเงินประจำเดือน ${Utils.getFullMonthName(month)} ${year + 543}
      </p>
    </div>

    <!-- สรุปตัวเลข (Redesigned) -->
    <div class="dashboard-summary-premium">
      <div class="summary-main">
        <div class="label">ยอดคงเหลือสุทธิ</div>
        <div class="value-huge" style="color: ${summary.balance >= 0 ? 'var(--text-success)' : '#fef08a'};">
          ${Utils.formatCurrency(summary.balance)}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px;">
          <div class="sub-label">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
             สภาพคล่องเดือนนี้
          </div>
          <button id="dashAddTxnBtn" style="
            padding: 5px 14px; 
            font-size: 11px; 
            font-weight: 600; 
            background: rgba(74, 222, 128, 0.1); 
            color: #4ade80; 
            border: 1px solid rgba(74, 222, 128, 0.4); 
            border-radius: 6px; 
            cursor: pointer; 
            transition: all 0.2s; 
            box-shadow: 0 0 15px rgba(74, 222, 128, 0.4); 
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            flex-shrink: 0;
          " onmouseover="this.style.background='rgba(74, 222, 128, 0.2)'; this.style.borderColor='rgba(74, 222, 128, 0.6)';" onmouseout="this.style.background='rgba(74, 222, 128, 0.1)'; this.style.borderColor='rgba(74, 222, 128, 0.4)';">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            เพิ่มรายการ
          </button>
        </div>
      </div>
      
      <div class="summary-divider"></div>

      <div class="summary-metrics">
        <div class="metric-card">
          <span class="m-label">รายรับเดือนนี้</span>
          <span class="m-value" style="color:var(--text-success)">+${Utils.formatCurrency(summary.income)}</span>
        </div>
        <div class="metric-card">
          <span class="m-label">รายจ่ายเดือนนี้</span>
          <span class="m-value" style="color:var(--text-danger)">-${Utils.formatCurrency(summary.expense)}</span>
        </div>
        <div class="metric-card">
          <span class="m-label">จ่ายดอกเบี้ยสะสม</span>
          <span class="m-value" style="color:#fb923c">-${Utils.formatCurrency(debtSummary.totalInterestPaid)}</span>
          <div style="font-size: 10.5px; color: var(--text-tertiary); margin-top: 6px; opacity: 0.6;">เงินที่จ่ายทิ้งเปล่าไปแล้ว</div>
        </div>
        <div class="metric-card">
          <span class="m-label">ชำระเงินต้นแล้ว</span>
          <div style="display: flex; justify-content: center; align-items: baseline; gap: 4px; flex-wrap: wrap;">
            <span class="m-value" style="color:var(--text-success)">${Utils.formatCurrency(debtSummary.totalPaid - debtSummary.totalInterestPaid)}</span>
            <span style="font-size: 12px; color: var(--text-tertiary); opacity: 0.6;">/ ${Utils.formatCurrency(debtSummary.totalOriginal)}</span>
          </div>
          <div style="margin-top: 8px; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2.5px; overflow: hidden;">
            <div style="width: ${Math.min(100, ((debtSummary.totalPaid - debtSummary.totalInterestPaid) / debtSummary.totalOriginal * 100)) || 0}%; height: 100%; background: var(--text-success); box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);"></div>
          </div>
          <div style="margin-top: 4px; font-size: 10.5px; color: var(--text-success); font-weight: 600; text-align: right; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-tertiary); font-weight: normal; opacity: 0.6;">จ่ายรวม: ${Utils.formatCurrency(debtSummary.totalPaid)}</span>
            <span>${(((debtSummary.totalPaid - debtSummary.totalInterestPaid) / debtSummary.totalOriginal) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card" style="border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);">
        <div class="card-header">
          <span class="card-title">แนวโน้มรายรับ-รายจ่าย (6 เดือน)</span>
        </div>
        <div class="chart-container">
          <canvas id="incomeExpenseChart"></canvas>
        </div>
      </div>
      <div class="card" style="border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);">
        <div class="card-header">
          <span class="card-title">สัดส่วนรายจ่ายรายหมวด</span>
        </div>
        <div class="chart-container">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>
    </div>

    <!-- รายการล่าสุด -->
    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);">
      <div style="padding: var(--space-lg); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between;">
        <span class="card-title" style="margin-bottom: 0;">ธุรกรรมล่าสุด</span>
        <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#transactions'" style="font-size: 11px; padding: 4px 12px; border-radius: 6px;">ดูทั้งหมด</button>
      </div>
      <div id="recentTransactions" style="padding: 0;"></div>
    </div>
  `;

  // Attach FAB/Header button listener
  document.getElementById('dashAddTxnBtn')?.addEventListener('click', () => {
    // Set flag to open modal on transactions page
    sessionStorage.setItem('triggerAddTxn', 'true');
    window.location.hash = '#transactions';
  });

  // Render recent transactions with more modern look
  const recent = await TransactionModule.getAll({});
  const recentSlice = recent.slice(0, 5); // Just top 5 for dashboard
  const recentEl = document.getElementById('recentTransactions');

  if (recentSlice.length === 0) {
    recentEl.innerHTML = `<div class="empty-state" style="padding: var(--space-xl);"><p>ยังไม่มีรายการบันทึก</p></div>`;
  } else {
    recentEl.innerHTML = `
      <div class="txn-list" style="display: flex; flex-direction: column;">
        ${recentSlice.map(t => {
          const isDebtIncome = t.category === 'เงินกู้/เงินสดจากบัตร';
          const mainColor = isDebtIncome ? '#fbbf24' : (t.type === 'income' ? 'var(--text-success)' : '');
          const badgeIcon = isDebtIncome ? '⚠️' : (t.type === 'income' ? '💰' : '💸');
          
          return `
          <div style="display: flex; align-items: center; padding: 10px var(--space-lg); border-bottom: 1px solid rgba(255,255,255,0.02);">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 1rem; flex-shrink: 0;">
              ${badgeIcon}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${mainColor ? `color: ${mainColor};` : ''}">
                ${t.category} <span style="font-weight: 400; font-size: 11px; color: ${mainColor || 'var(--text-tertiary)'}; margin-left: 4px; opacity: 0.7;">${t.note ? `• ${t.note}` : ''}</span>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
              <div class="amount ${t.type}" style="font-weight: 700; font-family: var(--font-mono); font-size: 13px; ${isDebtIncome ? 'color: #fbbf24 !important;' : ''}">
                ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
              </div>
              <div style="font-size: 9px; color: var(--text-tertiary); opacity: 0.4;">${Utils.formatDateShort(t.date)}</div>
            </div>
          </div>
          `;
        }).join('')}
      </div>
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
    const incomeGradient = ctx1.getContext('2d').createLinearGradient(0, 0, 0, 400);
    incomeGradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
    incomeGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

    const expenseGradient = ctx1.getContext('2d').createLinearGradient(0, 0, 0, 400);
    expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'รายรับ',
            data: incomeData,
            backgroundColor: incomeGradient,
            borderColor: '#22c55e',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: 'รายจ่าย',
            data: expenseData,
            backgroundColor: expenseGradient,
            borderColor: '#ef4444',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, usePointStyle: true, color: '#a1a1aa', font: { family: 'Inter', size: 11 } }
          }
        },
        scales: {
          x: {
            ticks: { color: '#71717a', font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: '#71717a', font: { size: 10 }, callback: v => Utils.formatCurrency(v) },
            grid: { color: 'rgba(255, 255, 255, 0.03)' }
          }
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
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#a855f7', '#64748b'
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
          borderWidth: 2,
          borderColor: '#18181b', // Match bg-primary
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#d4d4d8',
              font: { family: 'Inter', size: 11 },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        }
      }
    });
  }
  else if (ctx2) {
    ctx2.parentElement.innerHTML = '<div class="empty-state"><p>ยังไม่มีข้อมูลรายจ่าย</p></div>';
  }
}

async function generateSmartInsights(currentSummary, debtSummary) {
  const { year, month } = Utils.getMonthRange(-1);
  const prevSummary = await TransactionModule.getMonthlySummary(year, month);
  const insights = [];

  // 1. Expense Comparison
  let mostIncreasedCat = null;
  let maxIncreasePct = 0;

  Object.entries(currentSummary.byCategory).forEach(([cat, vals]) => {
    if (vals.expense > 0) {
      const prevVals = prevSummary.byCategory[cat] || { expense: 0 };
      if (prevVals.expense > 0) {
        const increase = ((vals.expense - prevVals.expense) / prevVals.expense) * 100;
        if (increase > maxIncreasePct) {
          maxIncreasePct = increase;
          mostIncreasedCat = cat;
        }
      }
    }
  });

  if (mostIncreasedCat && maxIncreasePct >= 5) {
    insights.push(`เดือนนี้คุณใช้จ่ายค่า<b>${mostIncreasedCat}</b>เพิ่มขึ้น ${maxIncreasePct.toFixed(0)}% เมื่อเทียบกับเดือนที่แล้ว`);
  } else if (currentSummary.expense < prevSummary.expense && currentSummary.expense > 0) {
    const decreasePct = ((prevSummary.expense - currentSummary.expense) / prevSummary.expense) * 100;
    insights.push(`เยี่ยมมาก! เดือนนี้คุณประหยัดค่าใช้จ่ายรวมได้ ${decreasePct.toFixed(0)}% เมื่อเทียบกับเดือนก่อน`);
  }

  // 2. Fixed Expense Ratio
  if (currentSummary.income > 0) {
    const ratio = (currentSummary.expense / currentSummary.income) * 100;
    insights.push(`ค่าใช้จ่ายส่วนใหญ่ของคุณคิดเป็น <b>${ratio.toFixed(0)}%</b> ของรายได้`);
  }

  // 3. Debt Acceleration Tip
  const activeDebts = (debtSummary.debts || []).filter(d => d.status === 'active');
  if (activeDebts.length > 0) {
    const d = activeDebts[0]; 
    const amount = 300; 
    const comparison = InterestEngine.comparePayments(
      d.currentBalance, 
      d.annualRate, 
      d.monthlyPayment || d.minPayment || 0, 
      amount,
      d.type,
      d.lastInterestDate
    );

    if (comparison.savings.months > 0) {
      insights.push(`ถ้าคุณจ่ายหนี้ "${d.name}" เพิ่มเดือนละ <b>${amount} บาท</b> คุณจะปลดหนี้เร็วขึ้น <b>${comparison.savings.months} เดือน</b>`);
    }
  }

  if (insights.length === 0) return '';

  return `
    <details open style="
      background: rgba(255, 255, 255, 0.03); 
      border: 1px solid rgba(255, 255, 255, 0.05); 
      border-radius: 12px; 
      margin-bottom: 20px;
      overflow: hidden;
    ">
      <summary style="padding: 12px 16px; cursor: pointer; font-weight: 600; color: #fef08a; display: flex; align-items: center; justify-content: space-between; list-style: none;">
        <span style="display: flex; align-items: center; gap: 8px;"><span>🧠</span> Smart Insight</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </summary>
      <div style="padding: 0 16px 16px 16px;">
        <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.6;">
          ${insights.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
        </ul>
      </div>
    </details>
  `;
}
