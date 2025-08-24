import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import worldMap from "world-atlas/countries-50m.json"; // consider 110m for even faster
import { ChartData } from "./ChartInterfaces";
import { countryIdToCode, getInterpolatedValue } from "@/utils/isoHelpers";
import Tooltip from "./Tooltip";

interface MapChartProps {
  chartData: ChartData;
}

const MapChart: React.FC<MapChartProps> = ({ chartData }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [box, setBox] = useState({ width: 900, height: 500 });

  // ---- 1) Memo: topo -> geo features once (drop Antarctica robustly)
  const countries = useMemo(() => {
    const feats = (feature(worldMap as any, (worldMap as any).objects.countries) as any).features as Array<any>;
    return feats.filter((f: any) => {
      const name = f?.properties?.name;
      const code = countryIdToCode((f as any).id);
      return name !== "Antarctica" && code !== "AQ"; // remove Antarctica
    });
  }, []);

  // Precompute id -> ISO code once
  const idToIso = useMemo(() => {
    const m = new Map<any, string>();
    for (const f of countries) {
      const code = countryIdToCode((f as any).id);
      if (code) m.set((f as any).id, code);
    }
    return m;
  }, [countries]);

  // ResizeObserver for accurate layout within container
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      const width = Math.max(480, cr.width || 900);
      const height = Math.max(360, cr.height || 500);
      setBox({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Projection/path memoized on size
  const projection = useMemo(
    () => d3.geoNaturalEarth1().scale(box.width / (2 * Math.PI)).translate([box.width / 2, box.height / 2]),
    [box.width, box.height]
  );
  const path = useMemo(() => d3.geoPath().projection(projection), [projection]);

  // Fixed domain using dataset-wide max keeps colors stable across years
  const maxValue = useMemo(() => chartData.maxValue || d3.max(chartData.data, (d) => d.value) || 1, [chartData]);
  const color = useMemo(() => d3.scaleSequential(d3.interpolateYlGnBu).domain([0, maxValue]), [maxValue]);

  // Keep latest values without rebinding handlers
  const valueMapRef = useRef<Record<string, number>>({});

  // ---- 2) Build static SVG once (no full redraw later)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.attr("width", box.width).attr("height", box.height).attr("viewBox", `0 0 ${box.width} ${box.height}`);

    if (!gRef.current) {
      gRef.current = svg.append("g").attr("data-layer", "countries").node() as SVGGElement;

      const g = d3.select(gRef.current);
      // One-time path creation, keyed by id
      g.selectAll<SVGPathElement, any>("path.country")
        .data(countries, (d: any) => (d as any).id)
        .join("path")
        .attr("class", "country")
        .attr("d", path as any)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .attr("shape-rendering", "optimizeSpeed")
        .on("mouseenter", (event, d: any) => {
          const [x, y] = d3.pointer(event, containerRef.current);
          const code = idToIso.get((d as any).id);
          const val = code ? (getInterpolatedValue(code, valueMapRef.current) as number | null) : null;
          setTooltip({
            x,
            y,
            content: (
              <>
                <div className="font-semibold text-blue-800 text-lg">{d.properties?.name}</div>
                {val != null ? (
                  <div className="text-blue-700 text-lg">{d3.format(",.0f")(val)}</div>
                ) : (
                  <div className="text-gray-500 text-sm">No data</div>
                )}
              </>
            ),
          });
        })
        .on("mouseleave", () => setTooltip(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  // ---- 3) Update size-dependent attributes (no rebind)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.attr("width", box.width).attr("height", box.height).attr("viewBox", `0 0 ${box.width} ${box.height}`);

    if (gRef.current) {
      d3.select(gRef.current).selectAll<SVGPathElement, any>("path.country").attr("d", path as any); // recompute geometry on resize only
    }
  }, [box.width, box.height, path]);

  // ---- 4) Fast color updates when data/year changes (no path rebuild)
  useEffect(() => {
    const vm: Record<string, number> = {};
    for (const d of chartData.data) vm[d.code] = d.value;
    valueMapRef.current = vm;

    if (gRef.current) {
      d3.select(gRef.current)
        .selectAll<SVGPathElement, any>("path.country")
        .attr("fill", (d: any) => {
          const code = idToIso.get((d as any).id);
          const val = code ? (getInterpolatedValue(code, vm) as number | null) : null;
          return val != null ? color(val) : "#ccc";
        });
    }
  }, [chartData, idToIso, color]);

  // ---- 5) Legend helpers (no inline functions in JSX) ----
  const legendGradient = useMemo(() => {
    const N = 12;
    const stops = Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1);
      return color(t * maxValue);
    });
    return `linear-gradient(to right, ${stops.join(",")})`;
  }, [color, maxValue]);

  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1], []);
  const legendPx = useMemo(() => Math.max(260, Math.min(480, box.width * 0.55)), [box.width]);
  const fmtShort = useMemo(() => d3.format(".2s"), []);

  return (
    <div ref={containerRef} className="relative pb-16 md:pb-20">
      <svg ref={svgRef} style={{ display: "block" }} />

      {/* Legend / color range tooltip with ticks */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 md:bottom-3">
        <div className="rounded-xl bg-white/90 backdrop-blur px-3 py-2 shadow ring-1 ring-black/5">
          <div className="text-[11px] text-gray-600 mb-1">Value scale</div>
          <div style={{ width: legendPx }}>
            <div
              className="relative h-2 w-full rounded-full"
              style={{ background: legendGradient }}
              aria-hidden="true"
            >
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-black/30"
                  style={{ left: `${t * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-gray-700">
              {ticks.map((t) => (
                <span key={t}>{fmtShort(t * maxValue)}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          style={{ position: "absolute", left: tooltip.x + 10, top: tooltip.y, pointerEvents: "none" }}
        >
          <Tooltip content={tooltip.content} />
        </div>
      )}
    </div>
  );
};

export default MapChart;
