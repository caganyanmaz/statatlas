import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import worldMap from "world-atlas/countries-50m.json";
import { ChartData } from "./ChartInterfaces";
import { countryIdToCode, getInterpolatedValue } from "@/utils/isoHelpers";

const MENU_WIDTH = 500; // Adjust this based on your actual menu width

interface MapChartProps {
  chartData: ChartData;
}

const MapChart: React.FC<MapChartProps> = ({ chartData }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

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

    const countries = feature(worldMap as any, (worldMap as any).objects.countries).features;

    svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("d", path)
      .attr("fill", (d: any) => {
        const val = getInterpolatedValue(countryIdToCode(d.id), valueMap);
        return val !== null ? color(val) : "#ccc";
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5)
      .append("title")
      .text((d: any) => {
        const val = valueMap[countryIdToCode(d.id)];
        return val !== undefined
          ? `${d.properties.name}: ${val.toLocaleString()}`
          : `${d.properties.name}: No data`;
      });
  }, [chartData]);

  return <svg ref={svgRef} style={{ display: "block" }} />;
};

export default MapChart;
