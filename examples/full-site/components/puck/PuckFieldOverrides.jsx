"use client";

import { Input, InputNumber, Select, Radio } from "antd";

const fieldStyle = {
  width: "100%",
  borderRadius: 0,
};

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "100%",
};

const labelTextStyle = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--theme-text-muted, #999)",
  letterSpacing: "0.02em",
};

function FieldWrap({ field, children }) {
  if (!field?.label) return children;
  return (
    <div style={labelStyle}>
      <span style={labelTextStyle}>{field.label}</span>
      {children}
    </div>
  );
}

export function TextField({ value, onChange, field }) {
  return (
    <FieldWrap field={field}>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field?.placeholder}
        style={fieldStyle}
        size="small"
      />
    </FieldWrap>
  );
}

export function TextareaField({ value, onChange, field }) {
  return (
    <FieldWrap field={field}>
      <Input.TextArea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field?.placeholder}
        autoSize={{ minRows: 2, maxRows: 6 }}
        style={fieldStyle}
        size="small"
      />
    </FieldWrap>
  );
}

export function NumberField({ value, onChange, field }) {
  return (
    <FieldWrap field={field}>
      <InputNumber
        value={value}
        onChange={(v) => onChange(v)}
        min={field?.min}
        max={field?.max}
        step={field?.step}
        style={fieldStyle}
        size="small"
      />
    </FieldWrap>
  );
}

export function SelectField({ value, onChange, field }) {
  const options = (field?.options ?? []).map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  return (
    <FieldWrap field={field}>
      <Select
        value={value}
        onChange={(v) => onChange(v)}
        options={options}
        style={fieldStyle}
        size="small"
        popupMatchSelectWidth={true}
      />
    </FieldWrap>
  );
}

export function RadioField({ value, onChange, field }) {
  const options = (field?.options ?? []).map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  return (
    <FieldWrap field={field}>
      <Radio.Group
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        optionType="button"
        buttonStyle="solid"
        size="small"
        style={fieldStyle}
      />
    </FieldWrap>
  );
}

/**
 * All field type overrides for Puck's `overrides.fieldTypes`.
 */
export const puckFieldOverrides = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  select: SelectField,
  radio: RadioField,
};
