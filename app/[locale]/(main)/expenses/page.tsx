"use client";

import { useState } from "react";
import { Button, Result } from "antd";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";
import RecurringBillsPanel from "@/modules/expenses/components/RecurringBillsPanel";
import ExpenseDocumentFilters from "@/modules/expenses/components/ExpenseDocumentFilters";
import ExpenseDocumentTable from "@/modules/expenses/components/ExpenseDocumentTable";
import ExpenseDocumentDrawer from "@/modules/expenses/components/ExpenseDocumentDrawer";
import StockConflictModal from "@/modules/expenses/components/StockConflictModal";
import { useExpenseDocument } from "@/modules/expenses/hooks/useExpenseDocument";
import type { ExpenseFiltersState } from "@/modules/expenses/components/ExpenseDocumentFilters";
import type { DrawerPreset } from "@/modules/expenses/components/ExpenseDocumentDrawer";
import type { ConflictProduct } from "@/modules/expenses/components/StockConflictModal";
import type { ExpenseDocumentListItem } from "@/common/services/expenseDocumentService";

export default function ExpensesPage() {
  const t = useTranslations("expenses");
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);

  const [filters, setFilters] = useState<ExpenseFiltersState>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [preset, setPreset] = useState<DrawerPreset | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictProducts, setConflictProducts] = useState<ConflictProduct[]>([]);

  const { data: editDocData, isLoading: isEditLoading } = useExpenseDocument(editId);
  const editRecord = editDocData?.data ?? null;

  if (!hasPermission(PERMISSIONS.EXPENSES_VIEW)) {
    return <Result status="403" title="403" subTitle="You do not have permission to access this page." />;
  }

  const canCreate = hasPermission(PERMISSIONS.EXPENSES_CREATE);

  const openCreate = (p?: DrawerPreset) => {
    setEditId(null);
    setPreset(p ?? null);
    setDrawerOpen(true);
  };

  const openEdit = (doc: ExpenseDocumentListItem) => {
    if (!hasPermission(PERMISSIONS.EXPENSES_EDIT)) return;
    setPreset(null);
    setEditId(doc.id);
    setDrawerOpen(true);
  };

  const openDuplicate = (doc: ExpenseDocumentListItem) => {
    if (!canCreate) return;
    setEditId(null);
    setPreset({
      type: doc.type,
      accountingMonth: dayjs().format("YYYY-MM"),
      vendorName: doc.vendorName ?? undefined,
    });
    setDrawerOpen(true);
  };

  const handleStockConflict = (products: ConflictProduct[]) => {
    setConflictProducts(products);
    setConflictOpen(true);
  };

  const handleCreateAdjustment = (products: ConflictProduct[]) => {
    setConflictOpen(false);
    openCreate({
      type: "INVENTORY_ADJUSTMENT",
      inventoryLines: products.map((p) => ({
        productId: p.productId,
        quantity: -p.shortfall,
        unitPrice: 0,
      })),
    });
  };

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="expenses.title"
        extra={
          canCreate ? (
            <Button type="primary" icon={<IconPlus size={16} />} onClick={() => openCreate()}>
              {t("newExpense")}
            </Button>
          ) : null
        }
      />

      {canCreate && <RecurringBillsPanel onQuickRecord={openCreate} />}

      <ExpenseDocumentFilters filters={filters} onChange={setFilters} />

      <ExpenseDocumentTable
        filters={filters}
        onEdit={openEdit}
        onDuplicate={openDuplicate}
      />

      <ExpenseDocumentDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditId(null); setPreset(null); }}
        editRecord={editRecord}
        isEditLoading={!!editId && isEditLoading}
        preset={!editRecord ? preset : null}
        onStockConflict={handleStockConflict}
      />

      <StockConflictModal
        open={conflictOpen}
        products={conflictProducts}
        onClose={() => setConflictOpen(false)}
        onCreateAdjustment={handleCreateAdjustment}
      />
    </div>
  );
}
