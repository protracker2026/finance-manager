// Reports Page
import { TransactionModule } from '../modules/transactions.js';
import { DebtModule } from '../modules/debts.js';
import { InterestEngine } from '../modules/interest.js';
import { Utils } from '../modules/utils.js';
import { PDFReport } from '../modules/pdf-report.js';

export async function renderReportsPage(container) {
    const { start, end } = Utils.getMonthRange();

    container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>รายงาน</h2>
        <p class="subtitle">ออกรายงานสรุปการเงินเป็น PDF</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:var(--space-xl)">
      <div class="card-header">
        <span class="card-title">ตั้งค่ารายงาน</span>
      </div>
      <div class="form-row" style="margin-bottom:var(--space-md)">
        <div class="form-group">
          <label class="form-label">ประเภทรายงาน</label>
          <select class="form-select" id="reportType">
            <option value="income_expense">📊 สรุปรายรับ-รายจ่าย</option>
            <option value="debt_summary">💳 รายงานหนี้สิน</option>
            <option value="debt_payments">💰 รายงานการชำระหนี้</option>
            <option value="full_report">📋 ภาพรวมสถานะการเงิน (รายงานฉบับเต็ม)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">ช่วงเวลา</label>
          <select class="form-select" id="reportPeriod">
            <option value="this_month">เดือนนี้</option>
            <option value="last_month">เดือนที่แล้ว</option>
            <option value="last_3_months">3 เดือนล่าสุด</option>
            <option value="last_6_months">6 เดือนล่าสุด</option>
            <option value="this_year">ปีนี้</option>
            <option value="custom">กำหนดเอง</option>
          </select>
        </div>
      </div>
      <div class="form-row" id="customDateRange" style="display:none;margin-bottom:var(--space-md)">
        <div class="form-group">
          <label class="form-label">วันเริ่ม</label>
          <input type="date" class="form-input" id="reportStartDate" value="${start}">
        </div>
        <div class="form-group">
          <label class="form-label">วันสิ้นสุด</label>
          <input type="date" class="form-input" id="reportEndDate" value="${end}">
        </div>
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn btn-primary" id="previewReportBtn">👁️ ดูตัวอย่าง</button>
        <button class="btn btn-success" id="exportPdfBtn">📥 ส่งออก PDF</button>
      </div>
    </div>

    <div id="reportPreview"></div>
  `;

    // Events
    document.getElementById('reportPeriod').addEventListener('change', (e) => {
        document.getElementById('customDateRange').style.display =
            e.target.value === 'custom' ? 'grid' : 'none';
    });

    document.getElementById('previewReportBtn').addEventListener('click', previewReport);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPdf);
}

function getDateRange() {
    const period = document.getElementById('reportPeriod').value;
    const now = new Date();
    let start, end;

    switch (period) {
        case 'this_month': {
            const r = Utils.getMonthRange(0);
            start = r.start; end = r.end; break;
        }
        case 'last_month': {
            const r = Utils.getMonthRange(-1);
            start = r.start; end = r.end; break;
        }
        case 'last_3_months': {
            const r1 = Utils.getMonthRange(-2);
            const r2 = Utils.getMonthRange(0);
            start = r1.start; end = r2.end; break;
        }
        case 'last_6_months': {
            const r1 = Utils.getMonthRange(-5);
            const r2 = Utils.getMonthRange(0);
            start = r1.start; end = r2.end; break;
        }
        case 'this_year': {
            start = `${now.getFullYear()}-01-01`;
            end = `${now.getFullYear()}-12-31`;
            break;
        }
        case 'custom':
            start = document.getElementById('reportStartDate').value;
            end = document.getElementById('reportEndDate').value;
            break;
    }
    return { start, end };
}

async function previewReport() {
    const type = document.getElementById('reportType').value;
    const { start, end } = getDateRange();
    const preview = document.getElementById('reportPreview');

    preview.innerHTML = '<div class="loading-spinner"></div>';

    try {
        let html = '';
        if (type === 'income_expense' || type === 'full_report') {
            html += await generateIncExpPreview(start, end);
        }
        if (type === 'debt_summary' || type === 'full_report') {
            html += await generateDebtPreview();
        }
        if (type === 'debt_payments' || type === 'full_report') {
            html += await generatePaymentPreview(start, end);
        }
        preview.innerHTML = `<div class="report-preview">${html}</div>`;
    } catch (e) {
        preview.innerHTML = `<div class="card"><div class="empty-state"><p>เกิดข้อผิดพลาด: ${e.message}</p></div></div>`;
    }
}

async function generateIncExpPreview(start, end) {
    const summary = await TransactionModule.getSummary(start, end);
    const txns = await TransactionModule.getAll({ startDate: start, endDate: end });

    let catRows = '';
    Object.entries(summary.byCategory).forEach(([cat, vals]) => {
        catRows += `<tr>
      <td>${cat}</td>
      <td style="text-align:right;color:var(--text-success);font-family:var(--font-mono)">${Utils.formatCurrency(vals.income)}</td>
      <td style="text-align:right;color:var(--text-danger);font-family:var(--font-mono)">${Utils.formatCurrency(vals.expense)}</td>
    </tr>`;
    });

    return `
    <div class="report-section">
      <h3>📊 สรุปรายรับ-รายจ่าย</h3>
      <p style="color:var(--text-tertiary);margin-bottom:var(--space-md)">ช่วง: ${Utils.formatDate(start)} - ${Utils.formatDate(end)}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-lg)">
        <div style="text-align:center;padding:var(--space-md);background:var(--bg-tertiary);border-radius:var(--border-radius)">
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary)">รายรับ</div>
          <div style="font-size:var(--font-size-lg);font-weight:700;color:var(--text-success);font-family:var(--font-mono)">${Utils.formatCurrency(summary.income)}</div>
        </div>
        <div style="text-align:center;padding:var(--space-md);background:var(--bg-tertiary);border-radius:var(--border-radius)">
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary)">รายจ่าย</div>
          <div style="font-size:var(--font-size-lg);font-weight:700;color:var(--text-danger);font-family:var(--font-mono)">${Utils.formatCurrency(summary.expense)}</div>
        </div>
        <div style="text-align:center;padding:var(--space-md);background:var(--bg-tertiary);border-radius:var(--border-radius)">
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary)">คงเหลือ</div>
          <div style="font-size:var(--font-size-lg);font-weight:700;color:${summary.balance >= 0 ? 'var(--text-success)' : 'var(--text-danger)'};font-family:var(--font-mono)">${Utils.formatCurrency(summary.balance)}</div>
        </div>
      </div>
      ${Object.keys(summary.byCategory).length > 0 ? `
      <h4 style="margin-bottom:var(--space-sm);color:var(--text-secondary)">แยกตามหมวดหมู่</h4>
      <table class="data-table">
        <thead><tr><th>หมวดหมู่</th><th style="text-align:right">รายรับ</th><th style="text-align:right">รายจ่าย</th></tr></thead>
        <tbody>${catRows}</tbody>
      </table>` : ''}
      <h4 style="margin: var(--space-lg) 0 var(--space-sm);color:var(--text-secondary)">รายการทั้งหมด (${txns.length} รายการ)</h4>
      <table class="data-table">
        <thead><tr><th>วันที่</th><th>ประเภท</th><th>หมวดหมู่</th><th>หมายเหตุ</th><th style="text-align:right">จำนวน</th></tr></thead>
        <tbody>
          ${txns.slice(0, 50).map(t => `
            <tr>
              <td>${Utils.formatDateShort(t.date)}</td>
              <td><span class="badge badge-${t.type}">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td>
              <td>${t.category}</td>
              <td>${t.note || '-'}</td>
              <td class="amount ${t.type}" style="text-align:right">${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${txns.length > 50 ? `<p style="color:var(--text-tertiary);font-size:var(--font-size-xs);margin-top:var(--space-sm)">แสดง 50 จาก ${txns.length} รายการ (PDF จะแสดงทั้งหมด)</p>` : ''}
    </div>
  `;
}

async function generateDebtPreview() {
    const summary = await DebtModule.getDebtSummary();

    return `
    <div class="report-section">
      <h3>💳 รายงานหนี้สิน</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-lg)">
        <div class="summary-row"><span class="label">เงินต้นรวม</span><span class="value">${Utils.formatCurrency(summary.totalOriginal)}</span></div>
        <div class="summary-row"><span class="label">คงค้างรวม</span><span class="value" style="color:var(--text-danger)">${Utils.formatCurrency(summary.totalDebt)}</span></div>
        <div class="summary-row"><span class="label">ดอกเบี้ยรวมที่จ่าย</span><span class="value" style="color:var(--text-warning)">${Utils.formatCurrency(summary.totalInterestPaid)}</span></div>
        <div class="summary-row"><span class="label">ชำระแล้วทั้งหมด</span><span class="value" style="color:var(--text-success)">${Utils.formatCurrency(summary.totalPaid)}</span></div>
      </div>
      <table class="data-table">
        <thead><tr><th>ชื่อ</th><th>ประเภท</th><th>ดอกเบี้ย</th><th style="text-align:right">เงินต้น</th><th style="text-align:right">คงเหลือ</th><th>สถานะ</th></tr></thead>
        <tbody>
          ${summary.debts.map(d => `
            <tr>
              <td>${d.name}</td>
              <td>${Utils.debtTypeName(d.type)}</td>
              <td>${d.annualRate}% (${Utils.interestTypeName(d.interestType)})</td>
              <td style="text-align:right;font-family:var(--font-mono)">${Utils.formatCurrency(d.principal)}</td>
              <td style="text-align:right;font-family:var(--font-mono);color:var(--text-danger)">${Utils.formatCurrency(d.currentBalance)}</td>
              <td><span class="badge badge-${d.status === 'paid' ? 'paid' : 'active'}">${d.status === 'paid' ? 'ปิดแล้ว' : 'คงค้าง'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function generatePaymentPreview(start, end) {
    const payments = await DebtModule.getAllPayments();
    const filtered = payments.filter(p => (!start || p.date >= start) && (!end || p.date <= end));
    const debts = await DebtModule.getAll();
    const debtMap = {};
    debts.forEach(d => debtMap[d.id] = d.name);

    return `
    <div class="report-section">
      <h3>💰 รายงานการชำระหนี้</h3>
      <p style="color:var(--text-tertiary);margin-bottom:var(--space-md)">ช่วง: ${Utils.formatDate(start)} - ${Utils.formatDate(end)}</p>
      ${filtered.length === 0 ? '<p style="color:var(--text-tertiary)">ไม่มีรายการชำระในช่วงนี้</p>' : `
      <table class="data-table">
        <thead><tr><th>วันที่</th><th>หนี้</th><th style="text-align:right">ยอดชำระ</th><th style="text-align:right">ดอกเบี้ย</th><th style="text-align:right">เงินต้น</th><th style="text-align:right">ยอมคงเหลือ</th></tr></thead>
        <tbody>
          ${filtered.map(p => `
            <tr>
              <td>${Utils.formatDateShort(p.date)}</td>
              <td>${debtMap[p.debtId] || 'N/A'}</td>
              <td style="text-align:right;font-family:var(--font-mono)">${Utils.formatCurrency(p.amount)}</td>
              <td style="text-align:right;font-family:var(--font-mono);color:var(--text-warning)">${Utils.formatCurrency(p.interestPortion)}</td>
              <td style="text-align:right;font-family:var(--font-mono);color:var(--text-success)">${Utils.formatCurrency(p.principalPortion)}</td>
              <td style="text-align:right;font-family:var(--font-mono)">${Utils.formatCurrency(p.balanceAfter)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}

async function exportPdf() {
    const type = document.getElementById('reportType').value;
    const { start, end } = getDateRange();

    try {
        Utils.showToast('กำลังสร้าง PDF...', 'info');
        await PDFReport.generate(type, start, end);
        Utils.showToast('ส่งออก PDF สำเร็จ!', 'success');
    } catch (e) {
        Utils.showToast('เกิดข้อผิดพลาดในการสร้าง PDF: ' + e.message, 'error');
        console.error(e);
    }
}
