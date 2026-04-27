## ADDED Requirements

### Requirement: Canonical breakpoint tiers
The system SHALL define three layout tiers — mobile (< 768 px), tablet (768–1023 px), and desktop (≥ 1024 px) — using Ant Design's `Grid.useBreakpoint()` with the `md` and `lg` keys as the tier boundaries.

#### Scenario: Breakpoint detection aligns with Ant Design thresholds
- **WHEN** the viewport width is below 768 px
- **THEN** the layout SHALL treat the session as "mobile" (`!screens.md`)

#### Scenario: Tablet tier
- **WHEN** the viewport width is between 768 px and 1023 px
- **THEN** the layout SHALL treat the session as "tablet" (`screens.md && !screens.lg`)

#### Scenario: Desktop tier
- **WHEN** the viewport width is 1024 px or above
- **THEN** the layout SHALL treat the session as "desktop" (`screens.lg`)

---

### Requirement: Mobile navigation drawer
On mobile, the sidebar navigation SHALL render as a full-height Ant Design `Drawer` overlay, not as a fixed `Sider`. The main content area SHALL span the full viewport width (`marginLeft: 0`).

#### Scenario: Sidebar is hidden behind hamburger on mobile
- **WHEN** the app loads on a mobile-width viewport
- **THEN** the fixed sidebar SHALL NOT be visible and the hamburger button SHALL be shown

#### Scenario: Navigation drawer opens on hamburger tap
- **WHEN** the user taps the hamburger button on mobile
- **THEN** a full-height drawer SHALL slide in from the left containing the `AppSidebar` menu

#### Scenario: Navigation drawer closes after link selection
- **WHEN** the user taps a navigation link inside the mobile drawer
- **THEN** the drawer SHALL close automatically

---

### Requirement: Tablet sidebar forced to icon-only collapse
On tablet-width viewports, the sidebar `Sider` SHALL always render in the collapsed (icon-only, 64 px) state regardless of the user's toggle preference. The main content area SHALL use `marginLeft: 64`.

#### Scenario: Sidebar icon-only on tablet
- **WHEN** the viewport width is in the tablet range (768–1023 px)
- **THEN** the sidebar SHALL display only icons (64 px wide) and SHALL NOT display text labels

#### Scenario: User toggle has no effect on tablet
- **WHEN** the user clicks the hamburger toggle button on a tablet-width viewport
- **THEN** the sidebar SHALL open as a drawer overlay (same as mobile behavior), not expand to full width

---

### Requirement: Desktop sidebar user-controlled collapse
On desktop viewports, the sidebar SHALL behave as today — expanded (240 px) by default, collapsible to icon-only (64 px) via the hamburger toggle button.

#### Scenario: Desktop sidebar expands and collapses
- **WHEN** the user clicks the hamburger toggle button on a desktop-width viewport
- **THEN** the sidebar SHALL toggle between 240 px (expanded) and 64 px (collapsed)

---

### Requirement: Responsive page content padding
The main `Content` container SHALL use reduced horizontal padding on mobile and standard padding on tablet and desktop.

#### Scenario: Reduced padding on mobile
- **WHEN** the viewport is in the mobile tier
- **THEN** the content area SHALL use 12 px horizontal margin (instead of 24 px)

#### Scenario: Standard padding on tablet and desktop
- **WHEN** the viewport is in the tablet or desktop tier
- **THEN** the content area SHALL use 24 px horizontal margin
