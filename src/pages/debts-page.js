// Debts Page
import { DebtModule } from '../modules/debts.js';
import { InterestEngine } from '../modules/interest.js';
import { Utils } from '../modules/utils.js';

export async function renderDebtsPage(container) {
  const summary = await DebtModule.getDebtSummary();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>จัดการหนี้สิน</h2>
        <p class="subtitle">ติดตามหนี้บัตรเครดิต สินเชื่อส่วนบุคคล พร้อมคำนวณดอกเบี้ย</p>
      </div>
      <button class="btn btn-primary" id="addDebtBtn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        เพิ่มหนี้
      </button>
    </div>

    <!-- Summary -->
    <div class="stats-grid">
      <div class="stat-card debt">
        <div class="stat-label">หนี้คงค้างรวม</div>
        <div class="stat-value accent">${Utils.formatCurrency(summary.totalDebt)}</div>
      </div>
      <div class="stat-card expense">
        <div class="stat-label">ดอกเบี้ยรวมที่จ่ายแล้ว</div>
        <div class="stat-value negative">${Utils.formatCurrency(summary.totalInterestPaid)}</div>
      </div>
      <div class="stat-card income">
        <div class="stat-label">ชำระแล้วทั้งหมด</div>
        <div class="stat-value positive">${Utils.formatCurrency(summary.totalPaid)}</div>
      </div>
      <div class="stat-card balance">
        <div class="stat-label">จำนวนหนี้</div>
        <div class="stat-value" style="color:var(--text-primary)">${summary.activeCount} รายการ</div>
      </div>
    </div>

    <!-- Debt Cards -->
    <div class="debts-grid" id="debtsGrid"></div>

    <!-- Add/Edit Debt Modal -->
    <div class="modal-overlay" id="debtModal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="debtModalTitle">เพิ่มหนี้</h3>
          <button class="modal-close" id="debtModalClose">&times;</button>
        </div>
        <div class="modal-body">
          <form id="debtForm">
            <input type="hidden" id="debtId">
            <div class="form-group">
              <label class="form-label">ชื่อหนี้</label>
              <input type="text" class="form-input" id="debtName" placeholder="เช่น บัตรเครดิต KTC, สินเชื่อ SCB" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">ประเภทหนี้</label>
                <select class="form-select" id="debtType" required>
                  <option value="credit_card">💳 บัตรเครดิต</option>
                  <option value="personal_loan">🏦 สินเชื่อส่วนบุคคล</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">ประเภทดอกเบี้ย</label>
                <select class="form-select" id="debtInterestType" required>
                  <option value="reducing_balance">ลดต้นลดดอก</option>
                  <option value="daily_accrual">เดินรายวัน</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">เงินต้น (บาท)</label>
                <input type="number" class="form-input" id="debtPrincipal" step="0.01" min="0" required>
              </div>
              <div class="form-group">
                <label class="form-label">ยอดคงเหลือปัจจุบัน (บาท)</label>
                <input type="number" class="form-input" id="debtCurrentBalance" step="0.01" min="0">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">อัตราดอกเบี้ย (% ต่อปี)</label>
                <input type="number" class="form-input" id="debtRate" step="0.01" min="0" required>
              </div>
              <div class="form-group">
                <label class="form-label">ระยะเวลา (เดือน)</label>
                <input type="number" class="form-input" id="debtTerm" min="0" placeholder="0 = ไม่กำหนด">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">ค่างวดรายเดือน (บาท)</label>
                <input type="number" class="form-input" id="debtMonthlyPayment" step="0.01" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">ชำระขั้นต่ำ (บาท)</label>
                <input type="number" class="form-input" id="debtMinPayment" step="0.01" min="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">วันที่เริ่มต้น</label>
              <input type="date" class="form-input" id="debtStartDate" value="${Utils.today()}" required>
            </div>
            <div class="form-group">
              <label class="form-label">หมายเหตุ</label>
              <textarea class="form-textarea" id="debtNote" rows="2" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn" id="debtCancelBtn">ยกเลิก</button>
          <button class="btn btn-primary" id="debtSaveBtn">บันทึก</button>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <div class="modal-overlay" id="paymentModal">
      <div class="modal">
        <div class="modal-header">
          <h3>บันทึกการชำระหนี้</h3>
          <button class="modal-close" id="paymentModalClose">&times;</button>
        </div>
        <div class="modal-body">
          <p id="paymentDebtName" style="color:var(--text-accent);margin-bottom:var(--space-md);font-weight:600;"></p>
          <input type="hidden" id="paymentDebtId">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">จำนวนเงินที่ชำระ (บาท)</label>
              <input type="number" class="form-input" id="paymentAmount" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label">วันที่ชำระ</label>
              <input type="date" class="form-input" id="paymentDate" value="${Utils.today()}" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">หมายเหตุ</label>
            <textarea class="form-textarea" id="paymentNote" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="paymentCancelBtn">ยกเลิก</button>
          <button class="btn btn-success" id="paymentSaveBtn">บันทึกการชำระ</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" id="detailModal">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h3 id="detailTitle">รายละเอียดหนี้</h3>
          <button class="modal-close" id="detailModalClose">&times;</button>
        </div>
        <div class="modal-body" id="detailBody" style="max-height:70vh;overflow-y:auto;"></div>
      </div>
    </div>
  `;

  setupDebtEvents();
  await refreshDebts();
}

function setupDebtEvents() {
  document.getElementById('addDebtBtn').addEventListener('click', () => openDebtModal());
  document.getElementById('debtModalClose').addEventListener('click', closeDebtModal);
  document.getElementById('debtCancelBtn').addEventListener('click', closeDebtModal);
  document.getElementById('debtModal').addEventListener('click', e => { if (e.target.id === 'debtModal') closeDebtModal(); });
  document.getElementById('debtSaveBtn').addEventListener('click', saveDebt);

  document.getElementById('paymentModalClose').addEventListener('click', closePaymentModal);
  document.getElementById('paymentCancelBtn').addEventListener('click', closePaymentModal);
  document.getElementById('paymentModal').addEventListener('click', e => { if (e.target.id === 'paymentModal') closePaymentModal(); });
  document.getElementById('paymentSaveBtn').addEventListener('click', savePayment);

  document.getElementById('detailModalClose').addEventListener('click', closeDetailModal);
  document.getElementById('detailModal').addEventListener('click', e => { if (e.target.id === 'detailModal') closeDetailModal(); });
}

function openDebtModal(debt = null) {
  const modal = document.getElementById('debtModal');
  if (debt) {
    document.getElementById('debtModalTitle').textContent = 'แก้ไขหนี้';
    document.getElementById('debtId').value = debt.id;
    document.getElementById('debtName').value = debt.name;
    document.getElementById('debtType').value = debt.type;
    document.getElementById('debtInterestType').value = debt.interestType;
    document.getElementById('debtPrincipal').value = debt.principal;
    document.getElementById('debtCurrentBalance').value = debt.currentBalance;
    document.getElementById('debtRate').value = debt.annualRate;
    document.getElementById('debtTerm').value = debt.termMonths || '';
    document.getElementById('debtMonthlyPayment').value = debt.monthlyPayment || '';
    document.getElementById('debtMinPayment').value = debt.minPayment || '';
    document.getElementById('debtStartDate').value = debt.startDate;
    document.getElementById('debtNote').value = debt.note || '';
  } else {
    document.getElementById('debtModalTitle').textContent = 'เพิ่มหนี้';
    document.getElementById('debtId').value = '';
    document.getElementById('debtForm').reset();
    document.getElementById('debtStartDate').value = Utils.today();
  }
  modal.classList.add('active');
}

function closeDebtModal() { document.getElementById('debtModal').classList.remove('active'); }
function closePaymentModal() { document.getElementById('paymentModal').classList.remove('active'); }
function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); }

async function saveDebt() {
  const id = document.getElementById('debtId').value;
  const data = {
    name: document.getElementById('debtName').value,
    type: document.getElementById('debtType').value,
    interestType: document.getElementById('debtInterestType').value,
    principal: document.getElementById('debtPrincipal').value,
    currentBalance: document.getElementById('debtCurrentBalance').value || document.getElementById('debtPrincipal').value,
    annualRate: document.getElementById('debtRate').value,
    termMonths: document.getElementById('debtTerm').value,
    monthlyPayment: document.getElementById('debtMonthlyPayment').value,
    minPayment: document.getElementById('debtMinPayment').value,
    startDate: document.getElementById('debtStartDate').value,
    note: document.getElementById('debtNote').value
  };

  if (!data.name || !data.principal || !data.annualRate) {
    Utils.showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  try {
    if (id) {
      await DebtModule.update(parseInt(id), data);
      Utils.showToast('แก้ไขหนี้สำเร็จ', 'success');
    } else {
      await DebtModule.add(data);
      Utils.showToast('เพิ่มหนี้สำเร็จ', 'success');
    }
    closeDebtModal();
    await refreshDebts();
  } catch (e) {
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  }
}

function openPaymentModal(debt) {
  document.getElementById('paymentDebtId').value = debt.id;
  document.getElementById('paymentDebtName').textContent = debt.name;
  document.getElementById('paymentAmount').value = debt.monthlyPayment || debt.minPayment || '';
  document.getElementById('paymentDate').value = Utils.today();
  document.getElementById('paymentNote').value = '';
  document.getElementById('paymentModal').classList.add('active');
}

async function savePayment() {
  const debtId = parseInt(document.getElementById('paymentDebtId').value);
  const data = {
    amount: document.getElementById('paymentAmount').value,
    date: document.getElementById('paymentDate').value,
    note: document.getElementById('paymentNote').value
  };

  if (!data.amount || !data.date) {
    Utils.showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  try {
    await DebtModule.recordPayment(debtId, data);
    Utils.showToast('บันทึกการชำระสำเร็จ', 'success');
    closePaymentModal();
    await refreshDebts();
  } catch (e) {
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  }
}

async function showDebtDetail(debt) {
  const payments = await DebtModule.getPayments(debt.id);
  const paid = debt.principal - debt.currentBalance;
  const paidPct = Utils.percentage(paid, debt.principal);

  // Generate schedule
  let scheduleHtml = '';
  if (debt.monthlyPayment > 0) {
    let result;
    if (debt.interestType === 'daily_accrual') {
      result = InterestEngine.generateDailyAccrualSchedule(
        debt.currentBalance, debt.annualRate, debt.monthlyPayment, debt.startDate);
    } else {
      result = InterestEngine.generateAmortizationSchedule(
        debt.currentBalance, debt.annualRate, debt.monthlyPayment);
    }

    const scheduleRows = result.schedule.slice(0, 60);
    scheduleHtml = `
      <h4 style="margin: var(--space-lg) 0 var(--space-md); color: var(--text-accent);">📋 ตารางผ่อนชำระ (คาดการณ์)</h4>
      <div style="margin-bottom: var(--space-md); padding: var(--space-md); background: var(--bg-tertiary); border-radius: var(--border-radius);">
        <div class="summary-row">
          <span class="label">คาดว่าหมดหนี้ใน</span>
          <span class="value">${result.totalMonths} เดือน</span>
        </div>
        <div class="summary-row">
          <span class="label">ดอกเบี้ยรวมที่ต้องจ่าย</span>
          <span class="value" style="color:var(--text-warning)">${Utils.formatCurrency(result.totalInterest)}</span>
        </div>
        <div class="summary-row">
          <span class="label">ยอดรวมทั้งหมด</span>
          <span class="value">${Utils.formatCurrency(result.totalPaid)}</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="amort-table">
          <thead>
            <tr>
              <th>งวด</th>
              <th>ค่างวด</th>
              <th>ดอกเบี้ย</th>
              <th>เงินต้น</th>
              <th>ยอดคงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows.map(s => `
              <tr>
                <td data-label="งวด">${s.month}</td>
                <td data-label="ค่างวด">${Utils.formatCurrency(s.payment)}</td>
                <td data-label="ดอกเบี้ย" style="color:var(--text-warning)">${Utils.formatCurrency(s.interest)}</td>
                <td data-label="เงินต้น" style="color:var(--text-success)">${Utils.formatCurrency(s.principal)}</td>
                <td data-label="ยอดคงเหลือ">${Utils.formatCurrency(s.balance)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${result.schedule.length > 60 ? `<p style="color:var(--text-tertiary);font-size:var(--font-size-xs);margin-top:var(--space-sm);">แสดง 60 งวดแรกจากทั้งหมด ${result.schedule.length} งวด</p>` : ''}
    `;
  }

  // Payment history
  let paymentHtml = '';
  if (payments.length > 0) {
    paymentHtml = `
      <h4 style="margin: var(--space-lg) 0 var(--space-md); color: var(--text-accent);">💰 ประวัติการชำระ</h4>
      <table class="data-table">
        <thead>
          <tr><th>วันที่</th><th style="text-align:right">ยอดชำระ</th><th style="text-align:right">ดอกเบี้ย</th><th style="text-align:right">เงินต้น</th><th style="text-align:right">ยอดคงเหลือ</th></tr>
        </thead>
        <tbody>
          ${payments.map(p => `
            <tr>
              <td data-label="วันที่">${Utils.formatDateShort(p.date)}</td>
              <td data-label="ยอดชำระ" style="text-align:right;font-family:var(--font-mono)">${Utils.formatCurrency(p.amount)}</td>
              <td data-label="ดอกเบี้ย" style="text-align:right;font-family:var(--font-mono);color:var(--text-warning)">${Utils.formatCurrency(p.interestPortion)}</td>
              <td data-label="เงินต้น" style="text-align:right;font-family:var(--font-mono);color:var(--text-success)">${Utils.formatCurrency(p.principalPortion)}</td>
              <td data-label="ยอดคงเหลือ" style="text-align:right;font-family:var(--font-mono)">${Utils.formatCurrency(p.balanceAfter)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  document.getElementById('detailTitle').textContent = debt.name;
  document.getElementById('detailBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-lg);">
      <div>
        <div class="summary-row"><span class="label">ประเภท</span><span class="value">${Utils.debtTypeName(debt.type)}</span></div>
        <div class="summary-row"><span class="label">ดอกเบี้ย</span><span class="value">${Utils.interestTypeName(debt.interestType)}</span></div>
        <div class="summary-row"><span class="label">อัตราดอกเบี้ย</span><span class="value">${debt.annualRate}% ต่อปี</span></div>
        <div class="summary-row"><span class="label">วันที่เริ่ม</span><span class="value">${Utils.formatDate(debt.startDate)}</span></div>
      </div>
      <div>
        <div class="summary-row"><span class="label">เงินต้น</span><span class="value">${Utils.formatCurrency(debt.principal)}</span></div>
        <div class="summary-row"><span class="label">ยอดคงเหลือ</span><span class="value" style="color:var(--text-danger)">${Utils.formatCurrency(debt.currentBalance)}</span></div>
        <div class="summary-row"><span class="label">ค่างวด</span><span class="value">${Utils.formatCurrency(debt.monthlyPayment || 0)}</span></div>
        <div class="summary-row"><span class="label">ชำระขั้นต่ำ</span><span class="value">${Utils.formatCurrency(debt.minPayment || 0)}</span></div>
      </div>
    </div>
    <div>
      <div class="progress-bar">
        <div class="progress-fill success" style="width:${paidPct}%"></div>
      </div>
      <div class="progress-info">
        <span>ชำระแล้ว ${paidPct}%</span>
        <span>${Utils.formatCurrency(paid)} / ${Utils.formatCurrency(debt.principal)}</span>
      </div>
    </div>
    ${paymentHtml}
    ${scheduleHtml}
  `;

  document.getElementById('detailModal').classList.add('active');
}

async function refreshDebts() {
  const debts = await DebtModule.getAll();
  const grid = document.getElementById('debtsGrid');

  if (debts.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>ยังไม่มีหนี้สิน — เพิ่มหนี้เพื่อเริ่มติดตาม</p><button class="btn btn-primary" onclick="document.getElementById('addDebtBtn').click()">เพิ่มหนี้</button></div>`;
    return;
  }

  grid.innerHTML = debts.map(d => {
    const paid = d.principal - d.currentBalance;
    const paidPct = Utils.percentage(paid, d.principal);
    return `
      <div class="debt-card" data-id="${d.id}">
        <div class="debt-card-header">
          <span class="debt-card-name">${d.name}</span>
          <span class="badge badge-${d.type === 'credit_card' ? 'credit-card' : 'personal-loan'}">${Utils.debtTypeName(d.type)}</span>
        </div>
        <div class="debt-card-balance">${Utils.formatCurrency(d.currentBalance)}</div>
        <div class="progress-bar">
          <div class="progress-fill ${paidPct > 70 ? 'success' : ''}" style="width:${paidPct}%"></div>
        </div>
        <div class="progress-info">
          <span>ชำระแล้ว ${paidPct}%</span>
          <span>${Utils.formatCurrency(paid)} / ${Utils.formatCurrency(d.principal)}</span>
        </div>
        <div class="debt-card-details" style="margin-top:var(--space-md)">
          <div class="debt-detail-item">
            <div class="label">ดอกเบี้ย</div>
            <div class="value">${d.annualRate}% (${Utils.interestTypeName(d.interestType)})</div>
          </div>
          <div class="debt-detail-item">
            <div class="label">ค่างวด/เดือน</div>
            <div class="value">${Utils.formatCurrency(d.monthlyPayment || d.minPayment || 0)}</div>
          </div>
        </div>
        <div class="debt-actions">
          <button class="btn btn-sm btn-success pay-debt" data-id="${d.id}">💰 ชำระ</button>
          <button class="btn btn-sm detail-debt" data-id="${d.id}">📋 รายละเอียด</button>
          <button class="btn btn-sm edit-debt" data-id="${d.id}">✏️ แก้ไข</button>
          <button class="btn btn-sm btn-danger delete-debt" data-id="${d.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners
  grid.querySelectorAll('.pay-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const debt = debts.find(d => d.id === parseInt(btn.dataset.id));
      if (debt) openPaymentModal(debt);
    });
  });

  grid.querySelectorAll('.detail-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const debt = debts.find(d => d.id === parseInt(btn.dataset.id));
      if (debt) showDebtDetail(debt);
    });
  });

  grid.querySelectorAll('.edit-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const debt = debts.find(d => d.id === parseInt(btn.dataset.id));
      if (debt) openDebtModal(debt);
    });
  });

  grid.querySelectorAll('.delete-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('คุณต้องการลบหนี้นี้และประวัติการชำระทั้งหมด?')) {
        await DebtModule.delete(parseInt(btn.dataset.id));
        Utils.showToast('ลบหนี้สำเร็จ', 'success');
        // Reload the page to refresh summary too
        const container = document.getElementById('app');
        await renderDebtsPage(container);
      }
    });
  });
}
