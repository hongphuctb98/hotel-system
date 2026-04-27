## 1. Shared Responsive Layout — MainLayout

- [x] 1.1 Add `Grid.useBreakpoint()` to `MainLayout` and derive `isMobile` (`!screens.md`) and `isTablet` (`screens.md && !screens.lg`)
- [x] 1.2 On mobile: replace the fixed `Sider` with an Ant Design `Drawer` containing `AppSidebar`; set `marginLeft: 0` on the content area
- [x] 1.3 On tablet: force `collapsed={true}` always on the `Sider`; set `marginLeft: 64`
- [x] 1.4 Wire the hamburger button to open the mobile drawer (in addition to its existing desktop toggle behavior)
- [x] 1.5 Close the mobile navigation drawer automatically when a menu link is selected (pass `onClose` callback to `AppSidebar`)
- [x] 1.6 Apply responsive `Content` margin: `12px` horizontal on mobile, `24px` on tablet/desktop

## 2. AppSidebar — drawer close callback

- [x] 2.1 Accept an optional `onMenuClick?: () => void` prop in `AppSidebar` and call it after a menu item is clicked (needed for mobile drawer auto-close)

## 3. AppDrawer — responsive width

- [x] 3.1 Add `Grid.useBreakpoint()` inside `AppDrawer`; override `width` to `"100%"` when `!screens.md`, otherwise pass through caller width

## 4. AppModal — responsive width

- [x] 4.1 Add `Grid.useBreakpoint()` inside `AppModal`; override `width` to `"calc(100vw - 32px)"` when `!screens.md`, otherwise pass through caller width

## 5. AppTable — responsive column hiding and density

- [x] 5.1 Add optional prop `responsiveHideColumns?: { below: "md" | "lg"; columns: string[] }` to `AppTable` type
- [x] 5.2 Add `Grid.useBreakpoint()` inside `AppTable`; filter out hidden columns from the `columns` prop based on the active tier and `responsiveHideColumns` config
- [x] 5.3 Auto-switch `size` to `"small"` on mobile (`!screens.md`), keep `"middle"` otherwise

## 6. Dashboard — responsive KPI card grid

- [x] 6.1 Locate the Dashboard KPI card row and convert fixed `Col span={6}` to responsive spans: `xs={24} sm={12} lg={6}`

## 7. Dashboard — responsive chart layout

- [x] 7.1 Locate the Dashboard chart section and convert to responsive column spans: `xs={24}` for each chart on mobile, `lg={14}` / `lg={10}` (or similar) for side-by-side on desktop

## 8. Manual verification

- [ ] 8.1 Verify sidebar drawer behavior at 375 px (iPhone) in browser DevTools — drawer opens/closes, navigation works
- [ ] 8.2 Verify icon-only sidebar at 768 px (tablet) — no text labels visible, content not obscured
- [ ] 8.3 Verify desktop collapse toggle still works at 1280 px
- [ ] 8.4 Verify AppDrawer is full-width at 375 px (open any create/edit form drawer)
- [ ] 8.5 Verify AppModal is near-full-width at 375 px (open any modal)
- [ ] 8.6 Verify AppTable horizontal scroll at 375 px on a wide table (e.g., Bookings)
- [ ] 8.7 Verify Dashboard KPI cards: 1-per-row at 375 px, 2-per-row at 640 px, 4-per-row at 1280 px
