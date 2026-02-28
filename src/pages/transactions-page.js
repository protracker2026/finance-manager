// Transactions Page
import { TransactionModule } from '../modules/transactions.js';
import { Utils } from '../modules/utils.js';

let currentFilters = {};
let currentDetailTxn = null;
let currentCategoryView = null; // Track if we are viewing a category detail full-screen
let cachedTxns = []; // Cache for event delegation
let refreshHandler = null; // To avoid stacking event listeners

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
        <button class="btn btn-secondary" id="exportReceiptBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Export PDF
        </button>
        <button class="btn btn-primary" id="addTransactionBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มรายการ
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
    <div class="filter-bar">
      <div class="filter-group date-range-group">
        <input type="date" class="date-no-border" id="filterStartDate" value="${start}">
        <span>-</span>
        <input type="date" class="date-no-border" id="filterEndDate" value="${end}">
      </div>
      <div class="filter-group selects">
        <select class="form-select" id="filterType" style="width:auto;min-width:120px">
          <option value="">ทุกประเภท</option>
          <option value="income">รายรับ</option>
          <option value="expense">รายจ่าย</option>
        </select>
        <select class="form-select" id="filterCategory" style="width:auto;min-width:140px">
          <option value="">ทุกหมวดหมู่</option>
          ${categories.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="search-input" style="flex:1;min-width:150px">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="form-input" id="filterSearch" placeholder="ค้นหา..." style="padding-left:36px">
      </div>
    </div>

    <!-- Table -->
    <!-- Collapsible Transaction List -->
    <details class="txn-list-details" id="txnListDetails" open>
      <summary class="btn" style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md); padding:var(--space-md);">
        <span style="font-weight:bold;">📋 แสดงรายการทั้งหมด</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
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
              <label class="form-label">หมวดหมู่</label>
              <select class="form-select" id="txnCategory" required>
                <option value="">เลือกหมวดหมู่</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer" style="flex-wrap: wrap; row-gap: 8px;">
          <button class="btn btn-danger" id="txnDeleteBtn" style="display:none; margin-right: auto;">ลบ</button>
          <div style="width: 100%; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn" id="txnCancelBtn">ยกเลิก</button>
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

  // Open modal
  document.getElementById('addTransactionBtn').addEventListener('click', () => openTxnModal());

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

  // Delegation for clicks inside category detail modal
  document.getElementById('categoryDetailBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.classList.contains('edit-txn')) {
      e.stopPropagation();
      const txnId = btn.dataset.id;
      const all = await TransactionModule.getAll({});
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

      document.getElementById('filterStartDate').value = r.start || '';
      document.getElementById('filterEndDate').value = r.end || '';
      applyFilters();
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
           <span class="value" style="font-size:var(--font-size-xs);">${txn.quantity} หน่วย x ${Utils.formatCurrency(txn.unitPrice || (txn.amount / txn.quantity))}</span>
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
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="btn btn-sm btn-icon edit-txn" data-id="${t.id}" title="แก้ไข" style="padding:4px 6px;">✏️</button>
        <button class="btn btn-sm btn-icon delete-txn" data-id="${t.id}" title="ลบ" style="padding:4px 6px;">🗑️</button>
      </div>
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
    if (lv === 'month') return `📆 ${Utils.getMonthName(m)} ${y + 543}`;
    if (lv === 'week') return `สัปดาห์ที่ ${Math.ceil(dd / 7)} (${Utils.getMonthName(m)})`;
    if (lv === 'day') return `📅 ${dd} ${Utils.getMonthName(m)}`;
    return '';
  };

  const renderGrouped = (txns, lvs) => {
    if (lvs.length === 0) {
      const sorted = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date));
      return sorted.map(t => _renderTxnItem(t, type)).join('');
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
      return `
        <details style="margin-bottom:6px; border:1px solid rgba(255,255,255,0.06); border-radius:var(--border-radius); overflow:hidden;">
          <summary style="padding:10px 12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); list-style:none;">
            <span style="font-weight:600; font-size:13px;">${g.label}</span>
            <span style="font-size:12px; color:${accentColor}; font-weight:600;">
              ${sign}${Utils.formatCurrency(gTotal)} 
              <span style="opacity:0.6; font-weight:400; font-size:11px;">(${g.items.length})</span>
            </span>
          </summary>
          <div style="padding:2px 4px 6px 4px; background:rgba(255,255,255,0.01);">
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
      console.log('[DEBUG] Updating txn, id:', id, 'type:', typeof id, 'data:', data);
      const result = await TransactionModule.update(id, data);
      console.log('[DEBUG] Update result:', result);
      Utils.showToast('แก้ไขรายการสำเร็จ', 'success');
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
        document.getElementById('receiptCategory').textContent = data.note ? data.note : data.category;
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
      } else {
        // Reset form for next entry
        document.getElementById('txnId').value = '';
        document.getElementById('txnAmount').value = '';
        document.getElementById('txnUnitPrice').value = '';
        document.getElementById('txnQuantity').value = '1';
        document.getElementById('txnNote').value = '';
        // Keep Date and Type and Category as they are likely similar
        document.getElementById('txnNote').focus();
      }
    }
    await refreshTransactions();
    refreshCategoryDetailView();
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
              <td colspan="3" style="text-align:right; font-weight:bold; padding-top:15px; border-top: 2px dashed #000 !important;">ยอดรวมสุทธิ</td>
              <td colspan="1" style="text-align:right; font-weight:bold; font-size:1.2em; padding-top:15px; border-top: 2px dashed #000 !important;">
                  ${Utils.formatCurrency(txns.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0))}
              </td>
          </tr>
        </tbody>
      </table>
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
          ${txns.map(t => `
            <tr class="txn-row" data-id="${t.id}" data-qty="${t.quantity || 1}">
              <td data-label="วันที่">${Utils.formatDateTimeShort(t.date)}</td>
              <td data-label="ประเภท"><span class="badge badge-${t.type}">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td>
              <td data-label="หมวดหมู่">
                  ${t.note ? t.note : t.category}
                  ${(t.quantity && t.quantity > 1) ? `<span style="font-size:0.85em; opacity:0.7; margin-left:8px;">@${Utils.formatCurrency(t.unitPrice || (t.amount / t.quantity))}</span>` : ''}
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
