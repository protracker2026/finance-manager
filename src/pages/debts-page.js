// Debts Page
import { DebtModule } from '../modules/debts.js';
import { InterestEngine } from '../modules/interest.js';
import { Utils } from '../modules/utils.js';

let amountsVisible = true;
let activeSortOrder = 'avalanche'; // 'avalanche' | 'snowball' | 'smart' | null
let activeGrouping = null; // 'payoffable' | 'installment' | null
let scrollDebounceTimer = null;

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
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <p class="subtitle">ติดตามหนี้บัตรเครดิต สินเชื่อส่วนบุคคล พร้อมคำนวณดอกเบี้ย</p>
          <p style="font-size: 13px; color: #4ade80; font-weight: 500; margin: 0;">${Utils.getDailyDebtEncouragement()}</p>
        </div>
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
        <div class="value-huge" id="totalDebtValue" style="color: #fef08a; text-shadow: 0 0 20px rgba(254, 240, 138, 0.1);">${formatValue(summary.totalDebt)}</div>
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
          <span class="metric-value" id="totalInterestPaidValue" style="color: #fb923c;">${Utils.formatCurrency(summary.totalInterestPaid)}</span>
        </div>
         <div class="metric-item">
          <span class="metric-label">ชำระเงินต้นไปแล้ว</span>
          <span class="metric-value success" id="totalPaidValue">${Utils.formatCurrency(summary.totalPaid)}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">คาดว่าจะหมดหนี้</span>
          <span class="metric-value accent" id="estimatedPayoffDateNew">...</span>
        </div>
      </div>
    </div>

    <!-- Sort & Filter Bar -->
    <div class="debt-sort-bar">
      <div class="debt-sort-controls">
        <span class="label">เรียงตาม:</span>
        <button class="sort-btn ${activeSortOrder === 'avalanche' ? 'active' : ''}" data-sort="avalanche">ดอกเบี้ยสูง</button>
        <button class="sort-btn ${activeSortOrder === 'snowball' ? 'active' : ''}" data-sort="snowball">ยอดน้อย</button>
        <button class="sort-btn ${activeSortOrder === 'smart' ? 'active' : ''}" data-sort="smart">⚡ คุ้มค่าสุด</button>
        <button class="sort-btn ${activeGrouping === 'payoffable' ? 'active' : ''}" data-sort="payoffable">โปะได้</button>
        <button class="sort-btn ${activeGrouping === 'installment' ? 'active' : ''}" data-sort="installment">ดอกเบี้ยแบ่งชำระ</button>
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
            <div class="form-group" style="margin-top: 10px; padding: 12px; background: rgba(74, 222, 128, 0.05); border-radius: 8px; border: 1px dashed rgba(74, 222, 128, 0.2);">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #4ade80; font-weight: 500; font-size: 14px;">
                <input type="checkbox" id="debtAddToIncome" style="width: 18px; height: 18px; cursor: pointer; accent-color: #4ade80;">
                บันทึกเป็นรายรับเดือนนี้ด้วย
              </label>
              <p style="margin: 6px 0 0 28px; font-size: 12px; color: var(--text-tertiary); line-height: 1.4;">
                เงินจะถูกเพิ่มในหน้าแดชบอร์ดเป็น "รายรับ" อัตโนมัติ เพื่อให้ยอดเงินคงเหลือในระบบตรงกับเงินในมือคุณ
              </p>
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
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label">จำนวนเงินที่ชำระ (บาท)</label>
            <input type="number" class="form-input" id="paymentAmount" inputmode="decimal" style="font-size: 24px; font-weight: bold; color: #4ade80; height: 48px;" required>
            <small id="paymentAmountHint" style="color: var(--text-tertiary); font-size: 11px; margin-top: 4px; display: block; opacity: 0.7;"></small>
          </div>
          
          <!-- Contextual Mini What-If Simulation -->
          <div id="paymentWhatIfContainer" style="display: none; margin-bottom: 16px; background: rgba(74, 222, 128, 0.05); border: 1px dashed rgba(74, 222, 128, 0.2); border-radius: 8px; padding: 12px; transition: all 0.3s ease;">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
               <div style="font-size: 11px; font-weight: 600; color: #4ade80;">
                 ✨ ลองจ่ายเพิ่มไหม? (เลื่อนเพื่อเปรียบเทียบ)
               </div>
             </div>
             <div style="position: relative; padding: 4px 0;">
                <input type="range" id="paymentWhatIfSlider" step="10" style="width: 100%; accent-color: #4ade80; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: var(--text-tertiary);">
                  <span id="paymentWhatIfMinValue">...</span>
                  <span id="paymentWhatIfMaxValue">...</span>
                </div>
             </div>
             <div id="paymentWhatIfResult" style="margin-top: 8px;"></div>
          </div>

          <div class="form-group" style="margin-top: 8px;">
            <label class="form-label">วันที่ชำระ</label>
            <input type="date" class="form-input" id="paymentDate" value="${Utils.today().split('T')[0]}" required>
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
    btn.addEventListener('click', async (e) => {
      const sortValue = e.currentTarget.dataset.sort;

      // Group A: Sort order (avalanche / snowball / smart) - toggle or switch
      if (['avalanche', 'snowball', 'smart'].includes(sortValue)) {
        activeSortOrder = (activeSortOrder === sortValue) ? null : sortValue;
      } 
      // Group B: Grouping (payoffable / installment) - toggle or switch
      else if (['payoffable', 'installment'].includes(sortValue)) {
        activeGrouping = (activeGrouping === sortValue) ? null : sortValue;
      }

      // Sync visual state of all buttons
      document.querySelectorAll('.sort-btn').forEach(b => {
        const sv = b.dataset.sort;
        const isActive = (sv === activeSortOrder) || (sv === activeGrouping);
        b.classList.toggle('active', isActive);
      });

      await refreshDebts();
      
      // Scroll only when both sort order AND grouping are selected (pair is complete)
      clearTimeout(scrollDebounceTimer);
      if (activeSortOrder && activeGrouping) {
        scrollDebounceTimer = setTimeout(() => {
          const container = document.getElementById('debtsContainer');
          if (container) {
            const yOffset = -120;
            const y = container.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 400);
      }
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
    const addToIncomeCheck = document.getElementById('debtAddToIncome');
    if (addToIncomeCheck) addToIncomeCheck.checked = false;
  }

  // Show/Hide "Add to Income" based on if it's new or edit
  const incomeRow = document.getElementById('debtAddToIncome')?.closest('.form-group');
  if (incomeRow) {
    incomeRow.style.display = debt ? 'none' : 'block';
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
    note: document.getElementById('debtNote').value,
    addToIncome: document.getElementById('debtAddToIncome') ? document.getElementById('debtAddToIncome').checked : false
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

    // Real-world accurate minimum: Account for interest accrued since last payment
    const daysSinceLast = InterestEngine.daysBetween(debt.lastInterestDate, Utils.today());
    const newInterest = InterestEngine.dailyAccrual(debt.currentBalance, debt.annualRate, daysSinceLast);
    const accruedSinceLast = (debt.accruedInterest || 0) + newInterest;
    const realLifeBalance = debt.currentBalance + accruedSinceLast;

    const expected = parseFloat(debt.monthlyPayment) || 0;
    const minPay = debt.type === 'credit_card' 
      ? InterestEngine.calculateMinPayment(realLifeBalance, 'credit_card')
      : (parseFloat(debt.minPayment) || InterestEngine.calculateMinPayment(debt.currentBalance, debt.type));

    const hintEl = document.getElementById('paymentAmountHint');
    if (hintEl) {
      let hintText = [];
      if (expected > 0) hintText.push(`ยอดชำระคาดการณ์: ${Utils.formatCurrency(expected).replace(' ฿', '')}`);
      if (minPay > 0) hintText.push(`ขั้นต่ำ: ${Utils.formatCurrency(minPay).replace(' ฿', '')}`);

      if (hintText.length > 0) {
        hintEl.textContent = `* ${hintText.join(' | ')}`;
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

  // Setup What-If in Modal (Only show if adding new payment)
  setupModalWhatIfSimulation(debt, payment);

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
      // Fetch full debt object for What-If context
      DebtModule.getById(debtId).then(debtObj => {
        if(debtObj) {
           openPaymentModal(debtObj, payment);
        } else {
           // Fallback if not physically found
           openPaymentModal({ id: debtId, name: document.getElementById('detailTitle').textContent }, payment);
        }
      });
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
    let debtBefore = null;
    let debtAfter = null;

    if (!paymentId) {
      // We only care about showing the summary when a new payment completely pays off the debt
      debtBefore = await DebtModule.getById(debtId);
    }

    if (paymentId) {
      await DebtModule.updatePayment(paymentId, data);
      Utils.showToast('แก้ไขการชำระสำเร็จ', 'success');
    } else {
      await DebtModule.recordPayment(debtId, data);
      // Fetch the updated debt state
      debtAfter = await DebtModule.getById(debtId);

      if (debtBefore && debtBefore.status !== 'paid' && debtAfter && debtAfter.status === 'paid') {
        // Debt was just paid off by this payment!
        // Create and show custom modal
        setTimeout(() => {
          let modal = document.getElementById('hurtfulSummaryModal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'hurtfulSummaryModal';
            modal.className = 'modal-overlay';
            modal.style.zIndex = '9999';
            document.body.appendChild(modal);
          }

          // Re-render innerHTML every time to ensure fresh numbers
          modal.innerHTML = `
            <div class="modal" style="max-width: 450px; padding: 20px; border-radius: 16px; background: transparent; box-shadow: none;">
              
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 56px; margin-bottom: 10px;">🎉</div>
                <h3 style="color: var(--text-base); font-size: 20px; margin:0;">ปิดหนี้สำเร็จ! คุณเป็นไทแล้ว!</h3>
                <p style="color: var(--text-secondary); font-size: 14px; margin-top:8px;">และนี่งบสรุปดอกเบี้ยที่คุณเสียไป... เจ็บใจไหมล่ะ! 💸</p>
              </div>

              <!-- Replicating the Debt Card UI -->
              <div class="debt-item" style="padding: 16px; cursor: default; box-shadow: 0 10px 30px rgba(0,0,0,0.5); pointer-events: none;">
                <div class="debt-item-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                      <span style="font-size: 16px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${debtAfter.name || 'หนี้ที่เพิ่งปิด'}</span>
                      <span class="badge" style="font-size: 10px; background: rgba(255,255,255,0.05); color: var(--text-tertiary); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;">${Utils.debtTypeName(debtAfter.type)}</span>
                    </div>
                  </div>
                  <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">คงเหลือ</div>
                    <div style="font-size: 18px; font-weight: 700; color: #22c55e; letter-spacing: -0.5px;">0.00 ฿</div>
                  </div>
                </div>

                <div class="progress-container" style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-bottom: 0;">
                  <div class="progress-fill" style="width: 100%; height: 100%; background: #22c55e; border-radius: 2px; opacity: 0.8;"></div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
                  <div>
                    <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px;">เงินต้นตั้งต้น</div>
                    <div style="font-size: 16px; font-weight: 500; color: var(--text-primary);">${Utils.formatCurrency(debtAfter.principal)}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 11px; color: #fb923c; opacity: 0.9; margin-bottom: 4px;">ดอกเบี้ยที่ถูกสูบไปทั้งหมด</div>
                    <div style="font-size: 16px; font-weight: 700; color: #fb923c;">+ ${Utils.formatCurrency(debtAfter.totalInterestPaid)}</div>
                  </div>
                </div>

                <div class="debt-detail-item" style="grid-column: 1 / -1; margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 12px; font-weight:600; color: var(--text-secondary); text-transform:uppercase;">ยอดเงินรวมที่จ่ายจริง</div>
                    <div style="font-size: 18px; font-weight: bold; color: var(--text-primary);">${Utils.formatCurrency(debtAfter.totalPaid)}</div>
                  </div>
                </div>
              </div>
              
              <button class="btn btn-primary" style="width: 100%; margin-top: 20px; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 16px;" onclick="document.getElementById('hurtfulSummaryModal').classList.remove('active')">รับทราบ (ปาดน้ำตา)</button>
            </div>
          `;

          // Force reflow and show
          void modal.offsetWidth;
          modal.classList.add('active');
        }, 300); // Slight delay so the payment modal closes first
      } else {
        Utils.showToast('บันทึกการชำระสำเร็จ', 'success');
      }
    }

    closePaymentModal();
    await refreshDebts();

    // If detail modal is open, refresh it
    const detailModal = document.getElementById('detailModal');
    if (detailModal && detailModal.classList.contains('active')) {
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
        <div style="border:1px solid var(--border-color); border-radius:4px; overflow:hidden; margin-top: 16px;">
          <div style="padding: 8px 12px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color); font-size: 13px; font-weight: 600; color: var(--text-secondary);">
             📜 ข้อมูลตามหลัก ธปท.
          </div>
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
      <details style="background:var(--bg-tertiary); border-radius:var(--border-radius); margin-bottom:var(--space-md); border:1px solid rgba(255,255,255,0.05);">
        <summary style="padding:var(--space-md); cursor:pointer; font-weight:600; color:var(--text-accent); display:flex; align-items:center; justify-content:space-between; list-style:none;">
           <span style="display:flex; align-items:center; gap:6px;"><span>📊</span> ตารางผ่อนชำระ (คาดการณ์)</span>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </summary>
        <div style="padding:0 var(--space-md) var(--space-md) var(--space-md);">
          
          <div style="margin-bottom: var(--space-md); padding: var(--space-md); background: rgba(0,0,0,0.1); border-radius: var(--border-radius); border: 1px dashed rgba(255,255,255,0.1);">
            <div class="summary-row" style="display:flex; justify-content:space-between;">
              <span class="label">ระยะเวลาที่เหลือ</span>
              <span class="value" style="color:var(--text-success); font-weight:600;">${result.totalMonths} เดือน</span>
            </div>
            <div class="summary-row" style="display:flex; justify-content:space-between; margin-top:8px;">
              <span class="label">ดอกเบี้ยรวมที่จะเกิดขึ้น</span>
              <span class="value" style="color:var(--text-warning); font-weight:600;">${Utils.formatCurrency(result.totalInterest)}</span>
            </div>
            <div class="summary-row" style="display:flex; justify-content:space-between; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05);">
              <span class="label">ยอดรวมเงินต้น + ดอกเบี้ย</span>
              <span class="value" style="font-weight:600;">${Utils.formatCurrency(result.totalPaid)}</span>
            </div>
          </div>

          <div style="overflow-x:auto; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">
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
    `;
  } else {
    scheduleHtml = `
      <details style="background:var(--bg-tertiary); border-radius:var(--border-radius); margin-bottom:var(--space-md); border:1px solid rgba(255,255,255,0.05);">
        <summary style="padding:var(--space-md); cursor:pointer; font-weight:600; color:var(--text-accent); display:flex; align-items:center; justify-content:space-between; list-style:none;">
           <span style="display:flex; align-items:center; gap:6px;"><span>📊</span> ตารางผ่อนชำระ (คาดการณ์)</span>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </summary>
        <div style="padding:0 var(--space-md) var(--space-md) var(--space-md); text-align:center; color:var(--text-tertiary);">
          <p style="margin:0; font-size:var(--font-size-sm);">ℹ️ ไม่สามารถคำนวณตารางคาดการณ์ได้</p>
          <p style="margin:5px 0 0; font-size:var(--font-size-xs); opacity:0.7;">ระบบจำเป็นต้องทราบ "ค่างวด หรือ จ่ายขั้นต่ำ" เพื่อจำลองตารางล่วงหน้า<br>หากค่างวดไม่ตายตัว สามารถข้ามกล่องนี้และบันทึกประวัติจ่ายจริงได้เลย</p>
        </div>
      </details>
    `;
  }

  // Payment history
  let paymentHtml = '';
  if (payments.length > 0) {
    paymentHtml = `
      <details id="paymentHistorySection" style="background:var(--bg-tertiary); border-radius:var(--border-radius); border:1px solid rgba(255,255,255,0.05);">
        <summary style="padding:var(--space-md); cursor:pointer; font-weight:600; color:var(--text-accent); display:flex; align-items:center; justify-content:space-between; list-style:none;">
           <span style="display:flex; align-items:center; gap:6px;"><span>💰</span> ประวัติการชำระเงิน</span>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </summary>
        <div style="padding:0 var(--space-md) var(--space-md) var(--space-md);">
          <div style="width:100%; border-radius:8px;">
              <div style="text-align:center; font-weight:600; font-size:15px; margin-bottom:12px; border-bottom:1px dashed rgba(255,255,255,0.1); padding-bottom:10px; color:var(--text-primary);">
                  รายการชำระเงิน
              </div>
              
              <div class="table-responsive" style="overflow-x:auto;">
                <table style="width:100%; font-size:13px; border-collapse:collapse; min-width:320px;">
                  <thead>
                      <tr style="border-bottom:1px dashed rgba(255,255,255,0.1); color:var(--text-tertiary);">
                          <th style="text-align:left; padding:8px 4px; font-weight:500;">วันที่</th>
                          <th style="text-align:right; padding:8px 4px; font-weight:500;">ยอดชำระ</th>
                          <th style="text-align:right; padding:8px 4px; font-weight:500;">ดอกเบี้ย</th>
                          <th style="text-align:right; padding:8px 4px; font-weight:500;">เงินต้น</th>
                          <th style="text-align:right; padding:8px 4px; font-weight:500;">คงเหลือ</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${payments.map(p => `
                          <tr class="clickable-payment-row" onclick="window.editPayment('${p.id}', '${debt.id}')" style="cursor:pointer; transition:background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.02);" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                              <td style="padding:10px 4px; color:var(--text-secondary);">${Utils.formatDateShort(p.date)}</td>
                              <td style="text-align:right; padding:10px 4px; font-weight:500; color:var(--text-primary);">${Utils.formatCurrency(p.amount).replace(' ฿', '')}</td>
                              <td style="text-align:right; padding:10px 4px; color:var(--text-warning);">${Utils.formatCurrency(p.interestPortion).replace(' ฿', '')}</td>
                              <td style="text-align:right; padding:10px 4px; color:var(--text-success);">${Utils.formatCurrency(p.principalPortion).replace(' ฿', '')}</td>
                              <td style="text-align:right; padding:10px 4px; color:var(--text-secondary);">${Utils.formatCurrency(p.balanceAfter).replace(' ฿', '')}</td>
                          </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
              <div style="border-top:1px dashed rgba(255,255,255,0.1); margin-top:8px; padding-top:10px; text-align:center; font-size:12px; opacity:0.5; color:var(--text-tertiary);">
                  *** END OF HISTORY ***
              </div>
          </div>
        </div>
      </details>
    `;
  }

  document.getElementById('detailTitle').textContent = debt.name;
  document.getElementById('detailBody').innerHTML = `
    <!-- Top Progress Bar (always visible) -->
    <div style="margin-bottom: 24px; padding: 0 4px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
        <span style="color: var(--text-secondary);">ความคืบหน้าการชำระ (${paidPct}%)</span>
        <span style="font-weight: 600; color: #4ade80;">${Utils.formatCurrency(paid)} <span style="color:var(--text-tertiary); font-weight:normal;">/ ${Utils.formatCurrency(debt.principal)}</span></span>
      </div>
      <div class="progress-bar" style="height: 8px; border-radius: 4px;">
        <div class="progress-fill success" style="width:${paidPct}%; border-radius: 4px;"></div>
      </div>
    </div>

    <!-- 1. รายละเอียดสัญญา (Contract & Financial Info) -->
    <details style="background:var(--bg-tertiary); border-radius:var(--border-radius); margin-bottom:var(--space-md); border:1px solid rgba(255,255,255,0.05);">
        <summary style="padding:var(--space-md); cursor:pointer; font-weight:600; color:var(--text-accent); display:flex; align-items:center; justify-content:space-between; list-style:none;">
           <span style="display:flex; align-items:center; gap:6px;"><span>📋</span> รายละเอียดสัญญา</span>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </summary>
        <div style="padding:0 var(--space-md) var(--space-md) var(--space-md);">
          
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
              ${debt.totalInterestPaid > 0 ? `
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">ดอกเบี้ยที่เสียไปเปล่าๆ</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right; color:#fb923c;">- ${Utils.formatCurrency(debt.totalInterestPaid || 0)}</td>
              </tr>` : ''}
              ${debt.totalPaid > 0 ? `
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-secondary); border-right:1px solid var(--border-color);">ยอดเงินรวมที่จ่ายจริง</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right;">${Utils.formatCurrency(debt.totalPaid || 0)}</td>
              </tr>` : ''}
              <tr style="background: rgba(254, 240, 138, 0.05);">
                <td style="padding:12px 10px; border-bottom:none; font-weight:600; color:var(--text-primary); border-right:1px solid var(--border-color);">ยอดคงเหลือ (ล่าสุด)</td>
                <td style="padding:12px 10px; border-bottom:none; font-weight:bold; color:#fef08a; font-size:16px; text-align:right;">${Utils.formatCurrency(debt.currentBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        ${botInfoHtml}
      </div>
    </details>

    <!-- 2. ตารางผ่อน -->
    ${scheduleHtml}

    <!-- 3. ประวัติการชำระ -->
    ${paymentHtml}
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
  const isAvalanche = activeSortOrder === 'avalanche';
  const isSnowball = activeSortOrder === 'snowball';
  const isPayoffable = activeGrouping === 'payoffable';
  const isInstallment = activeGrouping === 'installment';

  // 1. Filter
  let debts = allDebts;
  if (filter !== 'all') {
    debts = allDebts.filter(d => d.type === filter);
  }

  // 2. Sort Array
  debts.sort((a, b) => {
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;

    const isSmart = activeSortOrder === 'smart';
    if (isSmart) {
      // Score = annualRate / currentBalance  →  higher = pay this first
      const balA = parseFloat(a.currentBalance || 1);
      const balB = parseFloat(b.currentBalance || 1);
      const rateA = parseFloat(a.annualRate || 0);
      const rateB = parseFloat(b.annualRate || 0);
      const scoreA = rateA / balA;
      const scoreB = rateB / balB;
      if (scoreA !== scoreB) return scoreB - scoreA;
    } else if (isSnowball) {
      const balA = parseFloat(a.currentBalance || 0);
      const balB = parseFloat(b.currentBalance || 0);
      if (balA !== balB) return balA - balB;
    } else if (isAvalanche) {
      const rateA = parseFloat(a.annualRate || 0);
      const rateB = parseFloat(b.annualRate || 0);
      if (rateA !== rateB) return rateB - rateA;
    }
    
    // Fallback sort
    return (a.name || '').localeCompare(b.name || '');
  });

  // Calculate Summary Stats & Predictions
  let maxMonths = 0;
  let totalMonthly = 0;
  
  // We calculate months for ALL active debts first
  allDebts.forEach(d => {
    if (d.status !== 'active') return;
    
    const balance = parseFloat(d.currentBalance || 0);
    const rate = parseFloat(d.annualRate || 0);
    const initialBalance = parseFloat(d.principal || balance);
    const currentMin = d.type === 'credit_card' ? InterestEngine.calculateMinPayment(balance, 'credit_card') : (parseFloat(d.minPayment) || 0);
    const monthlyNeeded = parseFloat(d.monthlyPayment) || currentMin;
    totalMonthly += monthlyNeeded;

    const initialMin = d.type === 'credit_card' ? InterestEngine.calculateMinPayment(initialBalance, 'credit_card') : (parseFloat(d.minPayment) || 0);

    const payments = d.payments || [];
    const latestActualAmount = payments.length > 0 ? parseFloat(payments[payments.length - 1].amount) : 0;
    
    // Prediction is based on: Set Monthly > Last Actual Amount > Initial Min > Current Min
    const paymentForCalc = parseFloat(d.monthlyPayment) || Math.max(latestActualAmount, initialMin, currentMin);
    
    // Store this in the object so cards can use it without re-calculating
    d.paymentAmountForCalc = paymentForCalc;
    
    // 3. Real-world Reality (Today's Interest & Min)
    const daysSinceLast = InterestEngine.daysBetween(d.lastInterestDate, Utils.today());
    const newInterest = InterestEngine.dailyAccrual(balance, rate, daysSinceLast);
    const accruedSinceLast = (d.accruedInterest || 0) + newInterest;
    d.realTimeMin = InterestEngine.calculateMinPayment(balance + accruedSinceLast, d.type);
    d.todayInterest = accruedSinceLast;

    if (paymentForCalc > 0) {
      let result;
      if (d.type === 'credit_card') {
        result = InterestEngine.generateCreditCardSchedule(balance, rate, paymentForCalc, d.startDate);
      } else if (d.interestType === 'daily_accrual') {
        result = InterestEngine.generateDailyAccrualSchedule(balance, rate, paymentForCalc, d.startDate);
      } else if (d.interestType === 'fixed_rate') {
        result = InterestEngine.generateFixedRateSchedule(parseFloat(d.principal), rate, paymentForCalc);
      } else {
        result = InterestEngine.generateAmortizationSchedule(balance, rate, paymentForCalc);
      }
      
      d.monthsToPayoff = result.totalMonths;
      d.predictionResult = result;
      
      if (result.totalMonths > maxMonths) maxMonths = result.totalMonths;
    } else {
      d.monthsToPayoff = null;
    }
  });

  const totalMonthlyEl = document.getElementById('totalMonthlyPayment');
  if (totalMonthlyEl) totalMonthlyEl.textContent = amountsVisible ? Utils.formatCurrency(totalMonthly) : '••••••';

  const payoffEl = document.getElementById('estimatedPayoffDateNew');
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
    payoff: { title: '🔥 โปะได้ (ลดต้นลดดอก)', items: [], sum: 0 },
    installment: { title: '📦 สินเชื่อคงที่ / ผ่อน 0%', items: [], sum: 0 },
    credit_card: { title: '💳 บัตรเครดิต (หมุนเวียน)', items: [], sum: 0 },
    personal_loan: { title: '🏦 สินเชื่อ / ผ่อนชำระ', items: [], sum: 0 },
    paid: { title: '✅ ชำระหมดแล้ว', items: [], sum: 0 }
  };

  const isPrioritySort = isAvalanche || isSnowball;

  debts.forEach(d => {
    const isInst = (d.interestType === 'fixed_rate' || parseFloat(d.annualRate) === 0);
    const isPayoff = !isInst;

    if (d.status === 'paid') {
      groups.paid.items.push(d);
      groups.paid.sum += parseFloat(d.principal);
    } else if (isPayoffable && filter === 'all') {
      // If "Payoffable" grouping is on, ONLY show payoffable items. Skip others.
      if (isPayoff) {
        groups.payoff.items.push(d);
        groups.payoff.sum += parseFloat(d.currentBalance);
      }
    } else if (isInstallment && filter === 'all') {
      // If "Installment" grouping is on, ONLY show installment items. Skip others.
      if (isInst) {
        groups.installment.items.push(d);
        groups.installment.sum += parseFloat(d.currentBalance);
      }
    } else if (isPrioritySort && filter === 'all') {
      // Global priority group (only if no specific grouping is active)
      groups.priority.items.push(d);
      groups.priority.sum += parseFloat(d.currentBalance);
    } else if (d.type === 'credit_card') {
      groups.credit_card.items.push(d);
      groups.credit_card.sum += parseFloat(d.currentBalance);
    } else {
      groups.personal_loan.items.push(d); // Includes vehicle loans
      groups.personal_loan.sum += parseFloat(d.currentBalance);
    }
  });

  // 4. Render
  let html = '';

  const renderGroup = (key, group, isdetails = false) => {
    if (group.items.length === 0) return '';

    let listHtml = '';

    if (isdetails) {
      listHtml = `
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${group.items.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
              <div style="display:flex; align-items:center; gap: 12px; overflow:hidden;">
                <span style="font-size: 18px; flex-shrink: 0;">🎉</span>
                <div style="color: var(--text-primary); font-weight: 500; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${d.name || 'หนี้สินที่ไม่มีชื่อ'}
                </div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0; margin-left: 12px;">
                <button class="btn btn-sm edit-history-btn" data-id="${d.id}" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary); cursor:pointer; padding:6px 12px; border-radius: 6px; font-size: 12px;" title="แก้ไขประวัติล่าสุด">
                  แก้ไขล่าสุด
                </button>
                <button class="btn btn-sm detail-debt" data-id="${d.id}" style="background:var(--bg-tertiary); border:1px solid rgba(255,255,255,0.1); color:var(--text-accent); cursor:pointer; padding:6px 12px; border-radius: 6px; font-size: 12px; display:flex; align-items:center; gap:6px; font-weight: 600;" title="ดูรายละเอียด">
                  ดูรายละเอียด
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button class="delete-debt" data-id="${d.id}" style="background:rgba(220,53,69,0.1); border:1px solid rgba(220,53,69,0.2); color:var(--text-danger-soft); cursor:pointer; padding:6px; border-radius: 6px;" title="ลบ">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      listHtml = group.items.map(d => {
        const paid = d.principal - d.currentBalance;
        const paidPct = d.principal > 0 ? Utils.percentage(paid, d.principal) : 100;
        const paymentAmount = d.monthlyPayment || d.minPayment || 0;

        // 4.1 Use Pre-calculated Prediction
        let predictionSummaryHtml = '';
        const monthsToPayoff = d.monthsToPayoff;
        const result = d.predictionResult;
        const paymentAmountForCalc = d.paymentAmountForCalc || 0;

        if (monthsToPayoff !== null && result) {
          predictionSummaryHtml = `
          <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:12px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:4px;">
            <tbody>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px 4px; color:var(--text-tertiary); width:50%;">เงินต้นตั้งต้น</td>
                <td style="padding:8px 4px; font-weight:500; text-align:right;">${Utils.formatCurrency(d.principal)}</td>
              </tr>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px 4px; color:var(--text-tertiary);">วิธีคิดดอกเบี้ย</td>
                <td style="padding:8px 4px; font-weight:500; text-align:right;">${Utils.interestTypeName(d.interestType)}</td>
              </tr>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px 4px; color:var(--text-tertiary);">ระยะเวลา (คาดการณ์)</td>
                <td style="padding:8px 4px; font-weight:600; color:var(--text-success); text-align:right;">${result.totalMonths} เดือน</td>
              </tr>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px 4px; color:var(--text-tertiary);">ดอกเบี้ยรวม (คาดการณ์)</td>
                <td style="padding:8px 4px; font-weight:600; color:var(--text-warning); text-align:right;">${Utils.formatCurrency(result.totalInterest)}</td>
              </tr>
              <tr>
                <td style="padding:8px 4px; color:var(--text-tertiary);">หมดหนี้ประมาณ</td>
                <td style="padding:8px 4px; font-weight:700; color:var(--text-primary); text-align:right;">${Utils.formatMonthYear(Utils.addMonths(new Date(), result.totalMonths))}</td>
              </tr>
            </tbody>
          </table>
    `;
        } else {
          predictionSummaryHtml = `
          <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:12px; border-top:1px dashed rgba(255,255,255,0.1);">
            <tbody>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px 4px; color:var(--text-tertiary); width:50%;">เงินต้นตั้งต้น</td>
                <td style="padding:8px 4px; font-weight:500; text-align:right;">${Utils.formatCurrency(d.principal)}</td>
              </tr>
              <tr>
                <td style="padding:8px 4px; color:var(--text-tertiary);">วิธีคิดดอกเบี้ย</td>
                <td style="padding:8px 4px; font-weight:500; text-align:right;">${Utils.interestTypeName(d.interestType)}</td>
              </tr>
            </tbody>
          </table>
    `;
        }

        // Dynamic color based on repayment progress (Text only)
        let statusColor = '#ffffff'; // 0-25% (White)
        if (paidPct >= 90) statusColor = '#22c55e';      // 90%+ (Green)
        else if (paidPct >= 75) statusColor = '#4ade80'; // 75-90% (Light Green)
        else if (paidPct >= 50) statusColor = '#fcd34d'; // 50-75% (Yellow)
        else if (paidPct >= 25) statusColor = '#fb923c'; // 25-50% (Orange)

        return `
    <div class="debt-item" data-id="${d.id}" style="padding: 10px 14px; position: relative; cursor: pointer; transition: all 0.2s ease;">
          <div class="debt-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;" onclick="window.toggleDebtItem(this)">
            <div style="flex: 1; min-width: 0;">
              <span style="font-size: 14px; font-weight: 700; color: var(--text-primary); overflow-wrap: anywhere; min-width: 0;">${d.name || 'หนี้สินที่ไม่มีชื่อ'}</span>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 8px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0;">คงเหลือ</div>
              <div style="font-size: 15px; font-weight: 700; color: ${statusColor}; letter-spacing: -0.5px;">${Utils.formatCurrency(d.currentBalance)}</div>
            </div>
          </div>

          <div class="progress-container" style="height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-bottom: 0;" onclick="window.toggleDebtItem(this)">
            <div class="progress-fill" style="width: ${paidPct}%; height: 100%; background: ${statusColor}; border-radius: 2px; opacity: 0.6; transition: width 0.8s ease;"></div>
          </div>
          
          <!-- Progress Dopamine -->
          ${d.status !== 'paid' ? `
          <div style="margin-top: 8px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.01) 100%); border: 1px solid rgba(34, 197, 94, 0.15); border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="window.toggleDebtItem(this)">
            <div style="font-size: 16px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">🎉</div>
            <div style="flex: 1;">
               ${paidPct > 0 ? `<div style="font-size: 11px; color: #4ade80; font-weight: 600;">จ่ายหนี้ไปแล้ว ${paidPct.toFixed(1)}%</div>` : `<div style="font-size: 11px; color: #4ade80; font-weight: 600;">เริ่มต้นก้าวแรก!</div>`}
            </div>
          </div>
          ` : ''}
          
          <details class="debt-item-details" style="margin-top: 0; border-top: none;">
            <summary style="display:none"></summary>
            
            <!-- Details section: type, rate, payment info -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.07);">
              <span class="badge" style="font-size: 11px; background: rgba(255,255,255,0.05); color: var(--text-tertiary); padding: 3px 8px; border-radius: 4px;">${Utils.debtTypeName(d.type)}</span>
              <span class="badge" style="font-size: 11px; background: rgba(255,193,7,0.08); color: var(--text-warning); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255,193,7,0.15);">ดอกเบี้ย ${d.annualRate}%</span>
              ${d.realTimeMin > 0 ? `<span class="badge" style="font-size: 11px; background: rgba(239,68,68,0.08); color: #f87171; border: 1px solid rgba(239,68,68,0.15); padding: 3px 8px; border-radius: 4px;">ขั้นต่ำวันนี้: ${Utils.formatNumber(d.realTimeMin)} ฿</span>` : ''}
              ${paymentAmountForCalc > 0 ? `<span class="badge" style="font-size: 11px; background: rgba(34,197,94,0.08); color: #4ade80; border: 1px solid rgba(34,197,94,0.15); padding: 3px 8px; border-radius: 4px;">เป้าหมาย: ${Utils.formatNumber(paymentAmountForCalc)} ฿</span>` : ''}
            </div>

            ${predictionSummaryHtml}

            <div style="display: flex; gap: 8px; margin-top: 16px;">
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
                ตารางผ่อน &amp; ประวัติ
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
    }

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
  html += renderGroup('payoff', groups.payoff);
  html += renderGroup('installment', groups.installment);
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
            schedule = InterestEngine.generateCreditCardSchedule(debt.currentBalance, debt.annualRate, paymentAmountForCalc, debt.startDate);
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

// --- Payment Modal What-If Logic ---
function setupModalWhatIfSimulation(debt, existingPayment) {
  const container = document.getElementById('paymentWhatIfContainer');
  const amountInput = document.getElementById('paymentAmount');
  const slider = document.getElementById('paymentWhatIfSlider');
  const resultEl = document.getElementById('paymentWhatIfResult');
  
  const whatIfInput = document.getElementById('paymentWhatIfInput');
  
  // Hide if editing existing or debt is undefined/fully paid
  if (existingPayment || !debt || debt.status === 'paid') {
      container.style.display = 'none';
      if(amountInput) {
          amountInput.oninput = null; // Clear old bindings
          amountInput.onblur = null;
      }
      return;
  }

  // Use the same interest-adjusted balance logic for the simulator's mandatory minimum
  const daysSinceLast = InterestEngine.daysBetween(debt.lastInterestDate, Utils.today());
  const newInterest = InterestEngine.dailyAccrual(debt.currentBalance, debt.annualRate, daysSinceLast);
  const totalBalanceForMin = debt.currentBalance + (debt.accruedInterest || 0) + newInterest;

  // Baseline for comparison (your established habit/goal)
  const habitPayment = debt.paymentAmountForCalc || debt.monthlyPayment || InterestEngine.calculateMinPayment(totalBalanceForMin, debt.type);
  
  // Dynamic minimum for the floor of the slider
  const mandatoryMin = InterestEngine.calculateMinPayment(totalBalanceForMin, debt.type);
  const sliderMin = Math.max(mandatoryMin, (debt.type === 'personal_loan' ? 300 : mandatoryMin));

  if (sliderMin <= 0) {
      container.style.display = 'none';
      return;
  }

  container.style.display = 'block';

  // Setup bounds for slider
  let sliderMax = Math.min(debt.currentBalance, habitPayment + 20000);
  if (sliderMax <= sliderMin) sliderMax = sliderMin + 1000;
  
  slider.min = sliderMin;
  slider.max = sliderMax;

  document.getElementById('paymentWhatIfMinValue').textContent = Utils.formatCurrency(sliderMin);
  document.getElementById('paymentWhatIfMaxValue').textContent = Utils.formatCurrency(sliderMax);

  // Set initial value to your established habit/goal
  amountInput.value = ''; // Keep blank as per user request
  slider.value = habitPayment; 

  const currentPayment = habitPayment; 

  // Render logic
  const renderResult = (val) => {
      if(val < sliderMin) {
          resultEl.innerHTML = `<span style="color: var(--text-warning); font-size: 11px;">⚠️ กรุณาชำระขั้นต่ำ ${Utils.formatCurrency(sliderMin)}</span>`;
          return;
      }
      const extraAmount = val - habitPayment;
      const comparison = InterestEngine.comparePayments(
          debt.currentBalance,
          debt.annualRate,
          habitPayment,
          extraAmount,
          debt.type,
          debt.lastInterestDate
      );

      // Scenarios: Goal (val == habit), Diligence (val > habit), Lapse (val < habit)
      const diff = Math.abs(val - habitPayment);
      const isGoal = diff < 0.01;
      const isLapse = val < habitPayment - 0.01;
      const isHighDiligence = val > habitPayment + 0.01;

      if (isGoal) {
          resultEl.innerHTML = `
            <div style="font-size: 11px; color: var(--text-tertiary);">
              คุณจะปลดหนี้นี้หมดในอีก <b style="color: #4ade80;">${comparison.minPayment.totalMonths} เดือน</b> ตามแผน ✌️
            </div>
          `;
      } else if (isLapse) {
          const extraMonths = comparison.extraPayment.totalMonths - comparison.minPayment.totalMonths;
          resultEl.innerHTML = `
            <div style="font-size: 12px; color: #f87171; margin-bottom: 2px; font-weight: 600;">
              ⚠️ วินัยหย่อน! จะหมดหนี้ช้าลงเป็น <b>${comparison.extraPayment.totalMonths} เดือน</b>
            </div>
            <div style="font-size: 11px; color: var(--text-tertiary);">
              ต้องทนอยู่กับหนี้นี้นานขึ้นอีก <b>${extraMonths} เดือน</b> เลยนะ! 😭
            </div>
          `;
      } else {
          resultEl.innerHTML = `
            <div style="font-size: 12px; color: var(--text-primary); margin-bottom: 2px;">
              หมดเร็วขึ้นเหลือ <b>${comparison.extraPayment.totalMonths} เดือน!</b> <span style="font-size: 11px; color: var(--text-tertiary); font-weight: normal;">(จากเดิม ${comparison.minPayment.totalMonths} เดือน)</span>
            </div>
            <div style="font-size: 11px; color: #4ade80;">
              ประหยัดดอกเบี้ยได้ <b>${Utils.formatCurrency(comparison.savings.interest)}</b> ว้าว! 🎉
            </div>
          `;
      }
  };

  // Bind input -> slider -> result
  amountInput.oninput = (e) => {
      let val = parseFloat(e.target.value);
      if(!isNaN(val)) {
          slider.value = Math.min(Math.max(val, sliderMin), sliderMax);
          renderResult(val);
      } else {
          // If empty, show default min payment result
          renderResult(sliderMin);
          slider.value = sliderMin;
      }
  };

  amountInput.onblur = (e) => {
      let val = parseFloat(e.target.value);
      // We don't force them to enter min value anymore to let them have an empty field if they prefer
      if (isNaN(val)) {
          renderResult(sliderMin);
      } else if (val < sliderMin) {
          // But if they entered less than minimum, we still calculate the warning but keep their value intact, 
          // or we can auto-correct it. Let's auto-correct it to prevent saving invalid data
          val = sliderMin;
          amountInput.value = val;
          slider.value = val;
          renderResult(val);
      } else {
          renderResult(val);
      }
  };

  // Bind slider -> input -> result
  slider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      amountInput.value = val;
      renderResult(val);
  };

  // Initial draw using your habit as the starting point for consistency with the main card
  renderResult(habitPayment);
}
