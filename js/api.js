// Scryfall API Integration for Mystical Teachings

class ScryfallAPI {
    constructor() {
        this.baseURL = 'https://api.scryfall.com';
        this.userAgent = 'Mystical Teachings PWA/1.0';
        this.requestQueue = [];
        this.isRateLimited = false;
        this.lastRequestTime = 0;
        this.minRequestInterval = 100; // 100ms between requests (10 requests per second)
    }

    // Rate limiting wrapper for API requests
    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, options, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isRateLimited || this.requestQueue.length === 0) {
            return;
        }

        this.isRateLimited = true;

        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const waitTime = Math.max(0, this.minRequestInterval - timeSinceLastRequest);

        setTimeout(async () => {
            const { url, options, resolve, reject } = this.requestQueue.shift();

            try {
                const response = await this.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    ...options
                });

                this.lastRequestTime = Date.now();

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                resolve(data);

            } catch (error) {
                console.error('API request failed:', error);
                reject(error);
            } finally {
                this.isRateLimited = false;
                // Process next request in queue
                if (this.requestQueue.length > 0) {
                    setTimeout(() => this.processQueue(), this.minRequestInterval);
                }
            }
        }, waitTime);
    }

    // Fetch with timeout
    async fetchWithTimeout(url, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Search for cards by name
    async searchCards(query, options = {}) {
        try {
            // Check cache first
            const cacheKey = `search_${query.toLowerCase()}`;
            const cachedResult = window.storage.getCachedCard(cacheKey);

            if (cachedResult && !options.forceRefresh) {
                return cachedResult;
            }

            // Prepare search query
            const searchParams = new URLSearchParams({
                q: query,
                order: options.order || 'name',
                dir: options.direction || 'auto',
                unique: options.unique || 'cards',
                page: options.page || 1
            });

            if (options.include_extras !== undefined) {
                searchParams.append('include_extras', options.include_extras);
            }

            if (options.include_multilingual !== undefined) {
                searchParams.append('include_multilingual', options.include_multilingual);
            }

            const url = `${this.baseURL}/cards/search?${searchParams}`;
            const data = await this.makeRequest(url);

            // Process the results
            const processedData = {
                ...data,
                data: data.data ? data.data.map(card => this.processCardData(card)) : []
            };

            // Cache the results
            window.storage.setCachedCard(cacheKey, processedData);

            // Record search analytics
            window.storage.recordSearchAnalytics(query, processedData.total_cards || 0);

            return processedData;

        } catch (error) {
            // Handle different error types
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            } else if (error.message.includes('404')) {
                return {
                    object: 'error',
                    code: 'not_found',
                    status: 404,
                    details: 'No cards found matching your search.',
                    data: []
                };
            } else if (error.message.includes('429')) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            } else {
                throw new Error('Failed to search cards. Please check your connection.');
            }
        }
    }

    // Get a specific card by exact name
    async getCardByName(name, fuzzy = false) {
        try {
            const cacheKey = `card_${name.toLowerCase()}`;
            const cachedCard = window.storage.getCachedCard(cacheKey);

            if (cachedCard) {
                window.storage.updateCachedCardAccess(cacheKey);
                return cachedCard;
            }

            const searchParams = new URLSearchParams();
            if (fuzzy) {
                searchParams.append('fuzzy', name);
            } else {
                searchParams.append('exact', name);
            }

            const url = `${this.baseURL}/cards/named?${searchParams}`;
            const data = await this.makeRequest(url);

            const processedCard = this.processCardData(data);

            // Cache the card
            window.storage.setCachedCard(cacheKey, processedCard);

            return processedCard;

        } catch (error) {
            if (error.message.includes('404')) {
                throw new Error(`Card "${name}" not found.`);
            }
            throw new Error('Failed to fetch card details.');
        }
    }

    // Get card by Scryfall ID
    async getCardById(id) {
        try {
            const cacheKey = `card_id_${id}`;
            const cachedCard = window.storage.getCachedCard(cacheKey);

            if (cachedCard) {
                window.storage.updateCachedCardAccess(cacheKey);
                return cachedCard;
            }

            const url = `${this.baseURL}/cards/${id}`;
            const data = await this.makeRequest(url);

            const processedCard = this.processCardData(data);

            // Cache the card
            window.storage.setCachedCard(cacheKey, processedCard);

            return processedCard;

        } catch (error) {
            throw new Error('Failed to fetch card by ID.');
        }
    }

    // Get random card
    async getRandomCard() {
        try {
            const url = `${this.baseURL}/cards/random`;
            const data = await this.makeRequest(url);

            return this.processCardData(data);

        } catch (error) {
            throw new Error('Failed to fetch random card.');
        }
    }

    // Search for card suggestions (autocomplete)
    async getCardSuggestions(query, limit = 10) {
        try {
            if (query.length < 2) {
                return [];
            }

            // Check local search history for quick suggestions
            const historySuggestions = window.storage.getRecentSearchSuggestions(query, 3);

            // Search for actual cards
            const searchResult = await this.searchCards(query, {
                unique: 'cards',
                page: 1
            });

            const cardSuggestions = searchResult.data
                ? searchResult.data.slice(0, limit - historySuggestions.length).map(card => ({
                    type: 'card',
                    name: card.name,
                    image: card.image_uris?.small,
                    type_line: card.type_line,
                    id: card.id
                }))
                : [];

            // Combine history and card suggestions
            const allSuggestions = [
                ...historySuggestions.map(name => ({
                    type: 'history',
                    name: name
                })),
                ...cardSuggestions
            ];

            return allSuggestions.slice(0, limit);

        } catch (error) {
            console.warn('Failed to get suggestions:', error);
            // Fallback to search history only
            return window.storage.getRecentSearchSuggestions(query, limit).map(name => ({
                type: 'history',
                name: name
            }));
        }
    }

    // Process card data to normalize and add computed properties
    processCardData(card) {
        if (!card) return null;

        return {
            // Core card data
            id: card.id,
            name: card.name,
            mana_cost: card.mana_cost || '',
            cmc: card.cmc || 0,
            type_line: card.type_line || '',
            oracle_text: card.oracle_text || '',
            flavor_text: card.flavor_text || '',
            power: card.power,
            toughness: card.toughness,
            loyalty: card.loyalty,

            // Set information
            set: card.set,
            set_name: card.set_name,
            rarity: card.rarity,
            collector_number: card.collector_number,
            released_at: card.released_at,

            // Images
            image_uris: card.image_uris || (card.card_faces && card.card_faces[0] ? card.card_faces[0].image_uris : null),

            // Color information
            colors: card.colors || [],
            color_identity: card.color_identity || [],

            // Legality
            legalities: card.legalities || {},

            // Pricing (if available)
            prices: card.prices || {},

            // Additional computed properties
            is_creature: this.isCreature(card.type_line),
            is_planeswalker: this.isPlaneswalker(card.type_line),
            is_spell: this.isSpell(card.type_line),
            is_land: this.isLand(card.type_line),

            // Mana cost parsing
            mana_symbols: this.parseManaSymbols(card.mana_cost),

            // Card faces for double-faced cards
            card_faces: card.card_faces,

            // Layout information
            layout: card.layout,

            // Scryfall URLs
            scryfall_uri: card.scryfall_uri,

            // Artist and related
            artist: card.artist,

            // Reserve list status
            reserved: card.reserved || false,

            // Digital availability
            digital: card.digital || false,

            // Processed timestamp
            processed_at: Date.now()
        };
    }

    // Helper methods for card type checking
    isCreature(typeLine) {
        return typeLine && typeLine.toLowerCase().includes('creature');
    }

    isPlaneswalker(typeLine) {
        return typeLine && typeLine.toLowerCase().includes('planeswalker');
    }

    isSpell(typeLine) {
        return typeLine && (
            typeLine.toLowerCase().includes('instant') ||
            typeLine.toLowerCase().includes('sorcery')
        );
    }

    isLand(typeLine) {
        return typeLine && typeLine.toLowerCase().includes('land');
    }

    // Parse mana cost symbols
    parseManaSymbols(manaCost) {
        if (!manaCost) return [];

        const symbols = [];
        const regex = /\{([^}]+)\}/g;
        let match;

        while ((match = regex.exec(manaCost)) !== null) {
            symbols.push(match[1]);
        }

        return symbols;
    }

    // Get image URL with quality preference
    getCardImageUrl(card, quality = 'normal') {
        if (!card.image_uris) return null;

        const qualityMap = {
            'small': card.image_uris.small,
            'normal': card.image_uris.normal,
            'large': card.image_uris.large,
            'png': card.image_uris.png,
            'art_crop': card.image_uris.art_crop,
            'border_crop': card.image_uris.border_crop
        };

        return qualityMap[quality] || card.image_uris.normal;
    }

    // Check API health
    async checkAPIHealth() {
        try {
            const url = `${this.baseURL}/cards/random`;
            await this.fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                }
            }, 5000);
            return true;
        } catch (error) {
            console.error('API health check failed:', error);
            return false;
        }
    }

    // Batch card requests (for multiple card lookups)
    async getMultipleCards(cardIds) {
        try {
            const url = `${this.baseURL}/cards/collection`;
            const data = await this.makeRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifiers: cardIds.map(id => ({ id: id }))
                })
            });

            return data.data ? data.data.map(card => this.processCardData(card)) : [];

        } catch (error) {
            throw new Error('Failed to fetch multiple cards.');
        }
    }

    // Get set information
    async getSet(setCode) {
        try {
            const cacheKey = `set_${setCode}`;
            const cachedSet = window.storage.getCachedCard(cacheKey);

            if (cachedSet) {
                return cachedSet;
            }

            const url = `${this.baseURL}/sets/${setCode}`;
            const data = await this.makeRequest(url);

            // Cache the set data
            window.storage.setCachedCard(cacheKey, data);

            return data;

        } catch (error) {
            throw new Error('Failed to fetch set information.');
        }
    }
}

// Create global API instance
window.api = new ScryfallAPI();