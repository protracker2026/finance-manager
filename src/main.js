// Main application entry
import { seedCategories, db } from './db/database.js'; // Import db instance
import { Router } from './router.js';
import { AuthModule } from './modules/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactionsPage } from './pages/transactions-page.js';
import { renderDebtsPage } from './pages/debts-page.js';
import { renderSettingsPage } from './pages/settings-page.js';
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
                'settings': renderSettingsPage
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
    // Init Auth
    await AuthModule.init();

    // Listen for Auth Changes
    AuthModule.onAuthChange((user) => {
        init(user);
    });
});

// Global Auto-Refresh on Sync
window.addEventListener('data-synced', () => {
    // Check if user is editing something (if any modal is open)
    const modals = document.querySelectorAll('.modal-overlay');
    let isEditing = false;
    modals.forEach(m => {
        // Check for common visibility patterns
        const style = getComputedStyle(m);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            isEditing = true;
        }
    });

    if (isEditing) {
        console.log('Skipped auto-reload due to open modal.');
    } else {
        // Trigger hashchange to reload current route
        window.dispatchEvent(new Event('hashchange'));
    }
});
