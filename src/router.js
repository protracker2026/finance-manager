// Simple hash-based router
export class Router {
    constructor(routes) {
        this.routes = routes;
        this.currentRoute = null;
        window.addEventListener('hashchange', () => this.navigate());
    }

    navigate(hash) {
        if (hash) window.location.hash = hash;
        const route = window.location.hash.slice(1) || 'dashboard';
        this.currentRoute = route;

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.route === route);
        });

        // Call route handler
        const handler = this.routes[route];
        if (handler) {
            const container = document.getElementById('app');
            if (container) handler(container);
        }
    }
}
