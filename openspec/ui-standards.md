# UI Standards

Project-wide conventions for UI components and patterns. All new modules must follow these standards. Existing modules should migrate when touched.

---

## Currency & Price Display

### Rule: Use `<PriceDisplay />` for all monetary values

**Component:** `common/components/ui/PriceDisplay.tsx`

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `amount` | `number \| string \| null \| undefined` | — | The monetary value. Accepts Prisma Decimal serialized as string. `null`/`undefined` renders `"—"`. |
| `originalCurrency` | `string` | `"VND"` | The currency in which the amount is stored in the DB. |
| `targetCurrency` | `string` | locale's currency | Override the display currency. Omit to use the current locale's default (VND for `vi`, USD for `en`). |
| `isFallback` | `boolean` | `false` | When `true`, renders the amount in muted gray (`#9ca3af`) and adds a tooltip. Use when the price comes from a parent type (e.g. `roomType.defaultPrice`) rather than the entity itself. |
| `className` | `string` | — | Additional CSS classes. |

**Example — room price with fallback:**
```tsx
<PriceDisplay
  amount={room.basePrice ?? room.roomType.defaultPrice}
  isFallback={room.basePrice == null}
/>
```

**Example — explicit amount, no fallback:**
```tsx
<PriceDisplay amount={invoice.totalAmount} />
```

### Currency conversion

All prices are stored in **VND** in the database (`BASE_CURRENCY` in `common/constants/currency.ts`).

`PriceDisplay` converts automatically at render time when the locale's display currency differs from `originalCurrency`:
- `vi` locale → display in VND (no conversion)
- `en` locale → display in USD using `EXCHANGE_RATES.VND_TO_USD`

Exchange rates live in `common/constants/currency.ts`. Update `EXCHANGE_RATES` when rates change. Do not hardcode rates inside components.

### Fallback price pattern

When an entity has an optional price override (e.g. `Room.basePrice`) that falls back to a parent type's price (e.g. `RoomType.defaultPrice`):
- Render with `isFallback={entityPrice == null}`
- The muted color communicates to staff that the price is inherited, not set
- Never silently show the fallback price without visual indication

### What NOT to do

```tsx
// ❌ Hardcoded symbol
<span>₫{amount}</span>
<span>${amount}</span>

// ❌ Raw Intl.NumberFormat in a component
new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

// ❌ useLocaleCurrency().format() in new code (acceptable in existing code that has no fallback concept)
const { format } = useLocaleCurrency();
return format(amount); // no isFallback support

// ✅ Correct
<PriceDisplay amount={amount} isFallback={isFallback} />
```

> **Note on `useLocaleCurrency().format()`:** The hook remains valid for existing billing, reservations, and guest pages where no fallback-price concept exists and currency conversion is not yet needed. Migrate those call sites to `<PriceDisplay />` when the pages are next significantly modified.

---

## Feedback & Loading Standards

All API-interacting actions (Create, Update, Delete, Upload) must:

1. **Loading state** — wire mutation `isPending` to button `loading` prop
2. **Success/error toast** — use `App.useApp()` → `message.success` / `message.error`. Never use the static `message` import.
3. **Cache invalidation** — call `queryClient.invalidateQueries`:
   - List query `["entity"]` — always
   - Detail query `["entity", id]` — on update, upload, image-delete; use `removeQueries` on delete

For inline destructive actions such as remove avatar, remove image, or delete document:
- Await the mutation at the call site (`await mutateAsync(...)`) and fire `message.success` / `message.error` there.
- Do not rely on cache invalidation alone for user feedback.
- If the action is row-scoped, show loading on the exact button being clicked.

### Mode-aware submit buttons

Form drawers that serve both Create and Edit modes must use distinct labels and messages:

| Mode | Button label | Success message |
|------|-------------|-----------------|
| Create | `"Create X"` | `"X created successfully"` |
| Update | `"Update X"` | `"X updated successfully"` |

i18n keys follow the pattern: `entity.createAction`, `entity.updateAction`, `entity.createSuccess`, `entity.updateSuccess`.

---

## Soft-Delete Conflict Handling

When creating an entity whose unique key matches a soft-deleted (inactive) record:

1. API returns HTTP 409 with `code: "ENTITY_INACTIVE_EXISTS"` and `data: { id }`
2. UI shows `modal.confirm` offering to reactivate the existing record
3. On confirm, call the update endpoint with `{ isActive: true }`

See `design.md` in `openspec/changes/room-management-crud/` for the full decision record on this pattern.

---

## Layout & Spacing Standards

### Page layout

Pages live under `app/[locale]/(main)/[page]/page.tsx` and are intentionally thin — they compose module components, not data.

```tsx
// Standard page wrapper
<div className="space-y-4">
  <AppPageHeader title="entity.title" />
  <FilterBar ... />
  <EntityTable ... />
</div>
```

| Area | Spacing |
|------|---------|
| Between page header and first content block | `space-y-4` (16px) |
| Between filter bar and table | `space-y-4` (16px) |
| Between cards on a detail page | `space-y-6` (24px) |
| Between form fields | Ant Design `Form layout="vertical"` default (24px bottom per item) |
| Inside cards | Ant Design Card default padding (24px) |
| Inside drawers | Ant Design Drawer default padding (24px) |

### Form layout

- **Single-column** — default for all drawers and modals. Fields stack vertically.
- **Two-column grid** — only for logically paired fields on the same row (e.g. check-in / check-out dates, unit price / quantity). Use `<div className="grid grid-cols-2 gap-4">`.
- Two-column forms inside a narrow drawer (width ≤ 480px) must collapse to single column at `sm` breakpoint.

### Section separation inside a drawer or card

Use a `<Divider />` between logically distinct groups of fields (e.g. "Contact info" and "Billing info"). Do not add dividers between every field.

---

## Typography Standards

Use Ant Design `Typography` components (`Title`, `Text`, `Paragraph`) or the equivalent Tailwind classes for plain elements. Do not set custom `fontSize` inline except when driven by a design token.

| Context | Component / Class | Example |
|---------|-------------------|---------|
| Page title | `<AppPageHeader title="..." />` | "Reservations" |
| Section / card title | `<Typography.Title level={5}>` or Ant Design Card `title` prop | "Booking Summary" |
| Field label | Ant Design `Form.Item label` | "Room Number" |
| Helper / hint text | `<Typography.Text type="secondary">` | "Available: 10 bottles" |
| Muted / empty value | `<Typography.Text type="secondary">` | "—", "Never" |
| Error / danger inline | `<Typography.Text type="danger">` | "Only 3 available" |
| Table cell text | Plain text node, no wrapper | "101", "John Doe" |
| Table muted fallback | `<Typography.Text type="secondary">` | "—" |

Rules:
- Never mix `className="text-xs text-gray-500"` for labels alongside Ant Design form labels in the same form.
- Do not use `<b>` or raw `<strong>` for emphasis; use `<Typography.Text strong>`.
- Page titles are always driven by `AppPageHeader`, never rendered inline as `<h1>` on the page.

---

## Status & Semantic Color Standards

### When to use Tag vs Text color vs Badge

| Situation | Component |
|-----------|-----------|
| Entity lifecycle status (booking, invoice, task) | `<StatusBadge>` or `<Tag color="...">` |
| Boolean active/inactive toggle | `<Switch>` in table; `<Tag>` in read-only view |
| Inventory low-stock alert | `<Tag color="error">` |
| Count / numeric indicator | `<Badge count={n}>` |
| Inline status hint within text | `<Typography.Text type="danger/warning/success">` |

### Semantic color mapping

Use these consistently across all modules. Do not invent per-screen colors.

| Semantic meaning | Ant Design color token | Tag color |
|-----------------|------------------------|-----------|
| Active / confirmed / paid / completed | `success` | `"success"` |
| Pending / in-progress / partial | `warning` | `"warning"` |
| Cancelled / rejected / failed / inactive | `error` | `"error"` |
| Draft / new / unstarted | `processing` | `"processing"` |
| Neutral / informational | `default` | `"default"` |
| Checked in | `"blue"` | `"blue"` |
| Checked out | `"geekblue"` | `"geekblue"` |

Rules:
- The mapping above applies to `BookingStatus`, `HousekeepingTask`, `Invoice`, and any future status enum.
- Never use `color="#hex"` on `<Tag>` without a semantic reason shared with other modules.
- Do not use color alone to communicate status — always pair with a text label.

---

## Button Color Standards

Define a consistent semantic color system for buttons. Action intent must be predictable across all modules.

### Primary button

Used for the **main action** in a page, drawer, or modal. One primary button per action group.

```tsx
<Button type="primary">Create Booking</Button>
<Button type="primary">Save</Button>
<Button type="primary">Confirm Payment</Button>
```

Examples: Create, Save, Update, Submit, Confirm.

### Default / secondary button

Used for neutral supporting actions that do not compete with the primary.

```tsx
<Button>Cancel</Button>
<Button>Back</Button>
<Button>Close</Button>
```

Examples: Cancel, Close, Back, Reset.

### Danger button

Used **only** for destructive or irreversible actions.

```tsx
<Button danger>Delete</Button>
<Button type="primary" danger>Deactivate</Button>
```

Examples: Delete, Remove, Deactivate, Cancel Booking, Clear data.

Never use `danger` for ordinary edit actions, navigation, or non-destructive toggles.

### Success button

Use only when the positive semantic meaning is truly distinct from a standard primary action — not as a substitute for primary everywhere.

```tsx
<Button style={{ background: token.colorSuccess }}>Approve</Button>
```

Examples: Approve, Mark as Paid, Activate, Complete.

### Warning button

Use for cautionary actions that are not fully destructive but require elevated attention.

Examples: Suspend, Archive, Put on hold.

Use sparingly. Only when the semantic distinction from primary or danger matters to the operator.

### Loading and disabled states

- `loading` prop must be wired to the mutation's `isPending`. Do not fake loading with `setTimeout`.
- A destructive button in loading state still reads as destructive — do not swap to a neutral style while loading.
- `disabled` must not be used as a substitute for loading. Reserve `disabled` for fields or actions that are structurally unavailable (e.g. role-gated, read-only period).

### Rules

- Do not assign custom button colors per screen without a semantic reason shared with other modules.
- Do not create multiple competing primary buttons in the same action area.
- Do not use color for decoration. A green button must always mean "positive/safe action", not just "approved by design".
- Action bar button order: **Destructive → Secondary → Primary** (left to right), so the most important action is rightmost and hardest to accidentally click.

---

## Form Standards

### Form surface: Drawer vs Modal vs Full page

| Use case | Surface |
|----------|---------|
| Create or edit a single entity with ≤ 10 fields | `AppDrawer` |
| Quick confirmation or single-field action | `AppModal` |
| Complex entity with many sections, images, or relations | Dedicated page (e.g. `/rooms/[id]/edit`) |
| Record a small operation (movement, payment, note) | `Modal` (simpler than drawer, no header nav) |

Do not use a drawer for a form that has already spawned a child drawer — nest at most one level. If nesting is required, use a modal for the child.

### Footer actions

All form drawers and modals must place action buttons in the footer, right-aligned:

```
[Cancel]  [Primary Action]
```

For destructive drawers (e.g. confirm deactivation):

```
[Cancel]  [Delete / Deactivate]  ← danger styling
```

Do not place the primary action button at the top of the form.

### Required fields

- Use Ant Design `rules={[{ required: true }]}` — Ant Design renders the asterisk automatically.
- Do not manually add `*` to label strings.
- Place validation messages below the field using Ant Design's default placement (never above or inline as a tooltip).

### Dirty-state and accidental close

- Forms that have unsaved changes should prevent accidental close. Use `modal.confirm` before calling `onClose` if the form is dirty.
- During a mutation (`isPending`), disable the close button and Cancel button to prevent partial submission.
- After a successful mutation, always call `form.resetFields()` before calling `onClose()`.

### Field width conventions

- Full-width fields (stretch to drawer/modal width): text input, textarea, select, date picker.
- Half-width paired fields: use `grid grid-cols-2 gap-4`.
- Numeric fields (price, quantity, count): fixed width (`style={{ width: 120 }}` or `w-32`), never stretched.

---

## Table & List Page Standards

### Standard list page structure

```
AppPageHeader (title + primary CTA)
─────────────────────────────────────────
FilterBar (search input, selects, toggles, clear button)
─────────────────────────────────────────
AppTable (columns, rows, pagination)
  └─ action column (fixed right, icon buttons)
```

Every list page must follow this structure. Do not embed filter controls inside the table header or inside the page title row.

### Pagination

- All tables must use `showSizeChanger: true` with `pageSizeOptions: [10, 20, 50, 100]`.
- Default page size: 20.
- Server-side pagination (via API `page` + `limit` params) for master data and all entity lists.
- Client-side pagination (Ant Design built-in) only for small in-memory datasets that are already fully loaded.

### Action column

- Place the action column last, `fixed: "right"`, width 120–180px.
- Use icon-only `Button type="text" size="small"` with `icon={<IconEdit size={14} />}` for Edit and View.
- Use `Button type="text" size="small" danger` for inline Delete/Deactivate.
- Always add a `title` or `tooltip` to icon-only action buttons for accessibility.
- For actions that need confirmation (delete, deactivate), trigger `useConfirm()` — do not use `window.confirm`.

### Loading state

- Wire `isLoading` from the query to `AppTable loading={isLoading}`.
- Do not show a spinner overlay that covers the whole page — the table skeleton is sufficient.

### Empty state

- `AppTable` uses `<EmptyState />` by default.
- For filtered empty results ("No items match your search"), pass a custom `locale={{ emptyText: "No results" }}` to `AppTable`.
- For a page with no data at all (zero records), the default `EmptyState` is sufficient.

### Long text truncation

- Truncate long text in table cells with CSS (`text-ellipsis overflow-hidden whitespace-nowrap`) and add a `Tooltip` showing the full value on hover.
- Do not wrap cell text to multiple lines unless the column is explicitly a notes/description column.

### Row-level loading

- When a per-row mutation is in progress (e.g. toggling `isActive`), show loading state on that row's control only — not on the whole table.

---

## Empty / Error / Permission States

### Empty states

- Use `<EmptyState />` from `common/components/ui/EmptyState.tsx` inside tables.
- For full-page empty (a module with no data yet), use Ant Design `<Empty description="..." />` centered in the content area with a CTA button if the user has create permission.

### No search result state

- When filters/search are active and return zero results, show `<Empty description="No results found" />` with a "Clear filters" button.
- Do not show the same empty state as the zero-data state — the user needs to know the data exists but the filter excluded it.

### API error state

- If a query fails (`isError`), show an Ant Design `<Alert type="error" title="Failed to load data" description="..." />` in place of the table.
- Do not silently render an empty table when the request failed.

### Permission denied state

- If the user lacks the required permission for a page, render Ant Design `<Result status="403" title="403" subTitle="You do not have permission to access this page." />`.
- Never hide the page entirely (blank render) — always render the 403 result.
- Gating example:
```tsx
if (!hasPermission(PERMISSIONS.INVENTORY_VIEW)) {
  return <Result status="403" title="403" subTitle="..." />;
}
```

### Not found state

- If a detail page entity is not found (404 from API), render `<Result status="404" title="404" subTitle="This record does not exist." />`.

---

## Detail / Read-only View Standards

### Label–value layout

Use a two-column `Descriptions` layout (Ant Design `<Descriptions bordered size="small">`) for read-only entity details:

```tsx
<Descriptions bordered size="small" column={2}>
  <Descriptions.Item label="Room">{booking.room.number}</Descriptions.Item>
  <Descriptions.Item label="Guest">{booking.guest.name}</Descriptions.Item>
  <Descriptions.Item label="Check-in">{formatDate(booking.checkIn)}</Descriptions.Item>
  <Descriptions.Item label="Total"><PriceDisplay amount={booking.totalAmount} /></Descriptions.Item>
</Descriptions>
```

- Use `column={1}` inside narrow drawers (width ≤ 480px).
- Collapse to `column={1}` on mobile.

### Audit metadata

Always display at the bottom of a detail view:

```
Created: 12/04/2025 09:31 · by Admin
Last updated: 14/04/2025 14:02 · by Manager
```

Use `<Typography.Text type="secondary" className="text-xs">` for this block.

### Muted / missing values

Render `—` (em dash) for `null`/`undefined` fields. Use `<Typography.Text type="secondary">—</Typography.Text>` in read-only contexts, plain `"—"` inside table cells.

### Related images / files

Display with fixed-size thumbnails in a horizontal flex row. Clicking opens a preview. Do not embed full-resolution images inline.

---

## Shared Input & Display Components

Beyond `PriceDisplay`, prefer these shared components for consistency:

| Need | Component / hook |
|------|-----------------|
| Monetary value display | `<PriceDisplay />` |
| Currency input field | `<CurrencyField />` (`common/components/form/CurrencyField.tsx`) |
| Date / time display | `dayjs(value).format("DD/MM/YYYY HH:mm")` — always use this format project-wide |
| Short date (no time) | `dayjs(value).format("DD/MM/YYYY")` |
| Status badge / colored tag | `<StatusBadge>` or `<Tag color={semanticColor}>` |
| Text input field | `<TextField />` (`common/components/form/TextField.tsx`) |
| Select field | `<SelectField />` (`common/components/form/SelectField.tsx`) |
| Date picker field | `<DateField />` (`common/components/form/DateField.tsx`) |
| Confirmation dialog | `useConfirm()` (`common/hooks/useConfirm.ts`) — never use `window.confirm` |
| Page header + CTA | `<AppPageHeader />` |
| Table | `<AppTable />` |
| Drawer | `<AppDrawer />` |
| Modal | `<AppModal />` or Ant Design `<Modal>` for simpler operations |

Rules:
- Do not call `dayjs().format()` with a different format string in different modules for the same purpose — use the two formats above.
- Do not add a new form wrapper component unless it covers a new input type not handled by the existing form components.
- When a display pattern appears in three or more places, extract it into a shared component.

---

## Responsive Standards

This application targets primarily **desktop and tablet** use. Mobile is a secondary concern but must not be broken.

### Breakpoints (Tailwind / Ant Design)

| Breakpoint | Width | Typical use |
|------------|-------|-------------|
| `sm` | 640px | Large phone / small tablet |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / laptop |
| `xl` | 1280px | Desktop |

### Pages and content area

- Page content must not overflow horizontally on any breakpoint. Use `overflow-x: hidden` on the page container if needed.
- `AppTable` uses horizontal scroll (`scroll={{ x: "max-content" }}`) — this is correct; do not remove it.

### Forms

- Drawers: always full-width on mobile (`sm`). Ant Design Drawer `width` should be `Math.min(windowWidth, 480)` or use `size="default"` which collapses.
- Two-column form grids (`grid-cols-2`) must collapse to `grid-cols-1` at `sm`: `className="grid grid-cols-1 sm:grid-cols-2 gap-4"`.

### Page header and filter bar

- `AppPageHeader` title and CTA button may stack vertically on mobile — ensure the CTA is not hidden.
- Filter bars (`Space wrap`) use `wrap` which naturally reflows on small screens. Prefer `Space wrap` over `flex` for filter bars.
- Search inputs: reduce width on small screens using `style={{ width: "100%" }}` with `max-width` on larger screens.

### Tables on small screens

- `AppTable` with `scroll={{ x: "max-content" }}` renders a horizontally scrollable table — this is the preferred pattern.
- Do not replace tables with stacked card lists for this project's primary screens. The application is admin-oriented and expects desktop/tablet use.
- Exception: for very small summary panels (e.g. a 2-column summary inside a drawer), a stacked layout is acceptable.

### Drawers

- Full-width on mobile (< `sm`).
- Fixed width (`480px`) on tablet and above.
- Never render a drawer that is wider than the viewport.

---

## Accessibility Basics

These are practical baseline rules, not full WCAG compliance:

### Icon-only buttons

Every icon-only button must have either:
- An Ant Design `tooltip` prop, or
- An `aria-label` attribute

```tsx
// ✅
<Button type="text" icon={<IconEdit size={14} />} title="Edit" onClick={...} />

// ❌
<Button type="text" icon={<IconEdit size={14} />} onClick={...} />
```

### Color alone must not convey meaning

Every status indicator that uses color must also include a text label. A red tag without text ("●") is not acceptable.

### Focus visibility

Do not use `outline: none` or `focus:outline-none` on interactive elements unless a custom focus style replaces it. Ant Design's default focus ring is acceptable — do not suppress it.

### Form labels

Every `Form.Item` must have a `label` prop. Do not use placeholder text as a substitute for a label.

### Screen reader hints for dynamic regions

Toasts (`message.success/error`) and modal dialogs are inherently accessible in Ant Design. Do not add redundant `aria-live` regions for these.
