"use client";

import { use } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { App, Spin } from "antd";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import StaffProfileForm from "@/modules/staff/components/StaffProfileForm";
import { useStaffMember } from "@/modules/staff/hooks/useStaffMember";
import {
  useUpdateStaff,
  useUploadStaffAvatar,
  useUploadStaffDocument,
} from "@/modules/staff/hooks/useStaffMutations";
import type {
  ProfileFormValues,
  MediaState,
} from "@/modules/staff/components/StaffProfileForm";

export default function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("staff");
  const { message } = App.useApp();
  const router = useRouter();
  const locale = useLocale();
  const qc = useQueryClient();

  const { data: staff, isLoading } = useStaffMember(id);

  const updateStaff = useUpdateStaff();
  const uploadAvatar = useUploadStaffAvatar();
  const uploadDocument = useUploadStaffDocument();

  const handleSave = async (
    profileValues: ProfileFormValues,
    { newAvatarFile, pendingDocFiles }: MediaState
  ) => {
    try {
      await updateStaff.mutateAsync({ id, data: profileValues, skipInvalidate: true });
      if (newAvatarFile) {
        await uploadAvatar.mutateAsync({ id, file: newAvatarFile, skipInvalidate: true });
      }
      for (const { file, type } of pendingDocFiles) {
        await uploadDocument.mutateAsync({ id, file, type, skipInvalidate: true });
      }
      qc.invalidateQueries({ queryKey: ["staff"] });
      message.success(t("updateSuccess"));
      router.push(`/${locale}/staff`);
    } catch {
      message.error(t("updateFailed"));
    }
  };

  const isPending =
    updateStaff.isPending ||
    uploadAvatar.isPending ||
    uploadDocument.isPending;

  const handleCancel = () => router.push(`/${locale}/staff`);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <AppPageHeader title="staff.editTitle" />
      <StaffProfileForm
        mode="edit"
        staff={staff}
        onSave={handleSave}
        onCancel={handleCancel}
        isPending={isPending}
      />
    </div>
  );
}
