import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import worldMap from "world-atlas/countries-50m.json";
import { ChartData } from "./ChartInterfaces";
import { countryIdToCode, getInterpolatedValue } from "@/utils/isoHelpers";
import Tooltip from "./Tooltip";

const MENU_WIDTH = 500; // Adjust this based on your actual menu width

interface MapChartProps {
  chartData: ChartData;
}

const MapChart: React.FC<MapChartProps> = ({ chartData }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  useEffect(() => {
    const { data } = chartData;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = window.innerWidth - MENU_WIDTH;
    const height = window.innerHeight * 0.75;

    const projection = d3
      .geoNaturalEarth1()
      // Adjust scale for the new width, tweak the divisor for best fit
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);
    const currentMaxValue = Math.max(...data.map(country => country.value));

    const color = d3
      .scaleSequential(d3.interpolateYlGnBu)
      .domain([0, currentMaxValue]);

    const valueMap: Record<string, number> = {};
    for (const datum of data) {
      valueMap[datum.code] = datum.value;
    }

    const countries = (feature(worldMap as any, (worldMap as any).objects.countries) as any).features;

    svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        const val = getInterpolatedValue(countryIdToCode(d.id), valueMap);
        return val !== null ? color(val) : "#ccc";
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5)
      .on("mouseenter", (event, d: any) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        const val = getInterpolatedValue(countryIdToCode(d.id), valueMap);
        setTooltip({
          x,
          y,
          content: (
            <>
              <div className="font-semibold text-blue-800 text-lg">{d.properties.name}</div>
              {val !== null ? (
                <div className="text-blue-700 text-lg">{d3.format(",.0f")(val)}</div>
              ) : (
                <div className="text-gray-500 text-sm">No data</div>
              )}
            </>
          ),
        });
      })
      .on("mouseleave", () => {
        setTooltip(null);
      });
  }, [chartData]);

  return (
    <div ref={containerRef} className="relative">
      <svg ref={svgRef} style={{ display: "block" }} />
      {tooltip && (
        <div style={{ position: "absolute", left: tooltip.x + 10, top: tooltip.y, pointerEvents: "none" }}>
          <Tooltip content={tooltip.content} />
        </div>
      )}
    </div>
  );
};

export default MapChart;
