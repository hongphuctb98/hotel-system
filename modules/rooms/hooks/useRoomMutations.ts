"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roomService } from "@/common/services/roomService";
import type { Room } from "@/types/room.types";

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Room> & { amenityIds?: string[] }) =>
      roomService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Room> & { amenityIds?: string[] } }) =>
      roomService.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", variables.id] });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roomService.delete(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.removeQueries({ queryKey: ["rooms", id] });
    },
  });
}

export function useUploadRoomImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, file }: { roomId: string; file: File }) =>
      roomService.uploadImage(roomId, file),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", variables.roomId] });
    },
  });
}

export function useDeleteRoomImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, imageId }: { roomId: string; imageId: string }) =>
      roomService.deleteImage(roomId, imageId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms", variables.roomId] });
    },
  });
}
