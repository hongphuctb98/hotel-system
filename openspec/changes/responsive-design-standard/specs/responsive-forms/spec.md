## ADDED Requirements

### Requirement: Full-width drawer on mobile
`AppDrawer` SHALL render at full viewport width on mobile-tier viewports regardless of the `width` prop or `size` prop passed by the caller.

#### Scenario: Drawer is full-width on mobile
- **WHEN** any `AppDrawer` opens on a mobile-width viewport (< 768 px)
- **THEN** the drawer width SHALL be `"100%"` and fill the screen horizontally

#### Scenario: Drawer uses caller width on tablet and desktop
- **WHEN** an `AppDrawer` opens on a tablet or desktop viewport
- **THEN** the drawer SHALL use the caller-supplied `width` prop, or fall back to the Ant Design `size`-based default

---

### Requirement: Near-full-width modal on mobile
`AppModal` SHALL render at near-full viewport width on mobile-tier viewports, with 16 px margin on each side, to prevent the modal from overflowing or appearing too narrow.

#### Scenario: Modal is near-full-width on mobile
- **WHEN** any `AppModal` opens on a mobile-width viewport (< 768 px)
- **THEN** the modal `width` SHALL be `"calc(100vw - 32px)"`

#### Scenario: Modal uses caller width on tablet and desktop
- **WHEN** an `AppModal` opens on a tablet or desktop viewport
- **THEN** the modal SHALL use the caller-supplied `width` prop or the Ant Design default

---

### Requirement: Responsive Dashboard KPI grid
The Dashboard KPI card grid SHALL adapt its column count to the viewport tier: four cards per row on desktop, two per row on tablet, one per row on mobile.

#### Scenario: Four KPI cards per row on desktop
- **WHEN** the viewport is in the desktop tier (≥ 1024 px)
- **THEN** all four KPI cards SHALL render in a single row

#### Scenario: Two KPI cards per row on tablet
- **WHEN** the viewport is in the tablet tier (768–1023 px)
- **THEN** KPI cards SHALL render two per row (two rows of two)

#### Scenario: One KPI card per row on mobile
- **WHEN** the viewport is in the mobile tier (< 768 px)
- **THEN** each KPI card SHALL render full-width (one per row)

---

### Requirement: Responsive Dashboard chart layout
The Dashboard chart section SHALL stack charts vertically on mobile and display them side-by-side on desktop.

#### Scenario: Charts stack on mobile
- **WHEN** the viewport is in the mobile tier
- **THEN** each chart SHALL occupy full width (stacked vertically)

#### Scenario: Charts are side-by-side on desktop
- **WHEN** the viewport is in the desktop tier
- **THEN** the primary chart and secondary chart SHALL render in the same row
