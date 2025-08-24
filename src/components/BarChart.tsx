import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { ChartDatum, ChartData } from "./ChartInterfaces";
import { getTextWidth } from "../utils/chartHelpers";

interface BarChartProps {
  chartData: ChartData;
  /** Optional external control of selection */
  selectedCountry?: string | null;
  /** Notify parent when selection changes (click the same country again to clear) */
  onSelectCountry?: (country: string | null) => void;
  /** History by country for the small trend view: [{ year, value }, ...] */
  historyByCountry?: Record<string, Array<{ year: number; value: number }>>;
}

const BAR_HEIGHT = 44; // px per bar
const CHART_HEIGHT = 700; // visible area height

const Sparkline: React.FC<{
  series: Array<{ year: number; value: number }>;
  width?: number;
  height?: number;
  format?: (n: number) => string;
}> = ({ series, width = 320, height = 120, format = d3.format(",.0f") as (n: number) => string }) => {
  const padding = { top: 14, right: 12, bottom: 22, left: 32 };
  const w = Math.max(60, width);
  const h = Math.max(60, height);
  const innerW = Math.max(1, w - padding.left - padding.right);
  const innerH = Math.max(1, h - padding.top - padding.bottom);

  const years = series.map(d => d.year);
  const values = series.map(d => d.value);

  const x = d3.scaleLinear()
    .domain(d3.extent(years) as [number, number])
    .range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(values) || 1])
    .nice()
    .range([innerH, 0]);

  const path = d3.line<{ year: number; value: number }>()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX)(series);

  const first = series[0];
  const last = series[series.length - 1];
  const delta = last && first ? last.value - first.value : 0;
  const deltaPct = last && first && first.value !== 0 ? (delta / first.value) * 100 : 0;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* grid */}
        {y.ticks(3).map((t, i) => (
          <line key={i} x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeDasharray="2,2" />
        ))}
        {/* path */}
        {path && <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />}
        {/* axes (minimal) */}
        <g transform={`translate(0,${innerH})`}>
          {x.ticks(3).map((t, i) => (
            <text key={i} x={x(t)} y={16} textAnchor="middle" fontSize={10} fill="#6b7280">{t}</text>
          ))}
        </g>
        <g>
          {y.ticks(3).map((t, i) => (
            <text key={i} x={-8} y={y(t)} textAnchor="end" alignmentBaseline="middle" fontSize={10} fill="#6b7280">{format(t)}</text>
          ))}
        </g>
      </g>
      {/* delta badge */}
      <g>
        <text x={w - 8} y={16} textAnchor="end" fontSize={12} fill={delta >= 0 ? "#065f46" : "#7f1d1d"}>
          {delta >= 0 ? "+" : ""}{format(delta)} ({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)
        </text>
      </g>
    </svg>
  );
};

const BarChart: React.FC<BarChartProps> = ({ chartData, selectedCountry: selectedProp, onSelectCountry, historyByCountry }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; country: string } | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  // Internal selection if not controlled by parent
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selectedCountry = selectedProp !== undefined ? selectedProp : internalSelected;
  const setSelected = (c: string | null) => {
    if (onSelectCountry) onSelectCountry(c);
    if (selectedProp === undefined) setInternalSelected(c);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      setContainerWidth(containerRef.current?.offsetWidth || 900);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Dynamically calculate left margin based on longest country name
    const fontSize = Math.max(12, Math.min(22, containerWidth / 60));
    const font = `700 ${fontSize}px Inter, sans-serif`;
    const maxNameWidth = typeof window !== "undefined"
      ? Math.max(...chartData.allNames.map(d => getTextWidth(d, font)))
      : 120;
    // Dynamically calculate right margin based on max value label width
    const maxValue = chartData.maxValue;
    const valueLabel = d3.format(",.0f")(maxValue);
    const valueLabelWidth = typeof window !== "undefined" ? getTextWidth(valueLabel, `600 ${Math.max(10, Math.min(18, containerWidth/80))}px Inter, sans-serif`) : 40;
    const margin = {
      top: 20,
      right: Math.max(48, Math.min(valueLabelWidth + 48, 180)),
      bottom: 50,
      left: Math.max(80, Math.min(maxNameWidth + 24, 220)),
    };

    // Drawing area
    const width = Math.max(containerWidth, 400);
    const height = Math.max(chartData.data.length * BAR_HEIGHT, CHART_HEIGHT, 320);
    const drawWidth = Math.max(1, width - margin.left - margin.right);
    const drawHeight = Math.max(1, height - margin.top - margin.bottom);

    // Fixed x-axis max depending on metric
    let xMax = chartData.maxValue;

    const x = d3.scaleLinear()
      .domain([0, xMax])
      .range([0, drawWidth]);

    const y = d3.scaleBand<string>()
      .domain(chartData.data.map(d => d.country))
      .range([0, drawHeight])
      .padding(0.12);

    // Blue color gradient
    const color = d3.scaleLinear<string>()
      .domain([0, chartData.data.length - 1])
      .range(["#60a5fa", "#1d4ed8"]);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisBottom(x)
          .ticks(8)
          .tickSize(drawHeight)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "2,2");

    // Bars
    const bars = g.selectAll("rect")
      .data(chartData.data, (d: any) => d.country as string)
      .enter()
      .append("rect")
      .attr("y", (d: ChartDatum) => y(d.country) ?? 0)
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", (d: ChartDatum) => x(d.value))
      .attr("fill", (_d: ChartDatum, i: number) => color(i))
      .attr("rx", 12)
      .attr("cursor", "pointer")
      .attr("opacity", (d: ChartDatum) => (hovered === d.country || selectedCountry === d.country ? 1 : 0.8))
      .attr("stroke", (d: ChartDatum) => (selectedCountry === d.country ? "#111827" : "none"))
      .attr("stroke-width", (d: ChartDatum) => (selectedCountry === d.country ? 2 : 0))
      .on("mouseenter", function (event, d: ChartDatum) {
        setHovered(d.country);
        const [xPos, yPos] = d3.pointer(event, svg.node());
        setTooltip({ x: xPos + 10, y: yPos, value: d.value, country: d.country });
      })
      .on("mouseleave", function () {
        setHovered(null);
        setTooltip(null);
      })
      .on("click", (_event, d: ChartDatum) => {
        setSelected(selectedCountry === d.country ? null : d.country);
      });

    // Country labels
    g.selectAll("text.label")
      .data(chartData.data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", -14)
      .attr("y", (d: ChartDatum) => (y(d.country) ?? 0) + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .attr("font-size", `${fontSize}px`)
      .attr("font-weight", 700)
      .attr("fill", (d: ChartDatum) => (selectedCountry === d.country ? "#111827" : "#22223b"))
      .attr("title", (d: ChartDatum) => d.country)
      .attr("cursor", "pointer")
      .text((d: ChartDatum) => {
        const maxChars = Math.floor((margin.left - 24) / (fontSize * 0.6));
        return d.country.length > maxChars ? d.country.slice(0, maxChars - 1) + "…" : d.country;
      })
      .on("click", (_ev, d: ChartDatum) => setSelected(selectedCountry === d.country ? null : d.country));

    // Values
    g.selectAll("text.value")
      .data(chartData.data)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d: ChartDatum) => x(d.value) + 12)
      .attr("y", (d: ChartDatum) => (y(d.country) ?? 0) + y.bandwidth() / 2)
      .attr("alignment-baseline", "middle")
      .attr("font-size", `${Math.max(10, Math.min(18, containerWidth/80))}px`)
      .attr("font-weight", 600)
      .attr("fill", (d: ChartDatum) => (selectedCountry === d.country ? "#111827" : "#1d3557"))
      .text((d: ChartDatum) => d3.format(",.0f")(d.value));

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${drawHeight})`)
      .call(
        d3.axisBottom(x)
          .ticks(8)
          .tickFormat(d3.format(",.2s") as any)
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").attr("font-size", `${Math.max(10, Math.min(18, containerWidth/80))}px`).attr("fill", "#222"));
  }, [chartData, hovered, containerWidth, selectedCountry]);

  const svgHeight = Math.max((chartData.data.length || 1) * BAR_HEIGHT + 90, CHART_HEIGHT);

  // Memo trend series for selected
  const trendSeries = useMemo(() => {
    if (!selectedCountry || !historyByCountry) return null;
    const s = historyByCountry[selectedCountry];
    return (s && s.length > 1) ? [...s].sort((a, b) => a.year - b.year) : null;
  }, [selectedCountry, historyByCountry]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-100 border rounded relative min-h-[350px] min-w-[350px] overflow-hidden p-0">
      <div className="w-full h-full max-h-[700px] overflow-y-auto">
        <svg ref={svgRef} style={{ width: containerWidth, height: `${svgHeight}px`, display: "block" }} viewBox={`0 0 ${containerWidth} ${svgHeight}`} />
      </div>

      {tooltip && (
        <div className="absolute bg-white border border-blue-200 rounded shadow px-3 py-2 text-base z-40 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="font-semibold text-blue-800 text-lg">{tooltip.country}</div>
          <div className="text-blue-700 text-lg">{d3.format(",.0f")(tooltip.value)}</div>
        </div>
      )}

      {/* Trend panel */}
      {selectedCountry && trendSeries && (
        <div className="absolute bottom-3 right-3 z-30 bg-white/95 backdrop-blur rounded-xl shadow-lg ring-1 ring-black/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-gray-800">{selectedCountry} — trend</div>
            <button className="text-xs text-gray-500 hover:text-gray-800" onClick={() => setSelected(null)}>Clear</button>
          </div>
          <Sparkline series={trendSeries} width={320} height={120} />
        </div>
      )}
    </div>
  );
};

export default BarChart;