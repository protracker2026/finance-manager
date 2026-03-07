import { Utils } from '../modules/utils.js';
import { BackupModule } from '../modules/backup.js';
import { AuthModule } from '../modules/auth.js';

export async function renderSettingsPage(container) {
  const user = AuthModule.getCurrentUser();
  const userEmail = user ? user.email : 'Guest User';

  container.innerHTML = `
    <div class="settings-page" style="max-width: 600px; margin: 0 auto; padding-bottom: var(--space-xl);">
      <div class="page-header" style="margin-bottom: var(--space-xl);">
        <h2 style="font-weight: 800; font-size: 1.8rem; letter-spacing: -0.5px;">บัญชีและการตั้งค่า</h2>
        <p class="subtitle" style="opacity: 0.6;">จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ</p>
      </div>

      <!-- Profile Section -->
      <div class="card" style="padding: var(--space-lg); margin-bottom: var(--space-lg); border-radius: 20px;">
        <div style="display: flex; align-items: center; gap: var(--space-lg); margin-bottom: 24px;">
          <div style="width: 72px; height: 72px; background: linear-gradient(135deg, var(--accent-primary), #6366f1); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2); flex-shrink: 0;">
            👤
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${user ? user.displayName || 'ผู้ใช้งาน' : 'ผู้ใช้งาน'}</h3>
              <span class="badge badge-income" style="font-size: 10px; padding: 4px 10px; border-radius: 100px; font-weight: 700; background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2);">PRO MEMBER</span>
            </div>
            <p style="margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem; opacity: 0.8;">${userEmail}</p>
          </div>
        </div>
        
        <button class="btn btn-outline" style="width: 100%; justify-content: center; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: 600; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          แก้ไขข้อมูลโปรไฟล์
        </button>
      </div>

      <!-- Security Section -->
      <div class="card" style="padding: var(--space-lg); margin-bottom: var(--space-lg); border-radius: 20px;">
        <h4 style="margin: 0 0 16px; font-size: 0.95rem; font-weight: 700; color: var(--text-accent); text-transform: uppercase; letter-spacing: 1px;">ความปลอดภัย</h4>
        
        <div class="settings-list" style="display: flex; flex-direction: column; gap: 8px;">
          <div class="setting-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px solid rgba(139, 92, 246, 0.05);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; background: rgba(139, 92, 246, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #8b5cf6;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">รหัสผ่าน</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.7;">เปลี่ยนรหัสผ่านเพื่อความปลอดภัย</span>
              </div>
            </div>
            <button class="btn btn-sm" style="padding: 6px 14px; border-radius: 8px; font-weight: 600;" onclick="alert('ฟีเจอร์นี้ยังไม่เปิดใช้งาน')">เปลี่ยน</button>
          </div>

          <div class="setting-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px solid rgba(139, 92, 246, 0.05);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; background: rgba(59, 130, 246, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">ยืนยันตัวตน 2 ชั้น</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.7;">เพิ่มความปลอดภัยอีกขั้นให้กับบัญชี</span>
              </div>
            </div>
            <button class="btn btn-sm" style="padding: 6px 14px; border-radius: 8px; font-weight: 600;" onclick="alert('ฟีเจอร์นี้ยังไม่เปิดใช้งาน')">เปิดใช้</button>
          </div>
        </div>
      </div>

      <!-- Data Section -->
      <div class="card" style="padding: var(--space-lg); margin-bottom: var(--space-lg); border-radius: 20px;">
        <h4 style="margin: 0 0 16px; font-size: 0.95rem; font-weight: 700; color: var(--text-accent); text-transform: uppercase; letter-spacing: 1px;">จัดการข้อมูล</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <button id="exportBackupBtn" class="btn" style="flex-direction: column; gap: 8px; padding: 20px; border-radius: 16px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.15); color: #4ade80;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span style="font-weight: 700; font-size: 14px;">ส่งออกไฟล์</span>
          </button>
          
          <button id="importBackupBtn" class="btn" style="flex-direction: column; gap: 8px; padding: 20px; border-radius: 16px; background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.15); color: #a78bfa;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span style="font-weight: 700; font-size: 14px;">นำเข้าไฟล์</span>
          </button>
          <input type="file" id="importFile" style="display: none;" accept=".json">
        </div>
      </div>

      <div style="margin-top: 32px; padding: 0 var(--space-md);">
        <button id="logoutBtn" class="btn btn-danger" style="width: 100%; padding: 16px; border-radius: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, #ef4444, #b91c1c); border: none; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          ออกจากระบบ
        </button>
        <p style="text-align: center; margin-top: 16px; font-size: 11px; color: var(--text-tertiary); opacity: 0.5; font-weight: 600;">Finance Manager v2.2.0 PRE-RELEASE</p>
      </div>
    </div>

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
