## Context

The Room Map modal (`RoomDetailModal`) and its supporting hooks contain two categories of un-localized error messaging:

1. **Field validation messages** — three rules in `GuestSearchSection.tsx` use hardcoded English strings (`"Required"`, `"Phone number is required"`, `"Check-out must be after check-in"`) instead of `t()` calls. The two charge-type validation rules already use `t("validation.*")` correctly; the generic required/phone rules were missed.

2. **API error display** — `useRoomModalActions.ts` calls `message.error(err.message)` directly. `err.message` is the raw English string from the API response body, which is written for server logs, not end users. This means Vietnamese users see English error strings. Additionally, `badRequest()` in `lib/response.ts` has no `code` parameter (unlike `conflict()`), so check-in and check-out route errors cannot be distinguished from generic 400s on the client.

## Goals / Non-Goals

**Goals:**
- All field validation messages in the room-map flow use the `next-intl` `t()` system.
- API errors displayed to users are translated via a code→`t()` mapping instead of showing raw English strings.
- Structured error codes added to `badRequest` responses in the check-in and check-out routes so the client can map them.
- `badRequest()` in `lib/response.ts` gains an optional `code` param, consistent with `conflict()`.

**Non-Goals:**
- Changing API response HTTP statuses or error message text (server strings stay English for logging; only the client-side display changes).
- Translating non-room-map validation (rooms, reservations, etc.) — those are separate modules.
- Adding validation rules that don't already exist.

## Decisions

### 1. Server strings stay English; client maps codes to `t()`
**Decision:** API route handlers keep English `error` strings. The client checks `err.code` and maps it to `t("errors.<code>")`. Unknown codes fall back to a generic translated fallback.  
**Rationale:** The server does not know the client's locale. Translating on the server would require passing `Accept-Language` headers into every route, which is complex and inconsistent with the existing pattern. The `conflict()` helper already follows the code-based approach; `badRequest()` is extended to match.

### 2. `badRequest` gains optional `code`
**Decision:** Add `code?: string` to `badRequest(error, code?)` in `lib/response.ts`.  
**Rationale:** The check-in route returns 400 for two distinct conditions — booking not CONFIRMED, and room not sellable — but the client cannot distinguish them without a code. This is the same reason `conflict()` has a code; 400 and 409 should be symmetric.

### 3. New i18n keys are scoped under `roomMap.validation` and `roomMap.errors`
**Decision:** Add `roomMap.validation.required`, `roomMap.validation.phoneRequired`, `roomMap.validation.checkOutAfterCheckIn` for field rules; add `roomMap.errors.*` for API error codes.  
**Rationale:** `validation.*` already exists in the namespace (two keys are there); these are additive. Scoping under `roomMap` avoids polluting the `common` namespace with flow-specific messages.

### 4. Internal hook errors (`useCheckInFlow`) fall back to generic message
**Decision:** The `throw new Error(...)` calls inside `useCheckInFlow` (for missing master data, no booking id, etc.) are programming-level errors that should not normally surface. The catch block in `useRoomModalActions` maps non-`ApiError` errors to `t("checkInFailed")` rather than displaying the raw `.message`.  
**Rationale:** These conditions indicate a configuration or data-integrity problem, not a user input error. A generic "Check-in failed. Please try again." message is more appropriate than the internal English debug string.

## Error Code Map

| API Code | Route | Client message key |
|---|---|---|
| `BOOKING_OVERLAP` | POST /api/bookings, POST /api/bookings/[id]/checkin | `roomMap.errors.bookingOverlap` |
| `BOOKING_NOT_CONFIRMED` | POST /api/bookings/[id]/checkin | `roomMap.errors.bookingNotConfirmed` |
| `ROOM_NOT_READY` | POST /api/bookings/[id]/checkin | `roomMap.errors.roomNotReady` |
| `BOOKING_NOT_CHECKED_IN` | POST /api/bookings/[id]/checkout | `roomMap.errors.bookingNotCheckedIn` |
| *(unknown)* | any | `roomMap.checkInFailed` / `roomMap.errors.saveFailed` |

## Affected Files

- `lib/response.ts` — add `code?` to `badRequest`
- `app/api/bookings/[id]/checkin/route.ts` — add codes to badRequest calls
- `app/api/bookings/[id]/checkout/route.ts` — add code to badRequest call
- `modules/room-map/components/GuestSearchSection.tsx` — fix 3 hardcoded messages
- `modules/room-map/hooks/useRoomModalActions.ts` — replace `err.message` with code-based mapping
- `messages/en.json` + `messages/vi.json` — add new i18n keys
