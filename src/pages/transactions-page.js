// Transactions Page
import { TransactionModule } from '../modules/transactions.js';
import { Utils } from '../modules/utils.js';
import { AIModule } from '../modules/ai.js';

let currentFilters = {};
let currentDetailTxn = null;
let currentCategoryView = null; // Track if we are viewing a category detail full-screen
let cachedTxns = []; // Cache for event delegation
let refreshHandler = null; // To avoid stacking event listeners

// Voice typing uses native keyboard, no browser mic APIs needed.
export async function renderTransactionsPage(container) {
  const categories = await TransactionModule.getCategories();
  const { start, end } = Utils.getTodayRange();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>รายรับ - รายจ่าย</h2>
        <p class="subtitle">บันทึกและติดตามรายรับ-รายจ่ายของคุณ</p>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-secondary" id="openBulkDeleteBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6L18 20a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
            <span style="color: var(--accent-danger);">เลือกลบ</span>
        </button>
        <button class="btn btn-secondary" id="exportReceiptBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Export PDF
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div id="txnSummaryCards"></div>

    <!-- Filters -->
    <!-- Period Selector -->
    <div style="display:flex; gap:6px; margin-bottom:10px; padding-bottom:5px;">
        <button class="btn btn-primary period-btn active" data-period="today" style="flex:1; padding:6px 2px; font-size:12px; border-radius:16px; justify-content:center;">วันนี้</button>
        <button class="btn btn-outline period-btn" data-period="week" style="flex:1; padding:6px 2px; font-size:12px; border-radius:16px; justify-content:center;">สัปดาห์นี้</button>
        <button class="btn btn-outline period-btn" data-period="month" style="flex:1; padding:6px 2px; font-size:12px; border-radius:16px; justify-content:center;">เดือนนี้</button>
        <button class="btn btn-outline period-btn" data-period="year" style="flex:1; padding:6px 2px; font-size:12px; border-radius:16px; justify-content:center;">ปีนี้</button>
        <button class="btn btn-outline period-btn" data-period="all" style="flex:1; padding:6px 2px; font-size:12px; border-radius:16px; justify-content:center;">ทั้งหมด</button>
    </div>


    <!-- Filters -->
    <details style="margin-bottom: 20px; background: var(--bg-card); border-radius: var(--border-radius-lg); border: 1px solid var(--border-color);">
      <summary style="padding: 12px 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 500; color: var(--text-secondary); list-style: none; outline: none; user-select: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>ตัวกรอง และค้นหา...</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </summary>
      <div style="display: grid; grid-template-columns: 1fr; gap: 10px; padding: 0 15px 15px 15px;">
        <div style="height: 1px; background: var(--border-color); margin: 0 -15px 5px -15px;"></div>
        <div class="date-range-group" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin: 0;">
          <input type="date" class="date-no-border" id="filterStartDate" value="${start}" style="text-align: center; flex: 1;">
          <span style="padding: 0 10px; color: var(--text-tertiary); font-weight: bold;">-</span>
          <input type="date" class="date-no-border" id="filterEndDate" value="${end}" style="text-align: center; flex: 1;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <select class="form-select" id="filterType" style="width: 100%;">
            <option value="">ทุกประเภท</option>
            <option value="income">รายรับ</option>
            <option value="expense">รายจ่าย</option>
          </select>
          <select class="form-select" id="filterCategory" style="width: 100%;">
            <option value="">ทุกหมวดหมู่</option>
            ${categories.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="search-input" style="width: 100%;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="filterSearch" placeholder="ค้นหา..." style="padding-left:36px; width: 100%;">
        </div>
      </div>
    </details>

    <!-- Table -->
    <!-- Collapsible Transaction List -->
    <details class="txn-list-details" id="txnListDetails" open>
      <summary class="btn" style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md); padding: 12px 16px; background: rgba(255,255,255,0.03);">
        <div style="display:flex; align-items:center; gap:10px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><polyline points="6 9 12 15 18 9"></polyline></svg>
          <span style="font-weight:bold; opacity: 0.9;">📋 แสดงรายการทั้งหมด</span>
        </div>
        <button class="btn btn-primary" id="printReceiptBtn" style="padding: 7px 18px; font-size: 13px; font-weight: 600; height: auto; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); display: flex; align-items: center; gap: 6px; margin-right: 2px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          ปริ๊นใบเสร็จ
        </button>
      </summary>
      <div id="transactionsTable"></div>
    </details>

    <!-- Modal -->
    <div class="modal-overlay" id="txnModal" style="z-index: 1100;">
      <div class="modal">
        <div class="modal-header">
          <h3 id="txnModalTitle">เพิ่มรายการ</h3>
          <button class="modal-close" id="txnModalClose">&times;</button>
        </div>
        <div class="modal-body">
          <form id="txnForm">
            <input type="hidden" id="txnId">
            <div class="tabs" id="txnTypeTabs">
              <button type="button" class="tab-btn active" data-type="expense">รายจ่าย</button>
              <button type="button" class="tab-btn" data-type="income">รายรับ</button>
            </div>
            <div class="voice-typing-container" style="margin-bottom: var(--space-md);">
              <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                 พิมพ์ด้วยเสียง (กดไมค์ที่คีย์บอร์ดชั่วคราว)
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="aiVoiceInput" class="form-input" placeholder="เช่น ซื้อกาแฟ 60 บาท..." style="flex: 1;">
                <button type="button" id="aiVoiceSubmitBtn" class="btn btn-primary" style="white-space: nowrap; padding: 4px 12px; font-size: 12px; height: auto;">ส่งให้ AI</button>
              </div>
            </div>
            <input type="hidden" id="txnType" value="expense">
            <div class="form-group">
                <label class="form-label">หมายเหตุ (ชื่อรายการ)</label>
                <input type="text" class="form-input" id="txnNote" placeholder="ระบุชื่อรายการ...">
            </div>
            <div class="form-group">
                <label class="form-label">จำนวน</label>
                <input type="number" class="form-input" id="txnQuantity" step="1" min="1" value="1" inputmode="numeric">
            </div>
            <div class="form-group">
                <label class="form-label">ราคาต่อหน่วย</label>
                <input type="number" class="form-input" id="txnUnitPrice" step="0.01" min="0" placeholder="0.00" inputmode="decimal">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">รวมเป็นเงิน (บาท)</label>
                <input type="number" class="form-input" id="txnAmount" step="0.01" min="0" required inputmode="decimal">
              </div>
              <div class="form-group">
                <label class="form-label">วันที่ (ว/ด/ป) & เวลา</label>
                <input type="text" class="form-input" id="txnDate" required>
              </div>
            </div>
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="form-label" style="margin-bottom: 0;">หมวดหมู่</label>
                <button type="button" class="btn btn-sm btn-outline" id="manageCategoryBtn" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; border: none; background: rgba(255,255,255,0.05);">
                   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                   จัดการ
                </button>
              </div>
              <select class="form-select" id="txnCategory" required>
                <option value="">เลือกหมวดหมู่</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer" style="padding-top: 0; justify-content: space-between; align-items: center;">
          <button class="btn btn-danger" id="txnDeleteBtn" style="display:none;">ลบ</button>
          <div style="display: flex; gap: 8px; margin-left: auto;">
            <button class="btn" id="txnCancelBtn">ปิด</button>
            <button class="btn" id="txnSaveNextBtn">บันทึก & ต่อ</button>
            <button class="btn btn-primary" id="txnSaveBtn">บันทึก</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" id="txnDetailModal">
      <div class="modal">
        <div class="modal-header">
          <h3>รายละเอียดรายการ</h3>
          <button class="modal-close" id="txnDetailModalClose">&times;</button>
        </div>
        <div class="modal-body" id="txnDetailBody">
          <!-- Content injected via JS -->
        </div>
        <div class="modal-footer">
          <button class="btn" id="txnDetailCloseBtn">ปิด</button>
          <button class="btn btn-primary" id="txnDetailEditBtn">แก้ไข</button>
        </div>
      </div>
    </div>

    <!-- Category Detail Modal -->
    <div class="modal-overlay" id="categoryDetailModal">
      <div class="modal" style="width:100%; height:100%; max-width:100%; max-height:100%; border-radius:0; display:flex; flex-direction:column; overflow:hidden;">
        <div class="modal-header" style="flex-shrink:0; border-bottom: 1px solid rgba(255,255,255,0.05); background: var(--bg-primary);">
          <h3 id="categoryDetailTitle">รายการในหมวดหมู่</h3>
          <button class="modal-close" id="categoryDetailModalClose">&times;</button>
        </div>
        <div class="modal-body" id="categoryDetailBody" style="flex:1; overflow-y:auto; padding-bottom:100px;">
          <!-- Content injected via JS -->
        </div>
      </div>
    </div>

    <!-- Manage Categories Modal -->
    <div class="modal-overlay" id="manageCategoryModal" style="z-index: 1200;">
      <div class="modal">
        <div class="modal-header">
          <h3>จัดการหมวดหมู่</h3>
          <button class="modal-close" id="manageCategoryModalClose">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tabs" id="manageCatTypeTabs" style="margin-bottom: 10px;">
            <button type="button" class="tab-btn active" data-type="expense">รายจ่าย</button>
            <button type="button" class="tab-btn" data-type="income">รายรับ</button>
          </div>
          
          <div style="display: flex; gap: 8px; margin-bottom: 15px;">
             <input type="text" id="newCatIconi" class="form-input" placeholder="🍔" style="width: 50px; text-align: center;">
             <input type="text" id="newCatName" class="form-input" placeholder="ชื่อหมวดหมู่ใหม่..." style="flex: 1;">
             <button class="btn btn-primary" id="addNewCatBtn">+</button>
          </div>

          <div id="catListContainer" style="max-height: 60vh; min-height: 250px; overflow-y: auto; background: var(--bg-tertiary); border-radius: var(--border-radius); padding: 5px;">
             <!-- Categories will be injected here -->
          </div>
        </div>
      </div>
    </div>
    
    <!-- AI Receipt Confirmation Modal -->
    <div class="ai-receipt-overlay" id="aiReceiptOverlay">
      <div class="ai-receipt-paper">
        <div class="ai-receipt-header">
          <h3>บันทึกสำเร็จ?</h3>
          <div style="font-size: 10px; opacity: 0.5; margin-top: 5px;" id="aiReceiptDateTime">AI PREVIEW RECEIPT</div>
        </div>
        <div class="ai-receipt-body">
          <div class="ai-receipt-row">
            <span class="ai-receipt-label">รายการ</span>
            <div class="ai-receipt-dots"></div>
            <span class="ai-receipt-value" id="aiReceiptNote">-</span>
          </div>
          <div class="ai-receipt-row">
            <span class="ai-receipt-label">หมวดหมู่</span>
            <div class="ai-receipt-dots"></div>
            <span class="ai-receipt-value" id="aiReceiptCategory">-</span>
          </div>
          <div class="ai-receipt-row" style="margin-top: 20px;">
            <span class="ai-receipt-label">ยอดรวม</span>
            <div class="ai-receipt-dots"></div>
            <span class="ai-receipt-value amount" id="aiReceiptAmount">0.00</span>
          </div>
          <div id="aiReceiptQtyRow" class="ai-receipt-row" style="display:none;">
            <span class="ai-receipt-label">จำนวน</span>
            <div class="ai-receipt-dots"></div>
            <span class="ai-receipt-value" id="aiReceiptQty">1</span>
          </div>
        </div>
        <div class="ai-receipt-footer">
          <div class="btn-group">
            <button class="btn btn-receipt-edit" id="receiptEditBtn">⚙️ แก้ไขเอง</button>
            <button class="btn btn-receipt-confirm" id="receiptConfirmBtn">✅ บันทึกเลย</button>
          </div>
          <button class="btn btn-receipt-cancel" id="receiptCancelBtn">ยกเลิก</button>
        </div>
      </div>
    </div>
    <!-- Bulk Delete Modal -->
    <div class="modal-overlay" id="bulkDeleteModal" style="z-index: 1300;">
      <div class="modal" style="width:100%; height:100%; max-width:100%; max-height:100%; border-radius:0; display:flex; flex-direction:column; overflow:hidden;">
        <div class="modal-header" style="flex-shrink:0; border-bottom: 1px solid rgba(255,255,255,0.05); background: var(--bg-primary);">
          <h3>เลือกลบหลายรายการ</h3>
          <button class="modal-close" id="bulkDeleteModalClose">&times;</button>
        </div>
        <div class="modal-body" style="flex:1; overflow-y:auto; padding:0; background: var(--bg-secondary);">
          <div style="padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; position: sticky; top: 0; background: var(--bg-secondary); z-index: 10;">
             <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                 <input type="checkbox" id="bulkSelectAllCheckbox" style="width: 18px; height: 18px;">
                 <span style="font-weight: 500;">เลือกทั้งหมด</span>
             </label>
             <span id="bulkSelectedCount" style="color: var(--text-tertiary);">เลือก 0 รายการ</span>
          </div>
          <div id="bulkDeleteListContainer" style="padding: 10px;">
             <!-- Transaction List for deletion will be injected here -->
          </div>
        </div>
        <div class="modal-footer" style="flex-shrink:0; border-top: 1px solid var(--border-color); justify-content: space-between; background: var(--bg-primary);">
           <button class="btn btn-secondary" id="bulkDeleteCancelBtn">ยกเลิก</button>
           <button class="btn btn-danger" id="bulkDeleteConfirmBtn" disabled>ลบที่เลือก (0)</button>
        </div>
      </div>
    </div>
  `;
  setupTransactionEvents();
  currentFilters = { startDate: start, endDate: end };

  // Remove old refresh handler if exists, then add new one
  if (refreshHandler) {
    window.removeEventListener('refresh-transactions', refreshHandler);
  }
  refreshHandler = () => refreshTransactions();
  window.addEventListener('refresh-transactions', refreshHandler);

  await refreshTransactions();

  // Check if we should auto-open the Add Transaction modal (triggered from Dashboard FAB)
  if (sessionStorage.getItem('triggerAddTxn') === 'true') {
    sessionStorage.removeItem('triggerAddTxn');
    setTimeout(() => {
      openTxnModal();
    }, 400); // Wait for potential animations/renders
  }
}

function setupTransactionEvents() {
  // Persistent Event Delegation — attached to document so it survives innerHTML replacements
  document.addEventListener('click', async (e) => {
    const target = e.target;

    // Only handle clicks inside #transactionsTable
    const tableEl = document.getElementById('transactionsTable');
    if (!tableEl || !tableEl.contains(target)) return;

    // Handle Mobile Edit Overlay (Invisible Button)
    if (target.classList.contains('mobile-edit-overlay')) {
      e.stopPropagation();
      const txnId = target.dataset.id;
      const all = await TransactionModule.getAll({});
      const txn = all.find(t => String(t.id) === String(txnId));
      if (txn) {
        if (navigator.vibrate) navigator.vibrate(50);
        openTxnModal(txn);
      }
      return;
    }

    // Handle Button Clicks (Edit/Delete)
    const btn = target.closest('button');
    if (btn) {
      if (btn.classList.contains('edit-txn')) {
        e.stopPropagation();
        const txnId = btn.dataset.id;
        const all = await TransactionModule.getAll({});
        const txn = all.find(t => String(t.id) === String(txnId));
        if (txn) openTxnModal(txn);
        return;
      }
      if (btn.classList.contains('delete-txn')) {
        e.stopPropagation();
        if (confirm('คุณต้องการลบรายการนี้?')) {
          const txnId = btn.dataset.id;
          await TransactionModule.delete(txnId);
          Utils.showToast('ลบรายการสำเร็จ', 'success');
          await refreshTransactions();
        }
        return;
      }
    }

    // Handle Row Click (View Details)
    const row = target.closest('.txn-row');
    if (row && !btn) {
      const txnId = row.dataset.id;
      const all = await TransactionModule.getAll({});
      const txn = all.find(t => String(t.id) === String(txnId));
      if (txn) {
        if (navigator.vibrate) navigator.vibrate(30);
        openTxnDetail(txn);
      }
    }
  });

  // Handle Add Transaction and Print buttons via delegation since they can be dynamic/repositioned
  document.addEventListener('click', (e) => {
    const target = e.target;

    if (target.id === 'addTransactionBtn' || target.closest('#addTransactionBtn')) {
      e.preventDefault();
      e.stopPropagation();
      openTxnModal();
    }

    if (target.id === 'printReceiptBtn' || target.closest('#printReceiptBtn')) {
      e.preventDefault();
      e.stopPropagation();
      showPrintReceiptModal();
    }
  });

  // AI Voice Typing Logic helpers
  const aiVoiceSubmitBtn = document.getElementById('aiVoiceSubmitBtn');
  const aiVoiceInput = document.getElementById('aiVoiceInput');

  function setSimulatedVoiceState(state) {
    if (!aiVoiceSubmitBtn) return;
    if (state === 'analyzing') {
      aiVoiceSubmitBtn.innerHTML = `กำลังประมวลผล...`;
      aiVoiceSubmitBtn.disabled = true;
      aiVoiceSubmitBtn.classList.add('ai-analyzing');
      if (aiVoiceInput) aiVoiceInput.disabled = true;
    } else {
      aiVoiceSubmitBtn.innerHTML = `ส่งให้ AI`;
      aiVoiceSubmitBtn.disabled = false;
      aiVoiceSubmitBtn.classList.remove('ai-analyzing');
      if (aiVoiceInput) aiVoiceInput.disabled = false;
    }
  }

  async function fillFormWithAiData(parsed) {
    if (parsed.type) {
      document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.type === parsed.type);
      });
      document.getElementById('txnType').value = parsed.type;
      await updateCategoryOptions(parsed.type);
    }
    if (parsed.amount) document.getElementById('txnAmount').value = parsed.amount;
    if (parsed.quantity) document.getElementById('txnQuantity').value = parsed.quantity;
    else document.getElementById('txnQuantity').value = 1;

    if (parsed.unitPrice) {
      document.getElementById('txnUnitPrice').value = parsed.unitPrice;
    } else {
      const currentQty = parseFloat(document.getElementById('txnQuantity').value) || 1;
      if (currentQty === 1 && parsed.amount) {
        document.getElementById('txnUnitPrice').value = parsed.amount;
      } else {
        document.getElementById('txnUnitPrice').value = '';
      }
    }
    if (parsed.note) document.getElementById('txnNote').value = parsed.note;

    if (parsed.category) {
      const catSelect = document.getElementById('txnCategory');
      const aiCat = parsed.category.trim();
      console.log('[AI] Trying to match category:', aiCat, 'Options:', Array.from(catSelect.options).map(o => o.value));

      // Try exact match first
      let matched = Array.from(catSelect.options).find(o => {
        if (!o.value) return false;
        return o.value === aiCat;
      });

      // Try partial match (includes)
      if (!matched) {
        matched = Array.from(catSelect.options).find(o => {
          if (!o.value) return false;
          const optVal = o.value.trim().toLowerCase();
          const optText = o.textContent.trim().toLowerCase();
          const target = aiCat.toLowerCase();
          return optVal.includes(target) || optText.includes(target) || target.includes(optVal);
        });
      }

      // Fallback: try "อื่นๆ", or first non-empty option
      if (!matched) {
        matched = Array.from(catSelect.options).find(o => o.value === 'อื่นๆ');
      }
      if (!matched) {
        matched = Array.from(catSelect.options).find(o => o.value !== '');
      }

      if (matched) {
        catSelect.value = matched.value;
        console.log('[AI] Category matched:', matched.value);
      }
    }
  }

  window.processAudio = async (text) => {
    if (window._isVoiceProcessing) return;
    window._isVoiceProcessing = true;
    setSimulatedVoiceState('analyzing');
    try {
      const parsed = await AIModule.parseTransaction(text);
      // Show Receipt Modal
      const overlay = document.getElementById('aiReceiptOverlay');
      if (overlay) {
        document.getElementById('aiReceiptNote').textContent = parsed.note || '-';
        document.getElementById('aiReceiptAmount').textContent = Utils.formatNumber(parsed.amount);
        document.getElementById('aiReceiptCategory').textContent = parsed.category || 'อื่นๆ';

        // Add current date/time to receipt preview
        const now = new Date();
        const formattedDate = now.toLocaleDateString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit' }) + ' ' + now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('aiReceiptDateTime').textContent = formattedDate;

        const qtyRow = document.getElementById('aiReceiptQtyRow');
        if (parsed.quantity && parsed.quantity > 1) {
          qtyRow.style.display = 'flex';
          document.getElementById('aiReceiptQty').textContent = parsed.quantity;
        } else {
          qtyRow.style.display = 'none';
        }
      }
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

      // Fill the form FIRST, then show receipt
      await fillFormWithAiData(parsed);

      if (overlay) {
        overlay.classList.add('active');

        // Auto-save logic
        if (window._aiReceiptTimer) clearTimeout(window._aiReceiptTimer);
        window._aiReceiptTimer = setTimeout(() => {
          const receiptConfirmBtn = document.getElementById('receiptConfirmBtn');
          if (receiptConfirmBtn && overlay.classList.contains('active')) {
            receiptConfirmBtn.click();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('AI Processing Error:', error);
      Utils.showToast('ไม่สามารถวิเคราะห์ข้อมูลด้วย AI ได้ กรุณาลองใหม่', 'danger');
    } finally {
      setSimulatedVoiceState('reset');
      if (aiVoiceInput) aiVoiceInput.value = ''; // clear input
      window._isVoiceProcessing = false;
    }
  };

  if (aiVoiceSubmitBtn && aiVoiceInput) {
    aiVoiceSubmitBtn.addEventListener('click', () => {
      // Consume the continuous flag passed from saveTxn
      window._isContinuousAi = window._nextClickIsContinuous || false;
      window._nextClickIsContinuous = false; // Reset for next time

      const text = aiVoiceInput.value.trim();
      if (text) {
        processAudio(text);
      } else {
        // If empty, auto focus it for them to type
        aiVoiceInput.focus();
      }
    });

    aiVoiceInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        aiVoiceSubmitBtn.click();
      }
    });
  }

  // Receipt Button Listeners (Set once per render)
  const receiptConfirmBtn = document.getElementById('receiptConfirmBtn');
  if (receiptConfirmBtn) {
    receiptConfirmBtn.addEventListener('click', () => {
      if (window._aiReceiptTimer) {
        clearTimeout(window._aiReceiptTimer);
        window._aiReceiptTimer = null;
      }

      const overlay = document.getElementById('aiReceiptOverlay');
      if (overlay) overlay.classList.remove('active');

      window._preventNormalReceiptPopup = true;

      // If we are in continuous mode, trigger Save & Next, else Save & Close
      if (window._isContinuousAi) {
        const saveNextBtn = document.getElementById('txnSaveNextBtn');
        if (saveNextBtn) saveNextBtn.click();
      } else {
        const saveBtn = document.getElementById('txnSaveBtn');
        if (saveBtn) saveBtn.click();
      }
    });
  }

  const receiptCancelBtn = document.getElementById('receiptCancelBtn');
  if (receiptCancelBtn) {
    receiptCancelBtn.addEventListener('click', () => {
      if (window._aiReceiptTimer) {
        clearTimeout(window._aiReceiptTimer);
        window._aiReceiptTimer = null;
      }

      const overlay = document.getElementById('aiReceiptOverlay');
      if (overlay) overlay.classList.remove('active');
    });
  }

  const receiptEditBtn = document.getElementById('receiptEditBtn');
  if (receiptEditBtn) {
    receiptEditBtn.addEventListener('click', () => {
      if (window._aiReceiptTimer) {
        clearTimeout(window._aiReceiptTimer);
        window._aiReceiptTimer = null;
      }

      const overlay = document.getElementById('aiReceiptOverlay');
      if (overlay) overlay.classList.remove('active');
      document.getElementById('txnNote').focus();
    });
  }


  // Initialize Flatpickr
  if (typeof flatpickr !== 'undefined') {
    flatpickr("#txnDate", {
      enableTime: true,
      dateFormat: "d/m/Y H:i",
      time_24hr: true,
      locale: "th",
      defaultDate: new Date(),
      disableMobile: true
    });
    flatpickr("#filterStartDate", {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      disableMobile: true,
      locale: "th"
    });
    flatpickr("#filterEndDate", {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      disableMobile: true,
      locale: "th"
    });
  } else {
    console.warn("Flatpickr not loaded");
  }

  // Close modal
  document.getElementById('txnModalClose').addEventListener('click', closeTxnModal);
  document.getElementById('txnCancelBtn').addEventListener('click', closeTxnModal);
  document.getElementById('txnModal').addEventListener('click', (e) => {
    if (e.target.id === 'txnModal') closeTxnModal();
  });

  // Detail Modal Events
  document.getElementById('txnDetailModalClose').addEventListener('click', closeTxnDetailModal);
  document.getElementById('txnDetailCloseBtn').addEventListener('click', closeTxnDetailModal);
  document.getElementById('txnDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'txnDetailModal') closeTxnDetailModal();
  });

  // Category Detail Modal Events
  document.getElementById('categoryDetailModalClose').addEventListener('click', closeCategoryDetailModal);
  document.getElementById('categoryDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'categoryDetailModal') closeCategoryDetailModal();
  });

  // Bulk Delete Modal Events
  if (!window._bulkSelectedIds) window._bulkSelectedIds = new Set();

  document.getElementById('openBulkDeleteBtn').addEventListener('click', async () => {
    window._bulkSelectedIds.clear();
    document.getElementById('bulkSelectAllCheckbox').checked = false;
    updateBulkDeleteUI();

    const container = document.getElementById('bulkDeleteListContainer');
    container.innerHTML = '<div style="text-align:center; padding: 20px;">กำลังโหลด...</div>';

    document.getElementById('bulkDeleteModal').classList.add('active');

    const txns = cachedTxns && cachedTxns.length ? cachedTxns : await TransactionModule.getAll(currentFilters);

    if (txns.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-tertiary);">ไม่มีรายการให้ลบ</div>';
      return;
    }

    container.innerHTML = txns.map(t => {
      const sign = t.type === 'income' ? '+' : '-';
      const amountColor = t.type === 'income' ? 'var(--text-success)' : 'var(--text-danger)';
      return `
          <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: 8px; cursor: pointer;">
              <input type="checkbox" class="bulk-item-checkbox" value="${t.id}" style="width: 18px; height: 18px; flex-shrink: 0;">
              <div style="flex: 1; display:flex; flex-direction:column; gap:4px;">
                  <div style="display:flex; justify-content:space-between; align-items:baseline;">
                      <strong style="font-size: 14px;">${t.category} ${t.note ? `<span style="font-weight:normal; opacity:0.8;">- ${t.note}</span>` : ''}</strong>
                      <strong style="color: ${amountColor};">${sign}${Utils.formatCurrency(t.amount)}</strong>
                  </div>
                  <div style="font-size: 12px; color: var(--text-tertiary);">
                      ${Utils.formatDateTimeShort(t.date)}
                  </div>
              </div>
          </label>
          `;
    }).join('');
  });

  const closeBulkDeleteModal = () => document.getElementById('bulkDeleteModal').classList.remove('active');
  document.getElementById('bulkDeleteModalClose').addEventListener('click', closeBulkDeleteModal);
  document.getElementById('bulkDeleteCancelBtn').addEventListener('click', closeBulkDeleteModal);

  document.getElementById('bulkSelectAllCheckbox').addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll('.bulk-item-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      if (isChecked) window._bulkSelectedIds.add(cb.value);
      else window._bulkSelectedIds.delete(cb.value);
    });
    updateBulkDeleteUI();
  });

  document.getElementById('bulkDeleteListContainer').addEventListener('change', (e) => {
    if (e.target.classList.contains('bulk-item-checkbox')) {
      if (e.target.checked) window._bulkSelectedIds.add(e.target.value);
      else window._bulkSelectedIds.delete(e.target.value);

      const allCheckboxes = document.querySelectorAll('.bulk-item-checkbox');
      document.getElementById('bulkSelectAllCheckbox').checked = window._bulkSelectedIds.size === allCheckboxes.length && allCheckboxes.length > 0;

      updateBulkDeleteUI();
    }
  });

  document.getElementById('bulkDeleteConfirmBtn').addEventListener('click', async () => {
    if (window._bulkSelectedIds.size === 0) return;
    if (confirm(`คุณต้องการลบรายการที่เลือกจำนวน ${window._bulkSelectedIds.size} รายการใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      const btn = document.getElementById('bulkDeleteConfirmBtn');
      const originalText = btn.textContent;
      btn.textContent = 'กำลังลบ...';
      btn.disabled = true;

      for (let id of window._bulkSelectedIds) {
        await TransactionModule.delete(id);
      }

      Utils.showToast(`ลบแล้ว ${window._bulkSelectedIds.size} รายการ`, 'success');
      closeBulkDeleteModal();
      await refreshTransactions();

      btn.textContent = originalText;
    }
  });

  function updateBulkDeleteUI() {
    const count = window._bulkSelectedIds.size;
    document.getElementById('bulkSelectedCount').textContent = `เลือก ${count} รายการ`;
    const btn = document.getElementById('bulkDeleteConfirmBtn');
    btn.textContent = `ลบที่เลือก (${count})`;
    btn.disabled = count === 0;
  }

  // Delegation for clicks inside category detail modal
  document.getElementById('categoryDetailBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.classList.contains('edit-txn')) {
      e.stopPropagation();
      const txnId = btn.dataset.id;
      const all = await TransactionModule.getAll({});
      const txn = all.find(t => String(t.id) === String(txnId));
      if (txn) { openTxnModal(txn); }
      return;
    }
    if (btn && btn.classList.contains('delete-txn')) {
      e.stopPropagation();
      if (confirm('คุณต้องการลบรายการนี้?')) {
        const txnId = btn.dataset.id;
        await TransactionModule.delete(txnId);
        Utils.showToast('ลบรายการสำเร็จ', 'success');
        await refreshTransactions();
        refreshCategoryDetailView();
      }
      return;
    }
    // Click on a row item to open edit
    const row = e.target.closest('.cat-detail-item');
    if (row && !btn) {
      const txnId = row.dataset.id;
      const all = cachedTxns.length ? cachedTxns : await TransactionModule.getAll({});
      const txn = all.find(t => String(t.id) === String(txnId));
      if (txn) { openTxnModal(txn); }
    }
  });

  document.getElementById('txnDetailEditBtn').addEventListener('click', () => {
    const btn = document.getElementById('txnDetailEditBtn');
    const txnId = btn.dataset.id;
    if (txnId) {
      // Create a dummy object or fetch fresh from list?
      // Since we populate detail from a txn object, we should have access to it or refetch
      // Ideally we should pass the txn object. For now let's use global lookup or re-fetch logic if needed.
      // But we can just use the ID to find in current list if available.
      // Better yet, store current detail txn in a variable.
      if (currentDetailTxn) {
        closeTxnDetailModal();
        openTxnModal(currentDetailTxn);
      }
    }
  });

  // Type tabs
  document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('txnType').value = btn.dataset.type;
      updateCategoryOptions(btn.dataset.type);
    });
  });

  // Export PDF
  document.getElementById('exportReceiptBtn').addEventListener('click', async () => {
    const filters = {
      startDate: document.getElementById('filterStartDate').value,
      endDate: document.getElementById('filterEndDate').value,
      type: document.getElementById('filterType').value,
      category: document.getElementById('filterCategory').value,
      search: document.getElementById('filterSearch').value
    };
    const txns = await TransactionModule.getAll(filters);
    await Utils.exportToReceiptPDF(txns, filters.startDate, filters.endDate);
  });

  // Save
  // Save
  document.getElementById('txnSaveBtn').addEventListener('click', () => saveTxn(true));
  // Save & Next
  document.getElementById('txnSaveNextBtn').addEventListener('click', () => saveTxn(false));

  // Delete from modal
  document.getElementById('txnDeleteBtn').addEventListener('click', async () => {
    const id = document.getElementById('txnId').value;
    console.log('[DEBUG] Delete clicked, id:', id, 'type:', typeof id);
    if (id && confirm('คุณต้องการลบรายการนี้?')) {
      console.log('[DEBUG] Calling TransactionModule.delete with id:', id);
      const result = await TransactionModule.delete(id);
      console.log('[DEBUG] Delete result:', result);
      Utils.showToast('ลบรายการสำเร็จ', 'success');
      closeTxnModal();
      refreshTransactions();
    }
  });

  // Filters
  ['filterStartDate', 'filterEndDate', 'filterType', 'filterCategory'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });
  document.getElementById('filterSearch').addEventListener('input', debounce(applyFilters, 300));

  // Period buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Visual update
      document.querySelectorAll('.period-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary', 'active');

      // Logic
      const period = btn.dataset.period;
      let r = {};
      if (period === 'today') r = Utils.getTodayRange();
      else if (period === 'week') r = Utils.getWeekRange();
      else if (period === 'month') r = Utils.getMonthRange();
      else if (period === 'year') r = Utils.getYearRange();
      else if (period === 'all') r = { start: '', end: '' };

      const fpStart = document.getElementById('filterStartDate')._flatpickr;
      const fpEnd = document.getElementById('filterEndDate')._flatpickr;

      if (fpStart) fpStart.setDate(r.start || '', false);
      else document.getElementById('filterStartDate').value = r.start || '';

      if (fpEnd) fpEnd.setDate(r.end || '', false);
      else document.getElementById('filterEndDate').value = r.end || '';

      applyFilters();

      // Auto-calculate Total Amount
      const updateAmount = () => {
        const qty = parseFloat(document.getElementById('txnQuantity').value) || 0;
        const price = parseFloat(document.getElementById('txnUnitPrice').value) || 0;
        if (qty > 0 && price > 0) {
          document.getElementById('txnAmount').value = (qty * price).toFixed(2);
        }
      };

      document.getElementById('txnQuantity').addEventListener('input', updateAmount);
      document.getElementById('txnUnitPrice').addEventListener('input', updateAmount);

      applyFilters();

      // Auto-scroll to receipt list
      setTimeout(() => {
        const target = document.getElementById('txnListDetails');
        if (target) {
          const y = target.getBoundingClientRect().top + window.scrollY - 160;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    });
  });

  // Auto-calculate amount
  const calculateTotal = () => {
    const price = parseFloat(document.getElementById('txnUnitPrice').value) || 0;
    const qty = parseFloat(document.getElementById('txnQuantity').value) || 0;
    if (price > 0 && qty > 0) {
      document.getElementById('txnAmount').value = (price * qty).toFixed(2);
    }
  };
  document.getElementById('txnUnitPrice').addEventListener('input', calculateTotal);
  document.getElementById('txnQuantity').addEventListener('input', calculateTotal);

  // Manage Categories UI Logic
  const manageModal = document.getElementById('manageCategoryModal');
  let currentManageType = 'expense';

  document.getElementById('manageCategoryBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('txnType').value;
    currentManageType = document.getElementById('txnType').value || 'expense';

    // Sync tabs
    document.querySelectorAll('#manageCatTypeTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === currentManageType);
    });

    refreshManageCategoryList();
    manageModal.classList.add('active');
  });

  document.getElementById('manageCategoryModalClose')?.addEventListener('click', () => {
    manageModal.classList.remove('active');
    updateCategoryOptions(document.getElementById('txnType').value); // Re-sync dropdown
  });

  document.querySelectorAll('#manageCatTypeTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#manageCatTypeTabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentManageType = btn.dataset.type;
      refreshManageCategoryList();
    });
  });

  document.getElementById('addNewCatBtn')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('newCatName');
    const iconInput = document.getElementById('newCatIconi');
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim();

    if (!name) {
      Utils.showToast('กรุณาระบุชื่อหมวดหมู่', 'danger');
      return;
    }

    try {
      await TransactionModule.addCategory({ name, icon, type: currentManageType });
      nameInput.value = '';
      iconInput.value = '';
      Utils.showToast('เพิ่มหมวดหมู่สำเร็จ', 'success');
      refreshManageCategoryList();
      updateCategoryOptions(document.getElementById('txnType').value);
    } catch (e) {
      console.error(e);
      Utils.showToast('เพิ่มหมวดหมู่ไม่สำเร็จ', 'danger');
    }
  });

  async function refreshManageCategoryList() {
    const listContainer = document.getElementById('catListContainer');
    const cats = await TransactionModule.getCategories(currentManageType);

    if (cats.length === 0) {
      listContainer.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-tertiary); font-size:12px;">ไม่มีหมวดหมู่</div>';
      return;
    }

    listContainer.innerHTML = cats.map(c => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-card); margin-bottom:4px; border-radius:4px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px;">${c.icon || '📝'}</span>
          <span>${c.name}</span>
        </div>
        <div style="display:flex; gap:4px;">
          <button type="button" class="btn btn-sm btn-outline edit-cat-btn" data-id="${c.id}" data-name="${c.name}" data-icon="${c.icon || ''}" style="padding:4px 8px; font-size:11px; border:none; background:rgba(255,255,255,0.05);">แก้ไข</button>
          <button type="button" class="btn btn-sm btn-danger delete-cat-btn" data-id="${c.id}" style="padding:4px 8px; font-size:11px;">ลบ</button>
        </div>
      </div>
    `).join('');

    // Attach edit listeners
    listContainer.querySelectorAll('.edit-cat-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const oldName = e.target.dataset.name;
        const oldIcon = e.target.dataset.icon;

        const newName = prompt('แก้ไขชื่อหมวดหมู่ (หรือเว้นว่างเพื่อยกเลิก):', oldName);
        if (!newName || newName.trim() === '') return;

        const newIcon = prompt('แก้ไขไอคอน/อีโมจิ:', oldIcon);

        try {
          await TransactionModule.updateCategory(id, { name: newName.trim(), icon: newIcon ? newIcon.trim() : '' });
          Utils.showToast('อัปเดตหมวดหมู่สำเร็จ', 'success');
          refreshManageCategoryList();
          updateCategoryOptions(document.getElementById('txnType').value);
        } catch (err) {
          console.error(err);
          Utils.showToast('อัปเดตไม่สำเร็จ', 'danger');
        }
      });
    });

    // Attach delete listeners
    listContainer.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('ยืนยันการลบหมวดหมู่นี้? (รายการเก่าจะไม่ถูกอัปเดตอัตโนมัติ)')) {
          await TransactionModule.deleteCategory(id);
          Utils.showToast('ลบหมวดหมู่สำเร็จ', 'success');
          refreshManageCategoryList();
          updateCategoryOptions(document.getElementById('txnType').value);
        }
      });
    });
  }
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

async function openTxnModal(txn = null) {
  const modal = document.getElementById('txnModal');
  const title = document.getElementById('txnModalTitle');

  if (txn) {
    title.textContent = 'แก้ไขรายการ';
    document.getElementById('txnId').value = txn.id;
    document.getElementById('txnAmount').value = txn.amount;
    document.getElementById('txnUnitPrice').value = txn.unitPrice || '';
    document.getElementById('txnQuantity').value = txn.quantity || 1;
    // Ensure datetime string format
    // document.getElementById('txnDate').value = txn.date.includes('T') ? txn.date.slice(0, 16) : txn.date + 'T12:00';
    const fp = document.getElementById('txnDate')._flatpickr;
    if (fp) {
      let dStr = txn.date;
      // Handle legacy date-only formats by appending mid-day time (prevents UTC shift issues)
      if (dStr && dStr.length === 10) dStr += 'T12:00:00';
      // Normalize any stray space separated dates to ISO 8601
      if (dStr) dStr = dStr.replace(' ', 'T');

      const parsedDate = new Date(dStr);
      if (!isNaN(parsedDate.getTime())) {
        fp.setDate(parsedDate);
      } else {
        fp.setDate(new Date()); // Fallback if somehow date is invalid
      }
    }
    document.getElementById('txnNote').value = txn.note || '';

    // Set type tab
    document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === txn.type);
    });
    document.getElementById('txnType').value = txn.type;
    await updateCategoryOptions(txn.type);
    document.getElementById('txnType').value = txn.type;
    await updateCategoryOptions(txn.type);
    document.getElementById('txnCategory').value = txn.category;
    document.getElementById('txnDeleteBtn').style.display = 'block';
    document.getElementById('txnSaveNextBtn').style.display = 'none';
  } else {
    title.textContent = 'เพิ่มรายการ';
    document.getElementById('txnId').value = '';
    document.getElementById('txnAmount').value = '';
    document.getElementById('txnUnitPrice').value = '';
    document.getElementById('txnQuantity').value = '1';
    document.getElementById('txnQuantity').value = '1';
    // document.getElementById('txnDate').value = Utils.today();
    const fp = document.getElementById('txnDate')._flatpickr;
    if (fp) fp.setDate(new Date());

    document.getElementById('txnNote').value = '';
    document.getElementById('txnNote').value = '';
    document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === 'expense');
    });
    document.getElementById('txnType').value = 'expense';

    // Restore last used values if available
    // Do not restore lastDate to ensure it defaults to current time as requested
    // const lastDate = localStorage.getItem('lastTxnDate');
    const lastType = localStorage.getItem('lastTxnType');
    const lastCat = localStorage.getItem('lastTxnCat_' + (lastType || 'expense'));

    // if (lastDate) document.getElementById('txnDate').value = lastDate;

    const typeToUse = lastType || 'expense';
    document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.type === typeToUse);
    });
    document.getElementById('txnType').value = typeToUse;
    await updateCategoryOptions(typeToUse);

    if (lastCat) document.getElementById('txnCategory').value = lastCat;

    document.getElementById('txnDeleteBtn').style.display = 'none';
    document.getElementById('txnSaveNextBtn').style.display = 'inline-flex';
  }

  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

function updateBodyScrollLock() {
  const activeOverlay = document.querySelector('.modal-overlay.active');
  if (activeOverlay) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
}

function closeTxnModal() {
  document.getElementById('txnModal').classList.remove('active');
  updateBodyScrollLock();
}

function openTxnDetail(txn) {
  currentDetailTxn = txn;
  const modal = document.getElementById('txnDetailModal');
  const body = document.getElementById('txnDetailBody');
  const editBtn = document.getElementById('txnDetailEditBtn');

  editBtn.dataset.id = txn.id;

  // Format Date: "17 ก.พ. 2026 เวลา 23:45"
  const dateObj = new Date(txn.date);
  const dateStr = dateObj.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const sign = txn.type === 'income' ? '+' : '-';
  const colorClass = txn.type === 'income' ? 'success' : 'danger';
  const colorVar = txn.type === 'income' ? 'var(--text-success)' : 'var(--text-danger)';

  body.innerHTML = `
    <div style="text-align:center; margin-bottom:var(--space-lg);">
      <div style="width:60px; height:60px; background:var(--bg-tertiary); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto var(--space-md); font-size:28px;">
        ${txn.type === 'income' ? '💰' : '💸'}
      </div>
      <h2 style="color:${colorVar}; margin:0; font-family:var(--font-mono);">${sign}${Utils.formatCurrency(txn.amount)}</h2>
      <div style="color:var(--text-secondary); font-size:var(--font-size-sm); margin-top:4px;">${txn.note || txn.category}</div>
    </div>

    <div class="debt-group" style="margin-bottom:0;">
      <div class="debt-item-details" open style="background:transparent; padding:0; display:flex; flex-direction:column; gap:var(--space-sm);">
        <div class="debt-detail-item" style="flex-direction:row; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
          <span class="label">วันที่ & เวลา</span>
          <span class="value">${dateStr}</span>
        </div>
        <div class="debt-detail-item" style="flex-direction:row; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
          <span class="label">ประเภท</span>
          <span class="badge badge-${txn.type}">${txn.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
        </div>
        <div class="debt-detail-item" style="flex-direction:row; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
          <span class="label">หมวดหมู่</span>
          <span class="value">${txn.category}</span>
        </div>
        
        ${(txn.quantity && txn.quantity > 1) ? `
        <div class="debt-detail-item" style="flex-direction:row; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
           <span class="label">รายละเอียดราคา</span>
           <span class="value" style="font-size:var(--font-size-xs);">${txn.quantity} หน่วย ${txn.unitPrice ? `x ${Utils.formatCurrency(txn.unitPrice)}` : '(หลายราคา)'}</span>
        </div>
        ` : ''}

        <div class="debt-detail-item" style="flex-direction:column; gap:4px; padding:8px 0;">
          <span class="label">หมายเหตุ</span>
          <span class="value" style="background:var(--bg-tertiary); padding:8px; border-radius:4px; min-height:40px; color:var(--text-secondary);">${txn.note || '-'}</span>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeTxnDetailModal() {
  document.getElementById('txnDetailModal').classList.remove('active');
  updateBodyScrollLock();
}

function _renderTxnItem(t, type) {
  return `
    <div class="cat-detail-item" data-id="${t.id}" style="display:flex; align-items:center; padding:10px 8px; border-radius:var(--border-radius); cursor:pointer; transition: background 0.15s; gap:10px;" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='transparent'">
      <div style="flex:1; min-width:0;">
        <div style="font-size:11px; color:var(--text-tertiary);">${Utils.formatDateTimeShort(t.date)}</div>
        <div style="font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.note || '-'}${(t.quantity && t.quantity > 1) ? ` <span style="font-size:0.85em; opacity:0.6;">x${t.quantity}</span>` : ''}</div>
      </div>
      <span class="amount ${t.type}" style="font-size:13px; flex-shrink:0; font-weight:600;">${type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}</span>
    </div>`;
}

function refreshCategoryDetailView() {
  if (currentCategoryView) {
    const { type, category } = currentCategoryView;
    // Use cachedTxns from refreshTransactions logic
    const filtered = cachedTxns.filter(t => t.type === type && t.category === category);
    if (filtered.length === 0) {
      closeCategoryDetailModal();
    } else {
      openCategoryDetailModal(type, category, filtered);
    }
  }
}

function openCategoryDetailModal(type, category, txnsList) {
  currentCategoryView = { type, category };
  const modal = document.getElementById('categoryDetailModal');
  const title = document.getElementById('categoryDetailTitle');
  const body = document.getElementById('categoryDetailBody');
  const typeLabel = type === 'income' ? 'รายรับ' : 'รายจ่าย';
  const accentColor = type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)';
  const total = txnsList.reduce((s, t) => s + t.amount, 0);
  const sign = type === 'income' ? '+' : '-';

  title.textContent = `${category} (${typeLabel})`;

  const summaryHtml = `
    <div style="margin-bottom:12px; padding:10px; background:var(--bg-tertiary); border-radius:var(--border-radius); display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:13px; color:var(--text-secondary);">รวม ${txnsList.length} รายการ</span>
      <span style="font-weight:700; color:${accentColor}; font-size:15px;">${sign}${Utils.formatCurrency(total)}</span>
    </div>`;

  const activeBtn = document.querySelector('.period-btn.active');
  const period = activeBtn ? activeBtn.dataset.period : 'month';

  // Levels to group by based on period
  const levelMap = {
    'today': [],
    'week': ['day'],
    'month': ['week', 'day'],
    'year': ['month', 'day'],
    'all': ['year', 'month', 'week', 'day']
  };
  const levels = levelMap[period] || ['month', 'day'];

  const getGroupKey = (dateStr, lv) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = d.getDate();
    if (lv === 'year') return `${y}`;
    if (lv === 'month') return `${y}-${m}`;
    if (lv === 'week') return `${y}-${m}-W${Math.ceil(dd / 7)}`;
    if (lv === 'day') return `${y}-${m}-${String(dd).padStart(2, '0')}`;
    return 'root';
  };

  const getGroupLabel = (dateStr, lv) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    if (lv === 'year') return `ปี ${y + 543}`;
    if (lv === 'month') return `${Utils.getMonthName(m)} ${y + 543}`;
    if (lv === 'week') return `สัปดาห์ที่ ${Math.ceil(dd / 7)} (${Utils.getMonthName(m)})`;
    if (lv === 'day') return `${dd} ${Utils.getMonthName(m)}`;
    return '';
  };

  const renderGrouped = (txns, lvs) => {
    const depth = levels.length - lvs.length;
    if (lvs.length === 0) {
      const sorted = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date));
      return `
          <div style="display:flex; flex-direction:column; gap:2px; ${depth > 0 ? `margin-left:${depth * 8}px; border-left: 2px solid rgba(255,255,255,0.05); padding-left:4px;` : ''}">
            ${sorted.map(t => _renderTxnItem(t, type)).join('')}
          </div>
        `;
    }

    const currentLv = lvs[0];
    const remainingLvs = lvs.slice(1);
    const groups = {};

    txns.forEach(t => {
      const key = getGroupKey(t.date, currentLv);
      if (!groups[key]) {
        groups[key] = { label: getGroupLabel(t.date, currentLv), items: [] };
      }
      groups[key].items.push(t);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(key => {
      const g = groups[key];
      const gTotal = g.items.reduce((sum, item) => sum + item.amount, 0);
      const isTopLevel = depth === 0;

      const summaryStyle = isTopLevel
        ? `background: var(--bg-card); border: 1px solid rgba(255,255,255,0.1); font-size: 14px; font-weight: 700;`
        : `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.03); font-size: 12px; font-weight: 600; margin-left: ${depth * 10}px;`;

      return `
          <details style="margin-bottom:${isTopLevel ? '12px' : '4px'}; border-radius:var(--border-radius); overflow:hidden;">
            <summary style="padding:10px 12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; list-style:none; ${summaryStyle}">
              <span style="display:flex; align-items:center; gap:8px;">
                ${g.label}
              </span>
              <span style="color:${accentColor};">
                ${sign}${Utils.formatCurrency(gTotal)} 
                <span style="opacity:0.75; font-weight:400; font-size:11px; color:var(--text-tertiary); margin-left:4px;">(${g.items.length})</span>
              </span>
            </summary>
            <div style="padding:4px 0 8px 0;">
              ${renderGrouped(g.items, remainingLvs)}
            </div>
          </details>
        `;
    }).join('');
  };

  body.innerHTML = summaryHtml + renderGrouped(txnsList, levels);

  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeCategoryDetailModal() {
  currentCategoryView = null;
  document.getElementById('categoryDetailModal').classList.remove('active');
  updateBodyScrollLock();
}

// ─── RECEIPT PRINT ANIMATION ─────────────────────────────────────────────────
function showPrintReceiptModal() {
  const txns = cachedTxns;
  const filters = currentFilters;

  let periodLabel = 'ทั้งหมด';
  if (filters.startDate && filters.endDate) {
    periodLabel = `${Utils.formatDate(filters.startDate)} – ${Utils.formatDate(filters.endDate)}`;
  } else if (filters.startDate) {
    periodLabel = `ตั้งแต่ ${Utils.formatDate(filters.startDate)}`;
  }

  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  // Sort chronologically (Oldest first)
  txns.sort((a, b) => new Date(a.date) - new Date(b.date));

  const activePeriodBtn = document.querySelector('.period-btn.active');
  const isToday = activePeriodBtn && activePeriodBtn.dataset.period === 'today';

  const itemsHtml = txns.map(t => {
    const qtyInfo = (t.quantity && t.quantity > 1 && t.unitPrice)
      ? `<span style="font-size:0.9em; font-weight:normal; color:#555; margin-left:4px;">@${Utils.formatCurrency(t.unitPrice)}</span>`
      : '';
    const qtyPrefix = `${t.quantity || 1} `;

    return `
    <div style="margin-bottom:12px; font-size:12px;">
      <div style="display:flex; align-items:baseline; gap:6px;">
        <span style="font-weight:600; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">
          ${qtyPrefix}${t.note || t.category}${qtyInfo}
        </span>
        <div style="flex:1; border-bottom:1px dotted #aaa; margin-bottom:4px; opacity:0.6;"></div>
        <span style="font-weight:800; white-space:nowrap; color:#111; font-family:'Courier New', monospace;">
          ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
        </span>
      </div>
      <div style="font-size:10px; color:#888; margin-top:2px; font-family:monospace;">
        ${(() => {
        const d = new Date(t.date);
        const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        if (isToday) return timeStr;
        const dateStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
        return `${dateStr} ${timeStr}`;
      })()}
      </div>
    </div>
    `;
  }).join('');

  if (!document.getElementById('printReceiptStyles')) {
    const style = document.createElement('style');
    style.id = 'printReceiptStyles';
    style.textContent = `
      #printReceiptOverlay {
        position:fixed;inset:0;z-index:9999;
        background:rgba(0,0,0,0.8);
        display:flex;align-items:flex-start;justify-content:center;
        padding-top:40px;overflow-y:auto;
        opacity:0;transition:opacity 0.3s ease;
      }
      #printReceiptOverlay.visible { opacity:1; }
      .printer-body {
        width:270px;
        background:linear-gradient(160deg,#4a4a4a,#262626);
        border-radius:14px 14px 6px 6px;
        padding:16px 20px 14px;
        box-shadow:0 8px 32px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.12);
        position:relative;
        transition: opacity 0.4s ease, transform 0.4s ease;
      }
      .printer-body.fade-out {
        opacity: 0;
        transform: translateY(-20px) scale(0.9);
        pointer-events: none;
      }
      .printer-light {
        width:9px;height:9px;border-radius:50%;
        background:#22c55e;box-shadow:0 0 7px #22c55e;
        position:absolute;top:15px;right:18px;
        animation:pLight 1.6s ease-in-out infinite;
      }
      @keyframes pLight {
        0%,100%{opacity:1;box-shadow:0 0 7px #22c55e;}
        50%{opacity:0.3;box-shadow:0 0 2px #22c55e;}
      }
      .printer-slot {
        height:7px;background:#111;border-radius:3px;
        margin-top:10px;box-shadow:inset 0 2px 5px rgba(0,0,0,0.9);
        position: relative; z-index: 2;
      }
      .receipt-wrapper {
        width: 270px;
        overflow: hidden;
        margin-top: -8px; /* Pull it up under the slot */
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .printer-body {
        opacity: 1; transform: scale(1); transition: all 0.5s ease;
      }
      .receipt-paper {
        width:100%;background:#f4e6cc;color:#111;
        font-family:'Courier Prime','Courier New',monospace;
        border-radius:0 0 8px 8px;
        box-shadow:0 12px 40px rgba(0,0,0,0.5);
        transform:translateY(-100%);
        text-shadow: 0.1px 0.1px 0.2px rgba(0,0,0,0.05);
        letter-spacing: -0.2px;
        font-variant-numeric: slashed-zero;
        font-feature-settings: "zero";
      }
      .receipt-paper.printing {
        animation:paperFeed 10s steps(60, end) forwards;
      }
      .receipt-paper.tearing {
        animation:paperTear 0.35s cubic-bezier(0.23, 1, 0.32, 1) forwards;
      }
      .receipt-paper.showcase {
        transform: translateY(40px) scale(1) rotate(0deg) !important;
        box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        filter: contrast(1.01) brightness(1.01);
        background-image: 
          radial-gradient(circle at 70% 30%, rgba(0,0,0,0.01) 0%, transparent 40%),
          linear-gradient(135deg, rgba(0,0,0,0.01) 0%, transparent 20%, rgba(0,0,0,0.01) 40%, transparent 60%, rgba(0,0,0,0.01) 80%);
        transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s ease;
      }
      @keyframes paperTear {
        0% { transform: translateY(0); }
        100% { transform: translateY(40px); }
      }
      @keyframes paperFeed {
        0%   {transform:translateY(-100%);}
        2%   {transform:translateY(-98%);}
        4%   {transform:translateY(-96%);}
        6%   {transform:translateY(-93.5%);}
        8%   {transform:translateY(-91%);}
        10%  {transform:translateY(-88%);}
        12%  {transform:translateY(-85.5%);}
        14%  {transform:translateY(-83%);}
        16%  {transform:translateY(-80.5%);}
        18%  {transform:translateY(-78%);}
        20%  {transform:translateY(-75.5%);}
        22%  {transform:translateY(-73%);}
        24%  {transform:translateY(-70.5%);}
        26%  {transform:translateY(-68%);}
        28%  {transform:translateY(-65.5%);}
        30%  {transform:translateY(-63%);}
        32%  {transform:translateY(-60.5%);}
        34%  {transform:translateY(-58%);}
        36%  {transform:translateY(-55.5%);}
        38%  {transform:translateY(-53%);}
        40%  {transform:translateY(-50.5%);}
        42%  {transform:translateY(-48%);}
        44%  {transform:translateY(-45.5%);}
        46%  {transform:translateY(-43%);}
        48%  {transform:translateY(-40.5%);}
        50%  {transform:translateY(-38%);}
        52%  {transform:translateY(-35.5%);}
        54%  {transform:translateY(-33%);}
        56%  {transform:translateY(-30.5%);}
        58%  {transform:translateY(-28%);}
        60%  {transform:translateY(-25.5%);}
        62%  {transform:translateY(-23%);}
        64%  {transform:translateY(-20.5%);}
        66%  {transform:translateY(-18%);}
        68%  {transform:translateY(-15.5%);}
        70%  {transform:translateY(-13%);}
        72%  {transform:translateY(-10.5%);}
        74%  {transform:translateY(-8%);}
        76%  {transform:translateY(-6%);}
        78%  {transform:translateY(-4%);}
        80%  {transform:translateY(-2.5%);}
        82%  {transform:translateY(-1.2%);}
        84%  {transform:translateY(-0.3%);}
        100% {transform:translateY(0);}
      }
      .receipt-inner { padding:20px 16px 20px; }
      .receipt-tear {
        height:14px;
        background:repeating-linear-gradient(90deg,#f4e6cc 0,#f4e6cc 5px,transparent 5px,transparent 9px);
        border-top:1px dashed #bbb;
      }
      .sound-bar {
        display:flex;gap:2px;align-items:flex-end;height:18px;margin-top:8px;
      }
      .sound-bar span {
        width:3px;background:rgba(255,255,255,0.2);border-radius:2px;
        animation:sBar 0.35s ease-in-out infinite alternate;
      }
      .sound-bar span:nth-child(2){animation-delay:0.08s;}
      .sound-bar span:nth-child(3){animation-delay:0.18s;}
      .sound-bar span:nth-child(4){animation-delay:0.04s;}
      .sound-bar span:nth-child(5){animation-delay:0.14s;}
      @keyframes sBar {
        from{height:3px;}
        to{height:14px;}
      }
      @keyframes pulseGlow {
        0% { opacity: 0.85; box-shadow: 0 0 5px rgba(74, 222, 128, 0.2); }
        50% { opacity: 1; box-shadow: 0 0 15px rgba(74, 222, 128, 0.4); }
        100% { opacity: 0.85; box-shadow: 0 0 5px rgba(74, 222, 128, 0.2); }
      }
    `;
    document.head.appendChild(style);
  }

  let overlay = document.getElementById('printReceiptOverlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'printReceiptOverlay';
  overlay.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;padding-bottom:60px;">


      <div class="printer-body">
        <div class="printer-light" id="printerLight"></div>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:2px;margin-bottom:10px;">FINANCE MANAGER</div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div class="sound-bar" id="printerSoundBar">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <div style="width:40px;height:14px;background:#1a1a1a;border-radius:3px;border:1px solid #555;display:flex;align-items:center;justify-content:center;">
            <div style="width:9px;height:9px;border-radius:50%;background:#3b82f6;box-shadow:0 0 5px #3b82f6;"></div>
          </div>
        </div>
        <div class="printer-slot"></div>
      </div>

      <div class="receipt-wrapper">
        <div class="receipt-paper" id="receiptPaper">
          <div class="receipt-inner">
            <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:14px;">
              <div style="font-size:20px;font-weight:900;letter-spacing:2px;margin-bottom:4px;">💳 FINANCE MGR</div>
              <div style="font-size:10px;color:#555;line-height:1.7;">
                ใบสรุปรายรับ-รายจ่าย<br>
                ${periodLabel}<br>
                พิมพ์: ${new Date().toLocaleString('th-TH')}
              </div>
            </div>

            <div style="margin-bottom:14px;">
              ${txns.length > 0 ? itemsHtml : '<div style="text-align:center;color:#999;font-size:12px;padding:12px;">ไม่มีรายการ</div>'}
            </div>

            <div style="border-top:2px solid #111;padding-top:10px;">
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
                <span>รายรับรวม</span>
                <span style="color:#000;font-weight:700;">+${Utils.formatCurrency(income)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
                <span>รายจ่ายรวม</span>
                <span style="color:#000;font-weight:700;">-${Utils.formatCurrency(expense)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;border-top:1px dashed #ccc;margin-top:8px;padding-top:8px;">
                <span style="font-weight:900;font-size:14px;">ยอดสุทธิ</span>
                <span style="font-weight:900;font-size:16px;color:#000;">${balance >= 0 ? '+' : ''}${Utils.formatCurrency(balance)}</span>
              </div>
            </div>

            <div style="text-align:center;margin-top:18px;font-size:10px;color:#999;border-top:1px dashed #ccc;padding-top:12px;line-height:1.8;">
              *** ขอบคุณที่ใช้บริการ ***<br>
              Finance Manager · ${new Date().getFullYear()}
            </div>
          </div>
          <div class="receipt-tear"></div>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-top:80px;position:relative;z-index:10;flex-wrap:wrap;justify-content:center;">
        <button id="closePrintBtn" style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;">✕ ปิด</button>
        <button id="savePrintBtn" style="background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid #3b82f6;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">📄 บันทึก PDF</button>
        <button id="exportImageBtn" style="background:#3b82f6;color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">📸 บันทึกรูปภาพ</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('visible');

    setTimeout(() => {
      const paper = document.getElementById('receiptPaper');
      if (!paper) return;

      let progress = 0;
      paper.style.transition = 'none';
      paper.style.transform = 'translateY(-100%)';

      // Dynamic speed based on receipt length (more items = more steps)
      const totalItems = txns.length || 1;
      const baseSteps = 40 + (totalItems * 2.2); // 10% faster (fewer steps/ticks) than original 2.5

      function printTick() {
        if (progress >= 100) {
          paper.style.transition = 'transform 0.2s ease-out';
          paper.style.transform = 'translateY(0)';
          const sb = document.getElementById('printerSoundBar');
          const light = document.getElementById('printerLight');

          if (sb) Array.from(sb.children).forEach(s => { s.style.animation = 'none'; s.style.height = '3px'; });
          if (light) { light.style.background = '#f59e0b'; light.style.boxShadow = '0 0 7px #f59e0b'; light.style.animation = 'none'; }

          // Trigger "Tear and Showcase"
          setTimeout(() => {
            if (light) { light.style.background = '#3b82f6'; light.style.boxShadow = '0 0 10px #3b82f6'; }
            paper.style.transition = 'none';
            paper.classList.add('tearing');

            // Fade out the printer body during tear
            const printer = document.querySelector('.printer-body');
            if (printer) printer.classList.add('fade-out');

            // Allow full visibility of the paper once it's independent
            const wrapper = paper.parentElement;
            if (wrapper) wrapper.style.overflow = 'visible';

            setTimeout(() => {
              if (light) { light.style.background = '#22c55e'; light.style.boxShadow = '0 0 7px #22c55e'; }
              paper.classList.add('showcase');

              // Smoothly scroll up slightly to frame the independent receipt better
              overlay.scrollTo({ top: 150, behavior: 'smooth' });

              // Subtle "shake" or entry pop
              if (navigator.vibrate) navigator.vibrate([20, 40]);
            }, 400);
          }, 800);
          return;
        }

        const mood = Math.random();
        let step, delay, trans;

        // Calculate a base step size that makes the total time feel natural
        const avgStep = 100 / baseSteps;

        if (mood < 0.02) {
          // 1. Long Pause (Paper stutter/jam) - Maximum fluidity (lowest chance)
          step = 0;
          delay = 220 + Math.random() * 180;
          trans = 0;
        } else if (mood < 0.6) {
          // 2. Normal Line Feed (Standard speed) - 10% faster delay
          step = avgStep * (0.8 + Math.random() * 0.4);
          delay = 62 + Math.random() * 65;
          trans = (delay / 1000) * 0.9;
        } else if (mood < 0.85) {
          // 3. Fast Stutter (Rapid printing) - 10% faster delay
          step = avgStep * (1.2 + Math.random() * 0.8);
          delay = 32 + Math.random() * 32;
          trans = 0.03;
        } else {
          // 4. Heavy Jerky (Detailed text/Logo)
          step = avgStep * (0.3 + Math.random() * 0.4);
          delay = 105 + Math.random() * 115;
          trans = 0;
        }

        progress = Math.min(100, progress + step);

        if (trans > 0) {
          paper.style.transition = `transform ${trans}s linear`;
        } else {
          paper.style.transition = 'none';
        }

        paper.style.transform = `translateY(${-(100 - progress)}%)`;

        setTimeout(printTick, delay);
      }

      setTimeout(printTick, 400);
    }, 300);
  });

  const closeOverlay = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  };

  document.getElementById('closePrintBtn').addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
  document.getElementById('savePrintBtn').addEventListener('click', () => {
    const exportBtn = document.getElementById('exportReceiptBtn');
    if (exportBtn) exportBtn.click();
  });

  document.getElementById('exportImageBtn').addEventListener('click', async () => {
    const paper = document.getElementById('receiptPaper');
    if (!paper) return;

    try {
      const btn = document.getElementById('exportImageBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '⌛ กำลังสร้าง...';
      btn.disabled = true;

      // Temporarily ensure full visibility and add padding for capture
      const originalPadding = paper.style.paddingBottom;
      const originalOverflow = paper.style.overflow;
      paper.style.paddingBottom = '30px';
      paper.style.overflow = 'visible';

      // Use html2canvas to capture the paper
      const canvas = await html2canvas(paper, {
        backgroundColor: '#f4e6cc',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX
      });

      // Restore original styles
      paper.style.paddingBottom = originalPadding;
      paper.style.overflow = originalOverflow;

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `receipt-${periodLabel.replace(/\s+/g, '-')}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();

      btn.innerHTML = '✅ สำเร็จ!';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);

      Utils.showToast('บันทึกรูปภาพเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Export image failed:', err);
      Utils.showToast('เกิดข้อผิดพลาดในการบันทึกรูปภาพ', 'error');
      const btn = document.getElementById('exportImageBtn');
      if (btn) {
        btn.innerHTML = '📸 บันทึกรูปภาพ';
        btn.disabled = false;
      }
    }
  });
}

async function updateCategoryOptions(type) {
  const cats = await TransactionModule.getCategories(type);
  const select = document.getElementById('txnCategory');
  select.innerHTML = `<option value="">เลือกหมวดหมู่</option>` +
    cats.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('');
}

async function saveTxn(closeModal = true) {
  const id = document.getElementById('txnId').value;
  // Parse date from Flatpickr format (DD/MM/YYYY HH:mm) to ISO
  let dateStr = document.getElementById('txnDate').value;
  const fp = document.getElementById('txnDate')._flatpickr;
  if (fp && fp.selectedDates[0]) {
    // Use the Date object directly from flatpickr
    const d = fp.selectedDates[0];
    // Adjust timezone offset to store local time as ISO
    const offset = d.getTimezoneOffset() * 60000;
    dateStr = new Date(d.getTime() - offset).toISOString().slice(0, 16);
  }

  const data = {
    type: document.getElementById('txnType').value,
    amount: parseFloat(document.getElementById('txnAmount').value),
    unitPrice: document.getElementById('txnUnitPrice').value ? parseFloat(document.getElementById('txnUnitPrice').value) : null,
    quantity: document.getElementById('txnQuantity').value ? parseFloat(document.getElementById('txnQuantity').value) : 1,
    date: dateStr,
    category: document.getElementById('txnCategory').value,
    note: document.getElementById('txnNote').value
  };

  // Persist for next time
  if (data.date) localStorage.setItem('lastTxnDate', data.date);
  if (data.type) localStorage.setItem('lastTxnType', data.type);
  if (data.category) localStorage.setItem('lastTxnCat_' + data.type, data.category);

  if (!data.amount || !data.date || !data.category) {
    Utils.showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  try {
    if (id) {
      const numericId = parseInt(id, 10);
      console.log('[DEBUG] Updating txn, id:', numericId, 'data:', data);
      const result = await TransactionModule.update(numericId, data);
      console.log('[DEBUG] Update result:', result);
      Utils.showToast('แก้ไขรายการสำเร็จ', 'success');
      if (closeModal) {
        closeTxnModal();
      }
    } else {
      await TransactionModule.add(data);

      // Show Receipt Popup for new entries
      const dateObj = new Date(data.date);
      // Format as DD/MM/YY HH:MM
      const dateStr = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

      if (document.getElementById('receiptDate')) {
        document.getElementById('receiptDate').textContent = dateStr;
      }
      if (document.getElementById('receiptCategory')) {
        const catLabel = data.category + (data.note ? ` (${data.note})` : '');
        document.getElementById('receiptCategory').textContent = catLabel;
      }

      const sign = data.type === 'income' ? '+' : '-';
      const amountEl = document.getElementById('receiptAmount');
      if (amountEl) {
        amountEl.textContent = `${sign}${new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2 }).format(data.amount)} ฿`;
        amountEl.style.color = data.type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)';
      }

      // Only show popup if closing modal, otherwise it might be annoying when adding multiple
      if (closeModal) {
        closeTxnModal();
        if (!window._preventNormalReceiptPopup) {
          const popup = document.getElementById('receiptPopup');
          if (popup) {
            popup.classList.add('active');
            setTimeout(() => popup.classList.remove('active'), 3000);
          }
        }
        window._preventNormalReceiptPopup = false;
      } else {
        // Reset form for next entry
        document.getElementById('txnId').value = '';
        document.getElementById('txnAmount').value = '';
        document.getElementById('txnUnitPrice').value = '';
        document.getElementById('txnQuantity').value = '1';
        document.getElementById('txnNote').value = '';
        // Keep Date and Type and Category as they are likely similar
        document.getElementById('txnNote').focus();
        // Automatically start next voice entry
        const aiVoiceInput = document.getElementById('aiVoiceInput');
        if (aiVoiceInput) {
          aiVoiceInput.value = '';
          aiVoiceInput.focus();
        }
      }
    }
    await refreshTransactions();
    refreshCategoryDetailView();

    // Ensure we are on the transactions page
    if (closeModal || id) {
      window.location.hash = '#transactions';

      // Auto-scroll to receipt view after saving or updating
      setTimeout(() => {
        const target = document.getElementById('txnListDetails');
        if (target) {
          const y = target.getBoundingClientRect().top + window.scrollY - 160;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150); // Give router time to render if it was on a different page
    }
  } catch (e) {
    Utils.showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
  }
}

function applyFilters() {
  currentFilters = {
    startDate: document.getElementById('filterStartDate').value,
    endDate: document.getElementById('filterEndDate').value,
    type: document.getElementById('filterType').value,
    category: document.getElementById('filterCategory').value,
    search: document.getElementById('filterSearch').value
  };
  refreshTransactions();
}

async function refreshTransactions() {
  try {
    const txns = await TransactionModule.getAll(currentFilters);
    const summary = await TransactionModule.getSummary(currentFilters.startDate, currentFilters.endDate);

    // Update summary cards
    const summaryEl = document.getElementById('txnSummaryCards');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="debt-summary-compact">
          <div class="summary-main">
            <div class="label">คงเหลือ (ตามช่วงเวลา)</div>
            <div class="value-huge ${summary.balance >= 0 ? 'success' : 'danger'}" style="color: var(--text-${summary.balance >= 0 ? 'success' : 'danger'})">${Utils.formatCurrency(summary.balance)}</div>
            <div class="sub-label">รายรับ - รายจ่าย</div>
          </div>
          
          <div class="summary-divider"></div>
 
          <div class="summary-metrics">
            <div class="metric-item">
              <span class="metric-label">รายรับทั้งหมด</span>
              <span class="metric-value success" style="color:var(--text-success)">${Utils.formatCurrency(summary.income)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">รายจ่ายทั้งหมด</span>
              <span class="metric-value danger" style="color:var(--text-danger)">${Utils.formatCurrency(summary.expense)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">จำนวนรายการ</span>
              <span class="metric-value">${txns.length} รายการ</span>
            </div>
          </div>
        </div>
      `;
    }

    // Update table
    const tableEl = document.getElementById('transactionsTable');
    if (txns.length === 0) {
      tableEl.innerHTML = `<div class="empty-state"><p>ไม่พบรายการ</p></div>`;
      return;
    }

    const activePeriodBtn = document.querySelector('.period-btn.active');
    const isGroupedView = activePeriodBtn && activePeriodBtn.dataset.period !== 'today';

    if (isGroupedView) {
      const grouped = {};
      txns.forEach(t => {
        const key = `${t.type}_${t.category}`;
        if (!grouped[key]) {
          grouped[key] = { type: t.type, category: t.category, amount: 0, count: 0, txns: [] };
        }
        grouped[key].amount += t.amount;
        grouped[key].count += 1;
        grouped[key].txns.push(t);
      });

      const groupedArr = Object.values(grouped).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
        return b.amount - a.amount;
      });

      // Store grouped data so click handler can access it
      window._groupedTxnData = groupedArr;

      tableEl.innerHTML = `
      <div style="position: relative;">
        <button id="addTransactionBtn" style="position: absolute; top: 11px; right: 18px; z-index: 10; padding: 7px 18px; font-size: 13px; font-weight: 600; background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); border-radius: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(74, 222, 128, 0.4); opacity: 1;" onmouseover="this.style.background='rgba(74, 222, 128, 0.2)'; this.style.borderColor='rgba(74, 222, 128, 0.6)';" onmouseout="this.style.background='rgba(74, 222, 128, 0.1)'; this.style.borderColor='rgba(74, 222, 128, 0.4)';">
          + เพิ่มรายการ
        </button>
        <table class="data-table">
        <thead>
          <tr>
            <th>ประเภท</th>
            <th>หมวดหมู่</th>
            <th style="text-align:right">จำนวน(ครั้ง)</th>
            <th style="text-align:right">รวมเป็นเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${groupedArr.map((g, idx) => `
            <tr data-qty="${g.count}" data-group-idx="${idx}" class="grouped-row" style="cursor:pointer;">
              <td data-label="ประเภท"><span class="badge badge-${g.type}">${g.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td>
              <td data-label="หมวดหมู่">${g.category} <span style="font-size:0.7em; opacity:0.5;">▸</span></td>
              <td data-label="วันที่" style="text-align:right; color:var(--text-tertiary);">${g.count}</td>
              <td data-label="จำนวน" class="amount ${g.type}" style="text-align:right">
                  ${g.type === 'income' ? '+' : '-'}${Utils.formatCurrency(g.amount)}
              </td>
            </tr>
          `).join('')}
          <tr class="receipt-footer">
              <td colspan="3" style="text-align:center; font-weight:bold; padding-top:10px;">ยอดรวมสุทธิ</td>
              <td colspan="1" style="text-align:center; font-weight:bold; font-size:1.2em; padding-top:10px;">
                  ${Utils.formatCurrency(txns.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0))}
              </td>
          </tr>
        </tbody>
      </table>
      </div>
      <div style="padding: var(--space-md); color: var(--text-tertiary); font-size: var(--font-size-xs);">
        สรุปตามหมวดหมู่ จากทั้งหมด ${txns.length} รายการ (กดที่หมวดหมู่เพื่อดูรายย่อยและแก้ไข)
      </div>
      `;

      // Attach click handlers to grouped rows
      tableEl.querySelectorAll('.grouped-row').forEach(row => {
        row.addEventListener('click', () => {
          const idx = parseInt(row.dataset.groupIdx);
          const g = window._groupedTxnData[idx];
          if (g) openCategoryDetailModal(g.type, g.category, g.txns);
        });
      });
    } else {
      tableEl.innerHTML = `
      <div style="position: relative;">
        <button id="addTransactionBtn" style="position: absolute; top: 11px; right: 18px; z-index: 10; padding: 7px 18px; font-size: 13px; font-weight: 600; background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); border-radius: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(74, 222, 128, 0.4); opacity: 1;" onmouseover="this.style.background='rgba(74, 222, 128, 0.2)'; this.style.borderColor='rgba(74, 222, 128, 0.6)';" onmouseout="this.style.background='rgba(74, 222, 128, 0.1)'; this.style.borderColor='rgba(74, 222, 128, 0.4)';">
          + เพิ่มรายการ
        </button>
        <table class="data-table">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>ประเภท</th>
            <th>หมวดหมู่</th>
            <th>หมายเหตุ</th>
            <th style="text-align:right">จำนวน</th>
            <th style="text-align:center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${[...txns].sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)).map(t => `
            <tr class="txn-row" data-id="${t.id}" data-qty="${t.quantity || 1}">
              <td data-label="วันที่">${Utils.formatDateTimeShort(t.date)}</td>
              <td data-label="ประเภท"><span class="badge badge-${t.type}">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td>
              <td data-label="หมวดหมู่">
                  ${t.note ? t.note : t.category}
                  ${(t.quantity && t.quantity > 1 && t.unitPrice) ? `<span style="font-size:0.85em; opacity:0.7; margin-left:8px;">@${Utils.formatCurrency(t.unitPrice)}</span>` : ''}
              </td>
              <td data-label="หมายเหตุ">${t.note || '-'}</td>
              <td data-label="จำนวน" class="amount ${t.type}" style="text-align:right">
                  ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
                  <div class="mobile-edit-overlay" data-id="${t.id}" title="แก้ไข"></div>
              </td>
              <td data-label="จัดการ" style="text-align:center">
                <button class="btn btn-sm btn-icon edit-txn" data-id="${t.id}" title="แก้ไข">✏️</button>
                <button class="btn btn-sm btn-icon delete-txn" data-id="${t.id}" title="ลบ">🗑️</button>
              </td>
            </tr>
          `).join('')}
          <tr class="receipt-footer">
              <td colspan="4" style="text-align:right; font-weight:bold; padding-top:15px; border-top: 2px dashed #000 !important;">ยอดรวมสุทธิ</td>
              <td colspan="2" style="text-align:right; font-weight:bold; font-size:1.2em; padding-top:15px; border-top: 2px dashed #000 !important;">
                  ${Utils.formatCurrency(txns.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0))}
              </td>
          </tr>
        </tbody>
      </table>
      </div>
      <div style="padding: var(--space-md); color: var(--text-tertiary); font-size: var(--font-size-xs);">
        แสดง ${txns.length} รายการ
      </div>
      `;
    }

    // Update the shared cache so the persistent event handler can find txn objects
    cachedTxns = txns;
  } catch (e) {
    console.error('Error refreshing transactions:', e);
    const tableEl = document.getElementById('transactionsTable');
    if (tableEl) {
      tableEl.innerHTML = `<div class="empty-state"><p style="color:var(--text-danger)">โหลตข้อมูลไม่สำเร็จ: ${e.message}</p></div>`;
    }
  }
}
