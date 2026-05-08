"use client";

import { useState } from "react";
import { Button, Modal, Table, App, Flex, Statistic, Typography } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import TenantBillTable from "@/modules/long-term/components/TenantBillTable";
import TenantBillDetailDrawer from "@/modules/long-term/components/TenantBillDetailDrawer";
import { useGenerateBills } from "@/modules/long-term/hooks/useTenantBills";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";

interface SkipEntry {
  leaseId: string;
  guestName: string;
  roomNumber: string;
  reason: string;
}

interface GenerateResult {
  created: number;
  regenerated: number;
  skipped: SkipEntry[];
  failed: SkipEntry[];
}

export default function BillsPage() {
  const t = useTranslations();
  const { message, modal } = App.useApp();
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);
  const canApprove = hasPermission(PERMISSIONS.LONG_TERM_BILL_APPROVE);
  const [detailBillId, setDetailBillId] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<GenerateResult | null>(null);
  const generateBills = useGenerateBills();

  function getSkipReasonLabel(reason: string): string {
    const key = `longTerm.bill.skipReason${reason}` as Parameters<typeof t>[0];
    return t(key);
  }

  function handleGenerate() {
    const now = dayjs();
    modal.confirm({
      title: t("longTerm.bill.generateAction"),
      content: t("longTerm.bill.generateRegenerationWarning"),
      okText: t("longTerm.bill.generateAction"),
      onOk: async () => {
        try {
          const res = await generateBills.mutateAsync({ month: now.month() + 1, year: now.year() });
          const result = res.data as GenerateResult;
          setResultModal(result);
        } catch (err: unknown) {
          message.error(getLongTermApiErrorMessage(err, t));
        }
      },
    });
  }

  const skipColumns = [
    { dataIndex: "guestName", title: t("longTerm.lease.tenant") },
    { dataIndex: "roomNumber", title: t("longTerm.lease.room") },
    {
      dataIndex: "reason",
      title: t("longTerm.bill.generateResultSkipped"),
      render: (v: string) => getSkipReasonLabel(v),
    },
  ];

  const failedColumns = [
    { dataIndex: "guestName", title: t("longTerm.lease.tenant") },
    { dataIndex: "roomNumber", title: t("longTerm.lease.room") },
    {
      dataIndex: "reason",
      title: t("longTerm.bill.generateResultFailed"),
      render: (v: string) => getSkipReasonLabel(v),
    },
  ];

  return (
    <div>
      <AppPageHeader
        translateTitle={false}
        title={t("longTerm.bill.title")}
        extra={
          canApprove && (
            <Button type="primary" loading={generateBills.isPending} onClick={handleGenerate}>
              {t("longTerm.bill.generateAction")}
            </Button>
          )
        }
      />
      <TenantBillTable onViewDetail={(bill) => setDetailBillId(bill.id as string)} />
      <TenantBillDetailDrawer
        open={!!detailBillId}
        onClose={() => setDetailBillId(null)}
        billId={detailBillId}
      />
      <Modal
        open={!!resultModal}
        title={t("longTerm.bill.generateResult")}
        onCancel={() => setResultModal(null)}
        footer={<Button onClick={() => setResultModal(null)}>OK</Button>}
        width={600}
      >
        {resultModal && (
          <div className="space-y-4">
            <Flex gap={24}>
              <Statistic title={t("longTerm.bill.generateResultCreated")} value={resultModal.created} styles={{ content: { color: "#52c41a" } }} />
              <Statistic title={t("longTerm.bill.generateResultRegenerated")} value={resultModal.regenerated} styles={{ content: { color: "#1677ff" } }} />
              <Statistic title={t("longTerm.bill.generateResultSkipped")} value={resultModal.skipped.length} />
              <Statistic title={t("longTerm.bill.generateResultFailed")} value={resultModal.failed.length} styles={resultModal.failed.length > 0 ? { content: { color: "#ff4d4f" } } : undefined} />
            </Flex>

            {resultModal.skipped.length > 0 && (
              <div>
                <Typography.Text strong>{t("longTerm.bill.generateResultSkipped")}</Typography.Text>
                <Table
                  size="small"
                  rowKey="leaseId"
                  dataSource={resultModal.skipped}
                  columns={skipColumns}
                  pagination={false}
                  style={{ marginTop: 8 }}
                />
              </div>
            )}

            {resultModal.failed.length > 0 && (
              <div>
                <Typography.Text strong type="danger">{t("longTerm.bill.generateResultFailed")}</Typography.Text>
                <Table
                  size="small"
                  rowKey="leaseId"
                  dataSource={resultModal.failed}
                  columns={failedColumns}
                  pagination={false}
                  style={{ marginTop: 8 }}
                />
              </div>
            )}

            {resultModal.skipped.length === 0 && resultModal.failed.length === 0 && (
              <Typography.Text type="secondary">{t("longTerm.bill.generateResultNoIssues")}</Typography.Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
