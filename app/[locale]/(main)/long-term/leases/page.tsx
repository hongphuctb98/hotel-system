"use client";

import { useState } from "react";
import { Button, App } from "antd";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";
import LeaseTable from "@/modules/long-term/components/LeaseTable";
import LeaseFormDrawer from "@/modules/long-term/components/LeaseFormDrawer";
import LeaseTerminateModal from "@/modules/long-term/components/LeaseTerminateModal";
import { roomService } from "@/common/services/roomService";
import { guestService } from "@/common/services/guestService";

export default function LeasesPage() {
  const t = useTranslations();
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);
  const canCreate = hasPermission(PERMISSIONS.LONG_TERM_CREATE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editLease, setEditLease] = useState<Record<string, unknown> | null>(null);
  const [terminateLease, setTerminateLease] = useState<Record<string, unknown> | null>(null);

  const { data: roomsData } = useQuery({
    queryKey: ["rooms", "all"],
    queryFn: () => roomService.findAll({ limit: 200 }),
  });
  const { data: guestsData } = useQuery({
    queryKey: ["guests", "all"],
    queryFn: () => guestService.findAll({ limit: 500 }),
  });

  const rooms = (roomsData?.data ?? []) as { id: string; number: string; roomType?: { name: string } }[];
  const guests = (guestsData?.data ?? []) as { id: string; firstName: string; lastName: string }[];

  function handleEdit(lease: Record<string, unknown>) {
    setEditLease(lease);
    setDrawerOpen(true);
  }

  function handleAdd() {
    setEditLease(null);
    setDrawerOpen(true);
  }

  return (
    <div>
      <AppPageHeader
        translateTitle={false}
        title={t("longTerm.lease.title")}
        extra={
          canCreate && (
            <Button type="primary" onClick={handleAdd}>
              {t("longTerm.lease.createAction")}
            </Button>
          )
        }
      />
      <LeaseTable
        onEdit={handleEdit}
        onTerminate={(lease) => setTerminateLease(lease)}
      />
      <LeaseFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditLease(null); }}
        editLease={editLease}
        rooms={rooms}
        guests={guests}
      />
      <LeaseTerminateModal
        open={!!terminateLease}
        onClose={() => setTerminateLease(null)}
        lease={terminateLease}
      />
    </div>
  );
}
