# Design Guidelines: Commercial Door Estimating & Measurement Tool

## Design Approach: Material Design System
**Rationale**: Utility-focused productivity tool requiring robust mobile support, complex form interactions, AR integration, and data-dense displays. Material Design provides the necessary component patterns for professional field work applications.

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 25 75% 47% (Professional blue for CTAs and interactive elements)
- Surface: 0 0% 100% (Clean white backgrounds)
- Surface Variant: 220 13% 96% (Subtle gray for cards and containers)
- Border: 220 13% 91% (Dividers and input borders)
- Text Primary: 220 9% 20%
- Text Secondary: 220 9% 46%

**Dark Mode:**
- Primary: 25 90% 60% (Adjusted for dark backgrounds)
- Surface: 220 18% 12% (Deep blue-gray base)
- Surface Variant: 220 15% 18% (Elevated surfaces)
- Border: 220 13% 26%
- Text Primary: 220 9% 96%
- Text Secondary: 220 9% 72%

**Accent (Data Visualization):**
- Success: 142 71% 45% (Approved/Complete)
- Warning: 38 92% 50% (Review Required)
- Error: 0 72% 51% (Issues/Missing Data)
- Info: 199 89% 48% (AR/Measurement indicators)

### B. Typography

**Font Stack:**
- Primary: 'Inter' (Google Fonts) - body text, forms, data
- Monospace: 'JetBrains Mono' - measurements, dimensions, IDs

**Hierarchy:**
- Display: 2.5rem (40px) / font-bold - Dashboard headers
- H1: 2rem (32px) / font-semibold - Page titles
- H2: 1.5rem (24px) / font-semibold - Section headers
- H3: 1.25rem (20px) / font-medium - Card titles
- Body: 1rem (16px) / font-normal - Default text
- Small: 0.875rem (14px) / font-normal - Labels, metadata
- Caption: 0.75rem (12px) / font-medium - Input hints, status badges

### C. Layout System

**Spacing Units**: Tailwind primitives of 1, 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4
- Form field spacing: space-y-4
- Icon-text gap: gap-2

**Responsive Grid:**
- Mobile (base): Single column, full-width cards
- Tablet (md:): 2-column dashboard, side-by-side forms
- Desktop (lg:): 3-column layouts, expanded data tables

**Container Strategy:**
- Dashboard: max-w-7xl mx-auto px-4
- Forms: max-w-4xl mx-auto
- Data tables: w-full with horizontal scroll on mobile

### D. Component Library

**Navigation:**
- Top App Bar: Fixed header with project selector, user menu, sync status
- Bottom Navigation (Mobile): Icons + labels for Survey / Projects / Library / Export
- Side Navigation (Desktop): Collapsible rail with expanded labels

**Data Entry Forms:**
- Floating Labels: Material-style inputs with animated labels
- Multi-step Forms: Progress stepper for complex surveys
- Quick Entry Cards: Swipeable cards for rapid data collection
- Input Groups: Measurement fields with unit selectors (inches/cm)

**AR & Photo Tools:**
- Camera Overlay: Dimension guides with tap-to-measure points
- Photo Annotation Canvas: Drawing tools, dimension arrows, callout boxes
- Gallery Grid: 3-column photo thumbnails with quick actions

**Data Display:**
- Project Cards: Elevated cards with status chips, progress bars, action buttons
- Specification Lists: Expandable accordion sections for door/frame/hardware details
- Measurement Tables: Sticky headers, sortable columns, inline editing
- Summary Widgets: Key metrics in compact stat cards

**Export & Actions:**
- FAB (Floating Action Button): Primary action for "Add Opening" or "Export Excel"
- Batch Actions Bar: Selection mode with multi-select checkboxes
- Export Dialog: Format selection, date range, filter options

**Feedback Elements:**
- Snackbars: Bottom-anchored for save confirmations, sync status
- Loading States: Skeleton screens for data-heavy views
- Empty States: Illustrated prompts for first-time use
- Validation: Inline error messages below fields

### E. Interaction Patterns

**Minimal Animation (Utility Focus):**
- Tab transitions: Slide 150ms for navigation switches
- Card expansion: Scale + fade 200ms for detail views
- Input focus: Border color 100ms transition
- List item actions: Slide-in 150ms for swipe gestures

**AR Measurement Flow:**
1. Camera activation with overlay grid
2. Tap to place measurement points
3. Real-time dimension display with confidence indicator
4. Capture with auto-save to opening record

**Photo Annotation Workflow:**
1. Full-screen photo viewer
2. Drawing toolbar (pen, arrow, text, dimension line)
3. Color/thickness selector
4. Save annotations as layer over original

---

## Images & Visual Assets

**Hero Image**: Not applicable (utility app, dashboard-first)

**In-App Imagery:**
- Empty States: Line illustrations showing "No projects yet" with surveyor character
- Onboarding: 3-step tutorial screens showing AR measurement, photo annotation, export
- Icon Library: Material Icons CDN for consistent UI icons (survey, photo, export, hardware types)
- Product Placeholders: Neutral door/frame silhouettes for catalog items without photos

**Photo Integration:**
- Project galleries display user-captured door/frame photos in responsive grid
- Annotation overlays shown in-context within measurement records
- Thumbnail generation for quick reference in lists

---

## Key Screens Layout

**Dashboard:** Stats cards (Total Projects, Pending Estimates, Openings Surveyed) + Recent Projects list + Quick Actions FAB

**Survey Screen:** Step-by-step form (Location → Measurements → Hardware → Photos) with progress indicator and save draft capability

**Opening Detail:** Tabbed interface (Specifications | Photos | Hardware | Notes) with edit mode toggle

**Export View:** Filter panel (date range, project, status) + preview table + export format selector (Excel) + download button