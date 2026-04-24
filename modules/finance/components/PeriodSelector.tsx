"use client";

import { Button, DatePicker } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

export type PeriodValue = { startMonth: string; endMonth: string };

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const t = useTranslations("finance");
  const currentMonth = dayjs().format("YYYY-MM");

  const rangeValue: [Dayjs, Dayjs] = [
    dayjs(value.startMonth, "YYYY-MM"),
    dayjs(value.endMonth, "YYYY-MM"),
  ];

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onChange({ startMonth: currentMonth, endMonth: currentMonth })}
        type={value.startMonth === currentMonth && value.endMonth === currentMonth ? "primary" : "default"}
      >
        {t("thisMonth")}
      </Button>
      <RangePicker
        picker="month"
        format="MM/YYYY"
        value={rangeValue}
        onChange={(v) => {
          if (v?.[0] && v?.[1]) {
            onChange({
              startMonth: v[0].format("YYYY-MM"),
              endMonth: v[1].format("YYYY-MM"),
            });
          }
        }}
        allowClear={false}
      />
    </div>
  );
}
