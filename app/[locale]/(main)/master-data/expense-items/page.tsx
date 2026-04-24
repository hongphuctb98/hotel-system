"use client";

import { Tag, Divider } from "antd";
import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import ExpenseCategoryForm from "@/modules/master-data/forms/ExpenseCategoryForm";
import ExpenseItemForm from "@/modules/master-data/forms/ExpenseItemForm";
import type { MasterDataConfig, ExpenseCategory, ExpenseItem } from "@/types/master.types";

const categoryConfig: MasterDataConfig<ExpenseCategory> = {
  endpoint: "/api/master/expense-categories",
  titleKey: "expenseCategories.title",
  columns: [
    { key: "name", dataIndex: "name", title: "Name", sorter: (a: ExpenseCategory, b: ExpenseCategory) => a.name.localeCompare(b.name) },
    {
      key: "description",
      dataIndex: "description",
      title: "Description",
      render: (v: string | null) => v ?? "—",
    },
  ],
  FormComponent: ExpenseCategoryForm,
};

const itemConfig: MasterDataConfig<ExpenseItem> = {
  endpoint: "/api/master/expense-items",
  titleKey: "expenseItems.title",
  columns: [
    { key: "name", dataIndex: "name", title: "Name", sorter: (a: ExpenseItem, b: ExpenseItem) => a.name.localeCompare(b.name) },
    {
      key: "category",
      title: "Category",
      width: 160,
      sorter: (a: ExpenseItem, b: ExpenseItem) => (a.category?.name ?? "").localeCompare(b.category?.name ?? ""),
      render: (_: unknown, record: ExpenseItem) => record.category?.name ?? "—",
    },
    {
      key: "isRecurring",
      title: "Recurring",
      dataIndex: "isRecurring",
      width: 100,
      render: (val: boolean) => val ? <Tag color="purple">Recurring</Tag> : null,
    },
  ],
  FormComponent: ExpenseItemForm,
};

export default function ExpenseItemsPage() {
  return (
    <div>
      <div>
        <MasterDataTable config={categoryConfig} />
      </div>
      <Divider />
      <div>
        <MasterDataTable config={itemConfig} />
      </div>
    </div>
  );
}
