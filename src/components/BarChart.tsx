import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { ChartDatum, ChartData } from "./ChartInterfaces";
import { getTextWidth } from "../utils/chartHelpers"

interface BarChartProps {
  chartData: ChartData
}

const BAR_HEIGHT = 44; // px per bar
const CHART_HEIGHT = 700; // visible area height

const BarChart: React.FC<BarChartProps> = ({ chartData }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; country: string } | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);

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
    g.selectAll("rect")
      .data(chartData.data)
      .enter()
      .append("rect")
      .attr("y", (d: ChartDatum) => y(d.country) ?? 0)
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", (d: ChartDatum) => x(d.value))
      .attr("fill", (_d: ChartDatum, i: number) => color(i))
      .attr("rx", 12)
      .attr("class", (d: ChartDatum) => hovered === d.country ? "opacity-100" : "opacity-80")
      .on("mouseenter", function (event, d: ChartDatum) {
        setHovered(d.country);
        const [xPos, yPos] = d3.pointer(event, svg.node());
        setTooltip({ x: xPos + 10, y: yPos, value: d.value, country: d.country });
      })
      .on("mouseleave", function () {
        setHovered(null);
        setTooltip(null);
      });

    // Country labels (truncate with ellipsis if too long)
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
      .attr("fill", "#22223b")
      .attr("title", (d: ChartDatum) => d.country)
      .text((d: ChartDatum) => {
        const maxChars = Math.floor((margin.left - 24) / (fontSize * 0.6));
        return d.country.length > maxChars ? d.country.slice(0, maxChars - 1) + "…" : d.country;
      });

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
      .attr("fill", "#1d3557")
      .text((d: ChartDatum) => d3.format(",.0f")(d.value));

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${drawHeight})`)
      .call(
        d3.axisBottom(x)
          .ticks(8)
          .tickFormat(d3.format(",.2s"))
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("text").attr("font-size", `${Math.max(10, Math.min(18, containerWidth/80))}px`).attr("fill", "#222"));

    // Y axis (hidden, since we show country names as labels)
    // g.append("g").call(d3.axisLeft(y));
  }, [chartData, hovered, containerWidth]);

  const svgHeight = Math.max((chartData.data.length || 1) * BAR_HEIGHT + 90, CHART_HEIGHT);
  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-100 border rounded relative min-h-[350px] min-w-[350px] overflow-hidden p-0">
      <div className="w-full h-full max-h-[700px] overflow-y-auto">
        <svg ref={svgRef} style={{ width: containerWidth, height: `${svgHeight}px`, display: "block" }}
        viewBox={`0 0 ${containerWidth} ${svgHeight}`} />
      </div>
      {tooltip && (
        <div
          className="absolute bg-white border border-blue-200 rounded shadow px-3 py-2 text-base z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-blue-800 text-lg">{tooltip.country}</div>
          <div className="text-blue-700 text-lg">{d3.format(",.0f")(tooltip.value)}</div>
        </div>
      )}
    </div>
  );
};

export default BarChart; 