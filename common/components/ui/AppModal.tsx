"use client";

import { Modal, Grid } from "antd";
import type { ModalProps } from "antd";

const { useBreakpoint } = Grid;

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
  width,
  ...props
}: AppModalProps) {
  const screens = useBreakpoint();
  const resolvedWidth = !screens.md ? "calc(100vw - 32px)" : width;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
      centered
      width={resolvedWidth}
      {...props}
    >
      {children}
    </Modal>
  );
}
