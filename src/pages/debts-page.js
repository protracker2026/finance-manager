// Debts Page
import { DebtModule } from '../modules/debts.js';
import { InterestEngine } from '../modules/interest.js';
import { Utils } from '../modules/utils.js';

let amountsVisible = true;
let activeSortOrder = 'avalanche'; // 'avalanche' | 'snowball' | 'smart' | null
let activeGrouping = null; // 'payoffable' | 'installment' | null
let interestTickerInterval = null;
let tickerStartTime = null;
let allDebts = []; // Store current debts globally within the module
let lastViewedDebt = null;

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
        <button class="header-btn" id="exportDebtPdfBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          PDF Report
        </button>
        <button class="header-btn primary" id="addDebtBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          เพิ่มหนี้
        </button>
      </div>
    </div>

    <!-- Premium Dashboard Summary Card -->
    <div style="background: linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 24px; margin-bottom: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);">
      <!-- Subtle Ambient Glow -->
      <div style="position: absolute; top: -50px; left: 50%; transform: translateX(-50%); width: 200px; height: 150px; background: rgba(254, 240, 138, 0.1); filter: blur(50px); border-radius: 50%; pointer-events: none;"></div>

      <!-- Hero Value (Main Debt) -->
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px dashed rgba(255,255,255,0.08); padding-bottom: 20px; position: relative; z-index: 1;">
        <div style="display:flex; justify-content:center; align-items:center; gap: 8px; margin-bottom: 10px;">
          <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">หนี้คงค้างสุทธิ</span>
          <button class="btn-icon" id="toggleVisibilityBtn" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; padding:0; display:flex; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--text-tertiary)'">
             <svg id="eyeIcon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${amountsVisible ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'}</svg>
          </button>
        </div>
        <div id="totalDebtValue" style="color: #fef08a; font-size: 34px; font-weight: 800; font-family: var(--font-mono); text-shadow: 0 0 24px rgba(254, 240, 138, 0.2); line-height: 1; margin-bottom: 8px; letter-spacing: -0.5px;">${formatValue(summary.totalDebt)}</div>
        <div style="font-size: 11px; color: var(--text-tertiary); opacity: 0.8; font-weight: 500;">จาก ${summary.activeCount} รายการ</div>
      </div>

      <!-- 2x2 Metrics Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; position: relative; z-index: 1;">
         <!-- Metric 1: Monthly -->
         <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 6px; display: flex; align-items: center; gap: 5px; font-weight: 600;">📅 จ่าย/เดือน</span>
            <span id="totalMonthlyPayment" style="font-size: 16px; font-weight: 800; color: var(--text-primary); font-family: var(--font-mono); letter-spacing: -0.3px;">...</span>
         </div>
         <!-- Metric 2: Interest -->
         <div style="background: rgba(251, 146, 60, 0.05); border: 1px solid rgba(251, 146, 60, 0.15); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-size: 10px; color: #fb923c; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; font-weight: 600; opacity: 0.9;">🔥 ดอกเบี้ยสะสม</span>
            <span id="totalInterestPaidValue" style="color: #fb923c; font-size: 16px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.3px;">${Utils.formatCurrency(summary.totalInterestPaid)}</span>
         </div>
         <!-- Metric 3: Paid Principal -->
         <div style="background: rgba(74, 222, 128, 0.05); border: 1px solid rgba(74, 222, 128, 0.15); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-size: 10px; color: #4ade80; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; font-weight: 600; opacity: 0.9;">✅ ชำระเงินต้น</span>
            <span id="totalPaidValue" style="color: #4ade80; font-size: 16px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.3px;">${Utils.formatCurrency(summary.totalPaid)}</span>
         </div>
         <!-- Metric 4: Target -->
         <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 6px; display: flex; align-items: center; gap: 5px; font-weight: 600;">🎯 คาดว่าหมดหนี้</span>
            <span id="estimatedPayoffDateNew" style="font-size: 16px; font-weight: 800; color: #60a5fa; font-family: var(--font-mono); letter-spacing: -0.3px;">...</span>
         </div>
      </div>
    </div>

    <!-- Sort & Filter Bar -->
    <details class="debt-sort-details" style="margin-bottom: 20px; background: var(--bg-card); border-radius: var(--border-radius-lg); border: 1px solid var(--border-color);">
      <summary style="padding: 12px 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 500; color: var(--text-secondary); list-style: none; outline: none; user-select: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>ลำดับการเรียงและตัวกรอง</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </summary>
      <div style="padding: 0 15px 15px 15px;">
        <div style="height: 1px; background: var(--border-color); margin: 0 -15px 15px -15px;"></div>
        <div class="debt-sort-bar" style="border: none; padding: 0; background: transparent; display: flex; flex-direction: column; gap: 12px;">
          <div class="debt-sort-controls" style="width: 100%;">
            <span class="label" style="display: block; margin-bottom: 8px;">เรียงตาม:</span>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="sort-btn ${activeSortOrder === 'avalanche' ? 'active' : ''}" data-sort="avalanche">ดอกเบี้ยสูง</button>
              <button class="sort-btn ${activeSortOrder === 'snowball' ? 'active' : ''}" data-sort="snowball">ยอดน้อย</button>
              <button class="sort-btn ${activeSortOrder === 'smart' ? 'active' : ''}" data-sort="smart">⚡ คุ้มค่าสุด</button>
              <button class="sort-btn ${activeSortOrder === 'newest' ? 'active' : ''}" data-sort="newest">ใหม่สุด</button>
              <button class="sort-btn ${activeSortOrder === 'oldest' ? 'active' : ''}" data-sort="oldest">เก่าสุด</button>
              <button class="sort-btn ${activeGrouping === 'payoffable' ? 'active' : ''}" data-sort="payoffable">โปะได้</button>
              <button class="sort-btn ${activeGrouping === 'installment' ? 'active' : ''}" data-sort="installment">ดอกเบี้ยคงที่</button>
            </div>
          </div>
          <div class="debt-sort-controls" style="width: 100%;">
            <span class="label" style="display: block; margin-bottom: 8px;">ฟิลเตอร์ประเภท:</span>
            <select class="form-select" id="debtFilter" style="width: 100%; padding: 8px;">
                <option value="all">ทั้งหมด</option>
                <option value="credit_card">💳 บัตรเครดิต</option>
                <option value="cash_card">🏧 บัตรกดเงินสด</option>
                <option value="personal_loan">🏦 สินเชื่อ</option>
            </select>
          </div>
        </div>
      </div>
    </details>

    <!-- Debt List Container -->
    <div id="debtsContainer"></div>

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

    <!-- Prediction Analysis Modal -->
    <div class="modal-overlay" id="predictionModal">
      <div class="modal" style="max-width: 450px;">
        <div class="modal-header">
          <h3>สรุปยอดและแผนการชำระ</h3>
          <button class="modal-close" onclick="closePredictionModal()">&times;</button>
        </div>
        <div class="modal-body" id="predictionModalBody">
           <!-- Dynamic Content -->
        </div>
        <div class="modal-footer" style="padding: 15px 20px;">
           <button class="btn btn-primary" style="width: 100%;" onclick="closePredictionModal()">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>

    <!-- Existing Add/Edit Debt Modal -->
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
                  <option value="cash_card">🏧 บัตรกดเงินสด</option>
                  <option value="personal_loan">🏦 สินเชื่อส่วนบุคคล</option>
                  <option value="personal_loan_vehicle">🚗 สินเชื่อ (ทะเบียนรถค้ำ)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">วันที่เริ่มต้น</label>
                <input type="date" class="form-input" id="debtStartDate" value="${Utils.today().split('T')[0]}" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" id="labelPrincipal">เงินต้น (บาท)</label>
                <input type="number" class="form-input" id="debtPrincipal" step="0.01" min="0" required inputmode="decimal">
              </div>
              <div class="form-group">
                <label class="form-label" id="labelCurrentBalance">ยอดคงเหลือปัจจุบัน (บาท)</label>
                <input type="number" class="form-input" id="debtCurrentBalance" step="0.01" min="0" inputmode="decimal">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">อัตราดอกเบี้ย (% ต่อปี)</label>
                <input type="number" class="form-input" id="debtRate" step="0.01" min="0" required inputmode="decimal">
                <div id="rateWarning" style="font-size:var(--font-size-xs);margin-top:4px;display:none;"></div>
              </div>
              <div class="form-group" id="monthlyPaymentGroup">
                <label class="form-label" id="labelMonthlyPayment">ค่างวดรายเดือน (บาท)</label>
                <input type="number" class="form-input" id="debtMonthlyPayment" step="0.01" min="0" inputmode="decimal">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" id="minPaymentGroup">
                <label class="form-label">ชำระขั้นต่ำ (บาท)</label>
                <input type="number" class="form-input" id="debtMinPayment" step="0.01" min="0" inputmode="decimal">
              </div>
              <div class="form-group" id="termGroup">
                <label class="form-label">ระยะเวลา (เดือน)</label>
                <input type="number" class="form-input" id="debtTerm" min="0" placeholder="0 = ไม่กำหนด" inputmode="numeric">
              </div>
            </div>

            <div class="form-group" id="interestTypeGroup">
              <label class="form-label">วิธีคิดดอกเบี้ย</label>
              <select class="form-select" id="debtInterestType" required>
                <option value="reducing_balance">ลดต้นลดดอก</option>
                <option value="daily_accrual">เดินรายวัน (Credit Card)</option>
                <option value="fixed_rate">ดอกเบี้ยคงที่ (Flat Rate)</option>
              </select>
            </div>
            
            <div id="advancedOptions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px;">
               <div style="display: flex; align-items: center;">
                 <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); font-size: 13px;">
                   <input type="checkbox" id="debtIsInstallment" style="width: 16px; height: 16px;">
                   <span>เป็นยอดแบ่งชำระ</span>
                 </label>
               </div>
               <div id="overpaymentOptionGroup" style="display: flex; align-items: center;">
                 <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); font-size: 13px;">
                   <input type="checkbox" id="debtAllowOverpayment" checked style="width: 16px; height: 16px;">
                   <span>อนุญาตให้โปะได้</span>
                 </label>
               </div>
            </div>
            <div class="form-group" style="margin-top: 16px;">
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

    <!-- Spend Modal (รูดเพิ่ม/กดเงินสดเพิ่ม) -->
    <div class="modal-overlay" id="spendModal">
      <div class="modal">
        <div class="modal-header" style="background: rgba(251, 146, 60, 0.05);">
          <h3>รูดเพิ่ม / กดเงินสดเพิ่ม 💸</h3>
          <button class="modal-close" id="spendModalClose">&times;</button>
        </div>
        <div class="modal-body">
          <p id="spendDebtName" style="color:var(--text-warning);margin-bottom:var(--space-md);font-weight:600;"></p>
          <input type="hidden" id="spendDebtId">
          
          <div class="form-row" style="margin-bottom: 12px; align-items: flex-end;">
             <div class="form-group" style="flex: 2;">
                <label class="form-label">ยอดที่ใช้เพิ่ม (บาท)</label>
                <input type="number" class="form-input" id="spendAmount" inputmode="decimal" style="font-size: 20px; font-weight: bold; color: #fb923c;" required>
             </div>
             <div class="form-group" style="flex: 1;" id="cashFeeGroup">
                <label class="form-label">ค่าธรรมเนียม (บาท)</label>
                <input type="number" class="form-input" id="spendFee" value="0" inputmode="decimal" style="font-size: 20px; font-weight: bold;">
             </div>
          </div>


          <div class="form-group" id="cashAdvanceOption" style="margin-bottom: 16px; padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 8px;">
             <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); font-size: 13px;">
               <input type="checkbox" id="spendIsCashAdvance" style="width: 16px; height: 16px;">
               <span>เป็นการกดเงินสด (Cash Advance)</span>
             </label>
             <p id="cashAdvanceFeeNotice" style="margin-top: 4px; font-size: 11px; color: var(--text-tertiary); margin-left: 24px; display: none;">* ดอกเบี้ยจะเริ่มเดินทันที และมีค่าธรรมเนียมประมาณ 3%</p>
          </div>

          <div class="form-group" style="margin-bottom: 16px; padding: 10px; background: rgba(74, 222, 128, 0.05); border-radius: 8px; border: 1px dashed rgba(74, 222, 128, 0.2);">
             <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #4ade80; font-weight: 500; font-size: 14px;">
                <input type="checkbox" id="spendAddToIncome" style="width: 18px; height: 18px; cursor: pointer; accent-color: #4ade80;">
                เพิ่มยอดเงินนี้เป็นรายรับด้วย
             </label>
          </div>

          <div class="form-group">
            <label class="form-label">วันที่ทำรายการ</label>
            <input type="date" class="form-input" id="spendDate" value="${Utils.today().split('T')[0]}" required>
          </div>
          <div class="form-group">
            <label class="form-label">หมายเหตุ</label>
            <input type="text" class="form-input" id="spendNote" placeholder="เช่น รูดค่าอาหาร, กดเงินทำธุระ">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="spendCancelBtn">ยกเลิก</button>
          <button class="btn" id="spendSaveBtn" style="background: #fb923c; color: white; border: none; font-weight:600;">บันทึกยอดเพิ่ม</button>
        </div>
      </div>
    </div>
  `;

  setupDebtEvents();

  await refreshDebts();
  startInterestTicker();
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
    flatpickr("#spendDate", {
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
    updateDebtModalUI(type);
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

  // === Auto fee calculation for cash advance (Only for Credit Cards) ===
  document.getElementById('spendIsCashAdvance').addEventListener('change', (e) => {
    const amount = parseFloat(document.getElementById('spendAmount').value) || 0;
    const feeGroup = document.getElementById('cashFeeGroup');
    // If fee group is visible, it's a credit card, apply 3% fee
    const isCreditCard = feeGroup.style.display !== 'none';
    if (e.target.checked && amount > 0 && isCreditCard) {
      document.getElementById('spendFee').value = (amount * 0.03).toFixed(2);
    } else {
      document.getElementById('spendFee').value = 0;
    }

    // Toggle notice text
    const notice = document.getElementById('cashAdvanceFeeNotice');
    if (notice) {
      notice.style.display = (e.target.checked && isCreditCard) ? 'block' : 'none';
    }
  });

  document.getElementById('debtPrincipal').addEventListener('input', autoCalcMinPayment);
  document.getElementById('debtCurrentBalance').addEventListener('input', autoCalcMinPayment);

  // === Sort & Filter Events ===
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const sortValue = e.currentTarget.dataset.sort;

      // Group A: Sort order (avalanche / snowball / smart / newest / oldest) - toggle or switch
      if (['avalanche', 'snowball', 'smart', 'newest', 'oldest'].includes(sortValue)) {
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
    });
  });

  document.getElementById('debtFilter').addEventListener('change', refreshDebts);

  document.getElementById('debtIsInstallment').addEventListener('change', (e) => {
    updateDebtModalUI(document.getElementById('debtType').value);
  });

  document.getElementById('spendModalClose').addEventListener('click', closeSpendModal);
  document.getElementById('spendCancelBtn').addEventListener('click', closeSpendModal);
  document.getElementById('spendSaveBtn').addEventListener('click', saveSpend);

  document.getElementById('exportDebtPdfBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const origText = btn.innerHTML;
    btn.innerHTML = '⏳ กำลังสร้าง...';
    btn.disabled = true;
    try {
      const summary = await DebtModule.getDebtSummary();
      await Utils.exportDebtsToPDF(summary);
    } catch(err) {
      console.error('[DebtPage] Export all debts PDF error:', err);
      Utils.showToast('Export ไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
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
  const startDateInput = document.getElementById('debtStartDate');
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
    document.getElementById('debtIsInstallment').checked = !!debt.isInstallment;
    document.getElementById('debtAllowOverpayment').checked = debt.allowOverpayment !== false;

    // Set Date with Flatpickr support
    const dateVal = debt.startDate || Utils.today().split('T')[0];
    if (startDateInput._flatpickr) startDateInput._flatpickr.setDate(dateVal);
    else startDateInput.value = dateVal;

    document.getElementById('debtNote').value = debt.note || '';
  } else {
    document.getElementById('debtModalTitle').textContent = 'เพิ่มหนี้';
    document.getElementById('debtId').value = '';
    document.getElementById('debtForm').reset();

    const today = Utils.today().split('T')[0];
    if (startDateInput._flatpickr) startDateInput._flatpickr.setDate(today);
    else startDateInput.value = today;

    const addToIncomeCheck = document.getElementById('debtAddToIncome');
    if (addToIncomeCheck) addToIncomeCheck.checked = false;
    
    // Starting a new debt creation, clear the back target
    lastViewedDebt = null;
  }

  // Update labels and visibility based on current type
  updateDebtModalUI(document.getElementById('debtType').value);

  // Show/Hide "Add to Income" based on if it's new or edit
  const incomeRow = document.getElementById('debtAddToIncome')?.closest('.form-group');
  if (incomeRow) {
    incomeRow.style.display = debt ? 'none' : 'block';
  }

  modal.classList.add('active');
}

function closeDebtModal() { 
  const modal = document.getElementById('debtModal');
  if (modal) {
    modal.classList.remove('active');
    
    // If we came from a detail view, go back to it
    if (lastViewedDebt) {
      setTimeout(() => {
        showDebtDetail(lastViewedDebt.id);
      }, 50);
    }
  }
}

function closePaymentModal() { 
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active');
      modal.classList.remove('closing');
      // If we came from details, ensure detail modal is still active or refresh it
      if (lastViewedDebt) {
        document.getElementById('detailModal')?.classList.add('active');
      }
    }, 150);
  }
}

function closeSpendModal() { 
  const modal = document.getElementById('spendModal');
  if (modal) {
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active');
      modal.classList.remove('closing');
      // If we came from details, ensure detail modal is still active
      if (lastViewedDebt) {
        document.getElementById('detailModal')?.classList.add('active');
      }
    }, 150);
  }
}

function closeDetailModal() { 
  const modal = document.getElementById('detailModal');
  if (modal) {
    modal.classList.add('closing');
    // Once closed, clear the back target
    lastViewedDebt = null;
    setTimeout(() => {
      modal.classList.remove('active');
      modal.classList.remove('closing');
    }, 200);
  }
}

function updateDebtModalUI(type) {
  const labelPrincipal = document.getElementById('labelPrincipal');
  const labelCurrentBalance = document.getElementById('labelCurrentBalance');
  const labelMonthlyPayment = document.getElementById('labelMonthlyPayment');
  const termGroup = document.getElementById('termGroup');
  const minGroup = document.getElementById('minPaymentGroup');
  const nameInput = document.getElementById('debtName');
  const interestTypeGroup = document.getElementById('interestTypeGroup');
  const isInstallmentCheck = document.getElementById('debtIsInstallment');
  const overpaymentGroup = document.getElementById('overpaymentOptionGroup');

  const isCard = (type === 'credit_card' || type === 'cash_card');
  const isInstallment = isInstallmentCheck.checked || !isCard;

  if (isCard) {
    if (labelPrincipal) labelPrincipal.textContent = 'วงเงินหน้าบัตร (บาท)';
    if (labelCurrentBalance) labelCurrentBalance.textContent = 'ยอดหนี้ตอนนี้ (บาท)';
    if (labelMonthlyPayment) labelMonthlyPayment.textContent = isInstallment ? 'ค่างวดรายเดือน' : 'เป้าหมายจ่ายต่อเดือน (บาท)';

    document.getElementById('debtPrincipal').placeholder = 'เช่น 50000';
    document.getElementById('debtCurrentBalance').placeholder = 'เช่น 10000 (ถ้าเป็นบัตรใหม่ใส่ 0)';

    // Toggle term and interest group based on installment status for cards
    if (termGroup) termGroup.style.display = isInstallment ? 'block' : 'none';
    if (interestTypeGroup) interestTypeGroup.style.display = isInstallment ? 'block' : 'none';
    if (minGroup) minGroup.style.display = isInstallment ? 'none' : 'block';

    if (nameInput && !nameInput.value) {
      nameInput.placeholder = type === 'credit_card' ? 'เช่น KTC Platinum, SCB M' : 'เช่น K-Express Cash, SCB Speedy';
    }
  } else {
    if (labelPrincipal) labelPrincipal.textContent = 'ยอดเงินกู้เริ่มต้น (บาท)';
    if (labelCurrentBalance) labelCurrentBalance.textContent = 'ยอดคงเหลือปัจจุบัน (บาท)';
    if (labelMonthlyPayment) labelMonthlyPayment.textContent = 'ค่างวดรายเดือน (ปกติ)';
    if (termGroup) termGroup.style.display = 'block';
    if (interestTypeGroup) interestTypeGroup.style.display = 'block';
    if (minGroup) minGroup.style.display = 'block';

    // For loans, installment is usually implicit, but we can hide the checkbox if we want,
    // or keep it to allow "overpayment" toggle.
    isInstallmentCheck.checked = true;

    if (nameInput && !nameInput.value) {
      nameInput.placeholder = 'เช่น สินเชื่อบ้าน, สินเชื่อรถ';
    }
  }
}

async function saveDebt() {
  const id = document.getElementById('debtId').value;
  const type = document.getElementById('debtType').value;
  const isCard = (type === 'credit_card' || type === 'cash_card');
  const data = {
    name: document.getElementById('debtName').value,
    type: type,
    interestType: document.getElementById('debtInterestType').value,
    principal: document.getElementById('debtPrincipal').value,
    currentBalance: document.getElementById('debtCurrentBalance').value || (isCard ? 0 : document.getElementById('debtPrincipal').value),
    annualRate: document.getElementById('debtRate').value,
    termMonths: document.getElementById('debtTerm').value,
    monthlyPayment: document.getElementById('debtMonthlyPayment').value,
    minPayment: document.getElementById('debtMinPayment').value,
    startDate: document.getElementById('debtStartDate').value,
    note: document.getElementById('debtNote').value,
    isInstallment: document.getElementById('debtIsInstallment').checked,
    allowOverpayment: document.getElementById('debtAllowOverpayment').checked,
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
  document.getElementById('paymentDebtName').innerHTML = `
    ${debt.name} 
    ${debt.allowOverpayment === false ? '<span style="font-size:10px; color:#fca5a5; background:rgba(239,68,68,0.1); padding:2px 6px; border-radius:4px; margin-left:8px;">ห้ามโปะ</span>' : ''}
  `;

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

    // Set Date with Flatpickr support
    const pDateInput = document.getElementById('paymentDate');
    if (pDateInput._flatpickr) pDateInput._flatpickr.setDate(payment.date);
    else pDateInput.value = payment.date;

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

    // Strictly use the bank's minimum rule for minPay
    const minPay = debt.type === 'credit_card'
      ? InterestEngine.calculateMinPayment(realLifeBalance, 'credit_card')
      : (debt.type === 'cash_card' ? InterestEngine.calculateMinPayment(realLifeBalance, 'cash_card') : (parseFloat(debt.minPayment) || InterestEngine.calculateMinPayment(debt.currentBalance, debt.type)));

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

function openSpendModal(debt) {
  const modal = document.getElementById('spendModal');
  document.getElementById('spendDebtId').value = debt.id;
  document.getElementById('spendDebtName').textContent = debt.name;
  document.getElementById('spendAmount').value = '';
  document.getElementById('spendFee').value = '0';
  document.getElementById('spendNote').value = '';
  if (document.getElementById('spendAddToIncome')) document.getElementById('spendAddToIncome').checked = false;

  const isRevolving = debt.type === 'credit_card' || debt.type === 'cash_card';
  const isCashCard = debt.type === 'cash_card';
  const isCreditCard = debt.type === 'credit_card';
  
  const titleEl = modal.querySelector('h3');
  if (titleEl) {
    if (isCashCard) titleEl.textContent = 'กดเงินสดเพิ่ม 💸';
    else if (isCreditCard) titleEl.textContent = 'ยอดรูดบัตรเพิ่ม 💳';
    else titleEl.textContent = 'บันทึกยอดหนี้เพิ่ม ➕';
  }

  const cashOption = document.getElementById('cashAdvanceOption');
  const feeGroup = document.getElementById('cashFeeGroup');
  const amountLabel = modal.querySelector('label[for="spendAmount"]') || modal.querySelectorAll('.form-label')[0];

  if (isCashCard || isCreditCard) {
    if (cashOption) cashOption.style.display = 'block';
    if (feeGroup) feeGroup.style.display = 'block';
  } else {
    if (cashOption) cashOption.style.display = 'none';
    if (feeGroup) feeGroup.style.display = 'none';
  }

  if (isCashCard) {
    // Cash cards are designed for withdrawal, usually no 3% fee
    if (cashOption) cashOption.style.display = 'none';
    if (feeGroup) feeGroup.style.display = 'none';
    if (amountLabel) amountLabel.textContent = 'ยอดที่กดเงิน (บาท)';
    document.getElementById('spendIsCashAdvance').checked = true; // Always true for cash card activity
  } else {
    // Credit cards have optional cash advance with fees
    if (cashOption) cashOption.style.display = 'block';
    if (feeGroup) feeGroup.style.display = 'block';
    if (amountLabel) amountLabel.textContent = 'ยอดที่รูดเพิ่ม (บาท)';
    document.getElementById('spendIsCashAdvance').checked = false;
  }

  // Update fee notice visibility
  const feeNotice = document.getElementById('cashAdvanceFeeNotice');
  if (feeNotice) {
     feeNotice.style.display = (!isCashCard && document.getElementById('spendIsCashAdvance').checked) ? 'block' : 'none';
  }

  const dateInput = document.getElementById('spendDate');
  const today = Utils.today().split('T')[0];
  if (dateInput._flatpickr) dateInput._flatpickr.setDate(today);
  else dateInput.value = today;

  modal.classList.add('active');
}

async function saveSpend() {
  const saveBtn = document.getElementById('spendSaveBtn');
  if (!saveBtn || saveBtn.disabled) return;

  const debtId = document.getElementById('spendDebtId').value;
  const data = {
    debtId: debtId,
    amount: document.getElementById('spendAmount').value,
    fee: document.getElementById('spendFee').value,
    date: document.getElementById('spendDate').value,
    note: document.getElementById('spendNote').value,
    isCashAdvance: document.getElementById('spendIsCashAdvance').checked,
    addToIncome: document.getElementById('spendAddToIncome').checked
  };

  if (!data.amount || !data.date) {
    Utils.showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner-tiny"></span> กำลังบันทึก...';
    
    await DebtModule.addSpending(data);
    Utils.showToast('บันทึกยอดเพิ่มสำเร็จ', 'success');
    
    // Close modal immediately
    closeSpendModal();
    
    // Then refresh UI
    await refreshDebts();
  } catch (e) {
    console.error('[DebtPage] Error saving spend:', e);
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'บันทึกยอดเพิ่ม';
    }
  }
}

async function savePayment() {
  const debtId = document.getElementById('paymentDebtId').value;
  const paymentId = document.getElementById('paymentId') ? document.getElementById('paymentId').value : null;
  const saveBtn = document.getElementById('paymentSaveBtn');

  const data = {
    amount: document.getElementById('paymentAmount').value,
    date: document.getElementById('paymentDate').value,
    note: document.getElementById('paymentNote').value
  };

  if (!data.amount || !data.date) {
    Utils.showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  // Update button state to show loading
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner-tiny"></span> กำลังบันทึก...';
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
      closePaymentModal();
    } else {
      await DebtModule.recordPayment(debtId, data);
      closePaymentModal();

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

    // Immediate closure of all possible modals
    closePaymentModal();
    closeSpendModal();

    try {
      await refreshDebts();
      const detailModal = document.getElementById('detailModal');
      if (detailModal && detailModal.classList.contains('active')) {
        const debt = await DebtModule.getById(debtId);
        if (debt) showDebtDetail(debt);
      }
    } catch (refreshError) {
      console.error('[DebtPage] Non-critical error refreshing UI:', refreshError);
    }
  } catch (e) {
    console.error('[DebtPage] Critical error in savePayment:', e);
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'บันทึกการชำระ';
    }
  }
}

async function deletePayment(paymentId, debtId) {
  if (!confirm('ยืนยันการลบประวัติการชำระนี้? \nระบบจะคำนวณยอดคงเหลือใหม่ทั้งหมด')) return;
  try {
    await DebtModule.deletePayment(paymentId);
    Utils.showToast('ลบประวัติการชำระสำเร็จ', 'success');
    await refreshDebts();
    const debt = await DebtModule.getById(debtId);
    if (debt) showDebtDetail(debt);
  } catch (e) {
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  }
}

async function showDebtDetail(debtOrId, scrollToHistory = false) {
  let debt;
  if (typeof debtOrId === 'string') {
    debt = await DebtModule.getById(debtOrId);
  } else {
    debt = debtOrId;
  }
  if (!debt) return;

  lastViewedDebt = debt;
  const history = await DebtModule.getHistory(debt.id);
  const isRevolving = (debt.type === 'credit_card' || debt.type === 'cash_card');
  let paid, paidPct;
  
  if (isRevolving) {
    // For cards, we track progress against the highest reached balance
    // principal is the LIMIT, so we don't use it for "paid" progress bar
    const baseline = Math.max(debt.startingBalance || 0, debt.currentBalance);
    paid = Math.max(0, baseline - debt.currentBalance);
    paidPct = baseline > 0 ? Utils.percentage(paid, baseline) : 0;
  } else {
    // For loans, principal is the original debt amount
    paid = debt.principal - debt.currentBalance;
    paidPct = Utils.percentage(paid, debt.principal);
  }

  const isCard = (debt.type === 'credit_card' || debt.type === 'cash_card');
  const availableCredit = isCard ? Math.max(0, debt.principal - debt.currentBalance) : 0;
  const utilization = isCard ? Utils.percentage(debt.currentBalance, debt.principal) : 0;

  const botConfig = InterestEngine.getBOTConfig(debt.type);
  const rateValidation = InterestEngine.validateRate(debt.annualRate, debt.type);

  const botInfoHtml = `
        <div style="border:1px solid var(--border-color); border-radius:4px; overflow:hidden; margin-top: 16px;">
          <div style="padding: 8px 12px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color); font-size: 13px; font-weight: 600; color: var(--text-secondary);">
             📜 ข้อมูลตามหลัก ธปท.
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tbody>
              ${isCard ? `
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-tertiary); width:40%; border-right:1px solid var(--border-color);">วงเงินหน้าบัตร</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right; color:var(--text-primary);">${Utils.formatCurrency(debt.principal)}</td>
              </tr>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-tertiary); border-right:1px solid var(--border-color);">วงเงินที่ใช้ได้ (คงเหลือ)</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:700; text-align:right; color:#4ade80;">${Utils.formatCurrency(availableCredit)}</td>
              </tr>
              <tr>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); color:var(--text-tertiary); border-right:1px solid var(--border-color);">สัดส่วนการใช้วงเงิน</td>
                <td style="padding:10px; border-bottom:1px solid var(--border-color); font-weight:600; text-align:right; color:${utilization > 80 ? '#f87171' : '#fcd34d'};">${utilization.toFixed(1)}%</td>
              </tr>
              ` : ''}
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

  // Payment and Spending history
  let historyHtml = '';
  if (history.length > 0) {
    historyHtml = `
      <details id="paymentHistorySection" style="background:var(--bg-tertiary); border-radius:var(--border-radius); border:1px solid rgba(255,255,255,0.05);">
        <summary style="padding:var(--space-md); cursor:pointer; font-weight:600; color:var(--text-accent); display:flex; align-items:center; justify-content:space-between; list-style:none;">
           <span style="display:flex; align-items:center; gap:6px;"><span>📜</span> ประวัติรายการ</span>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </summary>
        <div style="padding:0 var(--space-md) var(--space-md) var(--space-md);">
          <div style="background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; min-width: 400px;">
                  <thead style="background: rgba(255,255,255,0.03);">
                    <tr>
                      <th style="padding:10px; text-align:left; color:var(--text-tertiary); font-weight:500;">วันที่</th>
                      <th style="padding:10px; text-align:left; color:var(--text-tertiary); font-weight:500;">ประเภท</th>
                      <th style="padding:10px; text-align:right; color:var(--text-tertiary); font-weight:500;">จำนวน</th>
                      <th style="padding:10px; text-align:right; color:var(--text-tertiary); font-weight:500;">ยอดคงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${history.map(item => `
                      <tr style="border-top: 1px solid rgba(255,255,255,0.05);" class="clickable-history-row" onclick="${item.type === 'payment' ? `window.editPayment('${item.id}', '${debt.id}')` : `window.editSpend('${item.id}', '${debt.id}')`}" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                        <td style="padding:12px 10px; color:var(--text-secondary); white-space:nowrap;">${Utils.formatDate(item.date)}</td>
                        <td style="padding:12px 10px; white-space:nowrap;">
                           ${item.type === 'spend'
        ? `<span style="color:#fb923c; font-size:10px; background:rgba(251,146,60,0.1); padding:2px 6px; border-radius:4px; font-weight:600; white-space:nowrap;">${item.isCashAdvance ? '💸 กดเงินสด' : '🛍️ รูดเพิ่ม'}</span>`
        : `<span style="color:#4ade80; font-size:10px; background:rgba(74,222,128,0.1); padding:2px 6px; border-radius:4px; font-weight:600; white-space:nowrap;">💰 ชำระ</span>`
      }
                        </td>
                        <td style="padding:12px 10px; text-align:right; font-weight:600; color: ${item.type === 'spend' ? '#fb923c' : '#4ade80'}; white-space:nowrap;">
                          ${item.type === 'spend' ? '+' : '-'}${Utils.formatCurrency(item.amount)}
                        </td>
                        <td style="padding:12px 10px; text-align:right; font-weight:500; font-family:var(--font-mono); white-space:nowrap;">${Utils.formatCurrency(item.balanceAfter)}</td>
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
        <span style="font-weight: 600; color: #4ade80;">${Utils.formatCurrency(paid)} <span style="color:var(--text-tertiary); font-weight:normal;">/ ${Utils.formatCurrency(isRevolving ? Math.max(debt.startingBalance || 0, debt.currentBalance) : debt.principal)}</span></span>
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
    ${historyHtml}
    <!-- Action Bar: Redesigned for Symmetry and Completeness -->
    <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <!-- Primary Actions -->
        <button class="btn pay-debt-modal" style="height: 52px; font-size: 13.5px; font-weight: 700; border-radius: 12px; background: rgba(59, 130, 246, 0.05); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.25); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
          <span style="font-size: 16px;">💰</span> บันทึกจ่าย
        </button>
        
        <button class="btn spend-debt-modal" style="height: 52px; font-size: 13.5px; font-weight: 700; border-radius: 12px; background: rgba(249, 115, 22, 0.05); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.25); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
          <span style="font-size: 16px;">💳</span> ${isRevolving ? (debt.type === 'cash_card' ? 'กดเงินสด' : 'รูดเพิ่ม') : 'กู้เพิ่ม'}
        </button>

        <!-- Tool Actions -->
        <button class="btn edit-debt-modal" style="height: 52px; font-size: 13.5px; font-weight: 600; border-radius: 12px; background: rgba(255,255,255,0.02); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
          <span style="font-size: 16px; opacity: 0.8;">⚙️</span> ตั้งค่า
        </button>

        <button class="btn export-pdf-modal" style="height: 52px; font-size: 13.5px; font-weight: 600; border-radius: 12px; background: rgba(255,255,255,0.02); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
          <span style="font-size: 16px;">📄</span> Export PDF
        </button>
    </div>

    <!-- Danger Zone at the bottom -->
    <div style="margin-top: 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 12px;">
        <button class="btn delete-debt-modal" style="background: transparent; color: #f87171; border: none; font-size: 12px; font-weight: 500; opacity: 0.6; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; cursor: pointer;">
          <span style="font-size: 14px;">🗑️</span> ลบรายการหนี้สินนี้
        </button>
    </div>
  `;

  document.getElementById('detailModal').classList.add('active');
  document.getElementById('paymentDebtId').value = debt.id;

  // Add listeners for modal buttons
  const body = document.getElementById('detailBody');
  const dModal = document.getElementById('detailModal');
  
  const switchModal = (openFunc) => {
    // Keep the detail modal in the background instead of hiding it
    // to allow a seamless return experience
    openFunc();
  };

  body.querySelector('.pay-debt-modal').onclick = () => switchModal(() => openPaymentModal(debt));
  body.querySelector('.spend-debt-modal').onclick = () => switchModal(() => openSpendModal(debt));
  body.querySelector('.edit-debt-modal').onclick = () => switchModal(() => openDebtModal(debt));
  
  body.querySelector('.export-pdf-modal').onclick = async (e) => {
    const btn = e.currentTarget;
    const origText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> กำลังสร้าง PDF...';
    btn.disabled = true;
    try {
      const payments = await DebtModule.getPayments(debt.id);
      const result = await InterestEngine.generateFullSchedule(debt);
      await Utils.exportSingleDebtToPDF({ ...debt, payments }, result);
    } catch(err) {
      console.error('[DebtPage] Export PDF error:', err);
      Utils.showToast('Export ไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  };
  
  body.querySelector('.delete-debt-modal').onclick = () => {
    // Instead of window.confirm (may be blocked), show an inline confirmation UI
    const existingConfirm = body.querySelector('.delete-confirm-box');
    if (existingConfirm) { existingConfirm.remove(); return; }

    const confirmBox = document.createElement('div');
    confirmBox.className = 'delete-confirm-box';
    confirmBox.style.cssText = `
      margin-top: 12px; padding: 16px; border-radius: 12px;
      background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3);
      animation: fadeIn 0.2s ease;
    `;
    confirmBox.innerHTML = `
      <div style="font-size:13px; color:#f87171; font-weight:600; margin-bottom:10px;">
        ⚠️ ยืนยันการลบหนี้ "${debt.name}" และประวัติทั้งหมด?
      </div>
      <div style="display:flex; gap:8px;">
        <button id="confirmDeleteYes" style="flex:1; padding:10px; border-radius:8px; background:#ef4444; color:white; border:none; font-weight:700; cursor:pointer; font-size:13px;">
          🗑️ ลบเลย
        </button>
        <button id="confirmDeleteNo" style="flex:1; padding:10px; border-radius:8px; background:rgba(255,255,255,0.05); color:var(--text-secondary); border:1px solid rgba(255,255,255,0.1); font-weight:600; cursor:pointer; font-size:13px;">
          ยกเลิก
        </button>
      </div>
    `;

    // Insert after the delete button's parent div
    const dangerZone = body.querySelector('.delete-debt-modal').closest('div');
    dangerZone.after(confirmBox);

    confirmBox.querySelector('#confirmDeleteNo').onclick = () => confirmBox.remove();

    confirmBox.querySelector('#confirmDeleteYes').onclick = async () => {
      confirmBox.querySelector('#confirmDeleteYes').innerHTML = '⏳ กำลังลบ...';
      confirmBox.querySelector('#confirmDeleteYes').disabled = true;
      try {
        await DebtModule.delete(debt.id);
        lastViewedDebt = null;
        dModal.classList.remove('active');
        body.innerHTML = '';
        await refreshDebts();
        Utils.showToast('ลบรายการสำเร็จ', 'success');
      } catch(e) {
        console.error('[DebtPage] Error deleting debt:', e);
        Utils.showToast('เกิดข้อผิดพลาดในการลบ: ' + e.message, 'error');
        confirmBox.remove();
      }
    };
  };

  if (scrollToHistory) {
    setTimeout(() => {
      const historyEl = document.getElementById('paymentHistorySection');
      if (historyEl) historyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}

async function refreshDebts() {
  allDebts = await DebtModule.getAll();
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
    } else if (activeSortOrder === 'newest') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    } else if (activeSortOrder === 'oldest') {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    }

    // Fallback sort
    return (a.name || '').localeCompare(b.name || '');
  });

  // 3. Summary Stats & Predictions
  let maxMonths = 0;
  let totalMonthly = 0;

  allDebts.forEach(d => {
    if (d.status !== 'active') return;

    const balance = parseFloat(d.currentBalance || 0);
    const rate = parseFloat(d.annualRate || 0);
    const isCard = (d.type === 'credit_card' || d.type === 'cash_card');
    
    const currentMin = isCard ? InterestEngine.calculateMinPayment(balance, d.type) : (parseFloat(d.minPayment) || 0);
    const monthlyNeeded = parseFloat(d.monthlyPayment) || currentMin;
    totalMonthly += monthlyNeeded;

    // Live Interest logic
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const elapsedSeconds = (Date.now() - midnight.getTime()) / 1000;
    const fullDaysUpToMidnight = InterestEngine.daysBetween(d.lastInterestDate, midnight);

    let dailyInterest = (d.interestType === 'fixed_rate')
      ? (rate / 100 * d.principal) / 365
      : (balance * rate / 100) / 365;

    const dailyInterestVal = dailyInterest;
    const ratePerSecondVal = dailyInterest / 86400;
    const midnightBase = (d.accruedInterest || 0) + (dailyInterestVal * fullDaysUpToMidnight);

    d.interestMidnightBase = midnightBase;
    d.todayInterest = midnightBase + (ratePerSecondVal * elapsedSeconds);

    if (monthlyNeeded > 0) {
      let result;
      if (d.type === 'credit_card') result = InterestEngine.generateCreditCardSchedule(balance, rate, monthlyNeeded, d.startDate);
      else if (d.interestType === 'daily_accrual') result = InterestEngine.generateDailyAccrualSchedule(balance, rate, monthlyNeeded, d.startDate);
      else if (d.interestType === 'fixed_rate') result = InterestEngine.generateFixedRateSchedule(parseFloat(d.principal), rate, monthlyNeeded);
      else result = InterestEngine.generateAmortizationSchedule(balance, rate, monthlyNeeded);

      d.monthsToPayoff = result.totalMonths;
      if (result.totalMonths > maxMonths) maxMonths = result.totalMonths;
    }
  });

  if (debts.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>ไม่พบรายการหนี้สินตามเงื่อนไข</p></div>`;
    return;
  }

  // 4. Grouping
  const groups = {
    priority: { title: 'ลำดับชำระ', items: [], sum: 0 },
    payoff: { title: 'หนี้ลดต้นลดดอก', items: [], sum: 0 },
    installment: { title: 'หนี้ผ่อนชำระ', items: [], sum: 0 },
    credit_card: { title: 'บัตรเครดิต/บัตรกดเงินสด', items: [], sum: 0 },
    personal_loan: { title: 'สินเชื่อส่วนบุคคล', items: [], sum: 0 },
    paid: { title: 'ชำระหมดแล้ว', items: [], sum: 0 }
  };

  const isPrioritySort = (isAvalanche || isSnowball || activeSortOrder === 'smart');

  debts.forEach(d => {
    const isInst = (d.interestType === 'fixed_rate' || parseFloat(d.annualRate) === 0);
    const isPayoff = !isInst;

    if (d.status === 'paid') {
      groups.paid.items.push(d);
      groups.paid.sum += d.currentBalance || 0;
    } else {
      let assigned = false;
      if (filter === 'all') {
        if (isPayoffable && isPayoff) {
          groups.payoff.items.push(d);
          groups.payoff.sum += parseFloat(d.currentBalance);
          assigned = true;
        } else if (isInstallment && isInst) {
          groups.installment.items.push(d);
          groups.installment.sum += parseFloat(d.currentBalance);
          assigned = true;
        } else if (isPrioritySort) {
          groups.priority.items.push(d);
          groups.priority.sum += parseFloat(d.currentBalance);
          assigned = true;
        }
      }

      if (!assigned) {
        if (d.type === 'credit_card' || d.type === 'cash_card') {
          groups.credit_card.items.push(d);
          groups.credit_card.sum += parseFloat(d.currentBalance);
        } else {
          groups.personal_loan.items.push(d);
          groups.personal_loan.sum += parseFloat(d.currentBalance);
        }
      }
    }
  });

  // 5. Render
  let html = '';

  const renderGroup = (key, group, isPaidGroup = false) => {
    if (group.items.length === 0) return '';

    const listHtml = group.items.map(d => {
      const isCard = (d.type === 'credit_card' || d.type === 'cash_card');

      let paid = 0, paidPct = 0;
      if (isCard) {
        const baseline = Math.max(d.startingBalance || 0, d.currentBalance);
        paid = Math.max(0, baseline - d.currentBalance);
        paidPct = baseline > 0 ? Utils.percentage(paid, baseline) : 0;
      } else {
        paid = d.principal - d.currentBalance;
        paidPct = d.principal > 0 ? Utils.percentage(paid, d.principal) : 100;
      }

      const liveMin = isCard ? InterestEngine.calculateMinPayment(d.currentBalance, d.type) : 0;
      const paymentAmount = d.monthlyPayment || (isCard ? liveMin : d.minPayment) || 0;

      let statusColor = '#ffffff';
      if (paidPct >= 90) statusColor = '#22c55e';
      else if (paidPct >= 50) statusColor = '#fcd34d';
      else if (paidPct >= 20) statusColor = '#fb923c';

      return `
        <div class="debt-item premium-compact" onclick="window.showDebtDetailById('${d.id}')" style="padding: 12px 16px; margin-bottom: 8px;">
          <div class="item-main">
            <div class="left-content">
              <div class="debt-name" style="font-size: 14px; margin-bottom: 2px;">${d.name || 'ไม่มีชื่อ'}</div>
              <div class="debt-meta-line" style="font-size: 10px; gap: 6px;">
                <span style="opacity: 0.8;">${Utils.debtTypeName(d.type)}</span>
                <span style="opacity: 0.6;">•</span>
                <span>${d.annualRate}%</span>
                ${!isPaidGroup && d.interestType !== 'fixed_rate' ? `
                <span class="interest-tiny" style="font-size: 10px;">+<span class="live-interest-value" data-ticker-id="${d.id}" data-debt-id="${d.id}" data-rate="${d.annualRate}" data-balance="${d.currentBalance}" data-accrued-base="${d.interestMidnightBase || 0}" data-type="${d.interestType}" data-principal="${d.principal}">${(d.todayInterest || 0).toFixed(2)}</span></span>
                ` : ''}
              </div>
            </div>
            <div class="right-content">
              <div class="balance-value" style="font-size: 16px;">${Utils.formatCurrency(d.currentBalance)}</div>
              <div class="min-pay-label" style="font-size: 10px; margin-top: 1px;">
                ${isCard ? 'ขั้นต่ำ' : 'ค่างวด'}: <span class="min-pay-value">${Utils.formatCurrency(paymentAmount)}</span>
              </div>
            </div>
          </div>
          <div class="mini-progress-track" style="height: 2px;">
            <div class="mini-progress-fill" style="width: ${paidPct}%; background: ${statusColor};"></div>
          </div>
        </div>
      `;
    }).join('');

    const headerHtml = `
      <div class="debt-group-header" style="margin: 20px 0 10px 4px; display: flex; align-items: center; gap: 10px;">
           <div class="debt-group-title" style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px;">
              ${group.title} 
              <span style="opacity:0.5; font-weight:normal; margin-left: 2px;">• ${group.items.length}</span>
           </div>
           <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.05);"></div>
           <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 3px 8px; font-family: var(--font-mono, monospace); letter-spacing: -0.3px;">
             ${Utils.formatCurrency(group.sum)}
           </div>
        </div>
    `;

    if (isPaidGroup) {
      return `
        <details class="debt-group" style="margin-top:30px; opacity:0.5;">
          <summary style="cursor:pointer; font-size: 12px; font-weight:bold; color:var(--text-tertiary); margin-bottom:10px; padding: 4px;">${group.title} (${group.items.length})</summary>
          ${listHtml}
        </details>
      `;
    }

    return `<div class="debt-group">${headerHtml}${listHtml}</div>`;
  };

  // === Total Interest Summary Card ===
  const activeForInterest = allDebts.filter(d => d.status === 'active' && parseFloat(d.annualRate) > 0 && d.interestType !== 'fixed_rate');
  if (activeForInterest.length > 0) {
    let totalAccruedNow = 0;
    let totalDailyRate = 0;
    const perDebtRows = activeForInterest.map(d => {
      const daily = InterestEngine.dailyInterest(d.currentBalance, d.annualRate);
      totalDailyRate += daily;
      totalAccruedNow += (d.todayInterest || 0);
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
          <span style="font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;">${d.name}</span>
          <span style="font-size: 12px; color: #fb923c; font-family: var(--font-mono, monospace); font-weight: 600;">+${daily.toFixed(2)} ฿/วัน</span>
        </div>`;
    }).join('');

    const totalMonthlyInterest = totalDailyRate * 30;
    const totalYearlyInterest = totalDailyRate * 365;

    html += `
    <details class="interest-summary-details" style="margin-bottom: 24px; background: rgba(251, 146, 60, 0.03); border: 1px solid rgba(251, 146, 60, 0.1); border-radius: 12px; overflow: hidden;">
      <summary style="padding: 12px 16px; cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; outline: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
           <span style="font-size: 12px; font-weight: 700; color: #fb923c;">สรุปดอกเบี้ยรายวัน</span>
           <span id="totalLiveInterest" style="font-size: 14px; font-weight: 800; color: #fb923c; font-family: var(--font-mono, monospace);">+${totalAccruedNow.toFixed(2)} ฿</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </summary>

      <div style="padding: 0 16px 16px 16px; border-top: 1px dashed rgba(251, 146, 60, 0.05);">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px;">
          <div style="text-align: center;">
            <div style="font-size: 9px; color: var(--text-tertiary); margin-bottom: 2px;">วันละ</div>
            <div style="font-size: 12px; font-weight: 700; color: #fb923c;">+${totalDailyRate.toFixed(2)} ฿</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 9px; color: var(--text-tertiary); margin-bottom: 2px;">เดือนละ</div>
            <div style="font-size: 12px; font-weight: 700; color: #f87171;">+${totalMonthlyInterest.toFixed(0)} ฿</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 9px; color: var(--text-tertiary); margin-bottom: 2px;">ปีละ</div>
            <div style="font-size: 12px; font-weight: 700; color: #ef4444;">+${Utils.formatNumber(totalYearlyInterest)} ฿</div>
          </div>
        </div>
      </div>
    </details>`;
  }

  html += renderGroup('priority', groups.priority);
  html += renderGroup('payoff', groups.payoff);
  html += renderGroup('installment', groups.installment);
  html += renderGroup('credit_card', groups.credit_card);
  html += renderGroup('personal_loan', groups.personal_loan);
  html += renderGroup('paid', groups.paid, true); // Render paid as details

  container.innerHTML = html;

  // 6. Update Summary Metrics in DOM
  const totalDebtEl = document.getElementById('totalDebtValue');
  if (totalDebtEl) {
    const totalActiveBalance = allDebts.filter(d => d.status === 'active').reduce((sum, d) => sum + parseFloat(d.currentBalance || 0), 0);
    totalDebtEl.textContent = amountsVisible ? Utils.formatCurrency(totalActiveBalance) : '••••••';
  }

  const totalMonthlyEl = document.getElementById('totalMonthlyPayment');
  if (totalMonthlyEl) {
    totalMonthlyEl.textContent = amountsVisible ? Utils.formatCurrency(totalMonthly) : '••••••';
  }

  const payoffEl = document.getElementById('estimatedPayoffDateNew');
  if (payoffEl) {
    if (maxMonths > 0) {
      payoffEl.textContent = Utils.formatMonthYear(Utils.addMonths(new Date(), maxMonths));
      payoffEl.style.color = 'var(--text-accent)';
    } else {
      payoffEl.textContent = 'ไม่มีหนี้';
      payoffEl.style.color = 'var(--text-tertiary)';
    }
  }


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

  container.querySelectorAll('.spend-debt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const debt = allDebts.find(d => String(d.id) === String(btn.dataset.id));
      if (debt) openSpendModal(debt);
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

  container.querySelectorAll('.prediction-trigger').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const debt = allDebts.find(d => String(d.id) === String(btn.dataset.id));
      if (debt) openPredictionModal(debt);
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
  // Start ticker after rendering
  startInterestTicker();
}

// === Live Interest Ticker ===
function startInterestTicker() {
  stopInterestTicker();

  // Get midnight of current day
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  interestTickerInterval = setInterval(() => {
    const tickers = document.querySelectorAll('.live-interest-value');
    if (tickers.length === 0) {
      stopInterestTicker();
      return;
    }

    // Calculate elapsed seconds since midnight
    const elapsedSeconds = (Date.now() - midnight.getTime()) / 1000;
    let totalLiveInterest = 0;

    tickers.forEach(ticker => {
      const debtId = ticker.dataset.debtId;
      const rate = parseFloat(ticker.dataset.rate) || 0;
      const balance = parseFloat(ticker.dataset.balance) || 0;
      const principal = parseFloat(ticker.dataset.principal) || balance;
      const accruedBase = parseFloat(ticker.dataset.accruedBase) || 0; // Midnight baseline
      const isFixed = ticker.dataset.type === 'fixed_rate';

      // Interest per second calculation matched with backend
      let dailyInterest;
      if (isFixed) {
        dailyInterest = (rate / 100 * principal) / 365;
      } else {
        dailyInterest = (balance * rate / 100) / 365;
      }

      const perSecond = dailyInterest / 86400;
      const liveInterest = accruedBase + (perSecond * elapsedSeconds);
      
      // Update the inline ticker
      ticker.textContent = `+${liveInterest.toFixed(2)}`;

      // We only want to add to total if it's a "real" debt ticker, 
      // not a copy if there are multiple. But since we use debtId, we can track.
      // For simplicity, we'll just sum all but that might double count if there are multiple views.
      // However, usually there's only one per debt in the list.
    });

    // Recalculate total from scratch to be safer instead of summing potentially multiple tickers
    let summedTotal = 0;
    const processedDebts = new Set();
    tickers.forEach(t => {
       const dId = t.dataset.debtId;
       if (!processedDebts.has(dId)) {
          const rate = parseFloat(t.dataset.rate) || 0;
          const balance = parseFloat(t.dataset.balance) || 0;
          const principal = parseFloat(t.dataset.principal) || balance;
          const accruedBase = parseFloat(t.dataset.accruedBase) || 0;
          const isFixed = t.dataset.type === 'fixed_rate';
          const daily = isFixed ? (rate / 100 * principal) / 365 : (balance * rate / 100) / 365;
          summedTotal += (accruedBase + (daily / 86400 * elapsedSeconds));
          processedDebts.add(dId);
       }
    });
    totalLiveInterest = summedTotal;

    // Update total summary if exists
    const totalEl = document.getElementById('totalLiveInterest');
    if (totalEl) {
      totalEl.textContent = `+${totalLiveInterest.toFixed(2)} ฿`;
    }
  }, 1000); // Tick every second for true real-time feel
}

function stopInterestTicker() {
  if (interestTickerInterval) {
    clearInterval(interestTickerInterval);
    interestTickerInterval = null;
  }
  tickerStartTime = null;
}

// Clean up ticker when leaving page
window.addEventListener('hashchange', () => {
  if (!window.location.hash.includes('debts')) {
    stopInterestTicker();
  }
});

// --- Payment Modal What-If Logic ---
function setupModalWhatIfSimulation(debt, existingPayment) {
  const container = document.getElementById('paymentWhatIfContainer');
  const amountInput = document.getElementById('paymentAmount');
  const slider = document.getElementById('paymentWhatIfSlider');
  const resultEl = document.getElementById('paymentWhatIfResult');

  const whatIfInput = document.getElementById('paymentWhatIfInput');

  // Hide if editing existing, debt is fully paid, or overpayment is forbidden
  if (existingPayment || !debt || debt.status === 'paid' || debt.allowOverpayment === false) {
    container.style.display = 'none';
    if (amountInput) {
      amountInput.oninput = null; // Clear old bindings
      amountInput.onblur = null;
    }
    return;
  }

  // Use the same interest-adjusted balance logic for the simulator's mandatory minimum
  const daysSinceLast = InterestEngine.daysBetween(debt.lastInterestDate, Utils.today());
  let newInterest = 0;
  if (debt.interestType === 'fixed_rate') {
    newInterest = (debt.annualRate / 100 * debt.principal) / 365 * daysSinceLast;
  } else {
    newInterest = InterestEngine.dailyAccrual(debt.currentBalance, debt.annualRate, daysSinceLast);
  }
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
    if (val < sliderMin) {
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
    if (!isNaN(val)) {
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

// Global functions for inline Event Handlers
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
};

window.editPayment = function (paymentId, debtId) {
  if (!debtId || !paymentId) return;
  DebtModule.getPayments(debtId).then(payments => {
    const payment = payments.find(p => String(p.id) === String(paymentId));
    if (payment) {
      DebtModule.getById(debtId).then(debtObj => {
        if (debtObj) openPaymentModal(debtObj, payment);
      });
    }
  });
};

window.openPredictionModal = function(debt) {
  const modal = document.getElementById('predictionModal');
  const body = document.getElementById('predictionModalBody');
  if (!modal || !body) return;

  const isCard = (debt.type === 'credit_card' || debt.type === 'cash_card');
  const result = debt.predictionResult;
  
  let contentHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 40px; margin-bottom: 10px;">📊</div>
      <h4 style="margin: 0; color: var(--text-primary); font-size: 18px;">${debt.name}</h4>
      <p style="margin: 5px 0 0; color: var(--text-tertiary); font-size: 13px;">วิเคราะห์แผนการชำระและดอกเบี้ยคาดการณ์</p>
    </div>
    
    <div style="background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 15px; color: var(--text-tertiary); font-size: 14px;">ยอดหนี้ปัจจุบัน</td>
            <td style="padding: 15px; text-align: right; font-weight: 700; color: var(--text-primary); font-size: 16px;">${Utils.formatCurrency(debt.currentBalance)}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 15px; color: var(--text-tertiary); font-size: 14px;">อัตราดอกเบี้ย/ปี</td>
            <td style="padding: 15px; text-align: right; font-weight: 600; color: #fb923c;">${debt.annualRate}%</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 15px; color: var(--text-tertiary); font-size: 14px;">วิธีคิดดอกเบี้ย</td>
            <td style="padding: 15px; text-align: right; font-weight: 500; font-size: 13px;">${Utils.interestTypeName(debt.interestType)}</td>
          </tr>
  `;

  if (result) {
    contentHtml += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(34, 197, 94, 0.05);">
            <td style="padding: 15px; color: #4ade80; font-weight: 600;">ระยะเวลาที่เหลือ</td>
            <td style="padding: 15px; text-align: right; font-weight: 800; color: #4ade80; font-size: 18px;">${result.totalMonths} เดือน</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(239, 68, 68, 0.05);">
            <td style="padding: 15px; color: #f87171; font-weight: 600;">ดอกเบี้ยรวมคาดการณ์</td>
            <td style="padding: 15px; text-align: right; font-weight: 800; color: #f87171; font-size: 18px;">${Utils.formatCurrency(result.totalInterest)}</td>
          </tr>
          <tr style="background: rgba(255, 255, 255, 0.02);">
            <td style="padding: 15px; color: var(--text-tertiary);">จะหมดหนี้ประมาณ</td>
            <td style="padding: 15px; text-align: right; font-weight: 700; color: var(--text-accent);">${Utils.formatMonthYear(Utils.addMonths(new Date(), result.totalMonths))}</td>
          </tr>
    `;
  } else {
    contentHtml += `
          <tr>
            <td colspan="2" style="padding: 20px; text-align: center; color: var(--text-tertiary); font-size: 13px;">
              ⚠️ ไม่สามารถคำนวณคาดการณ์ได้<br>เนื่องจากยังระบุเป้าหมายการจ่ายไม่ชัดเจน
            </td>
          </tr>
    `;
  }

  contentHtml += `
        </tbody>
      </table>
    </div>
    
    <div style="padding: 12px; background: rgba(251, 146, 60, 0.1); border-radius: 8px; border: 1px solid rgba(251, 146, 60, 0.2); font-size: 12px; color: #fb923c; line-height: 1.5;">
      💡 <b>คำแนะนำ:</b> ยอดดอกเบี้ยรวมนี้คำนวณจากการที่คุณจ่าย <b>${Utils.formatCurrency(debt.paymentAmountForCalc)}</b> สม่ำเสมอทุกเดือนโดยไม่รูดเพิ่ม หากคุณโปะเพิ่ม ดอกเบี้ยจะลดลงกว่านี้อีกครับ!
    </div>
  `;

  body.innerHTML = contentHtml;
  modal.classList.add('active');
};

window.closePredictionModal = function() {
  const modal = document.getElementById('predictionModal');
  if (modal) modal.classList.remove('active');
};

window.showDebtDetailById = async function(debtId) {
  if (!debtId) return;
  try {
    const debt = await DebtModule.getById(debtId);
    if (debt) showDebtDetail(debt, false);
    else Utils.showToast('ไม่พบข้อมูลหนี้', 'error');
  } catch (e) {
    console.error('[DebtPage] Error in showDebtDetailById:', e);
  }
};
