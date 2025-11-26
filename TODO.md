# TypeSetGo Master TODO List

> Last updated: November 2024
> Use this file for planning and task distribution.

---

## Legend

- [ ] Not started
- [x] Completed
- [~] Partially complete / In progress

---

## Phase 1: Core Platform (Current)

### Core Typing Engine
- [x] Time mode (15/30/60/120s + custom)
- [x] Word mode (10/25/50/100 + custom)
- [x] Quote mode (short/medium/long/xl)
- [x] Zen mode (free typing)
- [x] Punctuation toggle
- [x] Numbers toggle
- [x] Real-time WPM calculation
- [x] Accuracy calculation
- [x] Per-character visual feedback (correct/incorrect/extra/missed)
- [x] Custom theme builder
- [ ] Backspace modes (normal/strict/no-backspace)
- [ ] Custom goal mode (X words in Y time with Z accuracy)
- [ ] Per-key error heatmap (post-test analysis)
- [ ] Preset themes (light/dark/high-contrast)
- [ ] PWA / Offline support with sync

### Connect Mode (Multiplayer)
- [x] Room creation with unique codes
- [x] WebSocket real-time sync
- [x] Host controls (mode/difficulty settings)
- [x] User list with live stats
- [x] Kick user functionality
- [x] Reset user progress
- [x] Synchronized test start
- [x] Waiting room for joiners
- [x] Locked settings for non-hosts
- [x] Rejoin on refresh (session persistence)
- [ ] Random anonymous name generation for joiners

### Preset Mode
- [x] Text area paste input
- [x] File upload (.txt)
- [x] Time limit constraint
- [x] Finish (type all) mode
- [x] Text sanitization
- [x] Connect mode integration
- [x] Character limit (10,000)

### Plan Mode
- [x] Plan builder modal
- [x] Drag-and-drop step reordering
- [x] Per-step configuration
- [x] Title/subtitle metadata
- [x] Progress counter (X/Y)
- [x] Intermediate splash screens
- [x] Forward/back navigation
- [x] Per-step results tracking
- [x] Wait for All toggle
- [x] Zen waiting toggle
- [ ] Global start/pause/stop controls for host
- [ ] Toast notifications ("Step ready")
- [ ] Host-side per-user results modal

### Content
- [x] Static wordlists (beginner/easy/medium/hard/extreme)
- [x] Static quotes (short/medium/long/xl)
- [x] Session text via Preset mode
- [ ] Content packs (bundled wordlists + passages with metadata)
- [ ] Public content library (curated, discoverable)

### Sound & UX
- [x] Multiple typing sound packs
- [x] Sound settings modal
- [x] Warning sounds
- [ ] Volume controls per sound type
- [ ] Sound preview in settings

---

## Phase 2: User Accounts & Persistence

### Authentication
- [ ] Email/password signup & login
- [ ] Google SSO
- [ ] Session management (Supabase Auth)
- [ ] Password reset flow
- [ ] Email verification

### User Roles
- [ ] Student role
- [ ] Teacher role
- [ ] Admin role
- [ ] Role-based access control

### Data Persistence
- [ ] User profiles (name, avatar, preferences)
- [ ] Settings sync across devices
- [ ] Typing attempt history
- [ ] Personal stats dashboard
- [ ] Row Level Security (RLS) policies

---

## Phase 3: Teacher Tools & Classes

### Class Management
- [ ] Create class (name, description)
- [ ] Join codes for students
- [ ] Invite links (with expiry/one-time options)
- [ ] Roster management (add/remove students)
- [ ] Multiple classes per teacher

### Teacher Presets
- [ ] Save typing configurations
- [ ] Preset library (personal)
- [ ] Share presets with other teachers
- [ ] Duplicate/edit presets

### Teacher Dashboard
- [ ] Class overview (student count, avg stats)
- [ ] Recent attempts list
- [ ] Individual student view
- [ ] Export to CSV

### Share Links
- [ ] Unique URLs for specific tests
- [ ] Expiry dates
- [ ] One-time use option
- [ ] Usage tracking

---

## Phase 4: Assignments & Grading

### Assignment Creation
- [ ] Select preset/configuration
- [ ] Set target metrics (WPM, accuracy)
- [ ] Due date/time
- [ ] Attempt limits
- [ ] Time windows (available from/to)

### Scoring Rules
- [ ] Best attempt scoring
- [ ] First attempt scoring
- [ ] Average of N attempts
- [ ] Custom rubrics

### Student Experience
- [ ] To-do dashboard tiles
- [ ] Status indicators (not started/in progress/completed/overdue)
- [ ] Attempt history per assignment
- [ ] Progress tracking

### Teacher Gradebook
- [ ] Matrix view (students x assignments)
- [ ] Bulk actions
- [ ] Grade export
- [ ] Late submission handling

### Notifications
- [ ] Email reminders (due soon, overdue)
- [ ] In-app notifications
- [ ] Configurable notification preferences

---

## Phase 5: Anti-Cheat & Integrity

### Detection Signals
- [ ] Focus/blur tracking (tab switches)
- [ ] Copy/paste prevention & logging
- [ ] Keystroke dynamics analysis
- [ ] Burst typing detection
- [ ] Inter-key latency analysis
- [ ] DevTools detection

### Review System
- [ ] Suspicion score (aggregated signals)
- [ ] Flagged attempts queue
- [ ] Session replay (keystroke timeline)
- [ ] Teacher review console

### Policy Engine
- [ ] Configurable rules per class/assignment
- [ ] Auto-flag thresholds
- [ ] Appeal workflow

---

## Phase 6: Gamification

### Leaderboards
- [ ] Class-scope leaderboards
- [ ] School-scope leaderboards
- [ ] Global leaderboards
- [ ] Metric selection (speed/accuracy/consistency)
- [ ] Timeframes (daily/weekly/monthly/all-time)

### Achievements
- [ ] Speed milestones (50/75/100+ WPM)
- [ ] Accuracy badges (95%+, 99%+, perfect)
- [ ] Streak rewards (daily practice)
- [ ] Challenge completions

### Events
- [ ] Scheduled race windows
- [ ] Live event dashboard
- [ ] Event results & prizes
- [ ] Teacher-created class competitions

---

## Phase 7: Organization Administration

### Organization Model
- [ ] School/district entity creation
- [ ] Organization hierarchy
- [ ] Domain enforcement (email restrictions)
- [ ] Branding options (logo, colors)

### User Management
- [ ] CSV bulk import (students/teachers)
- [ ] Bulk role assignment
- [ ] Deactivate/reactivate accounts
- [ ] Transfer ownership

### Admin Dashboard
- [ ] Usage statistics
- [ ] Active users metrics
- [ ] Storage/bandwidth monitoring
- [ ] System health

### Compliance
- [ ] Audit logs (critical actions)
- [ ] Data retention policies
- [ ] GDPR compliance tools
- [ ] FERPA compliance
- [ ] Data export (user request)
- [ ] Account deletion

---

## Phase 8: Integrations

### Google Classroom
- [ ] OAuth connection
- [ ] Roster sync (classes & students)
- [ ] Assignment sync
- [ ] Grade passback

### Clever
- [ ] SSO integration
- [ ] Roster sync
- [ ] Automatic provisioning

### Enterprise SSO
- [ ] SAML 2.0 support
- [ ] Custom IdP configuration
- [ ] Just-in-time provisioning

### SCIM
- [ ] User provisioning API
- [ ] Group sync
- [ ] Deprovisioning

### Public API
- [ ] REST API endpoints
- [ ] API key management
- [ ] Webhooks (attempt completed, assignment due, etc.)
- [ ] Rate limiting
- [ ] API documentation

---

## Phase 9: Internationalization

### Languages
- [ ] UI string externalization
- [ ] English (default)
- [ ] Spanish translation
- [ ] French translation
- [ ] Community translation system

### Localized Content
- [ ] Spanish wordlists & passages
- [ ] French wordlists & passages
- [ ] Language-specific difficulty scaling

### Keyboard Layouts
- [ ] QWERTY (default)
- [ ] AZERTY support
- [ ] Dvorak support
- [ ] Layout auto-detection
- [ ] Manual layout selection

### Regional
- [ ] Date/time formatting
- [ ] Number formatting
- [ ] RTL language support (future)

---

## Accessibility

- [ ] Full keyboard navigation
- [ ] Screen reader support (ARIA labels)
- [ ] High contrast theme
- [ ] Dyslexia-friendly font option
- [ ] Reduced motion option
- [ ] Focus indicators
- [ ] Color-blind friendly palettes

---

## Technical Debt & Infrastructure

### Performance
- [ ] Bundle size optimization
- [ ] Lazy loading for routes
- [ ] Image optimization
- [ ] Caching strategy

### Testing
- [ ] Unit tests (core functions)
- [ ] Integration tests (API routes)
- [ ] E2E tests (critical flows)
- [ ] Load testing (WebSocket connections)

### DevOps
- [x] Docker containerization
- [x] GitHub Actions CI/CD
- [ ] Staging environment
- [ ] Production monitoring
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (usage patterns)

### Documentation
- [x] Feature documentation (docs/features/)
- [x] PRDs (docs/PRDs/)
- [x] Docker deployment guide
- [ ] API documentation
- [ ] Contributing guide
- [ ] User help center

---

## Backlog / Ideas

> Add future ideas and low-priority items here

- [ ] Mobile app (React Native)
- [ ] Typing lessons / structured curriculum
- [ ] AI-generated practice texts
- [ ] Voice-to-type mode
- [ ] Multiplayer racing with matchmaking
- [ ] Browser extension for practice anywhere
- [ ] Embed widget for external sites
- [ ] Parent portal / progress reports
- [ ] Typing certificates (PDF generation)
- [ ] Integration with typing keyboards (mechanical keyboard stats)

---

## Notes

<!-- Add planning notes, decisions, or context here -->

