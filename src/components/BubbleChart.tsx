import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

interface BubbleChartProps {
  data?: any;
  year?: number;
}

const BubbleChart: React.FC<BubbleChartProps> = ({ data, year }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 500 });

  // Responsive: observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      setContainerSize({
        width: containerRef.current?.offsetWidth || 900,
        height: containerRef.current?.offsetHeight || 500,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!data || !year || !data.data) return;
    const yearStr = String(year);
    const chartData = data.data
      .map((d: any) => ({
        country: d.country,
        code: d.code,
        value: d.values[yearStr],
      }))
      .filter((d: { value: number | undefined | null }) => typeof d.value === "number" && !isNaN(d.value));

    // Responsive dimensions
    const width = Math.max(containerSize.width, 400);
    const height = Math.max(containerSize.height, 320);
    const margin = 20;

    // Only numbers for d3.min/max
    const values: number[] = chartData
      .map((d: { value: number }) => d.value)
      .filter((v: number): v is number => typeof v === "number" && !isNaN(v));
    const minValue = d3.min(values) ?? 0;
    const maxValue = d3.max(values) ?? 1;

    // Bubble size scale
    const r = d3.scaleSqrt()
      .domain([minValue, maxValue])
      .range([10, 0.08 * width]);

    // Color scale
    const color = d3.scaleOrdinal<string, string>(d3.schemeCategory10);

    // D3 pack layout
    const root = d3.hierarchy<{ children: typeof chartData }>({ children: chartData })
      .sum((d: any) => d.value);
    const pack = d3.pack<{ children: typeof chartData }>()
      .size([width - 2 * margin, height - 2 * margin])
      .padding(4);
    const nodes = pack(root).leaves();

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin},${margin})`);

    g.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("cx", (d: d3.HierarchyCircularNode<any>) => d.x)
      .attr("cy", (d: d3.HierarchyCircularNode<any>) => d.y)
      .attr("r", (d: d3.HierarchyCircularNode<any>) => d.r)
      .attr("fill", (_d: d3.HierarchyCircularNode<any>, i: number) => color(i.toString()))
      .attr("opacity", 0.8);

    g.selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", (d: d3.HierarchyCircularNode<any>) => d.x)
      .attr("y", (d: d3.HierarchyCircularNode<any>) => d.y)
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("font-size", (d: d3.HierarchyCircularNode<any>) => `${Math.max(10, d.r/2.5)}px`)
      .attr("fill", "#222")
      .text((d: d3.HierarchyCircularNode<any>) => d.data.code);
  }, [data, year, containerSize]);

  if (!data || !year) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 border rounded">
        <span className="text-gray-400">No data available</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-100 border rounded relative min-h-[350px] min-w-[350px]">
      <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
};

export default BubbleChart; 