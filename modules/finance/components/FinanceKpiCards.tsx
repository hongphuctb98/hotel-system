"use client";

import { Card, Statistic, theme, Skeleton } from "antd";
import { useTranslations } from "next-intl";
import PriceDisplay from "@/common/components/ui/PriceDisplay";

interface FinanceKpiCardsProps {
  revenue: number;
  totalService: number;
  totalInventory: number;
  netProfit: number;
  isLoading: boolean;
}

export default function FinanceKpiCards({
  revenue,
  totalService,
  totalInventory,
  netProfit,
  isLoading,
}: FinanceKpiCardsProps) {
  const t = useTranslations("finance");
  const { token } = theme.useToken();

  const cards = [
    { title: t("grossRevenue"), value: revenue, color: token.colorSuccess },
    { title: t("serviceExpenses"), value: totalService, color: token.colorPrimary },
    { title: t("goodsPurchased"), value: totalInventory, color: token.colorWarning },
    { title: t("netProfit"), value: netProfit, color: netProfit < 0 ? token.colorError : token.colorSuccess },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.title} variant="outlined">
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={card.title}
              value=" "
              formatter={() => <PriceDisplay amount={card.value} isFallback={false} />}
              styles={{ content: { color: card.color } }}
            />
          )}
        </Card>
      ))}
    </div>
  );
}
