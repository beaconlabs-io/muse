"use client";

import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as dfd from "danfojs";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChartData = {
  metric_key: string;
  origin_key: string;
  date: string;
  value: number;
};

// Chart configuration
const chartConfig = {
  arbitrum: {
    label: "Arbitrum",
    color: "#12AAFF",
  },
  optimism: {
    label: "Optimism",
    color: "#FF0420",
  },
} satisfies ChartConfig;

export function MultipleLine() {
  // State
  const [timeRange, setTimeRange] = useState("90d");
  const queryClient = useQueryClient();
  const data = queryClient.getQueryData(["getTxcounts"]);

  // Data processing
  const processedData = useMemo(() => {
    if (!data) return [];

    const df = new dfd.DataFrame(data);

    // Filter by txcount metric only
    const filteredByMetric = df.query(df["metric_key"].eq("txcount"));

    // Filter for Arbitrum and Optimism only
    const filteredByChains = filteredByMetric.query(
      df["origin_key"].eq("arbitrum").or(df["origin_key"].eq("optimism"))
    );

    // Sort by date
    const sorted = filteredByChains.sortValues("date", { ascending: true });

    // Convert to JSON format
    const jsonData = dfd.toJSON(sorted, {
      format: "column",
    }) as ChartData[];

    // Filter by selected time period
    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    } else if (timeRange === "180d") {
      daysToSubtract = 180;
    } else if (timeRange === "1y") {
      daysToSubtract = 365;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const filteredByDate = jsonData.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate;
    });

    // Group by date and format for chart
    const dateMap = new Map();

    filteredByDate.forEach((item) => {
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, { date: item.date });
      }

      const entry = dateMap.get(item.date);
      entry[item.origin_key] = item.value;
    });

    // Convert to array and sort by date
    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data, timeRange]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Arbitrum and Optimism Transaction Comparison</CardTitle>
            <CardDescription>Transaction count trends</CardDescription>
          </div>
          <div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] rounded-lg">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="1y" className="rounded-lg">
                  Last 1 year
                </SelectItem>
                <SelectItem value="180d" className="rounded-lg">
                  Last 6 months
                </SelectItem>
                <SelectItem value="90d" className="rounded-lg">
                  Last 3 months
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Last 7 days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={processedData}
              margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="arbitrum" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-arbitrum)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-arbitrum)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="optimism" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-optimism)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-optimism)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    year: "2-digit",
                    month: "numeric",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  // Format large numbers with abbreviations (K, M, B)
                  if (value >= 1000000000) {
                    return `${(value / 1000000000).toFixed(1)}B`;
                  } else if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(1)}K`;
                  }
                  return value;
                }}
              />
              <ChartTooltip
                cursor={true}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        year: "2-digit",
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="arbitrum"
                type="monotone"
                name="Arbitrum"
                fill="url(#arbitrum)"
                stroke="var(--color-arbitrum)"
                fillOpacity={0.6}
              />
              <Area
                dataKey="optimism"
                type="monotone"
                name="Optimism"
                fill="url(#optimism)"
                stroke="var(--color-optimism)"
                fillOpacity={0.6}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
