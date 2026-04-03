"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Switch,
  Upload,
  Select,
  Button,
  Tag,
  Tooltip,
  DatePicker,
  Row,
  Col,
  App,
} from "antd";
import type { UploadFile } from "antd";
import { IconUpload, IconTrash, IconFile } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppCard from "@/common/components/ui/AppCard";
import { useDeleteStaffAvatar, useDeleteStaffDocument } from "../hooks/useStaffMutations";
import type { StaffMember } from "@/types/staff.types";

const DOC_TYPE_OPTIONS = [
  { value: "CONTRACT", label: "Contract" },
  { value: "ID_SCAN", label: "ID Scan" },
  { value: "CV", label: "CV" },
  { value: "OTHER", label: "Other" },
];

export type ProfileFormValues = {
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  position?: string | null;
  department?: string | null;
  note?: string | null;
  isActive?: boolean;
  joinedAt?: string | null;
  resignedAt?: string | null;
};

export type MediaState = {
  newAvatarFile: File | null;
  pendingDocFiles: { file: File; type: string }[];
};

type Props = {
  mode: "create" | "edit";
  staff?: StaffMember;
  onSave: (values: ProfileFormValues, media: MediaState) => void;
  onCancel: () => void;
  isPending?: boolean;
};

export default function StaffProfileForm({ mode, staff, onSave, onCancel, isPending }: Props) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const isEdit = mode === "edit";

  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([]);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [pendingDocFiles, setPendingDocFiles] = useState<{ file: File; type: string }[]>([]);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [isResigned, setIsResigned] = useState(false);

  const deleteAvatar = useDeleteStaffAvatar();
  const deleteDocument = useDeleteStaffDocument();

  useEffect(() => {
    if (isEdit && staff) {
      form.setFieldsValue({
        name: staff.name,
        contactEmail: staff.contactEmail,
        phone: staff.phone,
        address: staff.address,
        position: staff.position,
        department: staff.department,
        note: staff.note,
        isActive: staff.isActive,
        joinedAt: staff.joinedAt ? dayjs(staff.joinedAt) : null,
        resignedAt: staff.resignedAt ? dayjs(staff.resignedAt) : null,
      });
      // isActive toggle disabled only when resignedAt is today or already passed
      const isPast = staff.resignedAt
        ? !dayjs(staff.resignedAt).isAfter(dayjs(), "day")
        : false;
      setIsResigned(isPast);

      if (staff.avatarUrl) {
        setAvatarFileList([
          { uid: "avatar", name: "avatar", status: "done", url: staff.avatarUrl },
        ]);
      }
    }
  }, [isEdit, staff, form]);

  const handleResignedAtChange = (val: dayjs.Dayjs | null) => {
    // Disable isActive only when the resignation date is today or has already passed
    const isPast = val ? !val.isAfter(dayjs(), "day") : false;
    setIsResigned(isPast);
    if (isPast) form.setFieldValue("isActive", false);
  };

  const handleRemoveAvatar = async () => {
    if (isEdit && staff?.avatarUrl) {
      try {
        await deleteAvatar.mutateAsync(staff.id);
        message.success(t("avatarDeleteSuccess"));
      } catch {
        message.error(t("avatarDeleteFailed"));
        return false;
      }
    }
    setAvatarFileList([]);
    setNewAvatarFile(null);
    return false;
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!staff) return;
    setDeletingDocumentId(docId);
    try {
      await deleteDocument.mutateAsync({ id: staff.id, docId });
      message.success(t("documentDeleteSuccess"));
    } catch {
      message.error(t("documentDeleteFailed"));
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    const profileValues: ProfileFormValues = {
      name: values.name,
      contactEmail: values.contactEmail || null,
      phone: values.phone || null,
      address: values.address || null,
      position: values.position || null,
      department: values.department || null,
      note: values.note || null,
      isActive: values.isActive ?? true,
      joinedAt: values.joinedAt ? (values.joinedAt as dayjs.Dayjs).toISOString() : null,
      resignedAt: values.resignedAt ? (values.resignedAt as dayjs.Dayjs).toISOString() : null,
    };

    onSave(profileValues, { newAvatarFile, pendingDocFiles });
  };

  return (
    <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
      {/* ── General Card ── */}
      <AppCard title={t("tabs.basicInfo")} style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          {/* Left: form fields */}
          <Col xs={24} md={16}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label={t("name")} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="phone" label={t("phone")}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="contactEmail" label={t("contactEmail")}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="address" label={t("address")}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="note" label={t("note")}>
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
          </Col>

          {/* Right: avatar */}
          <Col xs={24} md={8}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>{t("avatarUrl")}</div>
            <Upload
              listType="picture-card"
              fileList={avatarFileList}
              beforeUpload={(file) => {
                setAvatarFileList([
                  { uid: file.uid, name: file.name, status: "done", originFileObj: file },
                ]);
                setNewAvatarFile(file);
                return false;
              }}
              onRemove={handleRemoveAvatar}
              maxCount={1}
              accept="image/*"
            >
              {avatarFileList.length === 0 && (
                <div className="flex flex-col items-center">
                  <IconUpload size={16} />
                  <div style={{ marginTop: 4, fontSize: 12 }}>{t("avatarUploadHint")}</div>
                </div>
              )}
            </Upload>
          </Col>
        </Row>
      </AppCard>

      {/* ── Employment Card ── */}
      <AppCard title={t("tabs.employment")} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="position" label={t("position")}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="department" label={t("department")}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="joinedAt" label={t("joinedAt")}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="resignedAt" label={t("resignedAt")}>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                onChange={handleResignedAtChange}
              />
            </Form.Item>
          </Col>
          {isEdit && (
            <Col span={24}>
              <Form.Item label={t("isActive")}>
                <Tooltip title={isResigned ? t("resignedAtTooltip") : undefined}>
                  <Form.Item name="isActive" valuePropName="checked" noStyle>
                    <Switch disabled={isResigned} />
                  </Form.Item>
                </Tooltip>
              </Form.Item>
            </Col>
          )}
        </Row>
      </AppCard>

      {/* ── Documents Card ── */}
      <AppCard title={t("tabs.documents")} style={{ marginBottom: 16 }}>
        {staff?.documents.map((doc) => (
          <div
            key={doc.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              padding: "6px 10px",
              background: "#fafafa",
              borderRadius: 4,
              border: "1px solid #f0f0f0",
            }}
          >
            <IconFile size={14} />
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, fontSize: 13 }}
            >
              {doc.name}
            </a>
            <Tag color="default" style={{ fontSize: 11 }}>
              {DOC_TYPE_OPTIONS.find((o) => o.value === doc.type)?.label ?? doc.type}
            </Tag>
            <Button
              type="text"
              size="small"
              danger
              loading={deletingDocumentId === doc.id}
              icon={<IconTrash size={14} />}
              onClick={() => handleDeleteDocument(doc.id)}
            />
          </div>
        ))}

        {pendingDocFiles.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              padding: "6px 10px",
              background: "#f6ffed",
              borderRadius: 4,
              border: "1px solid #b7eb8f",
            }}
          >
            <IconFile size={14} />
            <span style={{ flex: 1, fontSize: 13 }}>{item.file.name}</span>
            <Select
              size="small"
              value={item.type}
              options={DOC_TYPE_OPTIONS}
              style={{ width: 110 }}
              onChange={(v) =>
                setPendingDocFiles((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, type: v } : p))
                )
              }
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<IconTrash size={14} />}
              onClick={() => setPendingDocFiles((prev) => prev.filter((_, i) => i !== idx))}
            />
          </div>
        ))}

        <Upload
          showUploadList={false}
          beforeUpload={(file) => {
            setPendingDocFiles((prev) => [...prev, { file, type: "OTHER" }]);
            return false;
          }}
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
        >
          <Button icon={<IconUpload size={14} />} size="small">
            {t("documentUploadHint")}
          </Button>
        </Upload>
      </AppCard>

      {/* ── Sticky Footer ── */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "#fff",
          borderTop: "1px solid #f0f0f0",
          padding: "12px 0",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          zIndex: 10,
        }}
      >
        <Button onClick={onCancel}>{tCommon("cancel")}</Button>
        <Button type="primary" loading={isPending} onClick={handleSubmit}>
          {isEdit ? t("updateAction") : t("createAction")}
        </Button>
      </div>
    </Form>
  );
}
