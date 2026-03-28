"use client";

import { Input, InputNumber, Select, Radio } from "antd";

const fieldStyle = {
   width: "100%",
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
         />
      </FieldWrap>
   );
}

export function SelectField({ value, onChange, field }) {
   const options = (field?.options ?? []).map((opt) => (typeof opt === "string" ? { label: opt, value: opt } : opt));

   return (
      <FieldWrap field={field}>
         <Select
            value={value}
            onChange={(v) => onChange(v)}
            options={options}
            style={fieldStyle}
            popupMatchSelectWidth={true}
         />
      </FieldWrap>
   );
}

export function RadioField({ value, onChange, field }) {
   const options = (field?.options ?? []).map((opt) => (typeof opt === "string" ? { label: opt, value: opt } : opt));

   return (
      <FieldWrap field={field}>
         <Radio.Group
            value={value}
            onChange={(e) => onChange(e.target.value)}
            options={options}
            optionType="button"
            buttonStyle="solid"
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

/**
 * Icon map for drawer items — maps block names to Lucide-style SVG paths.
 */
const blockIcons = {
   HeroBlock: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM4 15h16M4 19h10",
   ContentBlock: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
   HeaderBlock: "M3 3h18v4H3zM7 5h10",
   FooterBlock: "M3 17h18v4H3zM7 19h10",
   HeadingBlock: "M6 4v16M18 4v16M6 12h12",
   TextBlock: "M4 6h16M4 10h16M4 14h12M4 18h8",
   SpacerBlock: "M4 12h16M12 4v4M12 16v4M8 8l4-4 4 4M8 16l4 4 4-4",
   ArticleHeroBlock: "M4 4h16v8H4zM4 16h10M4 19h6",
   ArticleBodyBlock: "M4 4h16M4 8h16M4 12h16M4 16h12M4 20h8",
   ArticleMetaBlock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2",
};
const defaultIcon = "M4 4h16v16H4z";

/**
 * Custom drawer item — compact card with icon and name.
 */
export function DrawerItemOverride({ children, name }) {
   const iconPath = blockIcons[name] || defaultIcon;
   const label = name
      .replace(/Block$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();

   return (
      <div
         style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "12px 8px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            cursor: "grab",
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
            transition: "border-color 0.15s, background 0.15s",
            minHeight: 70,
            justifyContent: "center",
         }}
         onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(94,106,210,0.5)";
            e.currentTarget.style.background = "rgba(94,106,210,0.08)";
         }}
         onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
         }}
      >
         <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.7, flexShrink: 0 }}
         >
            <path d={iconPath} />
         </svg>
         <span style={{ textAlign: "center", lineHeight: 1.2 }}>{label}</span>
      </div>
   );
}

