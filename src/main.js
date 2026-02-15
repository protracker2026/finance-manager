// Main application entry
import { seedCategories } from './db/database.js';
import { Router } from './router.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactionsPage } from './pages/transactions-page.js';
import { renderDebtsPage } from './pages/debts-page.js';
import { renderReportsPage } from './pages/reports-page.js';

async function init() {
    // Seed default categories
    await seedCategories();

    // Initialize router
    const router = new Router({
        'dashboard': renderDashboard,
        'transactions': renderTransactionsPage,
        'debts': renderDebtsPage,
        'reports': renderReportsPage
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

// Start app
document.addEventListener('DOMContentLoaded', init);
