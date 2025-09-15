// Card Display and Management for Mystical Teachings

class CardManager {
    constructor() {
        this.currentSearch = null;
        this.searchResults = [];
        this.isLoading = false;
        this.currentPage = 1;
        this.hasMoreResults = false;
        this.suggestions = [];
        this.debounceTimer = null;
        this.currentModal = null;

        this.initializeElements();
        this.bindEvents();
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            searchInput: document.getElementById('card-search'),
            clearSearchBtn: document.getElementById('clear-search'),
            suggestionsDropdown: document.getElementById('search-suggestions'),
            loadingIndicator: document.getElementById('loading-indicator'),
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-search'),
            cardGrid: document.getElementById('card-grid'),
            cardModal: document.getElementById('card-modal'),
            modalClose: document.querySelector('.modal-close'),
            modalBackdrop: document.querySelector('.modal-backdrop'),
            cardDetail: document.getElementById('card-detail'),
            favoritesGrid: document.getElementById('favorites-grid'),
            noFavorites: document.getElementById('no-favorites'),
            recentSearches: document.getElementById('recent-searches'),
            noHistory: document.getElementById('no-history'),
            clearHistoryBtn: document.getElementById('clear-history')
        };
    }

    // Bind event listeners
    bindEvents() {
        // Search input events
        this.elements.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        this.elements.searchInput.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });

        this.elements.searchInput.addEventListener('focus', () => {
            this.showSuggestions();
        });

        // Clear search button
        this.elements.clearSearchBtn.addEventListener('click', () => {
            this.clearSearch();
        });

        // Retry button
        this.elements.retryBtn.addEventListener('click', () => {
            this.retrySearch();
        });

        // Modal events
        this.elements.modalClose.addEventListener('click', () => {
            this.closeModal();
        });

        this.elements.modalBackdrop.addEventListener('click', () => {
            this.closeModal();
        });

        // Clear history button
        this.elements.clearHistoryBtn.addEventListener('click', () => {
            this.clearSearchHistory();
        });

        // Global click handler to hide suggestions
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.hideSuggestions();
            }
        });

        // Handle card grid scroll for infinite loading
        this.elements.cardGrid.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    // Handle search input with debouncing
    handleSearchInput(query) {
        const trimmedQuery = query.trim();

        // Show/hide clear button
        this.elements.clearSearchBtn.classList.toggle('visible', trimmedQuery.length > 0);

        // Clear previous debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // If query is empty, clear results
        if (trimmedQuery.length === 0) {
            this.clearResults();
            this.hideSuggestions();
            return;
        }

        // Debounce search
        this.debounceTimer = setTimeout(() => {
            if (trimmedQuery.length >= 2) {
                this.getSuggestions(trimmedQuery);
                if (trimmedQuery.length >= 3) {
                    this.searchCards(trimmedQuery);
                }
            }
        }, 300);
    }

    // Handle keyboard navigation in search
    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.elements.searchInput.value.trim();
            if (query) {
                this.performSearch(query);
                this.hideSuggestions();
            }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
        } else if (e.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    // Get search suggestions
    async getSuggestions(query) {
        try {
            this.suggestions = await window.api.getCardSuggestions(query, 8);
            this.renderSuggestions();
        } catch (error) {
            console.warn('Failed to get suggestions:', error);
            this.suggestions = [];
            this.renderSuggestions();
        }
    }

    // Render search suggestions
    renderSuggestions() {
        if (this.suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        const suggestionsHTML = this.suggestions.map((suggestion, index) => {
            if (suggestion.type === 'card') {
                return `
                    <div class="suggestion-item card-suggestion" data-index="${index}" data-name="${suggestion.name}">
                        ${suggestion.image ? `<img src="${suggestion.image}" alt="${suggestion.name}" class="suggestion-image">` : '<div class="suggestion-image"></div>'}
                        <div class="suggestion-info">
                            <div class="suggestion-name">${this.escapeHtml(suggestion.name)}</div>
                            <div class="suggestion-type">${this.escapeHtml(suggestion.type_line || '')}</div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="suggestion-item" data-index="${index}" data-name="${suggestion.name}">
                        <span>🕒 ${this.escapeHtml(suggestion.name)}</span>
                    </div>
                `;
            }
        }).join('');

        this.elements.suggestionsDropdown.innerHTML = suggestionsHTML;
        this.showSuggestions();

        // Add click handlers to suggestions
        this.elements.suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.dataset.name;
                this.selectSuggestion(name);
            });
        });
    }

    // Navigate suggestions with keyboard
    navigateSuggestions(direction) {
        const suggestions = this.elements.suggestionsDropdown.querySelectorAll('.suggestion-item');
        if (suggestions.length === 0) return;

        const currentIndex = Array.from(suggestions).findIndex(item =>
            item.classList.contains('suggestion-active')
        );

        // Remove current active class
        if (currentIndex !== -1) {
            suggestions[currentIndex].classList.remove('suggestion-active');
        }

        // Calculate new index
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = suggestions.length - 1;
        if (newIndex >= suggestions.length) newIndex = 0;

        // Add active class to new item
        suggestions[newIndex].classList.add('suggestion-active');
        suggestions[newIndex].scrollIntoView({ block: 'nearest' });

        // Update search input with suggestion
        const name = suggestions[newIndex].dataset.name;
        this.elements.searchInput.value = name;
    }

    // Select a suggestion
    selectSuggestion(name) {
        this.elements.searchInput.value = name;
        this.hideSuggestions();
        this.performSearch(name);
    }

    // Show suggestions dropdown
    showSuggestions() {
        if (this.suggestions.length > 0) {
            this.elements.suggestionsDropdown.classList.remove('hidden');
        }
    }

    // Hide suggestions dropdown
    hideSuggestions() {
        this.elements.suggestionsDropdown.classList.add('hidden');
    }

    // Perform search
    async performSearch(query) {
        this.currentSearch = query;
        this.currentPage = 1;
        this.searchResults = [];

        // Add to search history
        window.storage.addToSearchHistory(query);

        await this.searchCards(query);
    }

    // Search for cards
    async searchCards(query, page = 1) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();
        this.hideError();

        try {
            const result = await window.api.searchCards(query, {
                page: page,
                order: 'name',
                unique: 'cards'
            });

            if (page === 1) {
                this.searchResults = result.data || [];
            } else {
                this.searchResults = [...this.searchResults, ...(result.data || [])];
            }

            this.hasMoreResults = result.has_more || false;
            this.currentPage = page;

            this.renderCards();
            this.showResultsCount(result.total_cards || this.searchResults.length);

        } catch (error) {
            console.error('Search failed:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    // Retry search
    async retrySearch() {
        if (this.currentSearch) {
            await this.searchCards(this.currentSearch, this.currentPage);
        }
    }

    // Render cards in grid
    renderCards() {
        if (this.searchResults.length === 0) {
            this.elements.cardGrid.innerHTML = '<div class="empty-state">No cards found. Try a different search term.</div>';
            return;
        }

        const cardsHTML = this.searchResults.map(card => this.createCardHTML(card)).join('');
        this.elements.cardGrid.innerHTML = cardsHTML;

        // Add event listeners to cards
        this.bindCardEvents();
    }

    // Create HTML for a single card
    createCardHTML(card) {
        const imageUrl = window.api.getCardImageUrl(card, 'normal');
        const isFavorited = window.storage.isFavorite(card.id);
        const manaCostHTML = this.createManaSymbolsHTML(card.mana_symbols);

        return `
            <div class="card-item" data-card-id="${card.id}" data-rarity="${card.rarity}">
                <button class="card-favorite ${isFavorited ? 'favorited' : ''}" data-card-id="${card.id}">
                    ${isFavorited ? '❤️' : '🤍'}
                </button>

                <div class="card-image-container">
                    ${imageUrl ? `
                        <img src="${imageUrl}" alt="${this.escapeHtml(card.name)}" class="card-image loading">
                    ` : `
                        <div class="card-image-error">No image available</div>
                    `}
                    ${card.is_creature && card.power && card.toughness ? `
                        <div class="card-power-toughness">${card.power}/${card.toughness}</div>
                    ` : ''}
                </div>

                <div class="card-info">
                    <div class="card-name">${this.escapeHtml(card.name)}</div>
                    <div class="card-type">${this.escapeHtml(card.type_line)}</div>
                    <div class="card-meta">
                        <div class="card-mana-cost">${manaCostHTML}</div>
                        <div class="card-set">${this.escapeHtml(card.set_name || card.set || '')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create mana symbols HTML
    createManaSymbolsHTML(symbols) {
        if (!symbols || symbols.length === 0) return '';

        return symbols.map(symbol => {
            const symbolClass = this.getManaSymbolClass(symbol);
            return `<span class="mana-symbol ${symbolClass}" data-symbol="${symbol}">${this.getManaSymbolDisplay(symbol)}</span>`;
        }).join('');
    }

    // Get CSS class for mana symbol
    getManaSymbolClass(symbol) {
        const symbol_lower = symbol.toLowerCase();

        if (['w', 'u', 'b', 'r', 'g'].includes(symbol_lower)) {
            const colorMap = { w: 'white', u: 'blue', b: 'black', r: 'red', g: 'green' };
            return colorMap[symbol_lower];
        }

        if (symbol_lower === 'c') return 'colorless';
        if (symbol_lower === 's') return 'snow';
        if (symbol_lower === 'x') return 'variable';
        if (symbol_lower === 't') return 'tap';
        if (symbol_lower === 'q') return 'untap';
        if (symbol_lower === 'e') return 'energy';
        if (/^\d+$/.test(symbol)) return 'generic';
        if (symbol.includes('/')) return 'hybrid';

        return 'generic';
    }

    // Get display text for mana symbol
    getManaSymbolDisplay(symbol) {
        const symbol_lower = symbol.toLowerCase();

        if (['w', 'u', 'b', 'r', 'g'].includes(symbol_lower)) {
            return symbol.toUpperCase();
        }

        if (symbol_lower === 'c') return 'C';
        if (symbol_lower === 's') return '❅';
        if (symbol_lower === 'x') return 'X';
        if (symbol_lower === 't') return '⟲';
        if (symbol_lower === 'q') return '⟳';
        if (symbol_lower === 'e') return 'E';
        if (/^\d+$/.test(symbol)) return symbol;

        return symbol;
    }

    // Bind events to card elements
    bindCardEvents() {
        // Card click events (open modal)
        this.elements.cardGrid.querySelectorAll('.card-item').forEach(cardElement => {
            cardElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('card-favorite')) {
                    return; // Don't open modal when clicking favorite button
                }

                const cardId = cardElement.dataset.cardId;
                const card = this.searchResults.find(c => c.id === cardId);
                if (card) {
                    this.openCardModal(card);
                }
            });
        });

        // Favorite button events
        this.elements.cardGrid.querySelectorAll('.card-favorite').forEach(favoriteBtn => {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cardId = favoriteBtn.dataset.cardId;
                const card = this.searchResults.find(c => c.id === cardId);
                if (card) {
                    this.toggleFavorite(card, favoriteBtn);
                }
            });
        });

        // Handle image loading
        this.elements.cardGrid.querySelectorAll('.card-image').forEach(img => {
            img.addEventListener('load', () => {
                img.classList.remove('loading');
                img.classList.add('loaded');
            });

            img.addEventListener('error', () => {
                img.classList.remove('loading');
                const container = img.closest('.card-image-container');
                container.innerHTML = '<div class="card-image-error">Failed to load image</div>';
            });
        });
    }

    // Toggle favorite status
    toggleFavorite(card, buttonElement) {
        const wasToggled = window.storage.toggleFavorite(card);

        if (wasToggled) {
            const isFavorited = window.storage.isFavorite(card.id);
            buttonElement.textContent = isFavorited ? '❤️' : '🤍';
            buttonElement.classList.toggle('favorited', isFavorited);

            // Refresh favorites display if we're on that tab
            this.refreshFavorites();
        }
    }

    // Open card detail modal
    async openCardModal(card) {
        try {
            // Show modal with loading state
            this.elements.cardModal.classList.remove('hidden');
            this.elements.cardDetail.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading card details...</span></div>';

            // Get fresh card data if needed
            let detailCard = card;
            if (!card.oracle_text && card.id) {
                try {
                    detailCard = await window.api.getCardById(card.id);
                } catch (error) {
                    console.warn('Failed to fetch detailed card data:', error);
                    detailCard = card; // Use original card data
                }
            }

            this.renderCardDetail(detailCard);
            this.currentModal = detailCard;

        } catch (error) {
            console.error('Failed to open card modal:', error);
            this.elements.cardDetail.innerHTML = '<div class="error-message">Failed to load card details.</div>';
        }
    }

    // Render card detail in modal
    renderCardDetail(card) {
        const imageUrl = window.api.getCardImageUrl(card, 'large');
        const isFavorited = window.storage.isFavorite(card.id);
        const manaCostHTML = this.createManaSymbolsHTML(card.mana_symbols);

        const detailHTML = `
            <div class="card-detail-image">
                ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHtml(card.name)}" loading="lazy">` : '<div class="card-image-error">No image available</div>'}
            </div>

            <div class="card-detail-info">
                <h2 class="card-detail-name">${this.escapeHtml(card.name)}</h2>

                ${card.mana_cost ? `
                    <div class="card-detail-mana">
                        <span>Mana Cost: </span>${manaCostHTML}
                        <span class="cmc-indicator">CMC: <span class="cmc-value">${card.cmc}</span></span>
                    </div>
                ` : ''}

                <div class="card-detail-type">${this.escapeHtml(card.type_line)}</div>

                ${card.oracle_text ? `
                    <div class="card-detail-text">
                        ${this.formatOracleText(card.oracle_text)}
                    </div>
                ` : ''}

                ${card.flavor_text ? `
                    <div class="card-detail-flavor">
                        "${this.escapeHtml(card.flavor_text)}"
                    </div>
                ` : ''}

                <div class="card-detail-stats">
                    ${card.is_creature && card.power && card.toughness ? `
                        <div class="card-stat">
                            <div class="card-stat-label">Power/Toughness</div>
                            <div class="card-stat-value">${card.power}/${card.toughness}</div>
                        </div>
                    ` : ''}

                    ${card.is_planeswalker && card.loyalty ? `
                        <div class="card-stat">
                            <div class="card-stat-label">Loyalty</div>
                            <div class="card-stat-value">${card.loyalty}</div>
                        </div>
                    ` : ''}

                    <div class="card-stat">
                        <div class="card-stat-label">Rarity</div>
                        <div class="card-stat-value">${this.capitalizeFirst(card.rarity)}</div>
                    </div>

                    <div class="card-stat">
                        <div class="card-stat-label">Set</div>
                        <div class="card-stat-value">${this.escapeHtml(card.set_name || card.set || 'Unknown')}</div>
                    </div>

                    ${card.artist ? `
                        <div class="card-stat">
                            <div class="card-stat-label">Artist</div>
                            <div class="card-stat-value">${this.escapeHtml(card.artist)}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="card-detail-actions">
                    <button class="card-action-btn favorite ${isFavorited ? 'favorited' : ''}" data-card-id="${card.id}">
                        ${isFavorited ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
                    </button>

                    ${card.scryfall_uri ? `
                        <a href="${card.scryfall_uri}" target="_blank" rel="noopener" class="card-action-btn">
                            🔗 View on Scryfall
                        </a>
                    ` : ''}
                </div>
            </div>
        `;

        this.elements.cardDetail.innerHTML = detailHTML;

        // Bind favorite button in modal
        const favoriteBtn = this.elements.cardDetail.querySelector('.card-action-btn.favorite');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                this.toggleModalFavorite(card, favoriteBtn);
            });
        }
    }

    // Toggle favorite from modal
    toggleModalFavorite(card, buttonElement) {
        const wasToggled = window.storage.toggleFavorite(card);

        if (wasToggled) {
            const isFavorited = window.storage.isFavorite(card.id);
            buttonElement.textContent = isFavorited ? '❤️ Remove from Favorites' : '🤍 Add to Favorites';
            buttonElement.classList.toggle('favorited', isFavorited);

            // Update any matching cards in the grid
            const gridCard = document.querySelector(`[data-card-id="${card.id}"] .card-favorite`);
            if (gridCard) {
                gridCard.textContent = isFavorited ? '❤️' : '🤍';
                gridCard.classList.toggle('favorited', isFavorited);
            }

            // Refresh favorites display
            this.refreshFavorites();
        }
    }

    // Format oracle text with proper line breaks
    formatOracleText(text) {
        return text
            .split('\n')
            .map(line => `<p>${this.escapeHtml(line)}</p>`)
            .join('');
    }

    // Close modal
    closeModal() {
        this.elements.cardModal.classList.add('hidden');
        this.currentModal = null;
    }

    // Clear search
    clearSearch() {
        this.elements.searchInput.value = '';
        this.elements.clearSearchBtn.classList.remove('visible');
        this.clearResults();
        this.hideSuggestions();
        this.currentSearch = null;
    }

    // Clear search results
    clearResults() {
        this.elements.cardGrid.innerHTML = '';
        this.searchResults = [];
        this.hideError();
    }

    // Show loading state
    showLoading() {
        this.elements.loadingIndicator.classList.remove('hidden');
    }

    // Hide loading state
    hideLoading() {
        this.elements.loadingIndicator.classList.add('hidden');
    }

    // Show error message
    showError(message) {
        this.elements.errorMessage.querySelector('p').textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
    }

    // Hide error message
    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    // Show results count
    showResultsCount(count) {
        const existingCount = document.querySelector('.search-results-count');
        if (existingCount) {
            existingCount.remove();
        }

        if (count > 0) {
            const countElement = document.createElement('div');
            countElement.className = 'search-results-count';
            countElement.innerHTML = `Found <strong>${count}</strong> card${count === 1 ? '' : 's'}`;
            this.elements.cardGrid.parentNode.insertBefore(countElement, this.elements.cardGrid);
        }
    }

    // Refresh favorites display
    refreshFavorites() {
        const favorites = window.storage.getFavorites();

        if (favorites.length === 0) {
            this.elements.favoritesGrid.style.display = 'none';
            this.elements.noFavorites.style.display = 'block';
        } else {
            this.elements.favoritesGrid.style.display = 'grid';
            this.elements.noFavorites.style.display = 'none';

            const favoritesHTML = favorites.map(card => this.createCardHTML(card)).join('');
            this.elements.favoritesGrid.innerHTML = favoritesHTML;

            // Bind events for favorite cards
            this.bindFavoriteCardEvents();
        }
    }

    // Bind events for favorite cards
    bindFavoriteCardEvents() {
        this.elements.favoritesGrid.querySelectorAll('.card-item').forEach(cardElement => {
            cardElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('card-favorite')) {
                    return;
                }

                const cardId = cardElement.dataset.cardId;
                const favorites = window.storage.getFavorites();
                const card = favorites.find(c => c.id === cardId);
                if (card) {
                    this.openCardModal(card);
                }
            });
        });

        this.elements.favoritesGrid.querySelectorAll('.card-favorite').forEach(favoriteBtn => {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cardId = favoriteBtn.dataset.cardId;
                const favorites = window.storage.getFavorites();
                const card = favorites.find(c => c.id === cardId);
                if (card) {
                    this.toggleFavorite(card, favoriteBtn);
                }
            });
        });
    }

    // Refresh search history display
    refreshSearchHistory() {
        const history = window.storage.getSearchHistory();

        if (history.length === 0) {
            this.elements.recentSearches.style.display = 'none';
            this.elements.noHistory.style.display = 'block';
        } else {
            this.elements.recentSearches.style.display = 'block';
            this.elements.noHistory.style.display = 'none';

            const historyHTML = history.map(item => `
                <div class="recent-item" data-query="${this.escapeHtml(item.query)}">
                    <span>${this.escapeHtml(item.query)}</span>
                    <span class="recent-item-time">${this.formatRelativeTime(item.timestamp)}</span>
                </div>
            `).join('');

            this.elements.recentSearches.innerHTML = historyHTML;

            // Bind click events for recent searches
            this.elements.recentSearches.querySelectorAll('.recent-item').forEach(item => {
                item.addEventListener('click', () => {
                    const query = item.dataset.query;
                    this.elements.searchInput.value = query;
                    this.performSearch(query);
                    // Switch to search tab
                    document.querySelector('[data-tab="search-tab"]').click();
                });
            });
        }
    }

    // Clear search history
    clearSearchHistory() {
        window.storage.clearSearchHistory();
        this.refreshSearchHistory();
    }

    // Handle scroll for infinite loading
    handleScroll() {
        if (this.isLoading || !this.hasMoreResults) return;

        const { scrollTop, scrollHeight, clientHeight } = this.elements.cardGrid;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

        if (scrollPercentage > 0.8) { // Load more when 80% scrolled
            this.loadMoreCards();
        }
    }

    // Load more cards for current search
    async loadMoreCards() {
        if (this.currentSearch && this.hasMoreResults) {
            await this.searchCards(this.currentSearch, this.currentPage + 1);
        }
    }

    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalizeFirst(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return new Date(timestamp).toLocaleDateString();
    }
}

// Initialize card manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cardManager = new CardManager();
});