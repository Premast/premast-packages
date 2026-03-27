"use client";

import { Button, Card, Form, Input, Typography, message, Flex, Result } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadySetup, setAlreadySetup] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.setupComplete) {
          setAlreadySetup(true);
        }
      })
      .finally(() => setChecking(false));
  }, []);

  async function onFinish(values) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Setup failed");
      message.success("Admin account created!");
      router.push("/admin");
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  if (alreadySetup) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", background: "#0a0a0a" }}>
        <Result
          status="info"
          title="Setup already complete"
          subTitle="An admin account already exists."
          extra={
            <Button type="primary" href="/admin/login">
              Go to Login
            </Button>
          }
        />
      </Flex>
    );
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: "100vh", background: "#0a0a0a" }}
    >
      <Card
        style={{
          width: 420,
          background: "#141414",
          border: "1px solid #2a2a2a",
        }}
      >
        <Flex vertical gap={24}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#e0e0e0" }}>
              Create Admin Account
            </Title>
            <Text type="secondary">
              Set up your first super admin to get started
            </Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: "Enter your name" }]}
            >
              <Input size="large" placeholder="Admin" />
            </Form.Item>

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
              rules={[
                { required: true, message: "Enter a password" },
                { min: 8, message: "At least 8 characters" },
              ]}
            >
              <Input.Password size="large" placeholder="Minimum 8 characters" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                Create Account
              </Button>
            </Form.Item>
          </Form>
        </Flex>
      </Card>
    </Flex>
  );
}
