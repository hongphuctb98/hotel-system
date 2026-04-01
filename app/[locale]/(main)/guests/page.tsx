"use client";

import { Button } from "antd";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import GuestTable from "@/modules/guests/components/GuestTable";
import { useDisclosure } from "@/common/hooks/useDisclosure";

export default function GuestsPage() {
  const t = useTranslations();
  const modal = useDisclosure();

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="nav.guests"
        extra={
          <Button type="primary" icon={<IconPlus size={16} />} onClick={modal.open}>
            {t("common.add")}
          </Button>
        }
      />
      <GuestTable />
    </div>
  );
}
