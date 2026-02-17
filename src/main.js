// Main application entry
import { seedCategories } from './db/database.js';
import { Router } from './router.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactionsPage } from './pages/transactions-page.js';
import { renderDebtsPage } from './pages/debts-page.js';
import { renderSettingsPage } from './pages/settings-page.js';

async function init() {
    // Initialize Database & Seed default categories
    await seedCategories();


    // Initialize router
    const router = new Router({
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
            document.querySelector('.sidebar').classList.remove('open');
        });
    });



    // Initial route
    router.navigate();
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
document.addEventListener('DOMContentLoaded', init);

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
