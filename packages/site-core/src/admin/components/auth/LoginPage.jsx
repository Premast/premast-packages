"use client";

import { Button, Card, Form, Input, Typography, message, Flex } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const { Title, Text } = Typography;

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const [loading, setLoading] = useState(false);

  async function onFinish(values) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");
      router.push(callbackUrl);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: "100vh", background: "#0a0a0a" }}
    >
      <Card
        style={{
          width: 380,
          background: "#141414",
          border: "1px solid #2a2a2a",
        }}
      >
        <Flex vertical gap={24}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#e0e0e0" }}>
              Admin Login
            </Title>
            <Text type="secondary">Sign in to access the dashboard</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
            >
              <Input size="large" placeholder="admin@example.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Enter your password" }]}
            >
              <Input.Password size="large" placeholder="Password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Flex>
      </Card>
    </Flex>
  );
}
