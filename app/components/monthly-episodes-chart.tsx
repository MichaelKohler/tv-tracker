import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyStats {
  month: string;
  episodes: number;
  runtime: number;
  showCount: number;
}

interface MonthlyEpisodesChartProps {
  data: MonthlyStats[];
}

export default function MonthlyEpisodesChart({
  data,
}: MonthlyEpisodesChartProps) {
  // Transform data to better format for chart and sort chronologically
  const chartData = data
    .map((item) => ({
      ...item,
      // Extract month/year for better sorting
      monthYear: item.month,
      // Create a short month format for better display
      shortMonth: item.month.split(" ")[0].substring(0, 3),
    }))
    .sort((a, b) => {
      // Sort by date (month/year)
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h3 className="mb-4 text-xl font-semibold">Episodes Watched Per Month</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="shortMonth"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.shortMonth === label);
                return item ? item.monthYear : label;
              }}
              formatter={(value, name) => [
                value,
                name === "episodes" ? "Episodes" : name,
              ]}
            />
            <Line
              type="monotone"
              dataKey="episodes"
              stroke="#1f3352"
              strokeWidth={2}
              dot={{ fill: "#1f3352", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
