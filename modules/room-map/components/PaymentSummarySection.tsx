"use client";

import { Form, Select, Row, Col } from "antd";
import { useTranslations } from "next-intl";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import type { PaymentMethod } from "@/types/master.types";

interface PaymentSummarySectionProps {
  paymentMethods: PaymentMethod[];
  totalPayable: number;
  prepaid: number;
  remaining: number;
}

export default function PaymentSummarySection({
  paymentMethods,
  totalPayable,
  prepaid,
  remaining,
}: PaymentSummarySectionProps) {
  const t = useTranslations("roomMap");

  const methodOptions = paymentMethods
    .filter((m) => m.isActive)
    .map((m) => ({ value: m.id, label: m.name }));

  return (
    <Row gutter={[12, 0]} align="middle">
      {/* Payment method selector */}
      <Col span={14}>
        <Form.Item name="paymentMethodId" label={t("paymentMethod")} style={{ marginBottom: 0 }}>
          <Select
            size="small"
            options={methodOptions}
            allowClear
            placeholder="—"
          />
        </Form.Item>
      </Col>

      {/* Calculated totals — read-only */}
      <Col span={10}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 2 }}>
          <TotalLine label={t("totalPayable")} strong>
            <PriceDisplay amount={totalPayable} />
          </TotalLine>
          <TotalLine label={t("prepaid")}>
            <PriceDisplay amount={prepaid} />
          </TotalLine>
          <TotalLine label={t("remaining")} warn={remaining > 0}>
            <PriceDisplay amount={remaining} />
          </TotalLine>
        </div>
      </Col>
    </Row>
  );
}

function TotalLine({
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
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        fontSize:       12,
        fontWeight:     strong ? 700 : undefined,
        color:          warn ? "#f5222d" : "#262626",
      }}
    >
      <span style={{ color: strong ? "#262626" : "#595959" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
