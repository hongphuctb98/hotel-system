"use client";

import { Modal } from "antd";
import type { ModalProps } from "antd";

interface AppModalProps extends ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AppModal({
  open,
  onClose,
  children,
  footer = null,
  ...props
}: AppModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
      centered
      {...props}
    >
      {children}
    </Modal>
  );
}
