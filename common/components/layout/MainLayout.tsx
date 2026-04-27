"use client";

import { useState } from "react";
import { Layout, Grid, Drawer } from "antd";
import { AuthRoleProvider } from "@/providers/AuthRoleProvider";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import type { UserRole } from "@/types/auth.types";

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({
  children,
  role,
  userId,
}: {
  children: React.ReactNode;
  role: UserRole;
  userId: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const screens = useBreakpoint();

  const isMobile = !screens.md;
  const isTablet = !!screens.md && !screens.lg;

  const siderCollapsed = isTablet ? true : collapsed;
  const marginLeft = isMobile ? 0 : siderCollapsed ? 64 : 240;

  const handleToggle = () => {
    if (isMobile || isTablet) {
      setMobileDrawerOpen(true);
    } else {
      setCollapsed((c) => !c);
    }
  };

  return (
    <AuthRoleProvider role={role} userId={userId}>
      <Layout style={{ minHeight: "100vh" }}>
        {isMobile ? (
          <Drawer
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            placement="left"
            styles={{ wrapper: { width: 240 }, body: { padding: 0 } }}
            className="print:hidden"
          >
            <AppSidebar
              collapsed={false}
              onMenuClick={() => setMobileDrawerOpen(false)}
            />
          </Drawer>
        ) : (
          <Sider
            collapsed={siderCollapsed}
            width={240}
            collapsedWidth={64}
            theme="light"
            trigger={null}
            className="print:hidden"
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 100,
              overflow: "hidden",
              boxShadow: "1px 0 4px rgba(0,0,0,0.06)",
            }}
          >
            <AppSidebar
              collapsed={siderCollapsed}
              onMenuClick={
                isTablet ? () => setMobileDrawerOpen(false) : undefined
              }
            />
          </Sider>
        )}

        <Layout
          style={{
            marginLeft,
            transition: "margin 0.2s ease",
          }}
        >
          <Header
            className="print:hidden"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 99,
              padding: 0,
              height: 64,
              lineHeight: "64px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <AppHeader
              collapsed={siderCollapsed}
              onToggle={handleToggle}
            />
          </Header>

          <Content
            style={{
              margin: isMobile ? "12px 12px 0" : "24px 24px 0",
              minHeight: "calc(100vh - 88px)",
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </AuthRoleProvider>
  );
}
