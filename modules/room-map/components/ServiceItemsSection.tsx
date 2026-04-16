"use client";

import { Form, InputNumber, Select, Button, Space, Input } from "antd";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import type { ServiceItem } from "@/types/master.types";

// Grid: Service (auto) | Qty (58px) | Unit Price (96px) | Total (96px) | Delete (28px)
const GRID = "1fr 58px 96px 96px 28px";
const GRID_NO_DELETE = "1fr 58px 96px 96px";

interface ServiceItemsSectionProps {
  serviceItems: ServiceItem[];
  serviceTotal: number;
  stayPrice: number;
  stayPriceLabel: string;
  chargeType: "nightly" | "daily" | "hourly";
  baseRate: number;
  hourlyRatePerHour: number;
  nightsStayed?: number;
  daysStayed?: number;
  totalPayable: number;
  remaining: number;
  discount: number;
  surcharge: number;
  prepaid: number;
  hoursStayed?: number;
  disabled?: boolean;
  prepaidDisabled?: boolean;
}

export default function ServiceItemsSection({
  serviceItems,
  serviceTotal,
  stayPrice,
  stayPriceLabel,
  chargeType,
  baseRate,
  hourlyRatePerHour,
  nightsStayed,
  daysStayed,
  totalPayable,
  remaining,
  hoursStayed,
  disabled,
  prepaidDisabled,
}: ServiceItemsSectionProps) {
  const t = useTranslations("roomMap");

  const serviceOptions = serviceItems
    .filter((s) => s.isActive)
    .map((s) => ({ value: s.id, label: `${s.name}${s.unit ? ` (${s.unit})` : ""}` }));

  const colHeader: React.CSSProperties = {
    fontSize: 11,
    color: "#8c8c8c",
    fontWeight: 600,
    paddingBottom: 3,
  };

  return (
    <>
      {/* Always-registered hidden fields — keeps values in form store for API submission
          and ensures validateFields() / getFieldsValue() include them regardless of
          which chargeType block is currently rendered. */}
      <Form.Item name="baseRate"          hidden noStyle><InputNumber /></Form.Item>
      <Form.Item name="hourlyRatePerHour" hidden noStyle><InputNumber /></Form.Item>
      <Form.Item name="hourlyBlockHours"  hidden noStyle><InputNumber /></Form.Item>

      {/* Pricing display — read-only for all charge types; edit via master data */}
      <div
        style={{
          background: "#fafafa",
          border: "1px solid #f0f0f0",
          borderRadius: 4,
          padding: "6px 12px",
          marginBottom: 8,
          display: "flex",
          // flexDirection: "column",
          gap: 24,
        }}
      >
        {chargeType === "nightly" && (
          <>
            <PriceRow label={t("ratePerNight")} amount={baseRate} />
            {(nightsStayed ?? 0) > 0 && (
              <PriceRow
                label={t("nightsStayed")}
                text={`${nightsStayed} ${t("nightsSuffix")}`}
                divided
              />
            )}
          </>
        )}
        {chargeType === "daily" && (
          <>
            <PriceRow label={t("dailyRate")} amount={baseRate} />
            {(daysStayed ?? 0) > 0 && (
              <PriceRow
                label={t("daysStayed")}
                text={`${daysStayed} ${t("dayUseSuffix")}`}
                divided
              />
            )}
          </>
        )}
        {chargeType === "hourly" && (
          <>
            <PriceRow label={t("blockPrice")} amount={baseRate} />
            <PriceRow label={t("ratePerHour")} amount={hourlyRatePerHour} divided />
            {(hoursStayed ?? 0) > 0 && (
              <PriceRow
                label={t("hoursStayed")}
                text={`${hoursStayed!.toFixed(1)} ${t("hrsSuffix")}`}
                divided
              />
            )}
          </>
        )}
      </div>

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: disabled ? GRID_NO_DELETE : GRID,
          gap: "0 6px",
          borderBottom: "1px solid #f0f0f0",
          marginBottom: 4,
        }}
      >
        <span style={colHeader}>{t("service")}</span>
        <span style={{ ...colHeader, textAlign: "center" }}>{t("quantity")}</span>
        <span style={{ ...colHeader, textAlign: "right" }}>{t("unitPrice")}</span>
        <span style={{ ...colHeader, textAlign: "right" }}>{t("lineTotal")}</span>
        {!disabled && <span />}
      </div>

      {/* Service rows */}
      <Form.List name="services">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name }) => (
              <ServiceRow
                key={key}
                name={name}
                serviceItems={serviceItems}
                serviceOptions={serviceOptions}
                disabled={disabled}
                onRemove={() => remove(name)}
              />
            ))}
            {!disabled && (
              <Button
                type="link"
                size="small"
                icon={<IconPlus size={12} />}
                onClick={() => add({ serviceItemId: undefined, quantity: 1 })}
                style={{ padding: "2px 0", height: "auto", fontSize: 12, marginTop: 2 }}
              >
                {t("addService")}
              </Button>
            )}
          </>
        )}
      </Form.List>

      {/* Summary block */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 24px",
          borderTop: "1px solid #f0f0f0",
          marginTop: 8,
          paddingTop: 8,
        }}
      >
        {/* Left: stay price + service total + surcharge + discount */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <SummaryLine label={stayPriceLabel}>
            <PriceDisplay amount={stayPrice} />
          </SummaryLine>
          <SummaryLine label={t("serviceTotal")}>
            <PriceDisplay amount={serviceTotal} />
          </SummaryLine>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#595959", whiteSpace: "nowrap" }}>{t("surcharge")}</span>
            <Space.Compact size="small">
              <Form.Item name="surcharge" noStyle>
                <InputNumber min={0} style={{ width: 90 }} disabled={disabled} />
              </Form.Item>
              <Input value="₫" readOnly style={{ width: 32, textAlign: "center", color: "#8c8c8c", cursor: "default" }} />
            </Space.Compact>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#595959", whiteSpace: "nowrap" }}>{t("discount")}</span>
            <Space.Compact size="small">
              <Form.Item name="discount" noStyle>
                <InputNumber min={0} style={{ width: 90 }} disabled={disabled} />
              </Form.Item>
              <Input value="₫" readOnly style={{ width: 32, textAlign: "center", color: "#8c8c8c", cursor: "default" }} />
            </Space.Compact>
          </div>
        </div>

        {/* Right: total payable + prepaid + remaining */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <SummaryLine label={t("totalPayable")} strong>
            <PriceDisplay amount={totalPayable} />
          </SummaryLine>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#595959", whiteSpace: "nowrap" }}>{t("prepaid")}</span>
            <Space.Compact size="small">
              <Form.Item name="prepaid" noStyle>
                <InputNumber min={0} style={{ width: 90 }} disabled={disabled || prepaidDisabled} />
              </Form.Item>
              <Input value="₫" readOnly style={{ width: 32, textAlign: "center", color: "#8c8c8c", cursor: "default" }} />
            </Space.Compact>
          </div>
          <SummaryLine label={t("remaining")} warn={remaining > 0}>
            <PriceDisplay amount={remaining} />
          </SummaryLine>
        </div>
      </div>
    </>
  );
}

/** Unified read-only pricing row used for all charge types. */
function PriceRow({
  label,
  amount,
  text,
  divided,
}: {
  label: string;
  amount?: number;
  text?: string;
  divided?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        // justifyContent: "space-between",
        // alignItems: "center",
        // fontSize: 12,
        // paddingTop: divided ? 4 : 0,
        // borderTop: divided ? "1px solid #f0f0f0" : undefined,
      }}
    >
      <span style={{ color: "#8c8c8c" }}>{label}</span>
      {text !== undefined
        ? <span style={{ color: "#262626", fontWeight: 500 }}>{text}</span>
        : <PriceDisplay amount={amount ?? 0} />
      }
    </div>
  );
}

function SummaryLine({
  label,
  children,
  strong,
  warn,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
        fontWeight: strong ? 700 : undefined,
        color: warn ? "#f5222d" : "#262626",
      }}
    >
      <span style={{ color: strong ? "#262626" : "#595959" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function ServiceRow({
  name,
  serviceItems,
  serviceOptions,
  disabled,
  onRemove,
}: {
  name: number;
  serviceItems: ServiceItem[];
  serviceOptions: { value: string; label: string }[];
  disabled?: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: disabled ? GRID_NO_DELETE : GRID,
        gap: "0 6px",
        alignItems: "center",
        marginBottom: 4,
      }}
    >
      {/* Preserves the DB row ID for existing services — required by the full-sync PUT */}
      <Form.Item name={[name, "id"]} hidden noStyle><Input /></Form.Item>

      <Form.Item name={[name, "serviceItemId"]} noStyle>
        <Select
          size="small"
          options={serviceOptions}
          style={{ width: "100%" }}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item name={[name, "quantity"]} noStyle initialValue={1}>
        <InputNumber size="small" min={1} style={{ width: "100%" }} disabled={disabled} />
      </Form.Item>

      {/* Unit price — read-only from master data */}
      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue }) => {
          const id = getFieldValue(["services", name, "serviceItemId"]);
          const item = serviceItems.find((s) => s.id === id);
          return (
            <div style={{ textAlign: "right", fontSize: 12 }}>
              <PriceDisplay amount={item?.unitPrice ?? null} />
            </div>
          );
        }}
      </Form.Item>

      {/* Line total */}
      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue }) => {
          const id = getFieldValue(["services", name, "serviceItemId"]);
          const qty = getFieldValue(["services", name, "quantity"]) ?? 1;
          const item = serviceItems.find((s) => s.id === id);
          const lineTotal = item ? item.unitPrice * qty : null;
          return (
            <div style={{ textAlign: "right", fontSize: 12 }}>
              <PriceDisplay amount={lineTotal} />
            </div>
          );
        }}
      </Form.Item>

      {!disabled && (
        <Button
          type="text"
          danger
          size="small"
          icon={<IconTrash size={13} />}
          onClick={onRemove}
          style={{ padding: 0 }}
        />
      )}
    </div>
  );
}
