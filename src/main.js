// Main application entry
import { seedCategories, db } from './db/database.js'; // Import db instance
import { Router } from './router.js';
import { AuthModule } from './modules/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactionsPage } from './pages/transactions-page.js';
import { renderDebtsPage } from './pages/debts-page.js';
import { renderSettingsPage } from './pages/settings-page.js';
import { renderAnalyticsPage } from './pages/analytics-page.js';
import { renderLoginPage } from './pages/login-page.js';

let router;

async function init(user) {
    if (user) {
        console.log('User authenticated:', user.email);

        // Hide Login
        document.getElementById('login-container').classList.remove('active');
        document.getElementById('login-container').style.display = 'none'; // Ensure hidden

        // Initialize Database with User ID
        await db.setUser(user.uid);

        // Initialize Database & Seed default categories
        await seedCategories();

        // Initialize router if not exists
        if (!router) {
            router = new Router({
                'dashboard': renderDashboard,
                'transactions': renderTransactionsPage,
                'debts': renderDebtsPage,
                'settings': renderSettingsPage,
                'analytics': renderAnalyticsPage
            });

            // Nav click handlers
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const route = item.dataset.route;
                    router.navigate(route);
                    // Close mobile menu
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) sidebar.classList.remove('open');
                });
            });
        }

        // Initial route
        router.navigate();

    } else {
        console.log('User not authenticated. Showing login.');

        // Clear Data
        db.clearData();

        // Show Login
        const loginContainer = document.getElementById('login-container');
        loginContainer.style.display = 'flex'; // Force display flex
        loginContainer.classList.add('active');
        renderLoginPage(loginContainer);
    }
}

// Prevent pinch-to-zoom on mobile
document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// Prevent gesture zoom on iOS Safari
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
}, { passive: false });

// Start app
document.addEventListener('DOMContentLoaded', async () => {
    // Sidebar toggle logic
    const closeBtn = document.getElementById('sidebar-toggle-close');
    const openBtn = document.getElementById('sidebar-toggle-open');
    
    // Check saved state
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
        if (openBtn) openBtn.style.display = 'flex';
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.body.classList.add('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', 'true');
            if (openBtn) openBtn.style.display = 'flex';
        });
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.body.classList.remove('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', 'false');
            openBtn.style.display = 'none';
        });
    }

    // Init Auth
    await AuthModule.init();

    // Listen for Auth Changes
    AuthModule.onAuthChange((user) => {
        init(user);
    });
});

// Global Auto-Refresh on Sync
window.addEventListener('data-synced', () => {
    // Check if any modal is currently open (uses .active class)
    const isEditing = document.querySelector('.modal-overlay.active') !== null;
    const isAiReceiptActive = document.querySelector('.ai-receipt-overlay.active') !== null;

    if (isEditing || isAiReceiptActive) {
        console.log('Skipped auto-reload due to open modal or AI receipt.');
    } else {
        // Refresh data only — do NOT re-render via hashchange
        window.dispatchEvent(new Event('refresh-transactions'));
    }
});

// (Swipe-to-close modals logic removed to prevent accidental navigation)

