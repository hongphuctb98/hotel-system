"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Divider, Form, Input, Select, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useHotelSettings } from "@/common/hooks/useHotelSettings";
import { apiClient } from "@/common/services/apiClient";

const { Text } = Typography;

const TIMEZONE_OPTIONS = [
  { label: "UTC+0 — UTC",                       value: "UTC" },
  { label: "UTC+1 — Europe/London",              value: "Europe/London" },
  { label: "UTC+1 — Africa/Lagos",               value: "Africa/Lagos" },
  { label: "UTC+2 — Europe/Paris",               value: "Europe/Paris" },
  { label: "UTC+2 — Europe/Athens",              value: "Europe/Athens" },
  { label: "UTC+2 — Africa/Cairo",               value: "Africa/Cairo" },
  { label: "UTC+3 — Europe/Moscow",              value: "Europe/Moscow" },
  { label: "UTC+3 — Asia/Riyadh",                value: "Asia/Riyadh" },
  { label: "UTC+3:30 — Asia/Tehran",             value: "Asia/Tehran" },
  { label: "UTC+4 — Asia/Dubai",                 value: "Asia/Dubai" },
  { label: "UTC+4:30 — Asia/Kabul",              value: "Asia/Kabul" },
  { label: "UTC+5 — Asia/Karachi",               value: "Asia/Karachi" },
  { label: "UTC+5:30 — Asia/Kolkata",            value: "Asia/Kolkata" },
  { label: "UTC+5:45 — Asia/Kathmandu",          value: "Asia/Kathmandu" },
  { label: "UTC+6 — Asia/Dhaka",                 value: "Asia/Dhaka" },
  { label: "UTC+6:30 — Asia/Rangoon",            value: "Asia/Rangoon" },
  { label: "UTC+7 — Asia/Bangkok",               value: "Asia/Bangkok" },
  { label: "UTC+7 — Asia/Ho_Chi_Minh",           value: "Asia/Ho_Chi_Minh" },
  { label: "UTC+7 — Asia/Jakarta",               value: "Asia/Jakarta" },
  { label: "UTC+8 — Asia/Shanghai",              value: "Asia/Shanghai" },
  { label: "UTC+8 — Asia/Singapore",             value: "Asia/Singapore" },
  { label: "UTC+8 — Asia/Manila",                value: "Asia/Manila" },
  { label: "UTC+8 — Australia/Perth",            value: "Australia/Perth" },
  { label: "UTC+9 — Asia/Tokyo",                 value: "Asia/Tokyo" },
  { label: "UTC+9 — Asia/Seoul",                 value: "Asia/Seoul" },
  { label: "UTC+9:30 — Australia/Darwin",        value: "Australia/Darwin" },
  { label: "UTC+10 — Australia/Sydney",          value: "Australia/Sydney" },
  { label: "UTC+10 — Pacific/Port_Moresby",      value: "Pacific/Port_Moresby" },
  { label: "UTC+11 — Pacific/Noumea",            value: "Pacific/Noumea" },
  { label: "UTC+12 — Pacific/Auckland",          value: "Pacific/Auckland" },
  { label: "UTC-3 — America/Sao_Paulo",          value: "America/Sao_Paulo" },
  { label: "UTC-4 — America/New_York (EDT)",     value: "America/New_York" },
  { label: "UTC-5 — America/Chicago",            value: "America/Chicago" },
  { label: "UTC-7 — America/Denver",             value: "America/Denver" },
  { label: "UTC-8 — America/Los_Angeles",        value: "America/Los_Angeles" },
  { label: "UTC-9 — America/Anchorage",          value: "America/Anchorage" },
  { label: "UTC-10 — Pacific/Honolulu",          value: "Pacific/Honolulu" },
].filter((opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx);


interface FormValues {
  hotelName: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
}

export default function SettingsForm() {
  const t = useTranslations("settings");
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const { data: settings } = useHotelSettings();

  useEffect(() => {
    if (!settings) return;
    form.setFieldsValue({
      hotelName: settings.hotelName ?? "",
      address:   settings.address   ?? "",
      phone:     settings.phone     ?? "",
      email:     settings.email     ?? "",
      timezone:  settings.timezone,
    });
  }, [settings, form]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      await apiClient.put("/api/settings", {
        timezone:  values.timezone,
        hotelName: values.hotelName || null,
        address:   values.address   || null,
        phone:     values.phone     || null,
        email:     values.email     || null,
      });
      queryClient.invalidateQueries({ queryKey: ["hotel-settings"] });
      message.success(t("saveSuccess"));
    } catch (e) {
      if (e instanceof Error) {
        message.error(t("saveError"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined">
      <Form form={form} layout="vertical">
        {/* Hotel Information */}
        <div className="mb-1">
          <Text strong className="text-base">{t("hotelInfo")}</Text>
          <div>
            <Text type="secondary" className="text-sm">{t("hotelInfoHelp")}</Text>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-4">
          <Form.Item name="hotelName" label={t("hotelName")}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t("phone")}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t("email")}>
            <Input />
          </Form.Item>
        </div>
        <Form.Item name="address" label={t("address")}>
          <Input.TextArea rows={2} style={{ maxWidth: 840 }} />
        </Form.Item>

        <Divider />

        {/* Timezone */}
        <Form.Item
          name="timezone"
          label={<Text strong>{t("timezone")}</Text>}
          extra={<Text type="secondary">{t("timezoneHelp")}</Text>}
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            options={TIMEZONE_OPTIONS}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            style={{ maxWidth: 400 }}
          />
        </Form.Item>

        <Button type="primary" loading={saving} onClick={handleSave}>
          {t("save")}
        </Button>
      </Form>
    </Card>
  );
}
