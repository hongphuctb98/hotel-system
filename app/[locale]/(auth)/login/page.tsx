"use client";

import { Form, Input, Button, Card, Typography, Alert } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { IconBuildingSkyscraper } from "@tabler/icons-react";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push(`/${locale}/dashboard`);
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg" variant="borderless">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
              <IconBuildingSkyscraper size={28} color="white" />
            </div>
          </div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t("auth.loginTitle")}
          </Typography.Title>
          <Typography.Text type="secondary">{t("auth.loginSubtitle")}</Typography.Text>
        </div>

        {error && (
          <Alert type="error" title={error} className="mb-4" showIcon />
        )}

        <Form layout="vertical" onFinish={handleLogin} size="large">
          <Form.Item
            name="email"
            label={t("auth.email")}
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="admin@hotel.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("auth.password")}
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{ height: 44 }}
          >
            {t("auth.loginButton")}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
