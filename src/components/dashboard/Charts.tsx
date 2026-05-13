import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Spinner, SectionCard, EmptyState } from '@/components/ui/DashboardPrimitives'
import type {
  TrendPoint,
  VendorSpend,
  ApprovalDistribution,
} from "@/types/dashboard";
import { useTheme } from "@/context/ThemeContext";

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "#16A34A",
  PENDING: "#D97706",
  REJECTED: "#DC2626",
  UNKNOWN: "#94A3B8",
};

const VENDOR_COLORS = [
  "#2563EB",
  "#7C3AED",
  "#0D9488",
  "#EA580C",
  "#DB2777",
  "#CA8A04",
  "#0891B2",
  "#4ADE80",
];

// ─── Invoice Trend ────────────────────────────────────────────────────────────

interface TrendChartProps {
  data: TrendPoint[];
  isLoading: boolean;
}

export const InvoiceTrendChart: React.FC<TrendChartProps> = ({
  data,
  isLoading,
}) => {
  const { isDark } = useTheme();
  const textColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <SectionCard title="Invoice Trend" subtitle="Last 30 days">
      {isLoading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Spinner />
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: textColor }}
                tickFormatter={(d) => d.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: isDark ? "#1E293B" : "#fff",
                  border: `1px solid ${isDark ? "#1F2937" : "#E2E8F0"}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: isDark ? "#F1F5F9" : "#0F172A",
                }}
                formatter={(v: unknown) => [`${v} invoices`, "Count"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#trendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
};

// ─── Approval Donut ───────────────────────────────────────────────────────────

interface DonutChartProps {
  data: ApprovalDistribution[];
  isLoading: boolean;
}

export const ApprovalDonutChart: React.FC<DonutChartProps> = ({
  data,
  isLoading,
}) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  const { isDark } = useTheme();

  return (
    <SectionCard title="Approval Distribution" subtitle="By status">
      {isLoading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Spinner />
        </div>
      ) : (
        <div className="chart-container" style={{ minHeight: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={STATUS_COLORS[entry.status] ?? "#94A3B8"}
                  />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v: string) => (
                  <span
                    style={{
                      fontSize: 12,
                      color: isDark ? "#94A3B8" : "#64748B",
                    }}
                  >
                    {v}
                  </span>
                )}
              />
              <Tooltip
                contentStyle={{
                  background: isDark ? "#1E293B" : "#fff",
                  border: `1px solid ${isDark ? "#1F2937" : "#E2E8F0"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: unknown, name: unknown) => {
                  const num = Number(v);
                  return [
                    `${num} (${total > 0 ? ((num / total) * 100).toFixed(1) : 0}%)`,
                    String(name),
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
};

// ─── Vendor Spend ─────────────────────────────────────────────────────────────

interface VendorChartProps {
  data: VendorSpend[];
  isLoading: boolean;
}

export const VendorSpendChart: React.FC<VendorChartProps> = ({
  data,
  isLoading,
}) => {
  const { isDark } = useTheme();
  const textColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <SectionCard title="Vendor Spend" subtitle="Top 8 vendors by invoice value">
      {isLoading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Spinner />
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 8, bottom: 0, left: 60 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: textColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${v}`
                }
              />
              <YAxis
                type="category"
                dataKey="vendor"
                tick={{ fontSize: 11, fill: textColor }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: isDark ? "#1E293B" : "#fff",
                  border: `1px solid ${isDark ? "#1F2937" : "#E2E8F0"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: unknown) => [
                  `₹${(v as number).toLocaleString("en-IN")}`,
                  "Total Spend",
                ]}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={VENDOR_COLORS[i % VENDOR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
};
