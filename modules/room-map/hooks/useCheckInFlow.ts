"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { guestService } from "@/common/services/guestService";
import { bookingService } from "@/common/services/bookingService";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { Room } from "@/types/room.types";
import type { CheckInFormValues } from "@/types/check-in.types";

export function useCheckInFlow(room: Room | null, onSuccess: () => void) {
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();
  const { bookingStatuses } = useMasterData();

  const handleCheckIn = async (values: CheckInFormValues, existingBookingId?: string) => {
    if (!room) return;
    setIsPending(true);
    try {
      if (existingBookingId) {
        // Reserved path: update guest info + booking details, then transition to CHECKED_IN.

        // Step 1: Update guest (name, phone, idNumber) using the editable form values
        const guestId = room.currentBooking?.guestId;
        if (guestId) {
          const nameParts = (values.customerName ?? "").trim().split(/\s+/);
          const lastName  = nameParts.pop() ?? "";
          const firstName = nameParts.join(" ") || lastName;
          await guestService.update(guestId, {
            firstName,
            lastName,
            phone:    values.phone    || undefined,
            idNumber: values.idNumber || undefined,
          });
        }

        // Step 2: Update booking (dates, pricing fields, note) in one call
        const bookingUpdates: Record<string, unknown> = {
          chargeType:        values.chargeType     ?? "nightly",
          baseRate:          values.baseRate,
          discountAmount:    values.discount       ?? 0,
          surchargeAmount:   values.surcharge      ?? 0,
          hourlyBlockHours:  values.hourlyBlockHours  ?? null,
          hourlyRatePerHour: values.hourlyRatePerHour ?? null,
        };
        if (values.checkInDate)  bookingUpdates.checkInDate  = values.checkInDate;
        if (values.checkOutDate) bookingUpdates.checkOutDate = values.checkOutDate;
        if (values.note !== undefined) bookingUpdates.note   = values.note;
        await bookingService.update(existingBookingId, bookingUpdates);

        // Step 3: Full-sync service items (existing rows updated/deleted, new rows inserted)
        await bookingService.syncServices(
          existingBookingId,
          (values.services ?? [])
            .filter(r => r.serviceItemId)
            .map(r => ({ id: r.id, serviceItemId: r.serviceItemId, quantity: r.quantity }))
        );

        // Step 4: Transition to CHECKED_IN
        await bookingService.checkIn(existingBookingId);
      } else {
        // Walk-in path: full flow — guest resolution, booking creation, services, then check in

        // Step 1: Resolve guest
        const guestId = await resolveGuest(values);

        // Step 2: Find "Confirmed" booking status to use when creating the booking
        const confirmedStatus = bookingStatuses.find((s) => s.code === "CONFIRMED");
        if (!confirmedStatus) throw new Error("Booking status 'CONFIRMED' not found in master data");

        // Step 3: Create booking — all fields stored in their proper columns
        const booking = await bookingService.create({
          guestId,
          roomId:            room.id,
          bookingStatusId:   confirmedStatus.id,
          checkInDate:       values.checkInDate,
          checkOutDate:      values.checkOutDate,
          adults:            1,
          children:          0,
          baseRate:          values.baseRate,
          depositAmount:     values.prepaid        ?? 0,
          discountAmount:    values.discount       ?? 0,
          surchargeAmount:   values.surcharge      ?? 0,
          chargeType:        values.chargeType     ?? "nightly",
          hourlyBlockHours:  values.hourlyBlockHours,
          hourlyRatePerHour: values.hourlyRatePerHour,
          paymentMethodId:   values.paymentMethodId,
          source:            values.source,
          note:              values.note || undefined,
        });

        const bookingId = booking.data?.id;
        if (!bookingId) throw new Error("Booking creation returned no id");

        // Step 4: Sync service items (brand-new booking — all rows are insertions)
        const serviceRows = (values.services ?? []).filter(r => r.serviceItemId);
        if (serviceRows.length > 0) {
          await bookingService.syncServices(
            bookingId,
            serviceRows.map(r => ({ serviceItemId: r.serviceItemId, quantity: r.quantity }))
          );
        }

        // Booking is now CONFIRMED (reserved). The actual check-in happens
        // when the user opens the room modal and clicks Check In explicitly.
      }

      // Refresh room map
      queryClient.invalidateQueries({ queryKey: ["room-map"] });
      onSuccess();
    } finally {
      setIsPending(false);
    }
  };

  return { handleCheckIn, isPending };
}

async function resolveGuest(
  values: CheckInFormValues
): Promise<string> {
  // If user selected a guest from search, use it directly
  if (values.guestId) return values.guestId;

  // Try to find by CCCD first
  if (values.idNumber?.trim()) {
    const res = await guestService.findAll({ search: values.idNumber.trim(), limit: 20 } as Parameters<typeof guestService.findAll>[0]);
    const match = (res.data ?? []).find(
      (g) => g.idNumber === values.idNumber
    );
    if (match) return match.id;
  }

  // Fallback: try by name + CCCD combo
  if (values.customerName?.trim()) {
    const res = await guestService.findAll({ search: values.customerName.trim(), limit: 20 } as Parameters<typeof guestService.findAll>[0]);
    const fullName = values.customerName.trim().toLowerCase();
    const match = (res.data ?? []).find((g) => {
      const gName = `${g.firstName} ${g.lastName}`.toLowerCase();
      const sameIdNumber = values.idNumber ? g.idNumber === values.idNumber : false;
      return gName === fullName && sameIdNumber;
    });
    if (match) return match.id;
  }

  // Create new guest
  const nameParts = (values.customerName ?? "").trim().split(/\s+/);
  const lastName = nameParts.pop() ?? "";
  const firstName = nameParts.join(" ") || lastName;
  const created = await guestService.create({
    firstName,
    lastName,
    phone: values.phone || undefined,
    idNumber: values.idNumber || undefined,
  });
  if (!created.data?.id) throw new Error("Failed to create guest");
  return created.data.id;
}

