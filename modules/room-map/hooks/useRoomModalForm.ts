"use client";

import { useEffect } from "react";
import { Form } from "antd";
import { useQuery } from "@tanstack/react-query";
import { bookingService } from "@/common/services/bookingService";
import { calculateStayPrice, buildStayPriceInput, countNights } from "@/common/utils/stayPricing";
import { useTimezone } from "@/providers/TimezoneProvider";
import { toHotelDayjs } from "@/common/utils/clientTimezone";
import type { Room } from "@/types/room.types";
import type { ServiceItem } from "@/types/master.types";
import type { StayMode, FormValues } from "../utils/roomModalMode";

type PersistedBookingService = NonNullable<
  Awaited<ReturnType<typeof bookingService.getServices>>["data"]
>[number];

const EMPTY_PERSISTED_SERVICES: PersistedBookingService[] = [];

export function useRoomModalForm(
  open: boolean,
  room: Room | null,
  stayMode: StayMode,
  serviceItems: ServiceItem[],
) {
  const booking = room?.currentBooking ?? null;
  const pricing = room?.roomType?.pricing ?? null;
  const tz = useTimezone();

  const [form] = Form.useForm<FormValues>();

  // Fetch persisted service list whenever the modal is open for an existing booking.
  const { data } = useQuery({
    queryKey: ["booking-services", booking?.id],
    queryFn: () => bookingService.getServices(booking!.id).then(r => r.data ?? []),
    enabled:  open && !!booking?.id,
    staleTime: 0,
  });
  const persistedServices = data ?? EMPTY_PERSISTED_SERVICES;

  // Live form field watches for pricing
  const chargeType   = (Form.useWatch("chargeType",  form) ?? "nightly") as "nightly" | "daily" | "hourly";
  const checkInDate  = Form.useWatch("checkInDate",  form);
  const checkOutDate = Form.useWatch("checkOutDate", form);

  // Derive pricing display values directly from the authoritative source so they are
  // never dependent on Form.Item registration (Form.useWatch returns undefined for
  // unregistered fields, which would silently zero-out all displayed prices).
  const baseRate = (() => {
    if (booking) return Number(booking.baseRate ?? 0);
    if (chargeType === "nightly") return Number(pricing?.nightlyPrice  ?? room?.basePrice ?? 0);
    if (chargeType === "daily")   return Number(pricing?.dailyPrice    ?? pricing?.nightlyPrice ?? room?.basePrice ?? 0);
    if (chargeType === "hourly")  return Number(pricing?.hourlyBlockPrice ?? 0);
    return 0;
  })();

  const hourlyRatePerHour = (() => {
    if (booking) return Number(booking.hourlyRatePerHour ?? 0);
    if (chargeType === "hourly") return Number(pricing?.hourlyExtraPrice ?? 0);
    return 0;
  })();

  // hoursStayed is always derived from dates — never manually entered
  const hoursStayed = (() => {
    if (chargeType === "hourly" && checkInDate && checkOutDate) {
      const minutes = checkOutDate.diff(checkInDate, "minute");
      return Math.max(0, minutes / 60);
    }
    return 0;
  })();

  const nightsStayed = (() => {
    if (chargeType === "nightly" && checkInDate && checkOutDate) {
      return countNights(checkInDate.toDate(), checkOutDate.toDate());
    }
    return 0;
  })();

  const daysStayed = (() => {
    if (chargeType === "daily" && checkInDate && checkOutDate) {
      return Math.max(1, checkOutDate.startOf("day").diff(checkInDate.startOf("day"), "day") + 1);
    }
    return 0;
  })();

  const services  = Form.useWatch("services",  form) ?? [];
  const discount  = Number(Form.useWatch("discount",  form) ?? 0);
  const surcharge = Number(Form.useWatch("surcharge", form) ?? 0);
  const prepaid   = Number(Form.useWatch("prepaid",   form) ?? 0);

  // Compute stay price from live values
  const stayPrice = (() => {
    if (!checkInDate || !checkOutDate) return baseRate;
    const priceInput = buildStayPriceInput(
      {
        chargeType,
        baseRate,
        checkInDate:  checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        hourlyRatePerHour,
      },
      hoursStayed,
    );
    return calculateStayPrice(priceInput);
  })();

  const serviceTotal = (services as { serviceItemId?: string; quantity?: number }[]).reduce(
    (acc, row) => {
      if (!row?.serviceItemId) return acc;
      const item = serviceItems.find((s) => s.id === row.serviceItemId);
      return acc + (item?.unitPrice ?? 0) * (row.quantity ?? 1);
    },
    0
  );
  const totalPayable = stayPrice + serviceTotal + surcharge - discount;
  const remaining    = totalPayable - prepaid;

  // chargeType watch — auto-update baseRate and hourly fields for new bookings
  useEffect(() => {
    if (!open || !!booking) return; // only for new bookings
    if (chargeType === "nightly") {
      form.setFieldValue("baseRate", pricing?.nightlyPrice ?? room?.basePrice ?? 0);
    } else if (chargeType === "daily") {
      form.setFieldValue("baseRate", pricing?.dailyPrice ?? pricing?.nightlyPrice ?? room?.basePrice ?? 0);
      // Auto-correct checkOutDate to match checkInDate for daily stays
      const ci = form.getFieldValue("checkInDate");
      const co = form.getFieldValue("checkOutDate");
      if (ci && co && co.isAfter(ci, "day")) {
        form.setFieldValue("checkOutDate", ci.clone().hour(co.hour()).minute(co.minute()));
      }
    } else if (chargeType === "hourly") {
      form.setFieldValue("baseRate",         pricing?.hourlyBlockPrice ?? 0);
      form.setFieldValue("hourlyBlockHours",  pricing?.hourlyBlockHours ?? 2);
      form.setFieldValue("hourlyRatePerHour", pricing?.hourlyExtraPrice ?? 0);
    }
  }, [chargeType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Form prefill on open
  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (booking) {
      // Existing booking: source of truth is always booking.* — never read roomType.pricing here
      form.setFieldsValue({
        guestId:          booking.guestId,
        customerName:     `${booking.guest.firstName} ${booking.guest.lastName}`,
        phone:            booking.guest.phone     ?? "",
        idNumber:         booking.guest.idNumber  ?? "",
        source:           booking.source          ?? "",
        chargeType:       (booking.chargeType     ?? "nightly") as "nightly" | "hourly" | "daily",
        checkInDate:      toHotelDayjs(booking.checkInDate, tz) ?? undefined,
        checkOutDate:     toHotelDayjs(booking.checkOutDate, tz) ?? undefined,
        baseRate:         Number(booking.baseRate ?? 0),
        hourlyBlockHours:  booking.hourlyBlockHours  ?? undefined,
        hourlyRatePerHour: booking.hourlyRatePerHour ?? undefined,
        note:             booking.note            ?? "",
        discount:         booking.discountAmount  ?? 0,
        surcharge:        booking.surchargeAmount ?? 0,
        prepaid:          Number(booking.depositAmount ?? 0),
        services: persistedServices.map(s => ({
          id:            s.id,
          serviceItemId: s.serviceItemId,
          quantity:      s.quantity,
          unitPrice:     Number(s.unitPrice),
        })),
      });
    } else {
      // New booking: pre-fill from roomType.pricing defaults (nightly by default)
      form.setFieldsValue({
        chargeType: "nightly",
        baseRate:   pricing?.nightlyPrice != null ? Number(pricing.nightlyPrice) : (room?.basePrice ? Number(room.basePrice) : 0),
      });
    }
  }, [open, booking?.id, stayMode, persistedServices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Field disabled rules
  const allLocked            = stayMode === "checked_out";
  const guestFieldsDisabled  = stayMode === "checked_in" || stayMode === "checked_out";
  const checkOutDateDisabled = stayMode === "checked_in" ? false : undefined;
  const servicesDisabled     = allLocked;
  const paymentDisabled      = allLocked;
  const noteDisabled         = allLocked;

  return {
    form,
    persistedServices,
    chargeType,
    stayPrice,
    baseRate,
    hourlyRatePerHour,
    nightsStayed,
    daysStayed,
    hoursStayed,
    services,
    discount,
    surcharge,
    prepaid,
    serviceTotal,
    totalPayable,
    remaining,
    // disabled rules
    guestFieldsDisabled,
    checkOutDateDisabled,
    servicesDisabled,
    paymentDisabled,
    noteDisabled,
  };
}
