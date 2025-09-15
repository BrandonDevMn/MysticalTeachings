# Mystical Teachings - iOS PWA Spec

## Overview
A Progressive Web App for searching Magic: The Gathering cards using the Scryfall API. Optimized for iPad and iOS devices with offline support and native-like user experience.

## App Description
**Name:** Mystical Teachings
**Purpose:** Search and view detailed Magic: The Gathering card information using Scryfall's comprehensive database
**Target Platform:** iOS PWA (iPhone/iPad)

## Core Features

### Tab 1: Card Search (Primary Function)
**Primary Interface:**
- Search input field for card name
- Real-time search suggestions as user types
- Search results displayed as card grid/list
- Tap card to view detailed information

**Search Functionality:**
- Search by exact card name
- Partial name matching
- Case-insensitive search
- Handle special characters and symbols
- Search history (last 10 searches)
- Clear search button

**Card Display:**
- Card image (if available)
- Card name
- Mana cost with colored symbols
- Type line (Creature, Instant, etc.)
- Set symbol and rarity
- Quick stats (power/toughness for creatures)

**Card Detail View:**
- Full-size card image
- Complete oracle text
- All printings of the card
- Set information
- Artist information
- Flavor text
- Legality in different formats
- Price information (if available)

### Tab 2: Search History
**Functionality:**
- List of recently searched cards
- Quick access to previous searches
- Ability to clear history
- Favorite cards feature
- Offline access to previously viewed cards

### Tab 3: About
**Content:**
- App information and version
- Scryfall API attribution
- Developer information
- App usage instructions
- Privacy policy
- Contact information

## API Integration

### Scryfall API Requirements
**Base URL:** `https://api.scryfall.com`

**Primary Endpoints:**
- `/cards/search?q={card_name}` - Search for cards by name
- `/cards/named?fuzzy={card_name}` - Fuzzy name search for single card
- `/cards/{id}` - Get specific card by ID

**API Headers:**
```javascript
{
    'User-Agent': 'Mystical Teachings PWA/1.0',
    'Accept': 'application/json'
}
```

**Rate Limiting:**
- Maximum 10 requests per second
- Implement request throttling
- Cache responses to minimize API calls

**Error Handling:**
- Network connectivity issues
- API rate limit exceeded
- Card not found scenarios
- Invalid search queries

## Technical Specifications

### File Structure
```
/
├── index.html              # Main entry point
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
├── icon.jpg               # App icon (180x180px)
├── css/
│   ├── styles.css         # Main styles
│   ├── cards.css          # Card-specific styles
│   └── mana-symbols.css   # MTG mana symbol styles
└── js/
    ├── app.js             # Main application logic
    ├── api.js             # Scryfall API interface
    ├── cards.js           # Card display logic
    └── storage.js         # Local storage management
```

### Required Meta Tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Mystical Teachings">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#1a1a1a">
<link rel="apple-touch-icon" href="icon.jpg">
<link rel="icon" href="icon.jpg">
<link rel="manifest" href="manifest.json">
```

### PWA Manifest
```json
{
    "name": "Mystical Teachings",
    "short_name": "Mystical",
    "description": "Search Magic: The Gathering cards using Scryfall API",
    "start_url": "./index.html",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait-primary",
    "theme_color": "#1a1a1a",
    "background_color": "#ffffff",
    "icons": [
        {
            "src": "icon.jpg",
            "sizes": "180x180",
            "type": "image/jpeg",
            "purpose": "any maskable"
        }
    ]
}
```

## UI/UX Design Requirements

### Color Scheme
**Primary Colors:**
- Background: `#f8f9fa` (light mode), `#1a1a1a` (dark mode)
- Primary: `#2c3e50` (MTG blue-black)
- Secondary: `#e74c3c` (MTG red)
- Accent: `#f39c12` (MTG gold)
- Text: `#2c3e50` (light mode), `#ffffff` (dark mode)

### Typography
- **Headers:** System font stack, bold, 18-24px
- **Body:** System font stack, regular, 16px
- **Card names:** System font stack, semibold, 14-16px
- **Mana costs:** Custom MTG symbol font fallback

### Card Grid Layout
- **Mobile (iPhone):** 2 cards per row
- **Tablet (iPad):** 3-4 cards per row
- **Card aspect ratio:** Standard MTG card ratio (2.5:3.5)
- **Spacing:** 8px between cards, 16px margins

### Mana Symbol Display
- Use Unicode symbols as fallback: ⚪ ⚫ 🔴 🔵 🟢
- Implement CSS for proper MTG mana symbols
- Colorize symbols appropriately
- Support hybrid mana costs

### Touch Interactions
- **Tap targets:** Minimum 44px for accessibility
- **Search input:** Large, prominent placement
- **Card taps:** Full card area clickable
- **Swipe gestures:** Navigate between card detail views
- **Pull to refresh:** Refresh search results

## Data Management

### Local Storage Strategy
```javascript
// Cache structure
{
    'search_history': [],           // Last 10 searches
    'favorite_cards': [],           // User favorites
    'cached_cards': {},             // Card data cache
    'app_settings': {}              // User preferences
}
```

### Caching Strategy
- **Card images:** Cache for 24 hours
- **Card data:** Cache for 7 days
- **Search results:** Cache for 1 hour
- **Failed requests:** Retry with exponential backoff

### Offline Support
- Cache last 50 viewed cards for offline viewing
- Show cached search history when offline
- Display offline indicator in UI
- Graceful degradation for missing images

## Performance Optimization

### Image Loading
- Lazy load card images
- Use Scryfall's image optimization parameters
- Implement image placeholder while loading
- Progressive image enhancement

### API Optimization
- Debounce search input (300ms delay)
- Cancel previous requests when new search initiated
- Batch related API calls when possible
- Implement smart caching based on search patterns

### Bundle Optimization
- Minimize CSS and JavaScript
- Use efficient CSS selectors
- Optimize images and compress assets
- Implement code splitting for non-critical features

## Accessibility Features

### Screen Reader Support
- Proper ARIA labels for all interactive elements
- Alt text for card images describing the card
- Live regions for search result announcements
- Semantic HTML structure

### Keyboard Navigation
- Tab order follows logical flow
- Enter key submits search
- Arrow keys navigate search results
- Escape key closes modal views

### Visual Accessibility
- High contrast mode support
- Respect user's reduced motion preferences
- Scalable text support
- Color-blind friendly design

## Security Considerations

### API Security
- No API keys required (public Scryfall API)
- Validate all user input before API calls
- Sanitize search queries
- Implement rate limiting client-side

### Data Privacy
- No personal data collection
- Local storage only for app functionality
- Clear privacy policy
- Option to clear all cached data

## Testing Requirements

### Device Testing
- iPhone SE, 12, 13, 14 (various sizes)
- iPad Air, iPad Pro (portrait/landscape)
- iOS Safari 14+ compatibility
- PWA installation flow testing

### Functionality Testing
- Search with various card names
- Special characters in search queries
- Network connectivity edge cases
- Offline functionality validation
- Cache management testing

### Performance Testing
- API response time monitoring
- Image loading performance
- Memory usage optimization
- Battery usage testing

## Development Phases

### Phase 1: Core Search
- Basic card search functionality
- Simple card display grid
- API integration with error handling
- Basic PWA setup

### Phase 2: Enhanced UI
- Detailed card view modal
- Mana symbol display
- Search history feature
- Improved responsive design

### Phase 3: Advanced Features
- Offline support implementation
- Advanced search filters
- Favorite cards feature
- Performance optimizations

### Phase 4: Polish
- Accessibility improvements
- Advanced caching strategies
- User experience refinements
- Comprehensive testing

## Success Metrics

### User Experience
- Search response time < 1 second
- Image load time < 2 seconds
- Smooth 60fps animations
- Successful PWA installation rate > 80%

### Technical Performance
- API rate limiting compliance
- Cache hit rate > 70%
- Offline functionality success rate > 95%
- Zero JavaScript errors in production

## Attribution Requirements

### Scryfall API Attribution
- Include Scryfall attribution in About tab
- Link to Scryfall website
- Follow Scryfall's API terms of service
- Credit Wizards of the Coast for MTG content

### Legal Compliance
- Magic: The Gathering copyright notice
- Scryfall API usage terms
- App privacy policy
- Open source license attribution (if applicable)

This app will provide MTG players with a fast, reliable way to search for card information while maintaining excellent performance on iOS devices and working seamlessly in offline scenarios.