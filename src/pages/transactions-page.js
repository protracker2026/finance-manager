// Transactions Page
import { TransactionModule } from '../modules/transactions.js';
import { Utils } from '../modules/utils.js';

let currentFilters = {};

export async function renderTransactionsPage(container) {
    const categories = await TransactionModule.getCategories();
    const { start, end } = Utils.getMonthRange();

    container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>รายรับ - รายจ่าย</h2>
        <p class="subtitle">บันทึกและติดตามรายรับ-รายจ่ายของคุณ</p>
      </div>
      <button class="btn btn-primary" id="addTransactionBtn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        เพิ่มรายการ
      </button>
    </div>

    <!-- Summary Cards -->
    <div id="txnSummaryCards"></div>

    <!-- Filters -->
    <div class="filter-bar">
      <input type="date" class="form-input" id="filterStartDate" value="${start}" style="width:auto">
      <span style="color:var(--text-tertiary)">ถึง</span>
      <input type="date" class="form-input" id="filterEndDate" value="${end}" style="width:auto">
      <select class="form-select" id="filterType" style="width:auto;min-width:120px">
        <option value="">ทุกประเภท</option>
        <option value="income">รายรับ</option>
        <option value="expense">รายจ่าย</option>
      </select>
      <select class="form-select" id="filterCategory" style="width:auto;min-width:140px">
        <option value="">ทุกหมวดหมู่</option>
        ${categories.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('')}
      </select>
      <div class="search-input" style="flex:1;min-width:150px">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="form-input" id="filterSearch" placeholder="ค้นหา..." style="padding-left:36px">
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div id="transactionsTable"></div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="txnModal">
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
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">จำนวนเงิน (บาท)</label>
                <input type="number" class="form-input" id="txnAmount" step="0.01" min="0" required>
              </div>
              <div class="form-group">
                <label class="form-label">วันที่</label>
                <input type="date" class="form-input" id="txnDate" value="${Utils.today()}" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">หมวดหมู่</label>
              <select class="form-select" id="txnCategory" required>
                <option value="">เลือกหมวดหมู่</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">หมายเหตุ</label>
              <textarea class="form-textarea" id="txnNote" rows="2" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn" id="txnCancelBtn">ยกเลิก</button>
          <button class="btn btn-primary" id="txnSaveBtn">บันทึก</button>
        </div>
      </div>
    </div>
  `;

    // Setup event listeners
    setupTransactionEvents();
    currentFilters = { startDate: start, endDate: end };
    await refreshTransactions();
}

function setupTransactionEvents() {
    // Open modal
    document.getElementById('addTransactionBtn').addEventListener('click', () => openTxnModal());

    // Close modal
    document.getElementById('txnModalClose').addEventListener('click', closeTxnModal);
    document.getElementById('txnCancelBtn').addEventListener('click', closeTxnModal);
    document.getElementById('txnModal').addEventListener('click', (e) => {
        if (e.target.id === 'txnModal') closeTxnModal();
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

    // Save
    document.getElementById('txnSaveBtn').addEventListener('click', saveTxn);

    // Filters
    ['filterStartDate', 'filterEndDate', 'filterType', 'filterCategory'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('filterSearch').addEventListener('input', debounce(applyFilters, 300));
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
        document.getElementById('txnDate').value = txn.date;
        document.getElementById('txnNote').value = txn.note || '';

        // Set type tab
        document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === txn.type);
        });
        document.getElementById('txnType').value = txn.type;
        await updateCategoryOptions(txn.type);
        document.getElementById('txnCategory').value = txn.category;
    } else {
        title.textContent = 'เพิ่มรายการ';
        document.getElementById('txnId').value = '';
        document.getElementById('txnAmount').value = '';
        document.getElementById('txnDate').value = Utils.today();
        document.getElementById('txnNote').value = '';
        document.querySelectorAll('#txnTypeTabs .tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === 'expense');
        });
        document.getElementById('txnType').value = 'expense';
        await updateCategoryOptions('expense');
    }

    modal.classList.add('active');
}

function closeTxnModal() {
    document.getElementById('txnModal').classList.remove('active');
}

async function updateCategoryOptions(type) {
    const cats = await TransactionModule.getCategories(type);
    const select = document.getElementById('txnCategory');
    select.innerHTML = `<option value="">เลือกหมวดหมู่</option>` +
        cats.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('');
}

async function saveTxn() {
    const id = document.getElementById('txnId').value;
    const data = {
        type: document.getElementById('txnType').value,
        amount: document.getElementById('txnAmount').value,
        date: document.getElementById('txnDate').value,
        category: document.getElementById('txnCategory').value,
        note: document.getElementById('txnNote').value
    };

    if (!data.amount || !data.date || !data.category) {
        Utils.showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
        return;
    }

    try {
        if (id) {
            await TransactionModule.update(parseInt(id), data);
            Utils.showToast('แก้ไขรายการสำเร็จ', 'success');
        } else {
            await TransactionModule.add(data);
            Utils.showToast('เพิ่มรายการสำเร็จ', 'success');
        }
        closeTxnModal();
        await refreshTransactions();
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
    const txns = await TransactionModule.getAll(currentFilters);
    const summary = await TransactionModule.getSummary(currentFilters.startDate, currentFilters.endDate);

    // Update summary cards
    const summaryEl = document.getElementById('txnSummaryCards');
    if (summaryEl) {
        summaryEl.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card income">
          <div class="stat-label">รายรับ</div>
          <div class="stat-value positive">${Utils.formatCurrency(summary.income)}</div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">รายจ่าย</div>
          <div class="stat-value negative">${Utils.formatCurrency(summary.expense)}</div>
        </div>
        <div class="stat-card balance">
          <div class="stat-label">คงเหลือ</div>
          <div class="stat-value ${summary.balance >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrency(summary.balance)}</div>
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
          <tr>
            <td>${Utils.formatDateShort(t.date)}</td>
            <td><span class="badge badge-${t.type}">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td>
            <td>${t.category}</td>
            <td>${t.note || '-'}</td>
            <td class="amount ${t.type}" style="text-align:right">${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}</td>
            <td style="text-align:center">
              <button class="btn btn-sm btn-icon edit-txn" data-id="${t.id}" title="แก้ไข">✏️</button>
              <button class="btn btn-sm btn-icon delete-txn" data-id="${t.id}" title="ลบ">🗑️</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="padding: var(--space-md); color: var(--text-tertiary); font-size: var(--font-size-xs);">
      แสดง ${txns.length} รายการ
    </div>
  `;

    // Attach row actions
    tableEl.querySelectorAll('.edit-txn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const txn = txns.find(t => t.id === parseInt(btn.dataset.id));
            if (txn) openTxnModal(txn);
        });
    });

    tableEl.querySelectorAll('.delete-txn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('คุณต้องการลบรายการนี้?')) {
                await TransactionModule.delete(parseInt(btn.dataset.id));
                Utils.showToast('ลบรายการสำเร็จ', 'success');
                refreshTransactions();
            }
        });
    });
}
