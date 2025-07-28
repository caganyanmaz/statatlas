import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import worldMap from "world-atlas/countries-110m.json";
import { countryIdToCode } from "@/utils/isoHelpers";
import { AnimationChartData, AnimationChartDatum } from "./ChartInterfaces";

interface BubbleMapProps {
  animationChartData: AnimationChartData;
  year: string | number;
}

const MENU_WIDTH = 250; // adjust to your menu width

const BubbleMapChart: React.FC<BubbleMapProps> = ({ animationChartData, year }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const nodesRef = useRef<
    (AnimationChartDatum & {
      x: number;
      y: number;
      radius: number;
      color: string;
      valueForYear: number;
      targetX: number;
      targetY: number;
    })[]
  >([]);

  const [, setTick] = useState(0);

  const width = window.innerWidth - MENU_WIDTH;
  const height = window.innerHeight * 0.9;

  const projection = d3
    .geoNaturalEarth1()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);

  const countries = feature(
    worldMap as any,
    (worldMap as any).objects.countries
  ).features;

  const countryCoords: Record<string, [number, number]> = {};
  for (const country of countries) {
    const code = countryIdToCode(country.id);
    if (!code) continue;
    const centroid = projection(d3.geoCentroid(country));
    if (centroid) countryCoords[code] = centroid;
  }

  useEffect(() => {
    if (!animationChartData || !animationChartData.data) return;

    const yearStr = year.toString();

    // Calculate max value for this year only
    const valuesForYear = animationChartData.data
      .map(d => d.values[yearStr] ?? 0);
    const totalValueForYear = d3.sum(valuesForYear) || 1;

    const radiusRange = [3, 30];
    const radiusScale = d3.scaleSqrt().domain([0, totalValueForYear]).range(radiusRange);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const oldNodes = nodesRef.current;
    const radiusMultiplier = 4;

    const newNodes = animationChartData.data
      .map(d => {
        const coords = countryCoords[d.code];
        if (!coords) return null;

        const valueForYear = d.values[yearStr] ?? 0;
        const radius = radiusScale(valueForYear) * radiusMultiplier;
        const color = colorScale(d.code);

        const prevNode = oldNodes.find(b => b.code === d.code);

        return {
          ...d,
          x: prevNode?.x ?? coords[0],
          y: prevNode?.y ?? coords[1],
          targetX: coords[0],
          targetY: coords[1],
          radius,
          color,
          valueForYear,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    nodesRef.current = newNodes;

    if (simulationRef.current) {
      simulationRef.current.nodes(newNodes);
      simulationRef.current.alpha(1).restart();
    }

    setTick(v => v + 1);
  }, [animationChartData, year, countryCoords]);

  useEffect(() => {
    if (simulationRef.current) return;

    const sim = d3
      .forceSimulation()
      .force("x", d3.forceX((d: any) => d.targetX).strength(0.1))
      .force("y", d3.forceY((d: any) => d.targetY).strength(0.1))
      .force("collide", d3.forceCollide((d: any) => d.radius + 1))
      .alphaDecay(0.02);

    sim.on("tick", () => {
      setTick(v => v + 1);
    });

    simulationRef.current = sim;

    return () => {
      sim.stop();
      simulationRef.current = null;
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ background: "#fdfdfd" }}
    >
      <g>
        {nodesRef.current.map(b => (
          <g key={b.code}>
            <circle
              cx={b.x}
              cy={b.y}
              r={b.radius}
              fill={b.color}
              stroke="#003366"
              strokeWidth={0.8}
              opacity={0.8}
            />
            <text
              x={b.x}
              y={b.y}
              textAnchor="middle"
              dy="0.35em"
              fontSize={10}
              fill="#222"
              pointerEvents="none"
              style={{ userSelect: "none" }}
            >
              {b.code}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

export default BubbleMapChart;
