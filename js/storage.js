// Local Storage Management for Mystical Teachings

class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            SEARCH_HISTORY: 'mt_search_history',
            FAVORITES: 'mt_favorites',
            CACHED_CARDS: 'mt_cached_cards',
            APP_SETTINGS: 'mt_app_settings'
        };

        this.MAX_SEARCH_HISTORY = 10;
        this.MAX_CACHED_CARDS = 50;

        // Initialize storage if needed
        this.initializeStorage();
    }

    // Initialize storage with default values
    initializeStorage() {
        if (!this.getSearchHistory()) {
            this.setItem(this.STORAGE_KEYS.SEARCH_HISTORY, []);
        }

        if (!this.getFavorites()) {
            this.setItem(this.STORAGE_KEYS.FAVORITES, []);
        }

        if (!this.getCachedCards()) {
            this.setItem(this.STORAGE_KEYS.CACHED_CARDS, {});
        }

        if (!this.getAppSettings()) {
            this.setItem(this.STORAGE_KEYS.APP_SETTINGS, {
                theme: 'auto',
                cardImageQuality: 'normal',
                enableNotifications: false,
                cacheEnabled: true
            });
        }
    }

    // Generic storage methods
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    getItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return null;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    // Search History Methods
    getSearchHistory() {
        return this.getItem(this.STORAGE_KEYS.SEARCH_HISTORY) || [];
    }

    addToSearchHistory(query, timestamp = Date.now()) {
        const history = this.getSearchHistory();

        // Remove existing entry if it exists
        const existingIndex = history.findIndex(item => item.query.toLowerCase() === query.toLowerCase());
        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        // Add new entry at the beginning
        history.unshift({
            query: query.trim(),
            timestamp: timestamp,
            id: this.generateId()
        });

        // Limit history size
        if (history.length > this.MAX_SEARCH_HISTORY) {
            history.splice(this.MAX_SEARCH_HISTORY);
        }

        return this.setItem(this.STORAGE_KEYS.SEARCH_HISTORY, history);
    }

    removeFromSearchHistory(id) {
        const history = this.getSearchHistory();
        const filteredHistory = history.filter(item => item.id !== id);
        return this.setItem(this.STORAGE_KEYS.SEARCH_HISTORY, filteredHistory);
    }

    clearSearchHistory() {
        return this.setItem(this.STORAGE_KEYS.SEARCH_HISTORY, []);
    }

    // Favorites Methods
    getFavorites() {
        return this.getItem(this.STORAGE_KEYS.FAVORITES) || [];
    }

    addToFavorites(card) {
        const favorites = this.getFavorites();

        // Check if card is already in favorites
        const exists = favorites.some(fav => fav.id === card.id);
        if (exists) {
            return false; // Already in favorites
        }

        // Add card with timestamp
        favorites.unshift({
            ...card,
            favorited_at: Date.now()
        });

        return this.setItem(this.STORAGE_KEYS.FAVORITES, favorites);
    }

    removeFromFavorites(cardId) {
        const favorites = this.getFavorites();
        const filteredFavorites = favorites.filter(fav => fav.id !== cardId);
        return this.setItem(this.STORAGE_KEYS.FAVORITES, filteredFavorites);
    }

    isFavorite(cardId) {
        const favorites = this.getFavorites();
        return favorites.some(fav => fav.id === cardId);
    }

    toggleFavorite(card) {
        if (this.isFavorite(card.id)) {
            return this.removeFromFavorites(card.id);
        } else {
            return this.addToFavorites(card);
        }
    }

    clearFavorites() {
        return this.setItem(this.STORAGE_KEYS.FAVORITES, []);
    }

    // Card Cache Methods
    getCachedCards() {
        return this.getItem(this.STORAGE_KEYS.CACHED_CARDS) || {};
    }

    getCachedCard(cardId) {
        const cache = this.getCachedCards();
        const cachedCard = cache[cardId];

        if (cachedCard) {
            // Check if cache is still valid (24 hours)
            const cacheAge = Date.now() - cachedCard.cached_at;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (cacheAge < maxAge) {
                return cachedCard.data;
            } else {
                // Remove expired cache
                this.removeCachedCard(cardId);
            }
        }

        return null;
    }

    setCachedCard(cardId, cardData) {
        const cache = this.getCachedCards();

        // Add new card to cache
        cache[cardId] = {
            data: cardData,
            cached_at: Date.now(),
            access_count: (cache[cardId]?.access_count || 0) + 1,
            last_accessed: Date.now()
        };

        // Manage cache size
        this.manageCacheSize(cache);

        return this.setItem(this.STORAGE_KEYS.CACHED_CARDS, cache);
    }

    removeCachedCard(cardId) {
        const cache = this.getCachedCards();
        delete cache[cardId];
        return this.setItem(this.STORAGE_KEYS.CACHED_CARDS, cache);
    }

    manageCacheSize(cache) {
        const cacheEntries = Object.entries(cache);

        if (cacheEntries.length > this.MAX_CACHED_CARDS) {
            // Sort by last accessed time (oldest first)
            cacheEntries.sort((a, b) => a[1].last_accessed - b[1].last_accessed);

            // Remove oldest entries
            const entriesToRemove = cacheEntries.length - this.MAX_CACHED_CARDS;
            for (let i = 0; i < entriesToRemove; i++) {
                delete cache[cacheEntries[i][0]];
            }
        }
    }

    updateCachedCardAccess(cardId) {
        const cache = this.getCachedCards();
        if (cache[cardId]) {
            cache[cardId].last_accessed = Date.now();
            cache[cardId].access_count++;
            this.setItem(this.STORAGE_KEYS.CACHED_CARDS, cache);
        }
    }

    clearCardCache() {
        return this.setItem(this.STORAGE_KEYS.CACHED_CARDS, {});
    }

    // App Settings Methods
    getAppSettings() {
        return this.getItem(this.STORAGE_KEYS.APP_SETTINGS);
    }

    updateAppSettings(newSettings) {
        const currentSettings = this.getAppSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        return this.setItem(this.STORAGE_KEYS.APP_SETTINGS, updatedSettings);
    }

    getSetting(key) {
        const settings = this.getAppSettings();
        return settings ? settings[key] : null;
    }

    setSetting(key, value) {
        return this.updateAppSettings({ [key]: value });
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Get storage usage information
    getStorageInfo() {
        try {
            const used = new Blob(Object.values(localStorage)).size;
            const quota = 5 * 1024 * 1024; // Assume 5MB quota for localStorage

            return {
                used: used,
                quota: quota,
                percentage: (used / quota * 100).toFixed(2),
                available: quota - used
            };
        } catch (error) {
            console.error('Failed to calculate storage usage:', error);
            return null;
        }
    }

    // Export data for backup
    exportData() {
        const data = {
            search_history: this.getSearchHistory(),
            favorites: this.getFavorites(),
            app_settings: this.getAppSettings(),
            exported_at: Date.now(),
            version: '1.0.0'
        };

        return JSON.stringify(data, null, 2);
    }

    // Import data from backup
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            if (data.search_history) {
                this.setItem(this.STORAGE_KEYS.SEARCH_HISTORY, data.search_history);
            }

            if (data.favorites) {
                this.setItem(this.STORAGE_KEYS.FAVORITES, data.favorites);
            }

            if (data.app_settings) {
                this.setItem(this.STORAGE_KEYS.APP_SETTINGS, data.app_settings);
            }

            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    // Clear all app data
    clearAllData() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            this.initializeStorage();
            return true;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            return false;
        }
    }

    // Check if storage is available
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get recent searches for suggestions
    getRecentSearchSuggestions(query, limit = 5) {
        const history = this.getSearchHistory();
        const lowercaseQuery = query.toLowerCase();

        return history
            .filter(item => item.query.toLowerCase().includes(lowercaseQuery))
            .slice(0, limit)
            .map(item => item.query);
    }

    // Analytics methods (for understanding app usage)
    recordSearchAnalytics(query, resultCount) {
        const analytics = this.getItem('mt_analytics') || {
            total_searches: 0,
            unique_searches: new Set(),
            popular_searches: {},
            last_search: null
        };

        analytics.total_searches++;
        analytics.unique_searches.add(query.toLowerCase());
        analytics.popular_searches[query.toLowerCase()] =
            (analytics.popular_searches[query.toLowerCase()] || 0) + 1;
        analytics.last_search = Date.now();

        // Convert Set to Array for storage (Sets can't be JSON.stringified)
        const analyticsToStore = {
            ...analytics,
            unique_searches: Array.from(analytics.unique_searches)
        };

        this.setItem('mt_analytics', analyticsToStore);
    }

    getAnalytics() {
        const analytics = this.getItem('mt_analytics');
        if (analytics && Array.isArray(analytics.unique_searches)) {
            analytics.unique_searches = new Set(analytics.unique_searches);
        }
        return analytics;
    }
}

// Create global instance
window.storage = new StorageManager();