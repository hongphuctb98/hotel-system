"use client";

import { App } from "antd";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import StaffProfileForm from "@/modules/staff/components/StaffProfileForm";
import {
  useCreateStaff,
  useUploadStaffAvatar,
  useUploadStaffDocument,
} from "@/modules/staff/hooks/useStaffMutations";
import type {
  ProfileFormValues,
  MediaState,
} from "@/modules/staff/components/StaffProfileForm";

export default function NewStaffPage() {
  const t = useTranslations("staff");
  const { message } = App.useApp();
  const router = useRouter();
  const locale = useLocale();

  const createStaff = useCreateStaff();
  const uploadAvatar = useUploadStaffAvatar();
  const uploadDocument = useUploadStaffDocument();

  const handleSave = async (
    profileValues: ProfileFormValues,
    { newAvatarFile, pendingDocFiles }: MediaState
  ) => {
    try {
      const res = await createStaff.mutateAsync(profileValues);
      const staffId = res.data?.id;
      if (staffId) {
        if (newAvatarFile) {
          await uploadAvatar.mutateAsync({ id: staffId, file: newAvatarFile });
        }
        for (const { file, type } of pendingDocFiles) {
          await uploadDocument.mutateAsync({ id: staffId, file, type });
        }
      }
      message.success(t("createSuccess"));
      router.push(`/${locale}/staff`);
    } catch {
      message.error(t("createFailed"));
    }
  };

  const isPending =
    createStaff.isPending ||
    uploadAvatar.isPending ||
    uploadDocument.isPending;

  const handleCancel = () => router.push(`/${locale}/staff`);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <AppPageHeader title="staff.createTitle" />
      <StaffProfileForm
        mode="create"
        onSave={handleSave}
        onCancel={handleCancel}
        isPending={isPending}
      />
    </div>
  );
}
