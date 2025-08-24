import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChartData } from "./ChartInterfaces";
import * as d3 from "d3";
import Tooltip from "./Tooltip";

interface BubbleChartProps {
  chartData: ChartData;
}

// --- Utilities for determinism ---
function hashString(str: string): number {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const BubbleChart: React.FC<BubbleChartProps> = ({ chartData }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const circlesRef = useRef<SVGGElement | null>(null);
  const labelsRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const nodesRef = useRef<
    Array<{
      code: string;
      country: string;
      value: number;
      radius: number;
      x: number;
      y: number;
      vx?: number;
      vy?: number;
    }>
  >([]);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [box, setBox] = useState({ width: 900, height: 500 });

  // Color scale is stable per code
  const colorFor = useMemo(() => {
    const scale = d3.scaleOrdinal<string, string>(d3.schemeCategory10);
    return (code: string) => scale(code);
  }, []);

  // Resize observer (more accurate than window resize for flex/containers)
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const ent of entries) {
        const cr = ent.contentRect;
        setBox({ width: Math.max(400, cr.width || 900), height: Math.max(320, cr.height || 500) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Derived scales (memoized)
  const rScale = useMemo(() => {
    const values = chartData.data.map((d) => d.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    // keep radius relative to width for responsiveness
    const maxR = Math.max(12, 0.08 * box.width);
    return d3.scaleSqrt().domain([min, max]).range([10, maxR]);
  }, [chartData, box.width]);

  // Initialize once: SVG structure + simulation with deterministic RNG
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.attr("width", box.width).attr("height", box.height).attr("viewBox", `0 0 ${box.width} ${box.height}`);

    if (!gRef.current) {
      gRef.current = svg.append("g").node() as SVGGElement;
      circlesRef.current = d3.select(gRef.current).append("g").attr("data-layer", "circles").node() as SVGGElement;
      labelsRef.current = d3.select(gRef.current).append("g").attr("data-layer", "labels").node() as SVGGElement;
    }

    if (!simulationRef.current) {
      const sim = d3.forceSimulation()
        .force("center", d3.forceCenter(box.width / 2, box.height / 2))
        .force("collide", d3.forceCollide((d: any) => d.radius + 1))
        .force("x", d3.forceX(box.width / 2).strength(0.03))
        .force("y", d3.forceY(box.height / 2).strength(0.03))
        .alphaDecay(0.08);

      // Deterministic randomness for stable layouts across runs
      const rng = mulberry32(0xC0FFEE); // fixed seed; can be swapped to dataset-based if desired
      // @ts-ignore - d3 v7 supports randomSource
      if (typeof (sim as any).randomSource === "function") (sim as any).randomSource(rng);

      sim.on("tick", () => {
        const circles = d3.select(circlesRef.current).selectAll<SVGCircleElement, any>("circle");
        circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        const labels = d3.select(labelsRef.current).selectAll<SVGTextElement, any>("text");
        labels.attr("x", (d) => d.x).attr("y", (d) => d.y).attr("font-size", (d) => `${Math.max(10, d.radius / 2.5)}px`);
      });

      simulationRef.current = sim;
    }

    return () => {
      // stop on unmount
      simulationRef.current?.stop();
      simulationRef.current = null;
    };
  }, []);

  // Update viewport forces when container size changes
  useEffect(() => {
    d3.select(svgRef.current)
      .attr("width", box.width)
      .attr("height", box.height)
      .attr("viewBox", `0 0 ${box.width} ${box.height}`);

    if (simulationRef.current) {
      (simulationRef.current.force("center") as d3.ForceCenter<any>).x(box.width / 2).y(box.height / 2);
      (simulationRef.current.force("x") as d3.ForceX<any>).x(box.width / 2);
      (simulationRef.current.force("y") as d3.ForceY<any>).y(box.height / 2);
      simulationRef.current.alpha(0.5).restart();
    }
  }, [box.width, box.height]);

  // Data join & simulation update — runs when data or rScale changes
  useEffect(() => {
    // Build new nodes array, preserving existing positions when possible
    const byCode = new Map(nodesRef.current.map((n) => [n.code, n] as const));
    const centerX = box.width / 2, centerY = box.height / 2;

    const nodes = chartData.data.map((d) => {
      const prev = byCode.get(d.code);
      const seed = hashString(d.code);
      const rand = mulberry32(seed);
      const angle = rand() * Math.PI * 2;
      const radiusJitter = 10 + rand() * 20; // deterministic small jitter
      return {
        code: d.code,
        country: d.country,
        value: d.value,
        radius: rScale(d.value),
        x: prev?.x ?? centerX + Math.cos(angle) * radiusJitter,
        y: prev?.y ?? centerY + Math.sin(angle) * radiusJitter,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
      };
    });

    nodesRef.current = nodes;

    // D3 join (no full re-render)
    const circlesSel = d3
      .select(circlesRef.current)
      .selectAll<SVGCircleElement, any>("circle")
      .data(nodes, (d: any) => d.code);

    circlesSel
      .enter()
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("fill", (d) => colorFor(d.code))
      .attr("opacity", 0.88)
      .on("mouseenter", (event, d) => {
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
      .on("mouseleave", () => setTooltip(null));

    circlesSel
      .transition()
      .duration(500)
      .attr("r", (d) => d.radius);

    circlesSel.exit().remove();

    const labelsSel = d3
      .select(labelsRef.current)
      .selectAll<SVGTextElement, any>("text")
      .data(nodes, (d: any) => d.code);

    labelsSel
      .enter()
      .append("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "#222")
      .style("user-select", "none")
      .style("pointer-events", "none")
      .text((d) => d.code);

    labelsSel.exit().remove();

    // (Re)start simulation with the new nodes
    const sim = simulationRef.current!;
    sim.nodes(nodes as any);
    sim.alpha(0.9).restart();
  }, [chartData, rScale, box.width, box.height, colorFor]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-100 border rounded relative min-h-[350px] min-w-[350px]">
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
