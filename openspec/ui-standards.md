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
