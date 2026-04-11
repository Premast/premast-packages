"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleTwoTone,
  CloseCircleOutlined,
  DeleteOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";

/**
 * Admin page for the i18n plugin.
 *
 * Two sections, stacked:
 *   1. Supported languages — CRUD on the LocaleSetting singleton.
 *   2. Translation coverage — matrix view of which locales each
 *      Page / Global is available in, plus per-cell status.
 *
 * All data comes from the plugin's own API:
 *   GET    /api/i18n/locales            — list supported locales
 *   POST   /api/i18n/locales            — add a locale
 *   PATCH  /api/i18n/locales/:code      — rename / change dir / toggle
 *   DELETE /api/i18n/locales/:code      — remove a locale
 *   POST   /api/i18n/locales/default    — set default locale
 *   GET    /api/i18n/coverage           — page + global coverage matrix
 */
export function TranslationsAdminPage() {
  const [locales, setLocales] = useState([]);
  const [defaultLocale, setDefaultLocale] = useState(null);
  const [coverage, setCoverage] = useState({ pages: [], globals: [], contentItems: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [localesRes, coverageRes] = await Promise.all([
        fetch("/api/i18n/locales").then((r) => r.json()),
        fetch("/api/i18n/coverage").then((r) => r.json()),
      ]);
      setLocales(localesRes.localesDetailed || []);
      setDefaultLocale(localesRes.defaultLocale || null);
      setCoverage({
        pages: coverageRes.pages || [],
        globals: coverageRes.globals || [],
        contentItems: coverageRes.contentItems || [],
      });
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <Space align="center" style={{ marginBottom: 8 }}>
        <GlobalOutlined style={{ fontSize: 22 }} />
        <Typography.Title level={3} style={{ margin: 0 }}>
          Translations
        </Typography.Title>
      </Space>

      <Typography.Paragraph type="secondary">
        Add or remove the languages your site supports, then track which
        pages and global blocks have been translated into each one.
      </Typography.Paragraph>

      {error ? <Alert type="error" message={error} style={{ marginBottom: 16 }} /> : null}

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Refresh
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          Add language
        </Button>
      </Space>

      <SupportedLanguagesTable
        locales={locales}
        defaultLocale={defaultLocale}
        onChange={load}
      />

      <Typography.Title level={4} style={{ marginTop: 32 }}>
        Translation coverage
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Each row groups documents that share a translation group. A green
        check means a published version exists in that language; a dashed
        circle means it's missing or still a draft.
      </Typography.Paragraph>

      <Tabs
        defaultActiveKey="pages"
        items={[
          {
            key: "pages",
            label: `Pages (${coverage.pages.length})`,
            children: (
              <CoverageTable
                rows={coverage.pages}
                locales={locales}
                kind="page"
              />
            ),
          },
          {
            key: "content",
            label: `Content (${coverage.contentItems.length})`,
            children: (
              <CoverageTable
                rows={coverage.contentItems}
                locales={locales}
                kind="content"
              />
            ),
          },
          {
            key: "globals",
            label: `Globals (${coverage.globals.length})`,
            children: (
              <CoverageTable
                rows={coverage.globals}
                locales={locales}
                kind="global"
              />
            ),
          },
        ]}
      />

      <AddLocaleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { setAddOpen(false); load(); }}
      />
    </div>
  );
}

/* --------------------- Supported languages table --------------------- */

function SupportedLanguagesTable({ locales, defaultLocale, onChange }) {
  const setDefault = async (code) => {
    try {
      const r = await fetch("/api/i18n/locales/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      message.success(`Default language set to ${code.toUpperCase()}`);
      onChange();
    } catch (err) {
      message.error(err.message);
    }
  };

  const remove = async (code) => {
    try {
      const r = await fetch(`/api/i18n/locales/${code}`, { method: "DELETE" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Failed");
      const orphans = body.orphans || {};
      const orphanTotal =
        (orphans.pages || 0) + (orphans.globals || 0) + (orphans.contentItems || 0);
      if (orphanTotal > 0) {
        message.warning(
          `Removed ${code.toUpperCase()}. Note: ${orphans.pages || 0} pages, ${orphans.contentItems || 0} content items and ${orphans.globals || 0} globals still exist with this locale and will only be visible if you re-add it.`,
          6,
        );
      } else {
        message.success(`Removed ${code.toUpperCase()}`);
      }
      onChange();
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    {
      title: "",
      dataIndex: "code",
      width: 50,
      render: (code) =>
        code === defaultLocale ? (
          <Tooltip title="Default language">
            <StarFilled style={{ color: "#fadb14" }} />
          </Tooltip>
        ) : (
          <Tooltip title="Set as default">
            <Button
              type="text"
              size="small"
              icon={<StarOutlined />}
              onClick={() => setDefault(code)}
            />
          </Tooltip>
        ),
    },
    {
      title: "Code",
      dataIndex: "code",
      width: 80,
      render: (code) => <Tag color="blue">{code.toUpperCase()}</Tag>,
    },
    { title: "Label", dataIndex: "label" },
    {
      title: "Native",
      dataIndex: "nativeLabel",
      render: (val, row) => (
        <span dir={row.dir}>{val}</span>
      ),
    },
    {
      title: "Direction",
      dataIndex: "dir",
      width: 100,
      render: (dir) => <Tag>{(dir || "ltr").toUpperCase()}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, row) =>
        row.code === defaultLocale ? null : (
          <Popconfirm
            title={`Remove ${row.code.toUpperCase()}?`}
            description="Existing pages/globals tagged with this locale will be hidden until you add it back."
            okText="Remove"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(row.code)}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
    },
  ];

  return (
    <Table
      size="small"
      rowKey="code"
      dataSource={locales}
      columns={columns}
      pagination={false}
      locale={{ emptyText: "No locales configured yet" }}
    />
  );
}

/* --------------------- Add locale modal --------------------- */

function AddLocaleModal({ open, onClose, onAdded }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Common ISO codes — purely a convenience picker. Users can also
  // type any code into the field; the server validates the format.
  const COMMON = [
    { value: "en", label: "English (en)" },
    { value: "ar", label: "Arabic (ar)" },
    { value: "fr", label: "French (fr)" },
    { value: "es", label: "Spanish (es)" },
    { value: "de", label: "German (de)" },
    { value: "it", label: "Italian (it)" },
    { value: "pt", label: "Portuguese (pt)" },
    { value: "tr", label: "Turkish (tr)" },
    { value: "he", label: "Hebrew (he)" },
    { value: "fa", label: "Persian (fa)" },
    { value: "ur", label: "Urdu (ur)" },
    { value: "ja", label: "Japanese (ja)" },
    { value: "zh", label: "Chinese (zh)" },
  ];

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const r = await fetch("/api/i18n/locales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Failed");
      message.success(`Added ${values.code.toUpperCase()}`);
      form.resetFields();
      onAdded();
    } catch (err) {
      if (err.errorFields) return; // form validation
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add language"
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText="Add"
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ dir: "ltr" }}>
        <Form.Item
          label="Locale code"
          name="code"
          rules={[
            { required: true, message: "Required" },
            { pattern: /^[a-z]{2}(-[a-z0-9]{2,8})?$/i, message: "Use 'en' or 'pt-br' format" },
          ]}
          extra="Two-letter ISO code, optionally with a region (e.g. en, ar, pt-br). Common picks below."
        >
          <Select
            showSearch
            allowClear
            placeholder="Pick or type a code"
            options={COMMON}
            mode="tags"
            maxCount={1}
            onChange={(val) => {
              const v = Array.isArray(val) ? val[0] : val;
              if (v) form.setFieldValue("code", v.toLowerCase());
            }}
          />
        </Form.Item>
        <Form.Item label="English label" name="label">
          <Input placeholder="Auto-detected from the registry if blank (e.g. 'Spanish')" />
        </Form.Item>
        <Form.Item label="Native label" name="nativeLabel">
          <Input placeholder="Auto-detected (e.g. 'Español')" />
        </Form.Item>
        <Form.Item label="Direction" name="dir">
          <Select
            options={[
              { value: "ltr", label: "Left → Right (ltr)" },
              { value: "rtl", label: "Right → Left (rtl)" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* --------------------- Coverage table --------------------- */

function CoverageTable({ rows, locales, kind }) {
  const enabledLocales = useMemo(
    () => locales.filter((l) => l.enabled !== false),
    [locales],
  );

  const indexBySibling = (siblings) => {
    const map = new Map();
    for (const s of siblings || []) {
      if (s.locale) map.set(s.locale, s);
    }
    return map;
  };

  const titleLabel = kind === "page" ? "Page" : kind === "content" ? "Content item" : "Global";

  const columns = [
    {
      title: titleLabel,
      dataIndex: "title",
      key: "title",
      fixed: "left",
      width: 240,
      render: (title, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{title || row.slug}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {kind === "content" && row.contentType?.name ? (
              <>
                <Tag color="purple" style={{ marginRight: 6 }}>
                  {row.contentType.name}
                </Tag>
                {row.slug}
              </>
            ) : (
              row.slug
            )}
          </Typography.Text>
        </Space>
      ),
    },
    ...enabledLocales.map((locale) => ({
      title: (
        <span dir={locale.dir}>
          <Tag color="blue">{locale.code.toUpperCase()}</Tag>
        </span>
      ),
      key: locale.code,
      align: "center",
      width: 110,
      render: (_, row) => {
        const map = indexBySibling(row.siblings);
        const sibling = map.get(locale.code);
        if (!sibling) {
          return (
            <Tooltip title={`No ${locale.label || locale.code} version yet`}>
              <CloseCircleOutlined style={{ color: "#bfbfbf", fontSize: 16 }} />
            </Tooltip>
          );
        }
        const editHref =
          kind === "page"
            ? `/admin/pages/${sibling.id}`
            : kind === "content"
            ? `/admin/content/${sibling.id}`
            : `/admin/global/${sibling.slug}/${sibling.locale}`;
        return (
          <Tooltip
            title={sibling.published ? "Published — click to edit" : "Draft — click to edit"}
          >
            <a href={editHref} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CheckCircleTwoTone twoToneColor={sibling.published ? "#52c41a" : "#faad14"} />
              {!sibling.published && (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  draft
                </Typography.Text>
              )}
            </a>
          </Tooltip>
        );
      },
    })),
  ];

  return (
    <Table
      size="small"
      rowKey={(row, idx) => row.groupId || `${row.slug}:${idx}`}
      dataSource={rows}
      columns={columns}
      pagination={false}
      scroll={{ x: 240 + enabledLocales.length * 110 }}
      locale={{
        emptyText:
          kind === "page"
            ? "No pages yet — create one in Pages."
            : kind === "content"
            ? "No content items yet — create one in Content."
            : "No globals yet.",
      }}
    />
  );
}
