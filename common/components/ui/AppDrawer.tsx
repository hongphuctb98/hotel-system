"use client";

import { Drawer } from "antd";
import type { DrawerProps } from "antd";

interface AppDrawerProps extends DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AppDrawer({
  open,
  onClose,
  children,
  size = 480,
  ...props
}: AppDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={size}
      destroyOnHidden
      {...props}
    >
      {children}
    </Drawer>
  );
}
