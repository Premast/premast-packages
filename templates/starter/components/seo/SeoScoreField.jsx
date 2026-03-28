"use client";

import { useMemo } from "react";
import { usePuck } from "@puckeditor/core";
import { analyzeSeo } from "./seo-analyzer.js";

const STATUS_COLORS = {
  good: "#52c41a",
  warning: "#faad14",
  poor: "#ff4d4f",
};

function scoreColor(score) {
  if (score >= 80) return STATUS_COLORS.good;
  if (score >= 50) return STATUS_COLORS.warning;
  return STATUS_COLORS.poor;
}

function CircularGauge({ score }) {
  const size = 100;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#2a2a2a"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="28"
        fontWeight="700"
        style={{ transition: "fill 0.4s ease" }}
      >
        {score}
      </text>
    </svg>
  );
}

function CheckItem({ label, status }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, lineHeight: "18px" }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: STATUS_COLORS[status],
          flexShrink: 0,
        }}
      />
      <span style={{ color: "#999" }}>{label}</span>
    </div>
  );
}

function usePuckSafe() {
  try {
    return usePuck();
  } catch {
    return null;
  }
}

export function SeoScoreField() {
  const puck = usePuckSafe();
  const rootProps = puck?.appState?.data?.root?.props || {};
  const contentBlocks = puck?.appState?.data?.content || [];

  const { totalScore, checks } = useMemo(
    () => analyzeSeo(rootProps, contentBlocks),
    [rootProps, contentBlocks],
  );

  const color = scoreColor(totalScore);
  const label = totalScore >= 80 ? "Good" : totalScore >= 50 ? "Needs Improvement" : "Poor";

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <CircularGauge score={totalScore} />
        <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: 4, transition: "color 0.4s ease" }}>
          {label}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {checks.map((c) => (
          <CheckItem key={c.key} label={c.result.label} status={c.result.status} />
        ))}
      </div>
    </div>
  );
}
