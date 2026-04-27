"use client";

import { Drawer, Grid } from "antd";
import type { DrawerProps } from "antd";

const { useBreakpoint } = Grid;

interface AppDrawerProps extends DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AppDrawer({
  open,
  onClose,
  children,
  size = "default",
  width,
  ...props
}: AppDrawerProps) {
  const screens = useBreakpoint();
  const customWidth = !screens.md ? "100%" : width;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={customWidth ? undefined : size}
      styles={customWidth ? { wrapper: { width: customWidth } } : undefined}
      destroyOnHidden
      {...props}
    >
      {children}
    </Drawer>
  );
}
