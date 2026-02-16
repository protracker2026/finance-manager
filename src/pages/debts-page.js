// Debts Page
import { DebtModule } from '../modules/debts.js';
import { InterestEngine } from '../modules/interest.js';
import { Utils } from '../modules/utils.js';

let amountsVisible = true;

export async function renderDebtsPage(container) {
  const summary = await DebtModule.getDebtSummary();

  const toggleVisibility = () => {
    amountsVisible = !amountsVisible;
    refreshDebts();
    updateSummaryUI(summary);
  };

  const formatValue = (val) => amountsVisible ? Utils.formatCurrency(val) : '••••••';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>จัดการหนี้สิน</h2>
        <p class="subtitle">ติดตามหนี้บัตรเครดิต สินเชื่อส่วนบุคคล พร้อมคำนวณดอกเบี้ย</p>
      </div>
      <div style="display:flex; gap:var(--space-sm);">
        <button class="btn" id="exportDebtPdfBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          PDF Report
        </button>
        <button class="btn btn-primary" id="addDebtBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          เพิ่มหนี้
        </button>
      </div>
    </div>

    <!-- Summary (Compact) -->
    <div class="debt-summary-compact">
      <div class="summary-main">
        <div class="label" style="display:flex; align-items:center; justify-content:center; gap:8px;">
            หนี้คงค้างสุทธิ
            <button class="btn-icon" id="toggleVisibilityBtn" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; padding:0; display:flex;">
                <svg id="eyeIcon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${amountsVisible ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'}</svg>
            </button>
        </div>
        <div class="value-huge" id="totalDebtValue">${formatValue(summary.totalDebt)}</div>
        <div class="sub-label">จาก ${summary.activeCount} รายการ</div>
      </div>
      
      <div class="summary-divider"></div>

      <div class="summary-metrics">
        <div class="metric-item">
          <span class="metric-label">ยอดจ่าย/เดือน</span>
          <span class="metric-value warning" id="totalMonthlyPayment">...</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">จ่ายดอกเบี้ยไปแล้ว</span>
          <span class="metric-value danger" id="totalInterestPaidValue">${Utils.formatCurrency(summary.totalInterestPaid)}</span>
        </div>
         <div class="metric-item">
          <span class="metric-label">ชำระเงินต้นไปแล้ว</span>
          <span class="metric-value success" id="totalPaidValue">${Utils.formatCurrency(summary.totalPaid)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">คาดว่าจะหมดหนี้</span>
          <span class="metric-value accent" id="estimatedPayoffDate">...</span>
        </div>
      </div>
    </div>

    <!-- Sort & Filter Bar -->
    <div class="debt-sort-bar">
      <div class="debt-sort-controls">
        <span class="label">เรียงตาม:</span>
        <button class="sort-btn active" data-sort="avalanche">ดอกเบี้ยสูง (Avalanche)</button>
        <button class="sort-btn" data-sort="snowball">ยอดน้อย (Snowball)</button>
        <button class="sort-btn" data-sort="name">ชื่อ</button>
      </div>
      <div style="margin-left:auto;" class="debt-sort-controls">
         <span class="label">ฟิลเตอร์:</span>
         <select class="form-select" id="debtFilter" style="padding:4px 8px; font-size:var(--font-size-xs);">
            <option value="all">ทั้งหมด</option>
            <option value="credit_card">บัตรเครดิต</option>
            <option value="personal_loan">สินเชื่อ</option>
         </select>
      </div>
    </div>

    <!-- Debt List Container -->
    <div id="debtsContainer"></div>

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
                  <option value="personal_loan_vehicle">🚗 สินเชื่อ (ทะเบียนรถค้ำ)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">ประเภทดอกเบี้ย</label>
                <select class="form-select" id="debtInterestType" required>
                  <option value="reducing_balance">ลดต้นลดดอก</option>
                  <option value="daily_accrual">เดินรายวัน</option>
                  <option value="fixed_rate">ดอกเบี้ยคงที่ (Flat Rate)</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">เงินต้น (บาท)</label>
                <input type="number" class="form-input" id="debtPrincipal" step="0.01" min="0" required inputmode="decimal">
              </div>
              <div class="form-group">
                <label class="form-label">ยอดคงเหลือปัจจุบัน (บาท)</label>
                <input type="number" class="form-input" id="debtCurrentBalance" step="0.01" min="0" inputmode="decimal">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">อัตราดอกเบี้ย (% ต่อปี)</label>
                <input type="number" class="form-input" id="debtRate" step="0.01" min="0" required inputmode="decimal">
                <div id="rateWarning" style="font-size:var(--font-size-xs);margin-top:4px;display:none;"></div>
              </div>
              <div class="form-group">
                <label class="form-label">ระยะเวลา (เดือน)</label>
                <input type="number" class="form-input" id="debtTerm" min="0" placeholder="0 = ไม่กำหนด" inputmode="numeric">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">ค่างวดรายเดือน (บาท)</label>
                <input type="number" class="form-input" id="debtMonthlyPayment" step="0.01" min="0" inputmode="decimal">
              </div>
              <div class="form-group">
                <label class="form-label">ชำระขั้นต่ำ (บาท)</label>
                <input type="number" class="form-input" id="debtMinPayment" step="0.01" min="0" inputmode="decimal">
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

  // One-click toggle for main balance visibility only
  document.getElementById('toggleVisibilityBtn').addEventListener('click', function () {
    amountsVisible = !amountsVisible;
    const valueEl = document.getElementById('totalDebtValue');
    const iconEl = document.getElementById('toggleVisibilityBtn');

    if (valueEl) {
      DebtModule.getDebtSummary().then(summary => {
        valueEl.textContent = amountsVisible ? Utils.formatCurrency(summary.totalDebt) : '••••••';
      });
    }

    if (iconEl) {
      iconEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${amountsVisible ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'}</svg>
      `;
    }
  });

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

  // === Smart Auto-fill ตามประเภทหนี้ (ธปท.) ===
  document.getElementById('debtType').addEventListener('change', (e) => {
    const type = e.target.value;
    const config = InterestEngine.getBOTConfig(type);
    // Auto-set interest type
    document.getElementById('debtInterestType').value = config.method;
    // Auto-set max rate as default
    document.getElementById('debtRate').value = config.maxRate;
    // Auto-calculate min payment if credit card
    if (type === 'credit_card') {
      const principal = parseFloat(document.getElementById('debtPrincipal').value) || 0;
      if (principal > 0) {
        document.getElementById('debtMinPayment').value = InterestEngine.calculateMinPayment(principal, 'credit_card').toFixed(2);
      }
    }
    validateRateInput();
  });

  // === Rate validation on input ===
  document.getElementById('debtRate').addEventListener('input', validateRateInput);

  // === Auto-calc min payment when principal changes (credit card) ===
  document.getElementById('debtPrincipal').addEventListener('input', () => {
    const type = document.getElementById('debtType').value;
    if (type === 'credit_card') {
      const principal = parseFloat(document.getElementById('debtPrincipal').value) || 0;
      if (principal > 0) {
        document.getElementById('debtMinPayment').value = InterestEngine.calculateMinPayment(principal, 'credit_card').toFixed(2);
      }
    }
  });

  // === Sort & Filter Events ===
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      refreshDebts();
    });
  });

  document.getElementById('debtFilter').addEventListener('change', refreshDebts);

  document.getElementById('exportDebtPdfBtn').addEventListener('click', async () => {
    const summary = await DebtModule.getDebtSummary();
    await Utils.exportDebtsToPDF(summary);
  });
}

function validateRateInput() {
  const rate = parseFloat(document.getElementById('debtRate').value) || 0;
  const type = document.getElementById('debtType').value;
  const warningEl = document.getElementById('rateWarning');
  if (!warningEl) return;

  const validation = InterestEngine.validateRate(rate, type);
  warningEl.style.display = 'block';
  if (validation.isOverLimit) {
    warningEl.style.color = 'var(--text-danger, #ef4444)';
    warningEl.textContent = validation.message;
  } else {
    warningEl.style.color = 'var(--text-success, #22c55e)';
    warningEl.textContent = validation.message;
  }
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

  // === BOT Info Section ===
  const botConfig = InterestEngine.getBOTConfig(debt.type);
  const rateValidation = InterestEngine.validateRate(debt.annualRate, debt.type);
  const botInfoHtml = `
    <div style="margin-bottom:var(--space-lg); padding:var(--space-md); background:var(--bg-tertiary); border-radius:var(--border-radius); border-left:3px solid var(--text-accent);">
      <div style="font-weight:600; color:var(--text-accent); margin-bottom:8px;">📜 ข้อมูลตามหลัก ธปท.</div>
      <div class="summary-row"><span class="label">วิธีคิดดอกเบี้ย</span><span class="value">${botConfig.description}</span></div>
      <div class="summary-row"><span class="label">เพดาน ธปท.</span><span class="value">${botConfig.maxRate}% ต่อปี</span></div>
      <div class="summary-row"><span class="label">สถานะอัตรา</span><span class="value" style="color:${rateValidation.isOverLimit ? 'var(--text-danger)' : 'var(--text-success)'}">${rateValidation.message}</span></div>
      ${debt.type === 'credit_card' ? `<div class="summary-row"><span class="label">ชำระขั้นต่ำ (8%)</span><span class="value">${Utils.formatCurrency(InterestEngine.calculateMinPayment(debt.currentBalance, 'credit_card'))}</span></div>` : ''}
    </div>
  `;

  // Generate schedule
  let scheduleHtml = '';
  const paymentForSchedule = debt.monthlyPayment || debt.minPayment;
  if (paymentForSchedule > 0) {
    let result;
    if (debt.type === 'credit_card') {
      // ใช้ตารางบัตรเครดิตเฉพาะ (daily accrual + dynamic min payment)
      result = InterestEngine.generateCreditCardSchedule(
        debt.currentBalance, debt.annualRate, debt.monthlyPayment || 0, debt.startDate);
    } else if (debt.interestType === 'daily_accrual') {
      result = InterestEngine.generateDailyAccrualSchedule(
        debt.currentBalance, debt.annualRate, paymentForSchedule, debt.startDate);
    } else if (debt.interestType === 'fixed_rate') {
      // Use principal as the base for flat rate calc
      result = InterestEngine.generateFixedRateSchedule(
        debt.principal, debt.annualRate, paymentForSchedule);
    } else {
      result = InterestEngine.generateAmortizationSchedule(
        debt.currentBalance, debt.annualRate, paymentForSchedule);
    }

    const scheduleRows = result.schedule.slice(0, 60);
    scheduleHtml = `
      <div style="margin-top: var(--space-lg);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span>📊</span>
              <h4 style="margin:0; color: var(--text-accent);">คาดการณ์การผ่อนชำระ</h4>
          </div>
          
          <div style="margin-bottom: var(--space-md); padding: var(--space-md); background: var(--bg-tertiary); border-radius: var(--border-radius); border: 1px solid rgba(255,255,255,0.05);">
            <div class="summary-row">
              <span class="label">ระยะเวลาที่เหลือ</span>
              <span class="value" style="color:var(--text-success)">${result.totalMonths} เดือน</span>
            </div>
            <div class="summary-row">
              <span class="label">ดอกเบี้ยรวมที่จะเกิดขึ้น</span>
              <span class="value" style="color:var(--text-warning)">${Utils.formatCurrency(result.totalInterest)}</span>
            </div>
            <div class="summary-row">
              <span class="label">ยอดรวมเงินต้น + ดอกเบี้ย</span>
              <span class="value">${Utils.formatCurrency(result.totalPaid)}</span>
            </div>
          </div>

          <details style="background:var(--bg-tertiary); border-radius:var(--border-radius); overflow:hidden; border: 1px solid rgba(255,255,255,0.05);">
            <summary style="padding:var(--space-md); cursor:pointer; font-weight:600; color:var(--text-accent); display:flex; align-items:center; justify-content:space-between; list-style:none;">
               <span>📅 ตารางผ่อนชำระแบบละเอียด</span>
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(90deg); transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div style="padding:0 var(--space-md) var(--space-md);">
              <div style="overflow-x:auto;">
                <table class="amort-table" style="width:100%;">
                  <thead>
                    <tr>
                      <th style="text-align:center">งวด</th>
                      <th>ค่างวด</th>
                      <th>ดอกเบี้ย</th>
                      <th>เงินต้น</th>
                      <th>ยอดคงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${scheduleRows.map(s => `
                      <tr>
                        <td style="text-align:center">${s.month}</td>
                        <td data-label="ค่างวด">${Utils.formatNumber(s.payment)}</td>
                        <td data-label="ดอกเบี้ย" style="color:var(--text-warning)">${Utils.formatNumber(s.interest)}</td>
                        <td data-label="เงินต้น" style="color:var(--text-success)">${Utils.formatNumber(s.principal)}</td>
                        <td data-label="ยอดคงเหลือ">${Utils.formatNumber(s.balance)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ${result.schedule.length > 60 ? `<p style="color:var(--text-tertiary);font-size:var(--font-size-xs);margin-top:var(--space-sm);text-align:center;">แสดง 60 งวดแรกจากทั้งหมด ${result.schedule.length} งวด</p>` : ''}
              <div style="text-align:center; padding:10px; opacity:0.5; font-size:10px;">* ข้อมูลนี้เป็นการคาดการณ์เบื้องต้นเพื่อใช้ในการวางแผนเท่านั้น</div>
            </div>
          </details>
      </div>
    `;
  } else {
    scheduleHtml = `
      <div style="margin-top:20px; padding:20px; text-align:center; background:var(--bg-tertiary); border-radius:var(--border-radius); color:var(--text-tertiary);">
        <p style="margin:0; font-size:var(--font-size-sm);">⚠️ ไม่สามารถแสดงตารางผ่อนชำระได้</p>
        <p style="margin:5px 0 0; font-size:var(--font-size-xs); opacity:0.7;">กรุณาระบุมูลค่า "ยอดผ่อนชำระต่อเดือน" ในเมนูแก้ไขเพื่อคำนวณ</p>
      </div>
    `;
  }

  // Payment history
  let paymentHtml = '';
  if (payments.length > 0) {
    paymentHtml = `
      <div style="margin-top:20px; color:var(--text-accent);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span>💰</span>
              <h4 style="margin:0;">ประวัติการชำระ</h4>
          </div>
          
          <div class="receipt-content" style="width:100%; max-width:none; padding:15px; margin:0; background:#f5e6ca; color:#333; box-shadow:none; border-radius:4px;">
              <div style="text-align:center; font-family:'Courier Prime', 'Inconsolata', monospace; font-weight:bold; font-size:16px; margin-bottom:12px; border-bottom:1px dashed #999; padding-bottom:10px;">
                  รายการชำระเงิน
              </div>
              
              <div class="table-responsive">
                <table style="width:100%; font-family:'Inconsolata', monospace; font-size:13px; border-collapse:collapse; min-width:320px;">
                  <thead>
                      <tr style="border-bottom:1px dashed #999;">
                          <th style="text-align:left; padding:5px;">วันที่</th>
                          <th style="text-align:right; padding:5px;">ยอดชำระ</th>
                          <th style="text-align:right; padding:5px;">ดอกเบี้ย</th>
                          <th style="text-align:right; padding:5px;">เงินต้น</th>
                          <th style="text-align:right; padding:5px;">คงเหลือ</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${payments.map(p => `
                          <tr style="">
                              <td style="padding:5px;">${Utils.formatDateShort(p.date)}</td>
                              <td style="text-align:right; padding:5px;">${Utils.formatCurrency(p.amount).replace(' ฿', '')}</td>
                              <td style="text-align:right; padding:5px; color:#c62828;">${Utils.formatCurrency(p.interestPortion).replace(' ฿', '')}</td>
                              <td style="text-align:right; padding:5px; color:#2e7d32;">${Utils.formatCurrency(p.principalPortion).replace(' ฿', '')}</td>
                              <td style="text-align:right; padding:5px;">${Utils.formatCurrency(p.balanceAfter).replace(' ฿', '')}</td>
                          </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
              <div style="border-top:1px dashed #999; margin-top:12px; padding-top:10px; text-align:center; font-family:'Inconsolata', monospace; font-size:12px; opacity:0.8;">
                  *** END OF HISTORY ***
              </div>
          </div>
      </div>
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
        <div class="summary-row"><span class="label">หลือ</span><span class="value" style="color:var(--text-accent)">${Utils.formatCurrency(debt.currentBalance > 0 ? debt.currentBalance - debt.principal + debt.principal : 0)}</span></div>
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
    ${botInfoHtml}
    ${paymentHtml}
    ${scheduleHtml}
  `;

  document.getElementById('detailModal').classList.add('active');
}

async function refreshDebts() {
  const allDebts = await DebtModule.getAll();
  const container = document.getElementById('debtsContainer');
  const filter = document.getElementById('debtFilter').value;
  const sort = document.querySelector('.sort-btn.active').dataset.sort;

  // 1. Filter
  let debts = allDebts;
  if (filter !== 'all') {
    debts = allDebts.filter(d => d.type === filter);
  }

  // 2. Sort
  debts.sort((a, b) => {
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;

    if (sort === 'avalanche') return b.annualRate - a.annualRate; // High interest first
    if (sort === 'snowball') return a.currentBalance - b.currentBalance; // Low balance first
    return a.name.localeCompare(b.name);
  });

  // Calculate Total Monthly Payment (Active Debts)
  let maxMonths = 0;
  const totalMonthly = allDebts
    .filter(d => d.status === 'active')
    .reduce((sum, d) => {
      const payment = d.monthlyPayment || d.minPayment || 0;
      const paymentAmountForCalc = payment || (d.type === 'credit_card' ? InterestEngine.calculateMinPayment(d.currentBalance, 'credit_card') : 0);

      if (paymentAmountForCalc > 0) {
        let result;
        if (d.type === 'credit_card') {
          result = InterestEngine.generateCreditCardSchedule(d.currentBalance, d.annualRate, d.monthlyPayment || 0, d.startDate);
        } else if (d.interestType === 'daily_accrual') {
          result = InterestEngine.generateDailyAccrualSchedule(d.currentBalance, d.annualRate, paymentAmountForCalc, d.startDate);
        } else if (d.interestType === 'fixed_rate') {
          result = InterestEngine.generateFixedRateSchedule(d.principal, d.annualRate, paymentAmountForCalc);
        } else {
          result = InterestEngine.generateAmortizationSchedule(d.currentBalance, d.annualRate, paymentAmountForCalc);
        }
        if (result && result.totalMonths > maxMonths) maxMonths = result.totalMonths;
      }
      return sum + paymentAmountForCalc;
    }, 0);

  const totalMonthlyEl = document.getElementById('totalMonthlyPayment');
  if (totalMonthlyEl) totalMonthlyEl.textContent = amountsVisible ? Utils.formatCurrency(totalMonthly) : '••••••';

  const payoffEl = document.getElementById('estimatedPayoffDate');
  if (payoffEl) {
    if (maxMonths > 0) {
      const payoffDate = Utils.addMonths(new Date(), maxMonths);
      payoffEl.textContent = amountsVisible ? Utils.formatMonthYear(payoffDate) : '••••••';
    } else {
      payoffEl.textContent = '-';
    }
  }

  if (debts.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>ไม่พบรายการหนี้สินตามเงื่อนไข</p></div>`;
    return;
  }

  // 3. Grouping
  const groups = {
    credit_card: { title: '💳 บัตรเครดิต (หมุนเวียน)', items: [], sum: 0 },
    personal_loan: { title: '🏦 สินเชื่อ / ผ่อนชำระ', items: [], sum: 0 },
    paid: { title: '✅ ชำระหมดแล้ว', items: [], sum: 0 }
  };

  debts.forEach(d => {
    if (d.status === 'paid') {
      groups.paid.items.push(d);
      groups.paid.sum += d.principal;
    } else if (d.type === 'credit_card') {
      groups.credit_card.items.push(d);
      groups.credit_card.sum += d.currentBalance;
    } else {
      groups.personal_loan.items.push(d); // Includes vehicle loans
      groups.personal_loan.sum += d.currentBalance;
    }
  });

  // 4. Render
  let html = '';

  const renderGroup = (key, group, isdetails = false) => {
    if (group.items.length === 0) return '';

    const listHtml = group.items.map(d => {
      const paid = d.principal - d.currentBalance;
      const paidPct = d.principal > 0 ? Utils.percentage(paid, d.principal) : 100;
      const paymentAmount = d.monthlyPayment || d.minPayment || 0;

      // 4.1 Calculate Quick Prediction for this item
      let predictionSummaryHtml = '';
      const paymentAmountForCalc = paymentAmount || (d.type === 'credit_card' ? InterestEngine.calculateMinPayment(d.currentBalance, 'credit_card') : 0);

      if (paymentAmountForCalc > 0) {
        let result;
        if (d.type === 'credit_card') {
          result = InterestEngine.generateCreditCardSchedule(d.currentBalance, d.annualRate, d.monthlyPayment || 0, d.startDate);
        } else if (d.interestType === 'daily_accrual') {
          result = InterestEngine.generateDailyAccrualSchedule(d.currentBalance, d.annualRate, paymentAmountForCalc, d.startDate);
        } else if (d.interestType === 'fixed_rate') {
          result = InterestEngine.generateFixedRateSchedule(d.principal, d.annualRate, paymentAmountForCalc);
        } else {
          result = InterestEngine.generateAmortizationSchedule(d.currentBalance, d.annualRate, paymentAmountForCalc);
        }

        predictionSummaryHtml = `
          <div class="debt-detail-item" style="grid-column: 1 / -1; margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
            <div class="label" style="color: var(--text-warning); margin-bottom: 4px;">🎯 คาดการณ์การผ่อน</div>
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-md); font-size: var(--font-size-sm); color: var(--text-secondary);">
              <div style="display:flex; flex-direction:column;">
                <span style="font-size:var(--font-size-xs); text-transform:uppercase; opacity:0.6;">ระยะเวลา</span>
                <span class="value" style="color:var(--text-success)">${result.totalMonths} เดือน</span>
              </div>
              <div style="display:flex; flex-direction:column;">
                <span style="font-size:var(--font-size-xs); text-transform:uppercase; opacity:0.6;">ดอกเบี้ยรวม</span>
                <span class="value">${Utils.formatCurrency(result.totalInterest)}</span>
              </div>
              <div style="display:flex; flex-direction:column; margin-left:auto; text-align:right;">
                <span style="font-size:var(--font-size-xs); text-transform:uppercase; opacity:0.6;">หมดหนี้ประมาณ</span>
                <span class="value" style="font-weight:bold;">${Utils.formatMonthYear(Utils.addMonths(new Date(), result.totalMonths))}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        predictionSummaryHtml = `
          <div class="debt-detail-item" style="grid-column: 1 / -1; margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 10px; color: var(--text-tertiary); font-size: var(--font-size-xs); text-align: center;">
            💡 ระบุยอดผ่อนชำระต่อเดือนเพื่อดูคาดการณ์วันหมดหนี้
          </div>
        `;
      }

      return `
        <div class="debt-item" data-id="${d.id}">
          <div class="debt-item-main" onclick="this.nextElementSibling.toggleAttribute('open')">
            <div class="debt-item-info">
              <div class="debt-item-name">
                ${d.name || 'หนี้สินที่ไม่มีชื่อ'}
                <span class="badge" style="font-size: 10px; opacity: 0.8; background: var(--bg-tertiary);">${Utils.debtTypeName(d.type)}</span>
              </div>
              <div class="debt-item-meta">
                <span>ดอกเบี้ย ${d.annualRate}%</span>
                <span>•</span>
                <span>จ่ายรายเดือน ~${Utils.formatCurrency(paymentAmountForCalc)}</span>
              </div>
            </div>
            
            <div class="debt-item-balance">
              <div style="text-align: right;">
                <span class="label">คงเหลือ</span>
                <span class="amount">${Utils.formatCurrency(d.currentBalance)}</span>
              </div>
              <div class="debt-item-actions">
                 <button class="btn btn-sm btn-success pay-debt" data-id="${d.id}" onclick="event.stopPropagation()">
                   ชำระ
                 </button>
              </div>
            </div>

            <!-- Subtle Progress Bar at Bottom -->
            <div class="progress-bar" style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.03); border-radius: 0;">
               <div class="progress-fill ${paidPct > 70 ? 'success' : ''}" style="width:${paidPct}%; height: 100%; border-radius: 0;"></div>
            </div>
          </div>
          
          <details class="debt-item-details">
            <summary style="display:none"></summary>
            
            <div class="debt-detail-item">
              <div class="label">เงินต้นตั้งต้น</div>
              <div class="value">${Utils.formatCurrency(d.principal)}</div>
            </div>
            <div class="debt-detail-item">
              <div class="label">วิธีคิดดอกเบี้ย</div>
              <div class="value">${Utils.interestTypeName(d.interestType)}</div>
            </div>
            
            ${predictionSummaryHtml}

            <div class="debt-item-actions" style="grid-column: 1 / -1; display:flex; gap:8px; margin-top:12px; border-top: 1px solid var(--border-color); padding-top:12px; justify-content: flex-start;">
               <button class="btn btn-sm detail-debt" data-id="${d.id}" style="background: var(--bg-tertiary);">📋 ตารางผ่อน & ประวัติ</button>
               <button class="btn btn-sm btn-icon export-single-pdf" data-id="${d.id}" title="Export PDF">📄</button>
               <button class="btn btn-sm btn-icon edit-debt" data-id="${d.id}" title="แก้ไข">✏️</button>
               <button class="btn btn-sm btn-icon btn-danger delete-debt" data-id="${d.id}" title="ลบ">🗑️</button>
            </div>
          </details>
        </div>
      `;
    }).join('');


    const headerHtml = `
      <div class="debt-group-header">
         <div class="debt-group-title">
            ${group.title} 
            <span style="font-size:0.7em; opacity:0.6; font-weight:normal;">(${group.items.length})</span>
         </div>
         <div class="debt-group-sum">${Utils.formatCurrency(group.sum)}</div>
      </div>
    `;

    if (isdetails) {
      return `
        <details class="debt-group" style="margin-top:40px; opacity:0.7;">
          <summary style="cursor:pointer; font-weight:bold; color:var(--text-accent); margin-bottom:10px;">${group.title} (${group.items.length})</summary>
          ${listHtml}
        </details>
      `;
    }

    return `<div class="debt-group">${headerHtml}${listHtml}</div>`;
  };

  html += renderGroup('credit_card', groups.credit_card);
  html += renderGroup('personal_loan', groups.personal_loan);
  html += renderGroup('paid', groups.paid, true); // Render paid as details

  container.innerHTML = html;

  // Event listeners delegated
  container.querySelectorAll('.pay-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => d.id === parseInt(btn.dataset.id));
      if (debt) openPaymentModal(debt);
    });
  });

  container.querySelectorAll('.detail-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => d.id === parseInt(btn.dataset.id));
      if (debt) showDebtDetail(debt);
    });
  });

  container.querySelectorAll('.edit-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => d.id === parseInt(btn.dataset.id));
      if (debt) openDebtModal(debt);
    });
  });

  container.querySelectorAll('.export-single-pdf').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const debt = allDebts.find(d => d.id === parseInt(btn.dataset.id));
      if (debt) {
        const payments = await DebtModule.getPayments(debt.id);
        const debtWithPayments = { ...debt, payments };

        // Generate schedule for PDF
        const paymentAmountForCalc = debt.monthlyPayment || (debt.type === 'credit_card' ? InterestEngine.calculateMinPayment(debt.currentBalance, 'credit_card') : 0);
        let schedule = null;
        if (paymentAmountForCalc > 0) {
          if (debt.type === 'credit_card') {
            schedule = InterestEngine.generateCreditCardSchedule(debt.currentBalance, debt.annualRate, debt.monthlyPayment || 0, debt.startDate);
          } else if (debt.interestType === 'daily_accrual') {
            schedule = InterestEngine.generateDailyAccrualSchedule(debt.currentBalance, debt.annualRate, paymentAmountForCalc, debt.startDate);
          } else if (debt.interestType === 'fixed_rate') {
            schedule = InterestEngine.generateFixedRateSchedule(debt.principal, debt.annualRate, paymentAmountForCalc);
          } else {
            schedule = InterestEngine.generateAmortizationSchedule(debt.currentBalance, debt.annualRate, paymentAmountForCalc);
          }
        }

        Utils.exportSingleDebtToPDF(debtWithPayments, schedule);
      }
    });
  });

  container.querySelectorAll('.delete-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('คุณต้องการลบหนี้นี้และประวัติการชำระทั้งหมด?')) {
        await DebtModule.delete(parseInt(btn.dataset.id));
        Utils.showToast('ลบหนี้สำเร็จ', 'success');
        refreshDebts(); // Refresh without reloading page
      }
    });
  });
}
