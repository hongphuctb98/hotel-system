"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Button, Tag, Skeleton, Row, Col } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { useRecurringExpenseItems } from "../hooks/useRecurringExpenseItems";
import { expenseDocumentService } from "@/common/services/expenseDocumentService";
import type { DrawerPreset } from "./ExpenseDocumentDrawer";

interface RecurringBillsPanelProps {
  onQuickRecord: (preset: DrawerPreset) => void;
}

export default function RecurringBillsPanel({
  onQuickRecord,
}: RecurringBillsPanelProps) {
  const t = useTranslations("expenses.recurringBills");
  const currentMonth = dayjs().format("YYYY-MM");

  const { data: itemsData, isLoading: itemsLoading } =
    useRecurringExpenseItems();
  const { data: recordedData } = useQuery({
    queryKey: ["expenseRecordedItems", currentMonth],
    queryFn: () => expenseDocumentService.getRecordedItemIds(currentMonth),
    staleTime: 30_000,
  });

  const items = itemsData?.data ?? [];
  const recordedItemIds = new Set(recordedData?.data ?? []);

  if (!itemsLoading && items.length === 0) return null;

  return (
    <Row>
      <Col xs={24} md={12} lg={10}>
        <Card
          title={t("title")}
          variant="outlined"
          className="mb-4"
          styles={{ body: { padding: "12px 16px" } }}
        >
          {itemsLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-1 border-b last:border-b-0"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-xs text-gray-400">
                      {item.defaultVendor ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {item.defaultAmount != null ? (
                      <PriceDisplay
                        amount={item.defaultAmount}
                        isFallback={false}
                      />
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                    {recordedItemIds.has(item.id) ? (
                      <Tag color="green">{t("recorded")}</Tag>
                    ) : (
                      <Tag color="orange">{t("notRecorded")}</Tag>
                    )}
                    <Button
                      size="small"
                      type="default"
                      onClick={() =>
                        onQuickRecord({
                          type: "SERVICE",
                          accountingMonth: currentMonth,
                          vendorName: item.defaultVendor ?? undefined,
                          paymentMethodId:
                            item.defaultPaymentMethodId ?? undefined,
                          serviceLines: [
                            {
                              expenseItemId: item.id,
                              amount: item.defaultAmount ?? 0,
                            },
                          ],
                        })
                      }
                    >
                      {t("quickRecord")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
}
