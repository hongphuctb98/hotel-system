"use client";

import { useState } from "react";
import { Button } from "antd";
import { IconUserPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AccountsTable from "@/modules/accounts/components/AccountsTable";
import CreateAccountModal from "@/modules/accounts/components/CreateAccountModal";

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <AppPageHeader
        title="accounts.title"
        extra={
          <Button
            type="primary"
            icon={<IconUserPlus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            {t("createAccount")}
          </Button>
        }
      />

      <AccountsTable />

      <CreateAccountModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
