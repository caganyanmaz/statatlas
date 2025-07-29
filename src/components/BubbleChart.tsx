import React, { useRef, useEffect, useState } from "react";
import { ChartData, ChartDatum } from "./ChartInterfaces";
import * as d3 from "d3";
import Tooltip from "./Tooltip";

interface BubbleChartProps {
  chartData: ChartData;
}

const BubbleChart: React.FC<BubbleChartProps> = ({ chartData }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 500 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const initializedCodes = useRef<Set<string>>(new Set());
  const lastPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  const codeToColor = useRef<Map<string, string>>(new Map());

  const colorScale = d3.scaleOrdinal<string, string>(d3.schemeCategory10);
  chartData.data.forEach((d, i) => {
    if (!codeToColor.current.has(d.code)) {
      codeToColor.current.set(d.code, colorScale(d.code));
    }
  });

  useEffect(() => {
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
    const width = Math.max(containerSize.width, 400);
    const height = Math.max(containerSize.height, 320);

    const values = chartData.data.map((d) => d.value);
    const rScale = d3.scaleSqrt()
      .domain([d3.min(values) ?? 0, d3.max(values) ?? 1])
      .range([10, 0.08 * width]);




    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    const nodes = chartData.data.map((d) => {
      const last = lastPositions.current.get(d.code);
      return {
        ...d,
        radius: rScale(d.value),
        x: last?.x ?? width / 2 + Math.random() * 10,
        y: last?.y ?? height / 2 + Math.random() * 10,
      };
    });

    // Re-run simulation for layout update only
    const simulation = d3.forceSimulation(nodes as any)
      .force("charge", d3.forceManyBody().strength(1))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.radius + 1))
      .stop();

    for (let i = 0; i < 100; i++) simulation.tick();

    // Save new positions
    nodes.forEach((d) => {
      lastPositions.current.set(d.code, { x: d.x, y: d.y });
    });

    // Animate positions only — no popping
    const circles = g.selectAll("circle")
      .data(nodes, (d: any) => d.code)
      .join(
        enter =>
          enter.append("circle")
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("r", (d: any) => d.radius)
            .attr("fill", (d: any) => codeToColor.current.get(d.code)!)
            .attr("opacity", 0.85)
            .on("mouseenter", (event, d: any) => {
              const [x, y] = d3.pointer(event, containerRef.current);
              setTooltip({
                x,
                y,
                content: (
                  <>
                    <div className="font-semibold text-blue-800 text-lg">{d.country}</div>
                    <div className="text-blue-700 text-lg">{d3.format(",.0f")(d.value)}</div>
                  </>
                ),
              });
            })
            .on("mouseleave", () => {
              setTooltip(null);
            }),
        update =>
          update.transition()
            .duration(800)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("r", (d: any) => d.radius)
      );

    const labels = g.selectAll("text")
      .data(nodes, (d: any) => d.code)
      .join(
        enter =>
          enter.append("text")
            .attr("x", (d: any) => d.x)
            .attr("y", (d: any) => d.y)
            .attr("text-anchor", "middle")
            .attr("dy", ".3em")
            .attr("font-size", (d: any) => `${Math.max(10, d.radius / 2.5)}px`)
            .attr("fill", "#222")
            .text((d: any) => d.code),
        update =>
          update.transition()
            .duration(800)
            .attr("x", (d: any) => d.x)
            .attr("y", (d: any) => d.y)
            .attr("font-size", (d: any) => `${Math.max(10, d.radius / 2.5)}px`)
            .style("user-select", "none")
            .style("cursor", "default")
      );

  }, [chartData, containerSize]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-gray-100 border rounded relative min-h-[350px] min-w-[350px]"
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {tooltip && (
        <div style={{ position: "absolute", left: tooltip.x + 10, top: tooltip.y }}>
          <Tooltip content={tooltip.content} />
        </div>
      )}
    </div>
  );
};

export default BubbleChart;
