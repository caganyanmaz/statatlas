import React from "react";
import BubbleChart from "./BubbleChart";
import BarChart from "./BarChart";

interface ChartRendererProps {
  chartType: string;
  data?: any;
  year?: number;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartType, data, year }) => {
  if (chartType === "bubble") {
    return <BubbleChart data={data} year={year} />;
  }
  if (chartType === "bar") {
    return <BarChart data={data} year={year} />;
  }
  return (
    <div className="border rounded-lg bg-white shadow h-96 flex flex-col items-center justify-center">
      <span className="text-gray-400 text-xl mb-2">[Chart: {chartType}]</span>
      {year && <span className="text-gray-500 text-sm">Year: {year}</span>}
      {data && (
        <pre className="text-xs text-gray-400 mt-2 max-h-32 overflow-auto">
          {JSON.stringify(data?.data?.slice(0, 2), null, 2)}
          {data?.data && data.data.length > 2 && "\n..."}
        </pre>
      )}
    </div>
  );
};

export default ChartRenderer; 