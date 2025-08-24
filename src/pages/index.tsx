import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Dropdown from "../components/Dropdown";
import ChartRenderer from "../components/ChartRenderer";
import Slider from "../components/Slider";
import { useDataLoader } from "../hooks/useDataLoader";
import { isChartTypeRequiringYear } from "../utils/chartHelpers";

const datasets = [
  { value: "gdp", label: "GDP" },
  { value: "population", label: "Population" },
];

const chartTypes = [
  { value: "bubble", label: "Bubble Chart" },
  { value: "bar", label: "Bar Chart" },
  { value: "map", label: "Map Chart" },
  { value: "proportional-map", label: "Proportional Map Chart" },
  { value: "slope", label: "Slope Chart" },
];

// Year animation constants
const YEAR_MIN = 1960;
const YEAR_MAX = 2022;
const STEP_MS = 50; // interval between year steps

function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Lock scroll and handle ESC
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Simple focus management: move focus to the dialog when opened
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="about-title"
              tabIndex={-1}
              ref={dialogRef}
              className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              {/* Top border accent */}
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 rounded-t-2xl" />

              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <h2 id="about-title" className="text-2xl font-semibold tracking-tight">
                    About StatAtlas
                  </h2>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    aria-label="Close about dialog"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-gray-600 leading-relaxed">
                  <p>
                    StatAtlas lets you explore global datasets with beautiful, interactive visualizations.
                    Choose a dataset, pick a chart type, and scrub through years to see trends unfold.
                  </p>
                  <ul className="list-disc pl-5">
                    <li>Datasets: GDP, Population (more soon)</li>
                    <li>Charts: Bubble, Bar, Map, Proportional Map, Slope</li>
                    <li>Tips: Hover for details, use the legend, and try different years</li>
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default function Home() {
  const [dataset, setDataset] = useState("gdp");
  const [chartType, setChartType] = useState("bubble");
  const [year, setYear] = useState(2022);
  const [isShowingAboutPage, setIsShowingAboutPage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const { data, loading, error } = useDataLoader(dataset);

  // Start/stop the year animation
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (year == YEAR_MAX)
      setYear(YEAR_MIN);
    timerRef.current = window.setInterval(() => {
      setYear(prev => { 
        if (prev == YEAR_MAX) {
          setIsPlaying(false);
          return YEAR_MAX;
        } else {
          return prev + 1;
        }
      }
      )
    }, STEP_MS);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  // If current chart type doesn't use year, stop the animation
  useEffect(() => {
    if (!isChartTypeRequiringYear(chartType) && isPlaying) {
      setIsPlaying(false);
    }
  }, [chartType, isPlaying]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 bg-white shadow">
        <h1 className="text-2xl font-bold tracking-tight">StatAtlas</h1>
        <button
          className="text-blue-600 hover:underline hover:cursor-pointer"
          onClick={() => setIsShowingAboutPage(true)}
        >
          About
        </button>
      </header>

      {/* Dim page slightly when modal is animating/open using an overlay state class */}
      <div className={`flex flex-1 min-h-0 transition-[filter] duration-300 ${
        isShowingAboutPage ? "sm:contrast-95" : ""
      }`}>
        {/* Sidebar */}
        <aside className="w-full max-w-xs bg-white border-r px-6 py-8 flex flex-col gap-6 shadow-sm">
          <div>
            <Dropdown label="Dataset" options={datasets} value={dataset} onChange={setDataset} />
          </div>
          <div>
            <Dropdown label="Chart Type" options={chartTypes} value={chartType} onChange={setChartType} />
          </div>
          <div>
            {isChartTypeRequiringYear(chartType) ? (
              <div className="flex items-center gap-3">
                <Slider min={YEAR_MIN} max={YEAR_MAX} value={year} onChange={setYear} />
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-pressed={isPlaying}
                  aria-label={isPlaying ? "Pause year animation" : "Play year animation"}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    isPlaying
                      ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {isPlaying ? (
                    <span className="leading-none">⏸</span>
                  ) : (
                    <span className="leading-none">▶️</span>
                  )}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>
              </div>
            ) : null}
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

      {/* About Modal */}
      <AboutModal open={isShowingAboutPage} onClose={() => setIsShowingAboutPage(false)} />
    </div>
  );
}
