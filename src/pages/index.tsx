import React, { useState } from "react";
import Dropdown from "../components/Dropdown";
import ChartRenderer from "../components/ChartRenderer";
import Slider from "../components/Slider";
import { useDataLoader } from "../hooks/useDataLoader";

const datasets = [
  { value: "gdp", label: "GDP" },
  { value: "population", label: "Population" },
];

const chartTypes = [
  { value: "bubble", label: "Bubble Chart" },
  { value: "bar", label: "Bar Chart" },
  { value: "map", label: "Map Chart"},
  { value: "proportional-map", label: "Proportional Map Chart" }
];

export default function Home() {
  const [dataset, setDataset] = useState("gdp");
  const [chartType, setChartType] = useState("bubble");
  const [year, setYear] = useState(2022);

  const { data, loading, error } = useDataLoader(dataset);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 bg-white shadow">
        <h1 className="text-2xl font-bold tracking-tight">StatAtlas</h1>
        <a href="#" className="text-blue-600 hover:underline">About</a>
      </header>
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-full max-w-xs bg-white border-r px-6 py-8 flex flex-col gap-6 shadow-sm">
          <div>
            <Dropdown
              label="Dataset"
              options={datasets}
              value={dataset}
              onChange={setDataset}
            />
          </div>
          <div>
            <Dropdown
              label="Chart Type"
              options={chartTypes}
              value={chartType}
              onChange={setChartType}
            />
          </div>
          <div>
            <Slider min={1960} max={2022} value={year} onChange={setYear} />
          </div>
        </aside>
        {/* Main chart area */}
        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col justify-center items-center w-full h-full min-h-0">
            <div className="w-full h-full flex-1 flex items-center justify-center min-h-[350px]">
              {loading && <div className="text-center text-gray-500">Loading data...</div>}
              {error && <div className="text-center text-red-500">{error}</div>}
              {!loading && !error && (
                <ChartRenderer chartType={chartType} data={data} year={year} onlyCountries={true} />
              )}
            </div>
            <section className="mt-8 p-4 bg-white rounded shadow max-w-3xl w-full mx-auto">
              <h2 className="font-semibold mb-2">Legend / Tooltip</h2>
              <p className="text-gray-600 text-sm">Hover over the chart to see details here.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
