import { Utils } from '../modules/utils.js';
import { BackupModule } from '../modules/backup.js';
import { AuthModule } from '../modules/auth.js';

export async function renderSettingsPage(container) {
  const user = AuthModule.getCurrentUser();
  const userEmail = user ? user.email : 'Guest User';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2>บัญชีและการตั้งค่า</h2>
        <p class="subtitle">จัดการข้อมูลส่วนตัวและการตั้งค่าแอพพลิเคชั่น</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: var(--space-lg);">
      <div style="display: flex; align-items: center; gap: var(--space-lg); margin-bottom: var(--space-lg);">
        <div style="width: 80px; height: 80px; background: var(--bg-tertiary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; border: 2px solid var(--accent-primary);">
          👤
        </div>
        <div>
          <h3 style="color: var(--text-accent); margin-bottom: 4px;">ผู้ใช้งาน</h3>
          <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${userEmail}</p>
          <span class="badge badge-income" style="margin-top: 8px;">Basic Member</span>
        </div>
        <button class="btn btn-sm" style="margin-left: auto;">แก้ไขโปรไฟล์</button>
      </div>
      
      <div class="summary-divider" style="margin: var(--space-md) 0;"></div>
      
      <div class="settings-grid">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">รหัสผ่าน</span>
            <span class="setting-value">จัดการรหัสผ่านของคุณ</span>
          </div>
          <button class="btn btn-sm" onclick="alert('ฟีเจอร์นี้ยังไม่เปิดใช้งาน')">เปลี่ยน</button>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">การยืนยันตัวตน 2 ขั้นตอน</span>
            <span class="setting-value">เพิ่มความปลอดภัยให้กับบัญชีของคุณ</span>
          </div>
          <button class="btn btn-sm" onclick="alert('ฟีเจอร์นี้ยังไม่เปิดใช้งาน')">ตั้งค่า</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom: var(--space-md); color: var(--text-accent);">การจัดการข้อมูลและการซิงค์</h3>
      <div class="settings-grid">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">สำรองข้อมูลไปยังไฟล์ (Export)</span>
            <span class="setting-value">ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ .json เพื่อย้ายไปยังเครื่องอื่น</span>
          </div>
          <button class="btn btn-sm" id="exportBackupBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ส่งออก
          </button>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">นำเข้าข้อมูลจากไฟล์ (Import)</span>
            <span class="setting-value">กู้คืนข้อมูลจากไฟล์สำรอง (ระวัง: ข้อมูลเดิมจะถูกลบ)</span>
          </div>
          <button class="btn btn-sm" id="importBackupBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            นำเข้า
          </button>
          <input type="file" id="importFile" style="display: none;" accept=".json">
        </div>
      
      <div style="margin-top: var(--space-xl); display: flex; justify-content: center;">
        <button class="btn btn-danger" id="logoutBtn" style="width: 100%; max-width: 300px; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          ออกจากระบบ
        </button>
      </div>
    </div>

    <p style="text-align: center; font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: var(--space-xl);">
      Finance Manager v2.1.0 (Auth Enabled)
    </p>

    <style>
      .settings-grid {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }
      .setting-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-sm) 0;
        border-bottom: 1px solid var(--border-color);
      }
      .setting-item:last-child {
        border-bottom: none;
      }
      .setting-info {
        display: flex;
        flex-direction: column;
      }
      .setting-label {
        color: var(--text-primary);
        font-weight: 500;
      }
      .setting-value {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
      }
    </style>
  `;

  // Add Logic
  const exportBtn = container.querySelector('#exportBackupBtn');
  const importBtn = container.querySelector('#importBackupBtn');
  const importFileInput = container.querySelector('#importFile');
  const logoutBtn = container.querySelector('#logoutBtn');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      BackupModule.exportData();
    });
  }

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        BackupModule.importData(event.target.result);
      };
      reader.readAsText(file);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        const result = await AuthModule.logout();
        if (result.success) {
          Utils.showToast('ออกจากระบบเรียบร้อยแล้ว');
          // Check main.js for auth state listener to redirect
        } else {
          Utils.showToast('เกิดข้อผิดพลาดในการออกจากระบบ: ' + result.error, 'error');
        }
      }
    });
  }
}
