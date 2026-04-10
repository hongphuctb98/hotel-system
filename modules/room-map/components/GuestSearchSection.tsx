"use client";

import { Form, Input, Select, DatePicker, AutoComplete, Button, Row, Col } from "antd";
import { useTranslations } from "next-intl";
import { useState, useCallback, useRef } from "react";
import type { FormInstance } from "antd";
import { guestService } from "@/common/services/guestService";
import type { Guest } from "@/types/guest.types";

interface GuestOption {
  value: string;
  label: string;
  guest: Guest;
}

interface GuestSearchSectionProps {
  form: FormInstance;
  disabled?: boolean;
  /** When set, overrides `disabled` for the check-out date field only.
   *  Use `checkOutDateDisabled={false}` together with `disabled={true}` to allow
   *  stay extensions on checked-in rooms while keeping all other fields locked. */
  checkOutDateDisabled?: boolean;
}

const CHARGE_TYPE_OPTIONS = [
  { value: "nightly", label: "Nightly" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
];

const ITEM_STYLE = { marginBottom: 8 };

export default function GuestSearchSection({ form, disabled, checkOutDateDisabled }: GuestSearchSectionProps) {
  // When checkOutDateDisabled is explicitly provided it wins; otherwise inherit disabled.
  const coDisabled = checkOutDateDisabled !== undefined ? checkOutDateDisabled : !!disabled;
  const t = useTranslations("roomMap");
  const [options, setOptions] = useState<GuestOption[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setOptions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await guestService.findAll({ search: value, limit: 10 } as Parameters<typeof guestService.findAll>[0]);
        setOptions(
          (res.data ?? []).map((g) => ({
            // value = what appears in the input after the user selects an option
            value: `${g.firstName} ${g.lastName}`,
            label: [`${g.firstName} ${g.lastName}`, g.phone, g.idNumber].filter(Boolean).join(" – "),
            guest: g,
          }))
        );
      } catch { setOptions([]); }
    }, 300);
  }, []);

  const handleSelect = (_value: string, option: GuestOption) => {
    const g = option.guest;
    setSelectedGuest(g);
    form.setFieldsValue({
      guestId: g.id,
      customerName: `${g.firstName} ${g.lastName}`,
      phone: g.phone ?? "",
      idNumber: g.idNumber ?? "",
    });
  };

  const handleClear = () => {
    setSelectedGuest(null);
    form.setFieldsValue({ guestId: undefined, phone: "", idNumber: "" });
    setOptions([]);
  };

  const isGuestLocked = !!selectedGuest && !disabled;

  return (
    <>
      <Form.Item name="guestId" hidden><Input /></Form.Item>

      {/* Row 1: Customer Name (wide) | Phone | CCCD */}
      <Row gutter={[8, 0]}>
        <Col span={10}>
          <Form.Item
            name="customerName"
            label={t("customerName")}
            style={ITEM_STYLE}
            rules={[{ required: true, message: "Required" }]}
          >
            <AutoComplete
              options={options}
              onSearch={handleSearch}
              onSelect={handleSelect}
              placeholder={t("searchGuest")}
              disabled={disabled}
            />
          </Form.Item>
          {isGuestLocked && (
            <div style={{ marginTop: -6, marginBottom: 6 }}>
              <Button type="link" size="small" onClick={handleClear} style={{ padding: 0, height: "auto", fontSize: 11 }}>
                {t("clearGuest")}
              </Button>
            </div>
          )}
        </Col>
        <Col span={7}>
          <Form.Item
            name="phone"
            label={t("phone")}
            style={ITEM_STYLE}
            rules={disabled ? [] : [{ required: true, message: "Phone number is required" }]}
          >
            <Input disabled={disabled || isGuestLocked} />
          </Form.Item>
        </Col>
        <Col span={7}>
          <Form.Item
            name="idNumber"
            label={t("idNumber")}
            style={ITEM_STYLE}
          >
            <Input disabled={disabled || isGuestLocked} />
          </Form.Item>
        </Col>
      </Row>

      {/* Row 2: Source | Charge Type */}
      <Row gutter={[8, 0]}>
        <Col span={14}>
          <Form.Item name="source" label={t("source")} style={ITEM_STYLE}>
            <Input disabled={disabled} />
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item name="chargeType" label={t("chargeType")} style={ITEM_STYLE}>
            <Select
              options={CHARGE_TYPE_OPTIONS}
              disabled={disabled}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Row 3: Check-in | Check-out */}
      <Row gutter={[8, 0]}>
        <Col span={12}>
          <Form.Item
            name="checkInDate"
            label={t("checkInTime")}
            style={ITEM_STYLE}
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              disabled={disabled}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="checkOutDate"
            label={t("checkOutTime")}
            style={ITEM_STYLE}
            dependencies={["chargeType", "checkInDate"]}
            rules={[
              { required: true, message: "Required" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const chargeType = getFieldValue("chargeType");
                  const checkIn    = getFieldValue("checkInDate");
                  if (!value || !checkIn) return Promise.resolve();

                  if (chargeType === "daily") {
                    const sameDay = value.isSame(checkIn, "day");
                    if (!sameDay) return Promise.reject(new Error(t("validation.dailySameDayRequired")));
                  } else if (chargeType === "nightly") {
                    if (!value.isAfter(checkIn, "day")) return Promise.reject(new Error(t("validation.nightlyOvernightRequired")));
                  } else {
                    // hourly — no date-range constraint
                    if (!value.isAfter(checkIn)) return Promise.reject(new Error("Check-out must be after check-in"));
                  }

                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              disabled={coDisabled}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
