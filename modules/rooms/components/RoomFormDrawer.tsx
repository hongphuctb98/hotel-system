"use client";

import { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Upload,
  Button,
  Space,
  App,
} from "antd";
import type { UploadFile } from "antd";
import { IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppDrawer from "@/common/components/ui/AppDrawer";
import { useMasterData } from "@/common/hooks/useMasterData";
import { masterDataService } from "@/common/services/masterDataService";
import { roomService } from "@/common/services/roomService";
import { ApiError } from "@/common/services/apiClient";
import {
  useCreateRoom,
  useUpdateRoom,
  useUploadRoomImage,
  useDeleteRoomImage,
} from "../hooks/useRoomMutations";
import type { Room } from "@/types/room.types";

interface RoomFormDrawerProps {
  open: boolean;
  onClose: () => void;
  room?: Room | null;
}

export default function RoomFormDrawer({ open, onClose, room }: RoomFormDrawerProps) {
  const t = useTranslations();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { floors, roomTypes, roomStatuses } = useMasterData();
  const { data: amenitiesRes } = useQuery({
    queryKey: ["master", "amenities"],
    queryFn: () => masterDataService.amenities(),
    staleTime: Infinity,
  });
  const amenities = amenitiesRes?.data ?? [];

  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const uploadImage = useUploadRoomImage();
  const deleteImage = useDeleteRoomImage();

  const isEdit = !!room;

  useEffect(() => {
    if (open) {
      if (room) {
        form.setFieldsValue({
          number: room.number,
          floorId: room.floorId,
          roomTypeId: room.roomTypeId,
          roomStatusId: room.roomStatusId,
          basePrice: room.basePrice ? Number(room.basePrice) : null,
          amenityIds: room.amenities.map((a) => a.amenity.id),
          note: room.note,
        });
        setFileList(
          (room.images ?? []).map((img) => ({
            uid: img.id,
            name: img.url.split("/").pop() ?? img.id,
            status: "done" as const,
            url: img.url,
          }))
        );
      } else {
        form.resetFields();
        setFileList([]);
      }
      setPendingFiles([]);
    }
  }, [open, room, form]);

  const handleClose = () => {
    form.resetFields();
    setFileList([]);
    setPendingFiles([]);
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        number: values.number,
        floorId: values.floorId,
        roomTypeId: values.roomTypeId,
        roomStatusId: values.roomStatusId,
        basePrice: values.basePrice ?? null,
        amenityIds: values.amenityIds ?? [],
        note: values.note ?? null,
      };

      let roomId: string;
      if (isEdit) {
        await updateRoom.mutateAsync({ id: room.id, data: payload });
        roomId = room.id;
      } else {
        const res = await createRoom.mutateAsync(payload);
        roomId = res.data!.id;
      }

      for (const file of pendingFiles) {
        await roomService.uploadImage(roomId, file);
      }
      if (pendingFiles.length > 0) {
        uploadImage.reset();
        await queryClient.invalidateQueries({ queryKey: ["rooms"] });
        await queryClient.invalidateQueries({ queryKey: ["rooms", roomId] });
      }

      message.success(isEdit ? t("room.updateSuccess") : t("room.createSuccess"));
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "ROOM_INACTIVE_EXISTS") {
          const existingId = (err.data as { id: string }).id;
          modal.confirm({
            title: t("room.reactivateTitle"),
            content: t("room.reactivateConfirm"),
            okText: t("room.reactivateAction"),
            cancelText: t("common.cancel"),
            onOk: async () => {
              try {
                await updateRoom.mutateAsync({ id: existingId, data: { isActive: true } });
                message.success(t("room.reactivateSuccess"));
                handleClose();
              } catch {
                message.error(t("room.reactivateFailed"));
              }
            },
          });
        } else if (err.code === "ROOM_NUMBER_TAKEN") {
          form.setFields([{ name: "number", errors: [t("room.numberTaken")] }]);
        }
      }
      // form validation errors are shown inline by Ant Design
    }
  };

  const handleRemoveImage = async (file: UploadFile) => {
    if (!file.originFileObj && room) {
      // Existing DB image — call delete API
      try {
        await deleteImage.mutateAsync({ roomId: room.id, imageId: file.uid });
        setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
        message.success(t("room.imageDeleteSuccess"));
      } catch {
        message.error(t("room.imageDeleteFailed"));
        return false;
      }
    } else {
      // Pending local file — remove from local state only
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
      setPendingFiles((prev) => prev.filter((f) => f.name !== file.name));
    }
    return true;
  };

  const isSubmitting = createRoom.isPending || updateRoom.isPending;

  return (
    <AppDrawer
      open={open}
      onClose={handleClose}
      title={isEdit ? t("room.editTitle") : t("room.createTitle")}
      width={500}
      extra={
        <Space>
          <Button onClick={handleClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={isSubmitting} onClick={handleSubmit}>
            {isEdit ? t("room.updateAction") : t("room.createAction")}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="number"
          label={t("room.number")}
          rules={[{ required: true }]}
        >
          <Input variant="outlined" />
        </Form.Item>

        <Form.Item
          name="floorId"
          label={t("room.floor")}
          rules={[{ required: true }]}
        >
          <Select
            variant="outlined"
            options={floors.map((f) => ({ value: f.id, label: f.name }))}
          />
        </Form.Item>

        <Form.Item
          name="roomTypeId"
          label={t("room.roomType")}
          rules={[{ required: true }]}
        >
          <Select
            variant="outlined"
            options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
          />
        </Form.Item>

        <Form.Item
          name="roomStatusId"
          label={t("room.status")}
          rules={[{ required: true }]}
        >
          <Select
            variant="outlined"
            options={roomStatuses.map((rs) => ({ value: rs.id, label: rs.name }))}
          />
        </Form.Item>

        <Form.Item name="basePrice" label={t("room.basePrice")}>
          <InputNumber
            style={{ width: "100%" }}
            variant="outlined"
            min={0}
            placeholder={t("room.basePricePlaceholder")}
          />
        </Form.Item>

        <Form.Item name="amenityIds" label={t("room.amenities")}>
          <Select
            variant="outlined"
            mode="multiple"
            options={amenities.map((a) => ({ value: a.id, label: a.name }))}
            allowClear
          />
        </Form.Item>

        <Form.Item name="note" label={t("room.note")}>
          <Input.TextArea rows={3} variant="outlined" />
        </Form.Item>

        <Form.Item label={t("room.images")}>
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={(file) => {
              setPendingFiles((prev) => [...prev, file]);
              setFileList((prev) => [
                ...prev,
                {
                  uid: `new-${Date.now()}`,
                  name: file.name,
                  status: "done",
                  originFileObj: file,
                },
              ]);
              return false;
            }}
            onRemove={handleRemoveImage}
          >
            <div>
              <IconUpload size={16} />
              <div style={{ marginTop: 8, fontSize: 12 }}>{t("room.uploadHint")}</div>
            </div>
          </Upload>
        </Form.Item>
      </Form>
    </AppDrawer>
  );
}
