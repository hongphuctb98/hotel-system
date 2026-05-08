"use client";

import { Form, Button, App, Switch } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import TextField from "@/common/components/form/TextField";
import SelectField from "@/common/components/form/SelectField";
import CurrencyField from "@/common/components/form/CurrencyField";
import { useMasterData } from "@/common/hooks/useMasterData";
import { apiClient, ApiError } from "@/common/services/apiClient";
import { invalidateMasterDataQueries } from "../utils/queryKeys";
import type { ExpenseItem } from "@/types/master.types";

interface ExpenseItemFormProps {
  initialValues?: ExpenseItem | null;
  onSuccess: () => void;
  endpoint: string;
}

export default function ExpenseItemForm({ initialValues, onSuccess, endpoint }: ExpenseItemFormProps) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { expenseCategories, paymentMethods } = useMasterData();
  const [isRecurring, setIsRecurring] = useState(initialValues?.isRecurring ?? false);

  const categoryOptions = expenseCategories.map((c) => ({ value: c.id, label: c.name }));
  const paymentMethodOptions = paymentMethods.map((pm) => ({ value: pm.id, label: pm.name }));

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      name: values.name,
      categoryId: values.categoryId,
      description: values.description || null,
      isRecurring: values.isRecurring ?? false,
      defaultVendor: (values.isRecurring && values.defaultVendor) ? values.defaultVendor : null,
      defaultAmount: (values.isRecurring && values.defaultAmount != null) ? values.defaultAmount : null,
      defaultPaymentMethodId: (values.isRecurring && values.defaultPaymentMethodId) ? values.defaultPaymentMethodId : null,
    };
    try {
      if (initialValues?.id) {
        await apiClient.put(`${endpoint}/${initialValues.id}`, payload);
      } else {
        await apiClient.post(endpoint, payload);
      }
      await invalidateMasterDataQueries(queryClient, endpoint);
      message.success(t("common.saveSuccess"));
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXPENSE_ITEM_INACTIVE_EXISTS") {
        const data = err.data as { id: string };
        modal.confirm({
          title: t("expenseItems.reactivateTitle"),
          content: t("expenseItems.reactivateContent"),
          onOk: async () => {
            await apiClient.put(`${endpoint}/${data.id}`, { isActive: true });
            await invalidateMasterDataQueries(queryClient, endpoint);
            message.success(t("common.saveSuccess"));
            onSuccess();
          },
        });
      } else if (err instanceof ApiError && err.code === "EXPENSE_ITEM_NAME_TAKEN") {
        form.setFields([{ name: "name", errors: [t("expenseItems.nameTaken")] }]);
      } else {
        message.error(err instanceof ApiError ? err.message : t("common.error"));
      }
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues ?? { isRecurring: false }}
      onFinish={handleSubmit}
    >
      <SelectField
        name="categoryId"
        label="expenseItems.category"
        options={categoryOptions}
        placeholder={t("expenseItems.categoryPlaceholder")}
        translateLabel={false}
        rules={[{ required: true }]}
      />
      <TextField
        name="name"
        label="expenseItems.name"
        rules={[{ required: true }]}
        placeholder={t("expenseItems.namePlaceholder")}
      />
      <TextField
        name="description"
        label="expenseItems.description"
        placeholder={t("expenseItems.descriptionPlaceholder")}
      />
      <Form.Item name="isRecurring" label={t("expenseItems.isRecurring")} valuePropName="checked">
        <Switch onChange={setIsRecurring} />
      </Form.Item>
      {isRecurring && (
        <>
          <TextField
            name="defaultVendor"
            label="expenseItems.defaultVendor"
            placeholder={t("expenseItems.defaultVendorPlaceholder")}
          />
          <CurrencyField
            name="defaultAmount"
            label="expenseItems.defaultAmount"
            translateLabel={false}
          />
          <SelectField
            name="defaultPaymentMethodId"
            label="expenseItems.defaultPaymentMethod"
            options={paymentMethodOptions}
            placeholder={t("expenseItems.defaultPaymentMethodPlaceholder")}
            translateLabel={false}
            allowClear
          />
        </>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onSuccess}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit">
          {t("common.save")}
        </Button>
      </div>
    </Form>
  );
}
