// Main Application Controller for Mystical Teachings

class MysticalTeachingsApp {
    constructor() {
        this.currentTab = 'search-tab';
        this.isOnline = navigator.onLine;
        this.serviceWorkerReady = false;

        this.initializeApp();
    }

    // Initialize the application
    async initializeApp() {
        this.setupServiceWorker();
        this.setupNetworkHandling();
        this.setupTabNavigation();
        this.setupKeyboardShortcuts();
        this.setupPWAHandling();
        this.loadInitialData();

        console.log('Mystical Teachings app initialized');
    }

    // Setup service worker
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered successfully:', registration.scope);

                // Listen for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateAvailable();
                            }
                        });
                    }
                });

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });

                this.serviceWorkerReady = true;

            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Handle messages from service worker
    handleServiceWorkerMessage(data) {
        if (data.type === 'OFFLINE_STATUS') {
            this.updateOfflineStatus(!data.isOffline);
        }
    }

    // Setup network status handling
    setupNetworkHandling() {
        window.addEventListener('online', () => {
            this.updateOfflineStatus(true);
        });

        window.addEventListener('offline', () => {
            this.updateOfflineStatus(false);
        });

        // Initial status check
        this.updateOfflineStatus(navigator.onLine);
    }

    // Update offline status indicator
    updateOfflineStatus(isOnline) {
        this.isOnline = isOnline;
        const offlineIndicator = document.getElementById('offline-indicator');

        if (isOnline) {
            offlineIndicator.classList.add('hidden');
        } else {
            offlineIndicator.classList.remove('hidden');
        }

        // Update any UI elements that depend on network status
        this.updateNetworkDependentUI();
    }

    // Update UI elements that depend on network status
    updateNetworkDependentUI() {
        const searchInput = document.getElementById('card-search');
        const retryBtn = document.getElementById('retry-search');

        if (searchInput) {
            searchInput.disabled = !this.isOnline;
            searchInput.placeholder = this.isOnline
                ? 'Search for a Magic card...'
                : 'Offline - showing cached results only';
        }

        if (retryBtn && !this.isOnline) {
            retryBtn.disabled = true;
            retryBtn.textContent = 'Connect to retry';
        } else if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.textContent = 'Retry';
        }
    }

    // Setup tab navigation
    setupTabNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // Initialize with first tab active
        this.switchTab(this.currentTab);
    }

    // Switch between tabs
    switchTab(tabId) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        this.currentTab = tabId;

        // Trigger tab-specific actions
        this.onTabSwitch(tabId);

        // Update URL hash without triggering navigation
        if (history.replaceState) {
            history.replaceState(null, null, `#${tabId}`);
        }
    }

    // Handle tab switch events
    onTabSwitch(tabId) {
        switch (tabId) {
            case 'search-tab':
                // Focus search input
                const searchInput = document.getElementById('card-search');
                if (searchInput && this.isOnline) {
                    setTimeout(() => searchInput.focus(), 100);
                }
                break;

            case 'history-tab':
                // Refresh history data
                if (window.cardManager) {
                    window.cardManager.refreshFavorites();
                    window.cardManager.refreshSearchHistory();
                }
                break;

            case 'about-tab':
                // Could trigger analytics or load dynamic content
                this.trackTabView('about');
                break;
        }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + K: Focus search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('card-search');
                if (searchInput) {
                    this.switchTab('search-tab');
                    searchInput.focus();
                }
            }

            // Cmd/Ctrl + H: Switch to history tab
            if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
                e.preventDefault();
                this.switchTab('history-tab');
            }

            // Cmd/Ctrl + I: Switch to about tab
            if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                e.preventDefault();
                this.switchTab('about-tab');
            }

            // Escape: Close modals and clear focus
            if (e.key === 'Escape') {
                document.activeElement?.blur();
            }
        });
    }

    // Setup PWA installation handling
    setupPWAHandling() {
        let deferredPrompt;

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPromotion();
        });

        // Listen for app installation
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallPromotion();
            this.trackInstallation();
        });

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('PWA is running in standalone mode');
            this.trackStandaloneUsage();
        }

        // Handle install button if we create one
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`User ${outcome} the install prompt`);
                    deferredPrompt = null;
                }
            });
        }
    }

    // Show PWA install promotion
    showInstallPromotion() {
        // Could show a banner or button encouraging installation
        console.log('PWA can be installed');

        // Example: Add install button to about tab
        const aboutTab = document.getElementById('about-tab');
        if (aboutTab && !aboutTab.querySelector('.install-prompt')) {
            const installPrompt = document.createElement('div');
            installPrompt.className = 'install-prompt';
            installPrompt.innerHTML = `
                <div style="background: var(--primary-color); color: white; padding: var(--spacing-md); border-radius: var(--border-radius-lg); margin-bottom: var(--spacing-lg); text-align: center;">
                    <h3>Install Mystical Teachings</h3>
                    <p>Add this app to your home screen for quick access!</p>
                    <button id="install-app-btn" style="background: white; color: var(--primary-color); border: none; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--border-radius-md); cursor: pointer; font-weight: 600;">
                        📱 Install App
                    </button>
                </div>
            `;
            aboutTab.querySelector('.about-content').prepend(installPrompt);

            // Re-setup install button handler
            const installBtn = document.getElementById('install-app-btn');
            if (installBtn) {
                installBtn.addEventListener('click', () => {
                    if (window.deferredPrompt) {
                        window.deferredPrompt.prompt();
                    }
                });
            }
        }
    }

    // Hide install promotion
    hideInstallPromotion() {
        const installPrompt = document.querySelector('.install-prompt');
        if (installPrompt) {
            installPrompt.remove();
        }
    }

    // Load initial data
    loadInitialData() {
        // Check if we should restore a previous search from URL hash
        const hash = window.location.hash.slice(1);
        if (hash && ['search-tab', 'history-tab', 'about-tab'].includes(hash)) {
            this.switchTab(hash);
        }

        // Load favorites and search history
        if (window.cardManager) {
            window.cardManager.refreshFavorites();
            window.cardManager.refreshSearchHistory();
        }

        // Preload common data if online
        if (this.isOnline) {
            this.preloadCommonData();
        }
    }

    // Preload common data for better performance
    async preloadCommonData() {
        try {
            // Could preload popular card searches, sets data, etc.
            // For now, just test API connectivity
            const isHealthy = await window.api.checkAPIHealth();
            if (!isHealthy) {
                console.warn('API health check failed');
            }
        } catch (error) {
            console.warn('Failed to preload data:', error);
        }
    }

    // Show update available notification
    showUpdateAvailable() {
        // Show a non-intrusive notification about app update
        const updateNotification = document.createElement('div');
        updateNotification.className = 'update-notification';
        updateNotification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: var(--success-color); color: white; padding: var(--spacing-md); border-radius: var(--border-radius-md); box-shadow: var(--shadow-lg); z-index: 1000; max-width: 300px;">
                <h4>Update Available</h4>
                <p>A new version of Mystical Teachings is available!</p>
                <button onclick="window.location.reload()" style="background: white; color: var(--success-color); border: none; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--border-radius-sm); cursor: pointer; margin-top: var(--spacing-xs);">
                    Update Now
                </button>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; color: white; border: 1px solid white; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--border-radius-sm); cursor: pointer; margin-top: var(--spacing-xs); margin-left: var(--spacing-xs);">
                    Later
                </button>
            </div>
        `;
        document.body.appendChild(updateNotification);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            updateNotification.remove();
        }, 10000);
    }

    // Analytics and tracking methods
    trackTabView(tabName) {
        console.log(`Tab viewed: ${tabName}`);
        // Could send analytics data here
    }

    trackInstallation() {
        console.log('PWA installation tracked');
        // Could send analytics data here
    }

    trackStandaloneUsage() {
        console.log('PWA standalone usage tracked');
        // Could send analytics data here
    }

    trackSearch(query, resultCount) {
        console.log(`Search tracked: ${query} (${resultCount} results)`);
        // Analytics is handled in storage.js
    }

    // Error handling
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);

        // Show user-friendly error message
        this.showErrorNotification(`Something went wrong. Please try again.`);
    }

    // Show error notification
    showErrorNotification(message) {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'error-notification';
        errorNotification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: var(--error-color); color: white; padding: var(--spacing-md); border-radius: var(--border-radius-md); box-shadow: var(--shadow-lg); z-index: 1000; max-width: 300px;">
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" style="background: white; color: var(--error-color); border: none; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--border-radius-sm); cursor: pointer; margin-top: var(--spacing-xs); float: right;">
                    Dismiss
                </button>
            </div>
        `;
        document.body.appendChild(errorNotification);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorNotification.parentElement) {
                errorNotification.remove();
            }
        }, 5000);
    }

    // Performance monitoring
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();

        if (result instanceof Promise) {
            return result.then(res => {
                const end = performance.now();
                console.log(`${name} took ${end - start} milliseconds`);
                return res;
            });
        } else {
            const end = performance.now();
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        }
    }

    // Cleanup method
    cleanup() {
        // Remove event listeners and clean up resources
        window.removeEventListener('online', this.updateOfflineStatus);
        window.removeEventListener('offline', this.updateOfflineStatus);
        console.log('App cleanup completed');
    }

    // Get app status for debugging
    getAppStatus() {
        return {
            currentTab: this.currentTab,
            isOnline: this.isOnline,
            serviceWorkerReady: this.serviceWorkerReady,
            storageAvailable: window.storage?.isStorageAvailable(),
            cacheInfo: window.storage?.getStorageInfo(),
            favorites: window.storage?.getFavorites()?.length || 0,
            searchHistory: window.storage?.getSearchHistory()?.length || 0
        };
    }
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MysticalTeachingsApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App hidden');
    } else {
        console.log('App visible');
        // Refresh data when app becomes visible again
        if (window.cardManager && window.app?.isOnline) {
            // Could refresh search results or check for updates
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.cleanup();
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app) {
        window.app.handleError(event.error, 'Global');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app) {
        window.app.handleError(event.reason, 'Promise');
    }
    event.preventDefault();
});