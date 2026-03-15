// Analytics Page — Custom Date Range + Group By
import { TransactionModule } from '../modules/transactions.js';
import { Utils } from '../modules/utils.js';

let currentGroupBy = 'day';

export async function renderAnalyticsPage(container) {
    // Default range: start of current month → today
    const today = new Date();
    const todayStr = toDateStr(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toDateStr(monthStart);

    container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>สรุปรายรับ-รายจ่าย</h2>
        <p class="subtitle">เลือกช่วงเวลาและดูรายรับ-รายจ่ายในช่วงนั้น</p>
      </div>
    </div>

    <!-- Date Range + Group By Controls -->
    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-bottom:24px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:14px 18px;">
      <!-- Date Range -->
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:260px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-tertiary);flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        
        <!-- Start Date Custom UI -->
        <div style="position:relative; display:flex; align-items:center;">
          <span id="displayStartDate" style="font-size:14px; font-weight:600; color:var(--text-primary); pointer-events:none; min-width:85px;"></span>
          <input type="date" id="analyticsStartDate" value="${monthStartStr}"
            style="position:absolute; left:0; top:0; width:100%; height:100%; opacity:0; cursor:pointer;">
        </div>

        <span style="color:var(--text-tertiary);font-size:12px;">ถึง</span>
        
        <!-- End Date Custom UI -->
        <div style="position:relative; display:flex; align-items:center;">
          <span id="displayEndDate" style="font-size:14px; font-weight:600; color:var(--text-primary); pointer-events:none; min-width:85px;"></span>
          <input type="date" id="analyticsEndDate" value="${todayStr}"
            style="position:absolute; left:0; top:0; width:100%; height:100%; opacity:0; cursor:pointer;">
        </div>
      </div>

      <!-- Quick Ranges -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="analytics-quick-btn" data-range="today">วันนี้</button>
        <button class="analytics-quick-btn" data-range="week">สัปดาห์นี้</button>
        <button class="analytics-quick-btn" data-range="month">เดือนนี้</button>
        <button class="analytics-quick-btn" data-range="last3">3 เดือน</button>
        <button class="analytics-quick-btn" data-range="year">ปีนี้</button>
      </div>

      <!-- Divider -->
      <div style="width:1px;height:28px;background:rgba(255,255,255,0.08);flex-shrink:0;"></div>

      <!-- Group By -->
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:11px;color:var(--text-tertiary);font-weight:600;white-space:nowrap;">แบ่งเป็น:</span>
        <div class="analytics-mode-bar" style="margin-bottom:0;">
          <button class="analytics-mode-btn active" data-group="day">วัน</button>
          <button class="analytics-mode-btn" data-group="week">สัปดาห์</button>
          <button class="analytics-mode-btn" data-group="month">เดือน</button>
          <button class="analytics-mode-btn" data-group="year">ปี</button>
        </div>
      </div>
    </div>

    <div id="analyticsContent"></div>
  `;

    // Quick range buttons
    container.querySelectorAll('.analytics-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            container.querySelectorAll('.analytics-quick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const now = new Date();
            let startDate, endDate = toDateStr(now);

            if (btn.dataset.range === 'today') {
                startDate = toDateStr(now);
            } else if (btn.dataset.range === 'week') {
                const day = now.getDay();
                const daysToMon = day === 0 ? -6 : 1 - day;
                const mon = new Date(now);
                mon.setDate(now.getDate() + daysToMon);
                startDate = toDateStr(mon);
            } else if (btn.dataset.range === 'month') {
                startDate = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
            } else if (btn.dataset.range === 'last3') {
                const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                startDate = toDateStr(d);
            } else if (btn.dataset.range === 'year') {
                startDate = `${now.getFullYear()}-01-01`;
            }

            document.getElementById('analyticsStartDate').value = startDate;
            document.getElementById('analyticsEndDate').value = endDate;
            renderContent();
        });
    });

    // Group By buttons
    container.querySelectorAll('[data-group]').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('[data-group]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGroupBy = btn.dataset.group;
            renderContent();
        });
    });

    // Date inputs
    document.getElementById('analyticsStartDate').addEventListener('change', () => {
        container.querySelectorAll('.analytics-quick-btn').forEach(b => b.classList.remove('active'));
        renderContent();
    });
    document.getElementById('analyticsEndDate').addEventListener('change', () => {
        container.querySelectorAll('.analytics-quick-btn').forEach(b => b.classList.remove('active'));
        renderContent();
    });

    // Initial render
    await renderContent();

    async function renderContent() {
        const contentEl = document.getElementById('analyticsContent');
        if (!contentEl) return;

        const startDateInput = document.getElementById('analyticsStartDate');
        const endDateInput = document.getElementById('analyticsEndDate');
        const startDate = startDateInput?.value;
        const endDate = endDateInput?.value;

        // Update display labels in DD/MM/YYYY format
        if (startDate) {
            const [y, m, d] = startDate.split('-');
            document.getElementById('displayStartDate').textContent = `${d}/${m}/${y}`;
        }
        if (endDate) {
            const [y, m, d] = endDate.split('-');
            document.getElementById('displayEndDate').textContent = `${d}/${m}/${y}`;
        }
        if (!startDate || !endDate || startDate > endDate) {
            contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-tertiary);">กรุณาเลือกช่วงวันที่ให้ถูกต้อง</div>`;
            return;
        }

        contentEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-tertiary);">กำลังโหลด...</div>`;

        const all = await TransactionModule.getAll({});
        // Filter to selected range
        const inRange = all.filter(t => {
            if (!t.date) return false;
            const d = t.date.slice(0, 10);
            return d >= startDate && d <= endDate;
        });

        const buckets = buildBuckets(inRange, startDate, endDate, currentGroupBy);

        const totalExpense = buckets.reduce((s, b) => s + b.expense, 0);
        const totalIncome = buckets.reduce((s, b) => s + b.income, 0);
        const totalNet = totalIncome - totalExpense;

        // Days in range for avg/day
        const daysDiff = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
        const avgExpPerDay = totalExpense / daysDiff;
        const avgIncPerDay = totalIncome / daysDiff;

        const maxBar = Math.max(...buckets.map(b => Math.max(b.expense, b.income)), 1);
        const groupLabel = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน', year: 'ปี' }[currentGroupBy];

        // Format date range for display
        const startFmt = new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        const endFmt = new Date(endDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

        contentEl.innerHTML = `
      <!-- Summary Stats -->
      <div class="analytics-stats-row">
        <div class="analytics-stat-card">
          <div class="analytics-stat-label">รายจ่ายเฉลี่ย / วัน</div>
          <div class="analytics-stat-value" style="color:#f87171;">${Utils.formatCurrency(avgExpPerDay)}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">รวม ${Utils.formatCurrency(totalExpense)}</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-label">รายรับเฉลี่ย / วัน</div>
          <div class="analytics-stat-value" style="color:#4ade80;">${Utils.formatCurrency(avgIncPerDay)}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">รวม ${Utils.formatCurrency(totalIncome)}</div>
        </div>
        <div class="analytics-stat-card highlight">
          <div class="analytics-stat-label">ยอดสุทธิ (${daysDiff} วัน)</div>
          <div class="analytics-stat-value" style="color:${totalNet >= 0 ? '#4ade80' : '#f87171'};">${totalNet >= 0 ? '+' : ''}${Utils.formatCurrency(totalNet)}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">${startFmt} – ${endFmt}</div>
        </div>
      </div>

      <!-- Bucket List Header -->
      <div class="analytics-bucket-header" style="margin-bottom: 8px;">
        <span style="color:var(--text-secondary);font-size:13px;font-weight:600;">แบ่งตาม${groupLabel} • ${buckets.length} ช่วง</span>
        <div style="display:flex;align-items:center;gap:14px;font-size:11px;font-weight:600;color:var(--text-tertiary);">
          <span style="display:flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:2px;background:#f87171;display:inline-block;"></span>จ่าย</span>
          <span style="display:flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:2px;background:#4ade80;display:inline-block;"></span>รับ</span>
        </div>
      </div>

      <!-- Bucket List -->
      <div class="analytics-bucket-container">
        <!-- Column Headers -->
        <div class="analytics-bucket-header-grid">
          <span class="col-time">ช่วงเวลา</span>
          <div class="analytics-bucket-values-header">
            <span class="col-income">รายรับ (+)</span>
            <span class="col-expense">รายจ่าย (-)</span>
            <span class="col-net">สุทธิ (=)</span>
          </div>
        </div>

        <div class="analytics-bucket-list">

          <!-- Bucket Rows -->
          <div class="analytics-bucket-list">
            ${buckets.length === 0
                ? `<div style="text-align:center;padding:40px;color:var(--text-tertiary);">ไม่มีรายการในช่วงเวลานี้</div>`
                : buckets.map(b => {
                    const expPct = (b.expense / maxBar * 100).toFixed(1);
                    const incPct = (b.income / maxBar * 100).toFixed(1);
                    const net = b.income - b.expense;
                    const hasAny = b.expense > 0 || b.income > 0;
                    return `
                <div class="analytics-bucket-row" 
                     data-key="${b.key}" 
                     data-label="${b.label}"
                     onclick="this.style.background='rgba(255,255,255,0.05)'">
                  <div class="analytics-bucket-meta-grid">
                    <span class="analytics-bucket-label">${b.label}</span>
                    
                    <div class="analytics-bucket-values">
                        <!-- Income -->
                        <span class="val-income">
                          ${b.income > 0 ? '+' + Utils.formatCurrency(b.income) : '—'}
                        </span>
                        
                        <!-- Expense -->
                        <span class="val-expense">
                          ${b.expense > 0 ? '-' + Utils.formatCurrency(b.expense) : '—'}
                        </span>
                        
                        <!-- Net Result -->
                        <div class="val-net-wrapper">
                          <span class="val-net ${net >= 0 ? 'pos' : 'neg'}">
                            ${net >= 0 ? '+' : ''}${Utils.formatCurrency(net)}
                          </span>
                        </div>
                    </div>
                  </div>
                  
                  <div style="display:flex; flex-direction:column; gap:4px;">
                    <div class="analytics-bar-track" style="height:5px; background:rgba(239, 68, 68, 0.05);">
                      <div style="height:100%; border-radius:2px; background:#ef4444; width:${expPct}%; transition:width 0.4s ease; opacity:0.8;"></div>
                </div>
                <div class="analytics-bar-track" style="height:5px; background:rgba(34, 197, 94, 0.05);">
                  <div style="height:100%; border-radius:2px; background:#22c55e; width:${incPct}%; transition:width 0.4s ease; opacity:0.8;"></div>
                </div>
              </div>
            </div>
          `;
            }).join('')
        }
      </div>
    </div>`;

        // Attach click handlers for drilling down
        contentEl.querySelectorAll('.analytics-bucket-row').forEach(row => {
            row.addEventListener('click', () => {
                const key = row.dataset.key;
                const groupBy = currentGroupBy;
                
                // Calculate range based on key and groupBy
                let filterStart = key;
                let filterEnd = key;

                if (groupBy === 'week') {
                    const startD = new Date(key + 'T00:00:00');
                    const endD = new Date(startD);
                    endD.setDate(startD.getDate() + 6);
                    filterEnd = toDateStr(endD);
                } else if (groupBy === 'month') {
                    const [y, m] = key.split('-');
                    const lastDay = new Date(y, m, 0).getDate();
                    filterEnd = `${y}-${m}-${lastDay}`;
                } else if (groupBy === 'year') {
                    const y = key.split('-')[0];
                    filterEnd = `${y}-12-31`;
                }

                // Save filter to session storage for Transactions page
                sessionStorage.setItem('analytics_filter_start', filterStart);
                sessionStorage.setItem('analytics_filter_end', filterEnd);
                
                // Navigate to transactions page
                window.location.hash = 'transactions';
                Utils.showToast(`แสดงรายการ: ${row.dataset.label}`, 'info');
            });
        });
    }
}

// ---------- Helpers ----------

function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function sumType(txns, type) {
    return txns.filter(t => t.type === type).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
}

function buildBuckets(txns, startDate, endDate, groupBy) {
    const buckets = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    if (groupBy === 'day') {
        const cur = new Date(start);
        while (cur <= end) {
            const ds = toDateStr(cur);
            const dayTxns = txns.filter(t => t.date?.startsWith(ds));
            const label = cur.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
            buckets.push({ label, expense: sumType(dayTxns, 'expense'), income: sumType(dayTxns, 'income'), key: ds });
            cur.setDate(cur.getDate() + 1);
        }

    } else if (groupBy === 'week') {
        // Align to Monday
        const cur = new Date(start);
        const dow = cur.getDay();
        const daysToMon = dow === 0 ? -6 : 1 - dow;
        cur.setDate(cur.getDate() + daysToMon);

        while (cur <= end) {
            const weekStart = new Date(cur);
            const weekEnd = new Date(cur);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const ws = toDateStr(weekStart);
            const we = toDateStr(weekEnd);

            const weekTxns = txns.filter(t => {
                const d = t.date?.slice(0, 10);
                return d && d >= ws && d <= we;
            });

            const labelStart = weekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            const labelEnd = weekEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            buckets.push({
                label: `${labelStart}–${labelEnd}`,
                expense: sumType(weekTxns, 'expense'),
                income: sumType(weekTxns, 'income'),
                key: ws
            });
            cur.setDate(cur.getDate() + 7);
        }

    } else if (groupBy === 'month') {
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

        while (cur <= endMonth) {
            const y = cur.getFullYear();
            const m = cur.getMonth();
            const ms = `${y}-${String(m + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(y, m + 1, 0).getDate();
            const me = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;

            const monthTxns = txns.filter(t => {
                const d = t.date?.slice(0, 10);
                return d && d >= ms && d <= me;
            });

            const label = cur.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            buckets.push({ label, expense: sumType(monthTxns, 'expense'), income: sumType(monthTxns, 'income'), key: ms });
            cur.setMonth(cur.getMonth() + 1);
        }
    } else if (groupBy === 'year') {
        buckets.push(...buildYearBuckets(txns, startDate, endDate));
    }

    return buckets;
}

function buildYearBuckets(txns, startDate, endDate) {
    const buckets = [];
    const startYear = new Date(startDate + 'T00:00:00').getFullYear();
    const endYear = new Date(endDate + 'T00:00:00').getFullYear();

    for (let y = startYear; y <= endYear; y++) {
        const ys = `${y}-01-01`;
        const ye = `${y}-12-31`;
        const yearTxns = txns.filter(t => {
            const d = t.date?.slice(0, 10);
            return d && d >= ys && d <= ye;
        });
        buckets.push({
            label: `${y + 543}`,
            expense: sumType(yearTxns, 'expense'),
            income: sumType(yearTxns, 'income'),
            key: ys
        });
    }
    return buckets;
}
