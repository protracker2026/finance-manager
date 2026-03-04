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
        <div class="value-huge" id="totalDebtValue" style="color: var(--text-danger-soft);">${formatValue(summary.totalDebt)}</div>
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
          <span class="metric-value" id="totalInterestPaidValue" style="color: var(--text-danger-soft);">${Utils.formatCurrency(summary.totalInterestPaid)}</span>
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
              <input type="date" class="form-input" id="debtStartDate" value="${Utils.today().split('T')[0]}" required>
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
              <input type="text" class="form-input" id="paymentAmount" inputmode="decimal" required>
              <small id="paymentAmountHint" style="color: var(--text-tertiary); font-size: 11px; margin-top: 4px; display: block; opacity: 0.7;"></small>
            </div>
            <div class="form-group">
              <label class="form-label">วันที่ชำระ</label>
              <input type="date" class="form-input" id="paymentDate" value="${Utils.today().split('T')[0]}" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">หมายเหตุ</label>
            <textarea class="form-textarea" id="paymentNote" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="paymentCancelBtn">ยกเลิก</button>
          <button class="btn btn-danger" id="paymentDeleteBtn" style="display:none; margin-right:auto;">🗑️ ลบ</button>
          <button class="btn btn-success" id="paymentSaveBtn">บันทึกการชำระ</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" id="detailModal">
      <div class="modal" style="width:100%; height:100%; max-width:100%; max-height:100%; border-radius:0; display:flex; flex-direction:column;">
        <div class="modal-header">
          <h3 id="detailTitle">รายละเอียดหนี้</h3>
          <button class="modal-close" id="detailModalClose">&times;</button>
        </div>
        <div class="modal-body" id="detailBody" style="flex:1; overflow-y:auto; padding:var(--space-md); position:relative;"></div>
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
  document.getElementById('paymentDeleteBtn').addEventListener('click', () => {
    const paymentId = document.getElementById('paymentId').value;
    const debtId = document.getElementById('paymentDebtId').value;
    if (paymentId) deletePayment(paymentId, debtId);
  });

  document.getElementById('detailModalClose').addEventListener('click', closeDetailModal);
  document.getElementById('detailModal').addEventListener('click', e => { if (e.target.id === 'detailModal') closeDetailModal(); });

  // Initialize Flatpickr for date inputs to force DD/MM/YYYY format globally
  if (typeof flatpickr !== 'undefined') {
    flatpickr("#debtStartDate", {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      disableMobile: true,
      locale: "th"
    });
    flatpickr("#paymentDate", {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      disableMobile: true,
      locale: "th"
    });
  }

  // === Removed event delegation in favor of inline onclick ===

  // === Smart Auto-fill ตามประเภทหนี้ (ธปท.) ===
  document.getElementById('debtType').addEventListener('change', (e) => {
    const type = e.target.value;
    const config = InterestEngine.getBOTConfig(type);
    // Auto-set interest type
    document.getElementById('debtInterestType').value = config.method;
    // Auto-set max rate as default
    document.getElementById('debtRate').value = config.maxRate;
    validateRateInput();
    autoCalcMinPayment();
  });

  // === Rate validation on input ===
  document.getElementById('debtRate').addEventListener('input', validateRateInput);

  // === Auto-calc min payment when principal or balance changes ===
  function autoCalcMinPayment() {
    const type = document.getElementById('debtType').value;
    const balance = parseFloat(document.getElementById('debtCurrentBalance').value)
      || parseFloat(document.getElementById('debtPrincipal').value) || 0;
    if (balance > 0) {
      const minPay = InterestEngine.calculateMinPayment(balance, type);
      if (minPay > 0) {
        document.getElementById('debtMinPayment').value = minPay.toFixed(2);
      }
    }
  }

  document.getElementById('debtPrincipal').addEventListener('input', autoCalcMinPayment);
  document.getElementById('debtCurrentBalance').addEventListener('input', autoCalcMinPayment);

  // === Sort & Filter Events ===
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clickedBtn = e.currentTarget;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      clickedBtn.classList.add('active');
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
      await DebtModule.update(id, data);
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

function openPaymentModal(debt, payment = null) {
  const modal = document.getElementById('paymentModal');
  const title = document.getElementById('paymentModalTitle') || modal.querySelector('h3');
  const deleteBtn = document.getElementById('paymentDeleteBtn');

  document.getElementById('paymentDebtId').value = debt.id;
  document.getElementById('paymentDebtName').textContent = debt.name;

  // Ensure we have a hidden input for paymentId
  let paymentIdEl = document.getElementById('paymentId');
  if (!paymentIdEl) {
    paymentIdEl = document.createElement('input');
    paymentIdEl.type = 'hidden';
    paymentIdEl.id = 'paymentId';
    document.getElementById('paymentForm') ? document.getElementById('paymentForm').appendChild(paymentIdEl) : modal.querySelector('.modal-body').appendChild(paymentIdEl);
  }

  if (payment) {
    if (title) title.textContent = 'แก้ไขประวัติชำระ';
    paymentIdEl.value = payment.id;
    document.getElementById('paymentAmount').value = payment.amount;
    document.getElementById('paymentDate').value = payment.date;
    document.getElementById('paymentNote').value = payment.note || '';
    if (deleteBtn) deleteBtn.style.display = 'inline-block';
  } else {
    if (title) title.textContent = 'บันทึกการชำระ';
    paymentIdEl.value = '';

    // Set blank default but show watermarked hint
    document.getElementById('paymentAmount').value = '';
    const expected = parseFloat(debt.monthlyPayment) || 0;
    const minPay = parseFloat(debt.minPayment) || 0;

    const hintEl = document.getElementById('paymentAmountHint');
    if (hintEl) {
      let hintText = [];
      if (expected > 0) hintText.push(`ยอดชำระคาดการณ์: ${Utils.formatCurrency(expected).replace(' ฿', '')}`);
      if (minPay > 0) hintText.push(`ขั้นต่ำ: ${Utils.formatCurrency(minPay).replace(' ฿', '')}`);

      if (hintText.length > 0) {
        hintEl.textContent = `* ${hintText.join(' | ')}`;
        // Optional: Click to auto-fill the highest realistic amount
        hintEl.style.cursor = 'pointer';
        hintEl.onclick = () => document.getElementById('paymentAmount').value = expected > 0 ? expected : minPay;
      } else {
        hintEl.textContent = '';
      }
    }

    // Update Flatpickr instance if it exists, otherwise fallback to standard value
    const dateInput = document.getElementById('paymentDate');
    if (dateInput._flatpickr) {
      dateInput._flatpickr.setDate(Utils.today().split('T')[0]);
    } else {
      dateInput.value = Utils.today().split('T')[0];
    }

    document.getElementById('paymentNote').value = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  modal.classList.add('active');
}

// Global function to be called from inline onclick for toggling expanding rows
window.toggleDebtItem = function (element) {
  const item = element.closest('.debt-item');
  if (!item) return;
  const details = item.querySelector('.debt-item-details');
  details.toggleAttribute('open');
  if (details.hasAttribute('open')) {
    setTimeout(() => {
      item.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
}

// Global function to be called from inline onclick in payment history table
window.editPayment = function (paymentId, debtId) {
  console.log("editPayment called with:", paymentId, debtId);
  if (!debtId || !paymentId) {
    Utils.showToast("Error: Missing ID data", "error");
    return;
  }

  DebtModule.getPayments(debtId).then(payments => {
    const payment = payments.find(p => String(p.id) === String(paymentId));
    if (payment) {
      const debtObj = { id: debtId, name: document.getElementById('detailTitle').textContent };
      openPaymentModal(debtObj, payment);
    } else {
      console.error("Payment not found in DB!");
      Utils.showToast("ไม่พบข้อมูลการชำระเงินนี้ในระบบ", "error");
    }
  }).catch(err => {
    console.error("Error fetching payments", err);
    Utils.showToast("เกิดข้อผิดพลาดในการดึงข้อมูล", "error");
  });
};

async function savePayment() {
  const debtId = document.getElementById('paymentDebtId').value;
  const paymentId = document.getElementById('paymentId') ? document.getElementById('paymentId').value : null;

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
    if (paymentId) {
      await DebtModule.updatePayment(paymentId, data);
      Utils.showToast('แก้ไขการชำระสำเร็จ', 'success');
    } else {
      await DebtModule.recordPayment(debtId, data);
      Utils.showToast('บันทึกการชำระสำเร็จ', 'success');
    }
    closePaymentModal();
    await refreshDebts();

    // If detail modal is open, refresh it
    const detailModal = document.getElementById('detailModal');
    if (detailModal.classList.contains('active')) {
      const debt = await DebtModule.getById(debtId);
      if (debt) showDebtDetail(debt);
    }
  } catch (e) {
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  }
}

async function deletePayment(paymentId, debtId) {
  if (!confirm('ยืนยันการลบประวัติการชำระนี้? \nระบบจะคำนวณยอดคงเหลือใหม่ทั้งหมด')) return;

  try {
    await DebtModule.deletePayment(paymentId);
    Utils.showToast('ลบประวัติการชำระสำเร็จ', 'success');

    // Refresh UI
    await refreshDebts();
    const debt = await DebtModule.getById(debtId);
    if (debt) showDebtDetail(debt);
  } catch (e) {
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  }
}

async function showDebtDetail(debt, scrollToHistory = false) {
  const payments = await DebtModule.getPayments(debt.id);
  const paid = debt.principal - debt.currentBalance;
  const paidPct = Utils.percentage(paid, debt.principal);

  // === BOT Info Section ===
  const botConfig = InterestEngine.getBOTConfig(debt.type);
  const rateValidation = InterestEngine.validateRate(debt.annualRate, debt.type);
  const botInfoHtml = `
    <details style="background:var(--bg-tertiary); border-radius:var(--border-radius); margin-bottom:var(--space-md); border:1px solid rgba(255,255,255,0.05);">
      <summary style="padding:var(--space-md); cursor:pointer; font-weight:600; color:var(--text-accent); display:flex; align-items:center; justify-content:space-between; list-style:none;">
         <span style="display:flex; align-items:center; gap:6px;"><span>📜</span> ข้อมูลตามหลัก ธปท.</span>
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </summary>
      <div style="padding: 0 var(--space-md) var(--space-md) var(--space-md);">
        <div style="border:1px solid var(--border-color); border-radius:4px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tbody>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); width:40%; border-right:1px solid var(--border-color);">วิธีคิดดอกเบี้ย</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${botConfig.description}</td>
              </tr>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">เพดาน ธปท.</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${botConfig.maxRate}% ต่อปี</td>
              </tr>
              <tr>
                <td style="padding:10px; ${botConfig.minPaymentPct ? 'border-bottom:1px solid var(--border-color);' : ''} color:var(--text-secondary); border-right:1px solid var(--border-color);">สถานะอัตรา</td>
                <td style="padding:10px; ${botConfig.minPaymentPct ? 'border-bottom:1px solid var(--border-color);' : ''} font-weight:600; text-align:right; color:${rateValidation.isOverLimit ? 'var(--text-danger)' : 'var(--text-success)'};">${rateValidation.message}</td>
              </tr>
              ${botConfig.minPaymentPct ? `
              <tr>
                <td style="padding:10px; color:var(--text-secondary); border-right:1px solid var(--border-color);">ชำระขั้นต่ำปัจจุบัน (${botConfig.minPaymentPct}%)</td>
                <td style="padding:10px; font-weight:600; text-align:right; color:var(--text-warning);">${Utils.formatCurrency(InterestEngine.calculateMinPayment(parseFloat(debt.currentBalance) || 0, debt.type))}</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  `;

  // Generate schedule
  let scheduleHtml = '';
  const safePrincipal = parseFloat(debt.principal) || 0;
  const safeBalance = parseFloat(debt.currentBalance) || safePrincipal;
  const safeRate = parseFloat(debt.annualRate) || 0;
  const paymentForSchedule = parseFloat(debt.monthlyPayment) || parseFloat(debt.minPayment) || 0;

  if (paymentForSchedule > 0) {
    let result;
    if (debt.type === 'credit_card') {
      // ใช้ตารางบัตรเครดิตเฉพาะ (daily accrual + dynamic min payment)
      result = InterestEngine.generateCreditCardSchedule(
        safeBalance, safeRate, paymentForSchedule, debt.startDate || Utils.today());
    } else if (debt.interestType === 'daily_accrual') {
      result = InterestEngine.generateDailyAccrualSchedule(
        safeBalance, safeRate, paymentForSchedule, debt.startDate || Utils.today());
    } else if (debt.interestType === 'fixed_rate') {
      // Use principal as the base for flat rate calc
      result = InterestEngine.generateFixedRateSchedule(
        safePrincipal, safeRate, paymentForSchedule);
    } else {
      result = InterestEngine.generateAmortizationSchedule(
        safeBalance, safeRate, paymentForSchedule);
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
        <p style="margin:0; font-size:var(--font-size-sm);">ℹ️ ไม่สามารถคำนวณตารางคาดการณ์ได้</p>
        <p style="margin:5px 0 0; font-size:var(--font-size-xs); opacity:0.7;">ระบบจำเป็นต้องทราบ "ค่างวด หรือ จ่ายขั้นต่ำ" เพื่อจำลองตารางล่วงหน้า<br>หากค่างวดไม่ตายตัว สามารถข้ามกล่องนี้และบันทึกประวัติจ่ายจริงได้เลย</p>
      </div>
    `;
  }

  // Payment history
  let paymentHtml = '';
  if (payments.length > 0) {
    paymentHtml = `
      <div id="paymentHistorySection" style="margin-top:20px; color:var(--text-accent);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span>💰</span>
              <h4 style="margin:0;">ประวัติการชำระ</h4>
          </div>
          
          <div class="receipt-content" style="width:100%; max-width:none; padding:15px; margin:0; background:#f5e6ca; color:#333; box-shadow:none; border-radius:8px;">
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
                          <tr class="clickable-payment-row" onclick="window.editPayment('${p.id}', '${debt.id}')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">
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
    <!-- Account & Financial Table Frame -->
    <div style="background:var(--bg-tertiary); border-radius:var(--border-radius); padding:var(--space-md); margin-bottom:var(--space-lg); border:1px solid rgba(255,255,255,0.05);">
        <h4 style="margin: 0 0 12px 0; color:var(--text-accent); font-size:16px; display:flex; align-items:center; gap:6px;"><span>📋</span> ข้อมูลบัญชีและยอดหนี้</h4>
        
        <div style="border:1px solid var(--border-color); border-radius:4px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tbody>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); width:40%; border-right:1px solid var(--border-color);">ประเภท</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${Utils.debtTypeName(debt.type)}</td>
              </tr>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">อัตราดอกเบี้ย</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${debt.annualRate}% ต่อปี <div style="font-size:12px; font-weight:normal; opacity:0.8; margin-top:2px;">(${Utils.interestTypeName(debt.interestType)})</div></td>
              </tr>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">วันที่เริ่มสัญญา</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${Utils.formatDate(debt.startDate)}</td>
              </tr>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">เงินต้นเริ่มแรก</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${Utils.formatCurrency(debt.principal)}</td>
              </tr>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">ค่างวด (ต่อเดือน)</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${Utils.formatCurrency(debt.monthlyPayment || 0)}</td>
              </tr>
              ${debt.type === 'credit_card' ? `
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">ชำระขั้นต่ำ (ประเมิน)</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right; color:var(--text-warning);">${Utils.formatCurrency(debt.minPayment || 0)}</td>
              </tr>` : ''}
              <tr style="background: rgba(220, 53, 69, 0.05);">
                <td style="padding:12px 10px; border-bottom:none; font-weight:600; color:var(--text-primary); border-right:1px solid var(--border-color);">ยอดคงเหลือ (ล่าสุด)</td>
                <td style="padding:12px 10px; border-bottom:none; font-weight:bold; color:var(--text-danger); font-size:16px; text-align:right;">${Utils.formatCurrency(debt.currentBalance)}</td>
              </tr>
            </tbody>
          </table>
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
    ${botInfoHtml}
  `;

  document.getElementById('detailModal').classList.add('active');
  document.getElementById('paymentDebtId').value = debt.id;

  if (scrollToHistory) {
    setTimeout(() => {
      const historyEl = document.getElementById('paymentHistorySection');
      if (historyEl) historyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
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
    priority: { title: '🎯 ลำดับการชำระ (Priority)', items: [], sum: 0 },
    credit_card: { title: '💳 บัตรเครดิต (หมุนเวียน)', items: [], sum: 0 },
    personal_loan: { title: '🏦 สินเชื่อ / ผ่อนชำระ', items: [], sum: 0 },
    paid: { title: '✅ ชำระหมดแล้ว', items: [], sum: 0 }
  };

  const isPrioritySort = (sort === 'avalanche' || sort === 'snowball');

  debts.forEach(d => {
    if (d.status === 'paid') {
      groups.paid.items.push(d);
      groups.paid.sum += d.principal;
    } else if (isPrioritySort && filter === 'all') {
      // Global priority group
      groups.priority.items.push(d);
      groups.priority.sum += d.currentBalance;
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

      // Dynamic color based on repayment progress (Text only)
      let statusColor = '#ef4444'; // 0-25% (Vibrant Red)
      if (paidPct >= 90) statusColor = '#22c55e';      // 90%+ (Green)
      else if (paidPct >= 75) statusColor = '#4ade80'; // 75-90% (Light Green)
      else if (paidPct >= 50) statusColor = '#fcd34d'; // 50-75% (Yellow)
      else if (paidPct >= 25) statusColor = '#fb923c'; // 25-50% (Orange)

      return `
        <div class="debt-item" data-id="${d.id}" style="padding: 16px; position: relative; cursor: pointer; transition: all 0.2s ease;">
          <div class="debt-item-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;" onclick="window.toggleDebtItem(this)">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 16px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.name || 'หนี้สินที่ไม่มีชื่อ'}</span>
                <span class="badge" style="font-size: 10px; background: rgba(255,255,255,0.05); color: var(--text-tertiary); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;">${Utils.debtTypeName(d.type)}</span>
              </div>
              <div style="font-size: 12px; color: var(--text-tertiary); display: flex; gap: 8px; align-items: center;">
                <span>ดอกเบี้ย ${d.annualRate}%</span>
                <span style="opacity: 0.3;">•</span>
                <span>จ่าย ~${Utils.formatCurrency(paymentAmountForCalc).replace(' ฿', '')}</span>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">คงเหลือ</div>
              <div style="font-size: 18px; font-weight: 700; color: ${statusColor}; letter-spacing: -0.5px;">${Utils.formatCurrency(d.currentBalance)}</div>
            </div>
          </div>

          <div class="progress-container" style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-bottom: 0;" onclick="window.toggleDebtItem(this)">
            <div class="progress-fill" style="width: ${paidPct}%; height: 100%; background: ${statusColor}; border-radius: 2px; opacity: 0.6; transition: width 0.8s ease;"></div>
          </div>
          
          <details class="debt-item-details" style="margin-top: 0; border-top: none;">
            <summary style="display:none"></summary>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px;">เงินต้นตั้งต้น</div>
                <div style="font-size: 14px; font-weight: 500;">${Utils.formatCurrency(d.principal)}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px;">วิธีคิดดอกเบี้ย</div>
                <div style="font-size: 14px; font-weight: 500;">${Utils.interestTypeName(d.interestType)}</div>
              </div>
            </div>

            ${predictionSummaryHtml}

            <div style="display: flex; gap: 8px; margin-top: 20px;">
              <button class="btn btn-primary pay-debt" data-id="${d.id}" style="flex: 2; height: 38px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                 ชำระเงิน
              </button>
              <button class="btn edit-history-btn" data-id="${d.id}" style="flex: 1; height: 38px; font-size: 12px; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.1);">
                แก้ไขล่าสุด
              </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
              <button class="btn btn-sm detail-debt" data-id="${d.id}" style="background: none; padding: 0; color: var(--text-accent); font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                ตารางผ่อน & ประวัติ
              </button>
              
              <div style="display: flex; gap: 12px;">
                <button class="export-single-pdf" data-id="${d.id}" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; padding:4px;" title="Export PDF">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="edit-debt" data-id="${d.id}" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; padding:4px;" title="แก้ไข">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="delete-debt" data-id="${d.id}" style="background:none; border:none; color:var(--text-danger-soft); cursor:pointer; padding:4px;" title="ลบ">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
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

  html += renderGroup('priority', groups.priority);
  html += renderGroup('credit_card', groups.credit_card);
  html += renderGroup('personal_loan', groups.personal_loan);
  html += renderGroup('paid', groups.paid, true); // Render paid as details

  container.innerHTML = html;

  // Event listeners delegated
  container.querySelectorAll('.pay-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => String(d.id) === String(btn.dataset.id));
      if (debt) openPaymentModal(debt);
    });
  });

  container.querySelectorAll('.detail-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => String(d.id) === String(btn.dataset.id));
      if (debt) showDebtDetail(debt, false); // No scroll
    });
  });

  container.querySelectorAll('.edit-history-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => String(d.id) === String(btn.dataset.id));
      if (debt) {
        const payments = await DebtModule.getPayments(debt.id);
        if (payments && payments.length > 0) {
          // getPayments returns ascending date order, so last is newest
          const latestPayment = payments[payments.length - 1];
          openPaymentModal(debt, latestPayment);
        } else {
          Utils.showToast('ไม่มีประวัติการชำระ', 'info');
        }
      }
    });
  });

  container.querySelectorAll('.edit-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => String(d.id) === String(btn.dataset.id));
      if (debt) openDebtModal(debt);
    });
  });

  container.querySelectorAll('.export-single-pdf').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const debt = allDebts.find(d => String(d.id) === String(btn.dataset.id));
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
        await DebtModule.delete(btn.dataset.id);
        Utils.showToast('ลบหนี้สำเร็จ', 'success');
        refreshDebts(); // Refresh without reloading page
      }
    });
  });
}
