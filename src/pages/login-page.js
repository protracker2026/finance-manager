import { AuthModule } from '../modules/auth.js';
import { Utils } from '../modules/utils.js';

export function renderLoginPage(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="login-card">
            <!-- Loading -->
            <div class="loading-overlay" id="loadingOverlay">
                <div class="loading-spinner"></div>
            </div>

            <!-- Header -->
            <div class="login-header">
                <div class="login-icon">
                    <span>💰</span>
                </div>
                <h1 class="login-title">Finance Manager</h1>
                <p class="login-subtitle">จัดการการเงิน & หนี้สิน อย่างมืออาชีพ</p>
            </div>

            <!-- Error -->
            <div class="auth-error" id="authError">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span id="authErrorMessage">รหัสผ่านไม่ถูกต้อง</span>
            </div>

            <!-- Form -->
            <form id="authForm" class="auth-form">
                <div class="auth-input-group">
                    <label for="authEmail" class="auth-input-label">อีเมล</label>
                    <input type="email" id="authEmail" class="auth-input" placeholder="example@email.com" required autocomplete="email">
                </div>

                <div class="auth-input-group">
                    <label for="authPassword" class="auth-input-label">รหัสผ่าน</label>
                    <input type="password" id="authPassword" class="auth-input" placeholder="••••••••" required autocomplete="current-password" minlength="6">
                </div>

                <button type="submit" id="submitBtn" class="auth-btn btn-primary">เข้าสู่ระบบ</button>
            </form>

            <!-- Google Login -->
            <div style="margin-top: var(--space-md); text-align: center;">
                <p style="color: var(--text-tertiary); font-size: var(--font-size-xs); margin-bottom: var(--space-md);">- หรือ -</p>
                <button type="button" id="googleBtn" class="auth-btn btn-outline" style="background: white; color: #333; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width: 18px; height: 18px;" alt="Google">
                    ดำเนินการต่อด้วย Google
                </button>
            </div>

            <!-- Footer -->
            <div class="auth-footer">
                <p id="toggleText" class="text-tertiary text-sm mb-2">ยังไม่มีบัญชีใช่หรือไม่?</p>
                <button type="button" id="toggleModeBtn" class="btn btn-sm btn-outline">สมัครสมาชิกใหม่</button>
            </div>
        </div>
    `;

    // Elements
    const form = container.querySelector('#authForm');
    const emailInput = container.querySelector('#authEmail');
    const passwordInput = container.querySelector('#authPassword');
    const submitBtn = container.querySelector('#submitBtn');
    const toggleBtn = container.querySelector('#toggleModeBtn');
    const toggleText = container.querySelector('#toggleText');
    const errorBox = container.querySelector('#authError');
    const errorMessage = container.querySelector('#authErrorMessage');
    const loadingOverlay = container.querySelector('#loadingOverlay');

    // State
    let isRegisterMode = false;

    // Toggle Login / Register
    toggleBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;

        // Update UI
        if (isRegisterMode) {
            submitBtn.textContent = 'สมัครสมาชิก';
            toggleText.textContent = 'มีบัญชีอยู่แล้ว?';
            toggleBtn.textContent = 'เข้าสู่ระบบเดิม';
        } else {
            submitBtn.textContent = 'เข้าสู่ระบบ';
            toggleText.textContent = 'ยังไม่มีบัญชีใช่หรือไม่?';
            toggleBtn.textContent = 'สมัครสมาชิกใหม่';
        }

        // Clear errors
        errorBox.classList.remove('visible');
    });

    // Handle Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) return;

        // Show loading
        loadingOverlay.classList.add('active');
        errorBox.classList.remove('visible');
        submitBtn.disabled = true;

        let result;

        if (isRegisterMode) {
            result = await AuthModule.register(email, password);
        } else {
            result = await AuthModule.login(email, password);
        }

        // Hide loading
        loadingOverlay.classList.remove('active');
        submitBtn.disabled = false;

        if (result.success) {
            // Success logic is handled by onAuthStateChanged in main.js
            Utils.showToast(isRegisterMode ? 'สมัครสมาชิกเรียบร้อยแล้ว' : 'เข้าสู่ระบบเรียบร้อยแล้ว', 'success');
        } else {
            // Show error
            errorMessage.textContent = result.error;
            errorBox.classList.add('visible');
        }
    });

    // Handle Google Login
    const googleBtn = container.querySelector('#googleBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            // Show loading
            loadingOverlay.classList.add('active');
            errorBox.classList.remove('visible');

            const result = await AuthModule.loginWithGoogle();

            if (!result.success) {
                // Hide loading only on error (success redirects)
                loadingOverlay.classList.remove('active');

                // Show error
                errorMessage.textContent = result.error;
                errorBox.classList.add('visible');
            }
        });
    }
}
