## ADDED Requirements

### Requirement: Horizontal scroll on all screen sizes
`AppTable` SHALL enable horizontal scroll by default on all viewport sizes so that wide tables remain usable on small screens without content overflow.

#### Scenario: Table scrolls horizontally on mobile
- **WHEN** a table's total column width exceeds the viewport width on a mobile device
- **THEN** the table container SHALL scroll horizontally rather than clipping or wrapping content

---

### Requirement: Responsive column hiding
`AppTable` SHALL accept an optional `responsiveHideColumns` prop that specifies which column `dataIndex` values to hide below a given breakpoint.

Prop signature:
```ts
responsiveHideColumns?: {
  below: "md" | "lg";
  columns: string[];
}
```

When `below: "md"` is set, the listed columns SHALL be removed from the rendered column list when the viewport is in the mobile tier (`!screens.md`).

When `below: "lg"` is set, the listed columns SHALL be removed when the viewport is below the desktop tier (`!screens.lg`), covering both mobile and tablet.

#### Scenario: Columns hidden on mobile when below "md"
- **WHEN** `responsiveHideColumns={{ below: "md", columns: ["createdAt", "updatedAt"] }}` is passed
- **AND** the viewport is in the mobile tier (< 768 px)
- **THEN** the `createdAt` and `updatedAt` columns SHALL NOT render in the table

#### Scenario: Columns visible on tablet when below "md"
- **WHEN** `responsiveHideColumns={{ below: "md", columns: ["createdAt"] }}` is passed
- **AND** the viewport is in the tablet or desktop tier (≥ 768 px)
- **THEN** the `createdAt` column SHALL render normally

#### Scenario: Columns hidden on mobile and tablet when below "lg"
- **WHEN** `responsiveHideColumns={{ below: "lg", columns: ["notes"] }}` is passed
- **AND** the viewport is below 1024 px (mobile or tablet)
- **THEN** the `notes` column SHALL NOT render

#### Scenario: No responsiveHideColumns prop — all columns render
- **WHEN** `responsiveHideColumns` is not provided
- **THEN** all columns pass through unchanged (backward-compatible)

---

### Requirement: Compact row density on mobile
On mobile-width viewports, `AppTable` SHALL automatically switch to `size="small"` row density to maximize visible rows without requiring caller configuration.

#### Scenario: Small row density on mobile
- **WHEN** the viewport is in the mobile tier
- **THEN** the Ant Design `Table` SHALL render with `size="small"`

#### Scenario: Default row density on tablet and desktop
- **WHEN** the viewport is in the tablet or desktop tier
- **THEN** the Ant Design `Table` SHALL render with `size="middle"` (current default)
