"use client";

import { useState } from "react";
import { Layout } from "antd";
import { AuthRoleProvider } from "@/providers/AuthRoleProvider";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import type { UserRole } from "@/types/auth.types";

const { Sider, Header, Content } = Layout;

export default function MainLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthRoleProvider role={role}>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={240}
          collapsedWidth={64}
          theme="light"
          trigger={null}
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
          <AppSidebar collapsed={collapsed} />
        </Sider>

        <Layout
          style={{
            marginLeft: collapsed ? 64 : 240,
            transition: "margin 0.2s ease",
          }}
        >
          <Header
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
              collapsed={collapsed}
              onToggle={() => setCollapsed((c) => !c)}
            />
          </Header>

          <Content style={{ margin: "24px 24px 0", minHeight: "calc(100vh - 88px)" }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </AuthRoleProvider>
  );
}
