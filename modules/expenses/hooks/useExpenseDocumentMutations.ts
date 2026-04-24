"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseDocumentService } from "@/common/services/expenseDocumentService";
import type { CreateExpenseDocumentBody } from "@/common/services/expenseDocumentService";

export function useExpenseDocumentMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["expenseDocuments"] }),
      queryClient.invalidateQueries({ queryKey: ["expenseRecordedItems"] }),
    ]);

  const createMutation = useMutation({
    mutationFn: (body: CreateExpenseDocumentBody) =>
      expenseDocumentService.createExpenseDocument(body),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateExpenseDocumentBody> }) =>
      expenseDocumentService.updateExpenseDocument(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["expenseDocument", id] });
      return invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseDocumentService.deleteExpenseDocument(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["expenseDocument", id] });
      return invalidate();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}
