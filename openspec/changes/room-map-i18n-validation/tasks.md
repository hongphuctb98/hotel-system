## Tasks

- [x] Extend `badRequest()` in `lib/response.ts` with optional `code` param
- [x] Add `BOOKING_NOT_CONFIRMED` and `ROOM_NOT_READY` codes to `checkin/route.ts`
- [x] Add `BOOKING_NOT_CHECKED_IN` code to `checkout/route.ts`
- [x] Add `roomMap.validation.required`, `phoneRequired`, `checkOutAfterCheckIn` keys to `en.json` + `vi.json`
- [x] Add `roomMap.errors.*` keys to `en.json` + `vi.json`
- [x] Fix 3 hardcoded validation messages in `GuestSearchSection.tsx`
- [x] Replace `err.message` with code-based `t()` mapping in `useRoomModalActions.ts`
