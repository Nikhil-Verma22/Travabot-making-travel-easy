# Complete Project Specification: Jaipur Travel Planning Application

## Project Overview
Create a modern, responsive travel planning web application focused on Jaipur, India tourism. The application should help users discover attractions, plan itineraries, book transportation and hotels, and explore locations through interactive maps.

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **Routing**: React Router v6
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Maps**: Leaflet with React Leaflet
- **Icons**: Lucide React
- **State Management**: React Query (TanStack Query)
- **Theme**: Dark/Light mode with next-themes

## Design System Requirements

### Color Palette (HSL format)
- Use semantic color tokens defined in `index.css`
- Primary colors for brand identity
- Secondary colors for accents
- Muted colors for backgrounds
- Destructive colors for errors/warnings
- All colors must support both light and dark modes

### Custom Properties
- Gradients: `--gradient-primary`, `--gradient-secondary`, `--gradient-subtle`
- Shadows: `--shadow-elegant`, `--shadow-glow`
- Animations: Smooth transitions with `--transition-smooth`
- Border radius: Consistent rounding using CSS variables

### Typography
- Use system font stack for optimal performance
- Semantic heading hierarchy (h1-h6)
- Responsive text sizing
- Gradient text effects for hero sections

## Current Features Implemented

### 1. Navigation & Layout
**Header Component**
- Fixed position header with backdrop blur
- Logo/brand name
- Navigation menu with active state highlighting
- Theme toggle (Sun/Moon icon) for dark/light mode
- Responsive design with proper spacing

**Routes**
- `/` - Home/Landing page
- `/explore` - Interactive map and attractions
- `/book` - Transportation and hotel booking
- `/itinerary` - Day-by-day trip planning
- `*` - 404 Not Found page

### 2. Home Page (Index)
**Hero Section**
- Compelling headline: "Plan Your Perfect Journey"
- AI-powered badge/label
- Gradient background with SVG pattern overlay
- Call-to-action button to discover recommendations
- Smooth scroll behavior

**Journey Planning Card**
- Input fields for:
  - From location (default: Delhi)
  - To location (default: Jaipur)
  - Start date (date picker)
  - End date (date picker)
  - Number of travelers (default: 2)
- Primary CTA: "Plan My Perfect Trip" → navigates to `/explore`
- Secondary button: "Customize Details"
- Icon-based visual indicators

**Features Grid**
- 4-column responsive grid
- Each card displays:
  - Icon (Map, Compass, Utensils, HeadphonesIcon)
  - Numerical value (12+, 25+, 50+, 24/7)
  - Label (Top Attractions, Unique Activities, Restaurants, Support)
- Hover effects with subtle animations
- Gradient backgrounds

### 3. Explore Page
**Interactive Map**
- Leaflet map integration with OpenStreetMap tiles
- Custom markers for all Jaipur attractions
- Marker clustering for better UX
- Popup information on marker click
- Current location feature with custom blue marker
- Fullscreen map mode with maximize button
- Zoom controls
- Responsive map container

**Location Cards Grid**
- Grid layout of attraction cards
- Each card includes:
  - High-quality image
  - Attraction name
  - Brief description
  - "View Details" button
  - "View on Map" button (centers map on location)
- Smooth scroll to map when viewing location
- Hover effects

**Featured Attractions**
- Hawa Mahal (Wind Palace)
- Amber Fort (Amer Fort)
- City Palace
- Jantar Mantar (Observatory)
- Chokhi Dhani (Cultural Village)
- Rawat Mishtan Bhandar (Famous Sweet Shop)

### 4. Book Page
**Trip Summary Section**
- Destination display
- Travel dates
- Number of travelers
- Trip duration calculation

**Transportation Selection**
- Arrival Transportation Options:
  - Flights (multiple airlines, times)
  - Trains (Rajdhani, Shatabdi, etc.)
  - Private cars/cabs
  - Each option shows: name, type, time, duration, price
  - Selectable cards with visual feedback
  
- Return Transportation Options:
  - Similar structure to arrival
  - Independent selection

**Hotel Selection**
- Multiple hotel options with:
  - Hotel name and type (Luxury, Heritage, Boutique)
  - Star rating
  - Number of reviews
  - Distance from city center
  - Total price and per-night breakdown
  - Amenities icons
- Selectable cards with visual feedback

**Price Summary (Sticky Sidebar)**
- Transport costs (arrival + return)
- Hotel costs (total nights)
- Grand total calculation
- "Proceed to Payment" button (primary)
- "Save for Later" button (secondary)
- Updates in real-time based on selections

### 5. Itinerary Page
**Trip Summary**
- Destination and dates
- Duration display
- Number of travelers

**Day-by-Day Itinerary**
- Tabbed interface for each day
- Active day highlighted
- Each day includes:
  - Morning activities (6:00 AM - 12:00 PM)
  - Afternoon activities (12:00 PM - 6:00 PM)
  - Evening activities (6:00 PM onwards)
  - Time slots with icons
  - Activity descriptions
  - Location details

**Per-Day Map Feature**
- "View on Map" button for each day
- Opens dialog with Leaflet map
- Shows only locations for that specific day
- Custom markers for each location
- Current location feature
- Proper map initialization and cleanup
- Responsive map sizing

### 6. Theme System
- Dark mode by default
- Light mode support
- Persists theme preference in localStorage
- Smooth theme transitions
- All components theme-aware
- Proper contrast ratios for accessibility

### 7. Assets
**Images Available**
- `amber-fort.jpg`
- `city-palace.jpg`
- `hawa-mahal.jpg`
- `jantar-mantar.jpg`
- `chokhi-dhani.jpg`
- `rawat-mishtan.jpg`

## Future Features & Enhancements

### Phase 1: Enhanced User Experience
1. **User Authentication**
   - Sign up / Sign in functionality
   - Social login (Google, Facebook)
   - User profiles
   - Save favorite attractions
   - Booking history

2. **Advanced Search & Filters**
   - Search attractions by name, type, or location
   - Filter by category (historical, cultural, food, shopping)
   - Price range filters for hotels and transport
   - Rating-based filters
   - Distance-based sorting

3. **Reviews & Ratings**
   - User reviews for attractions
   - Photo uploads by users
   - Rating system (1-5 stars)
   - Verified booking reviews
   - Helpful review voting

### Phase 2: Booking Integration
4. **Real-time Availability**
   - Live hotel availability checking
   - Real-time flight/train pricing via APIs
   - Dynamic pricing updates
   - Seat availability for transportation

5. **Payment Integration**
   - Multiple payment methods (cards, UPI, wallets)
   - Secure payment gateway (Stripe/Razorpay)
   - Booking confirmations via email
   - Digital tickets/vouchers
   - Refund management

6. **Booking Management**
   - View upcoming bookings
   - Modify/cancel bookings
   - Download booking receipts
   - Calendar integration
   - Reminder notifications

### Phase 3: AI & Personalization
7. **AI-Powered Recommendations**
   - Personalized itinerary generation based on preferences
   - Smart suggestions based on travel dates and season
   - Budget-based recommendations
   - Family-friendly vs solo travel suggestions
   - Weather-based activity recommendations

8. **Chatbot Assistant**
   - 24/7 AI travel assistant
   - Answer common questions
   - Help with booking modifications
   - Local tips and recommendations
   - Multi-language support

### Phase 4: Social & Community
9. **Social Features**
   - Share itineraries with friends
   - Collaborative trip planning
   - Travel buddy finder
   - Share trip photos and experiences
   - Follow other travelers

10. **Community Content**
    - User-generated travel guides
    - Local tips from residents
    - Hidden gems section
    - Travel blogs and stories
    - Q&A forum

### Phase 5: Advanced Features
11. **Multi-City Planning**
    - Expand beyond Jaipur to other Rajasthan cities
    - Multi-city itineraries
    - Route optimization
    - Inter-city transportation options

12. **Offline Mode**
    - Download itineraries for offline access
    - Offline maps
    - Cached attraction information
    - Offline booking confirmations

13. **Augmented Reality**
    - AR navigation at attractions
    - Virtual tours of monuments
    - Historical recreations
    - Photo filters at landmarks

14. **Local Services**
    - Book local guides
    - Car rental integration
    - Restaurant reservations
    - Activity bookings (camel rides, cooking classes)
    - Shopping assistance

15. **Analytics & Insights**
    - Travel statistics dashboard
    - Budget tracking
    - Carbon footprint calculator
    - Travel milestones and badges

### Phase 6: Business Features
16. **For Tour Operators**
    - Business dashboard
    - Listing management
    - Booking management
    - Analytics and reports
    - Commission tracking

17. **For Hotels & Restaurants**
    - Property listing portal
    - Availability calendar
    - Pricing management
    - Review responses
    - Promotional campaigns

## Technical Enhancements

### Performance
- Lazy loading for images
- Code splitting by routes
- Progressive Web App (PWA) capabilities
- Service worker for offline functionality
- Image optimization and WebP support
- Caching strategies

### Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Focus indicators
- Alt text for all images

### SEO
- Server-side rendering (SSR) with Next.js migration
- Meta tags for each page
- Open Graph tags for social sharing
- Structured data (JSON-LD)
- Sitemap generation
- Robots.txt optimization

### Testing
- Unit tests with Vitest
- Component tests with React Testing Library
- E2E tests with Playwright or Cypress
- Visual regression testing
- Performance testing
- Accessibility testing

### Monitoring
- Error tracking (Sentry)
- Analytics (Google Analytics/Plausible)
- Performance monitoring (Web Vitals)
- User behavior tracking
- A/B testing framework

## Design Specifications

### Responsive Breakpoints
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

### Animation Principles
- Smooth transitions (300ms default)
- Ease-in-out timing functions
- Hover effects on interactive elements
- Loading skeletons for async content
- Page transition animations

### Accessibility Standards
- WCAG 2.1 Level AA compliance
- Minimum contrast ratio 4.5:1
- Touch targets minimum 44x44px
- Focus visible on all interactive elements
- Semantic HTML throughout

## Data Models (Future Backend)

### User
- id, email, password, name, phone
- profile_picture, preferences
- created_at, updated_at

### Booking
- id, user_id, type (transport/hotel)
- booking_details (JSON)
- status, payment_status
- total_amount, booking_date

### Review
- id, user_id, attraction_id
- rating, comment, photos
- helpful_count, created_at

### Itinerary
- id, user_id, name
- start_date, end_date
- destinations (JSON)
- is_public, share_token

## API Endpoints (Future)
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/attractions/*` - Attraction data
- `/api/bookings/*` - Booking management
- `/api/reviews/*` - Review system
- `/api/itineraries/*` - Itinerary CRUD
- `/api/search` - Search functionality
- `/api/recommendations` - AI recommendations

## Deployment
- Frontend: Lovable Cloud or Vercel/Netlify
- Backend: Lovable Cloud (Supabase)
- CDN: Cloudflare for static assets
- Database: PostgreSQL (via Supabase)
- File Storage: Supabase Storage
- Edge Functions: Supabase Edge Functions

## Environment Variables
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPBOX_TOKEN= (if using Mapbox instead of Leaflet)
VITE_PAYMENT_KEY=
VITE_API_BASE_URL=
```

## Prompt to Recreate This Project

**Use this prompt to recreate or continue building this application:**

"Create a modern travel planning web application for Jaipur tourism using React 18, TypeScript, Vite, and Tailwind CSS. Implement a dark/light theme system with a custom design system using HSL colors and semantic tokens. Include:

1. A header with navigation (Home, Explore, Book, Itinerary) and theme toggle
2. A landing page with hero section, journey planning inputs, and features grid
3. An Explore page with interactive Leaflet maps showing Jaipur attractions, location cards, current location feature, and fullscreen map capability
4. A Book page for selecting transportation (flights/trains/cars) and hotels with a sticky price summary
5. An Itinerary page with day-by-day trip planning, activities by time slot, and individual maps for each day with current location feature
6. Use shadcn/ui components, Lucide icons, and React Router for navigation
7. All maps should use Leaflet with OpenStreetMap tiles, custom markers, and geolocation support
8. Include images for: Hawa Mahal, Amber Fort, City Palace, Jantar Mantar, Chokhi Dhani, and Rawat Mishtan Bhandar
9. Implement responsive design, smooth animations, and proper SEO meta tags
10. Future enhancements should include: user authentication, booking integration with payment gateway, AI-powered recommendations, reviews and ratings, social features, multi-city planning, and offline mode."

---

**Last Updated:** November 2025
**Version:** 1.0
**Status:** Active Development
