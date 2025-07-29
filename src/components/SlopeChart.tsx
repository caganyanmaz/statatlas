import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { AnimationChartDatum } from "./ChartInterfaces";
import MultiSelectDropdown from "./MultiSelectDropdown";
import Tooltip from "./Tooltip";

interface SlopeDataPoint {
  country: string;
  values: { year: string; value: number }[];
}

interface SlopeChartProps {
  chartData: {
    data: AnimationChartDatum[];
    allNames: string[];
  };
  years: string[];
}

const SlopeChart: React.FC<SlopeChartProps> = ({ chartData, years }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["United States", "China", "Japan", "Germany", "India"]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

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
    if (!chartData || !chartData.data.length || !years.length) return;

    const filteredData = chartData.data.filter(d => selectedCountries.includes(d.country));

    const dataForChart: SlopeDataPoint[] = filteredData.map(d => ({
      country: d.country,
      values: years.map(year => ({ year: year, value: d.values[year]! })).filter(v => v.value != null)
    }));

    const margin = { top: 40, right: 150, bottom: 40, left: 60 };
    const width = Math.max(containerWidth, 400);
    const height = 500;
    const drawWidth = width - margin.left - margin.right;
    const drawHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
      .domain(years)
      .range([0, drawWidth]);

    const allValues = dataForChart.flatMap(d => d.values.map(v => v.value));
    const y = d3.scaleLinear()
      .domain(d3.extent(allValues) as [number, number])
      .range([drawHeight, 0]).nice();

    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(selectedCountries);

    const line = d3.line<{ year: string, value: number }>()
      .x(d => x(d.year)!)
      .y(d => y(d.value));

    g.selectAll(".line")
      .data(dataForChart)
      .enter()
      .append("path")
      .attr("class", "line")
      .attr("d", d => line(d.values))
      .style("stroke", d => color(d.country))
      .style("fill", "none")
      .style("stroke-width", 2);

    // Add circles for data points
    dataForChart.forEach(countryData => {
      g.selectAll(`.dot-${countryData.country.replace(/\s/g, '')}`)
        .data(countryData.values)
        .enter()
        .append("circle")
        .attr("class", `dot dot-${countryData.country.replace(/\s/g, '')}`)
        .attr("cx", d => x(d.year)!)
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .style("fill", color(countryData.country));
    });

    const xAxis = d3.axisBottom(x);
    g.append("g")
      .attr("transform", `translate(0,${drawHeight})`)
      .call(xAxis);

    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d3.format(",.2s"));
    g.append("g").call(yAxis);

    const focus = g.append("g")
      .attr("class", "focus")
      .style("display", "none");

    focus.append("line")
      .attr("class", "x-hover-line hover-line")
      .style("stroke", "#999")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "3,3");

    focus.append("line")
      .attr("class", "y-hover-line hover-line")
      .style("stroke", "#999")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "3,3");

    focus.append("circle")
      .attr("r", 5)
      .style("stroke", "white")
      .style("stroke-width", "1.5px");

    const mousemove = function(this: SVGRectElement, event: MouseEvent) {
      const [mouseX, mouseY] = d3.pointer(event, this);

      const domain = x.domain();
      const rangePoints = domain.map(d => x(d)!);
      const i = d3.bisectLeft(rangePoints, mouseX);

      if (i === 0 || i >= rangePoints.length) {
        focus.style("display", "none");
        setTooltip(null);
        return;
      }

      const year1 = domain[i - 1];
      const year2 = domain[i];

      let closestCountryData: SlopeDataPoint | null = null;
      let closestYDistance = Infinity;
      let interpolatedValue = 0;

      dataForChart.forEach(countryData => {
        const v1 = countryData.values.find(v => v.year === year1);
        const v2 = countryData.values.find(v => v.year === year2);

        if (v1 && v2) {
          const x1 = x(v1.year)!;
          const x2 = x(v2.year)!;
          const y1 = y(v1.value);
          const y2 = y(v2.value);

          const hoverY = y1 + (y2 - y1) * ((mouseX - x1) / (x2 - x1));
          const distance = Math.abs(mouseY - hoverY);

          if (distance < closestYDistance) {
            closestYDistance = distance;
            closestCountryData = countryData;
            interpolatedValue = v1.value + (v2.value - v1.value) * ((mouseX - x1) / (x2 - x1));
          }
        }
      });

      if (closestCountryData && closestYDistance < 20) {
        const hoverY = y(interpolatedValue);
        const [tooltipX, tooltipY] = d3.pointer(event, containerRef.current!);

        focus.style("display", null);
        focus.select("circle")
          .attr("transform", `translate(${mouseX},${hoverY})`)
          .style("fill", color(closestCountryData.country));

        focus.select(".x-hover-line")
          .attr("x1", mouseX)
          .attr("x2", mouseX)
          .attr("y1", hoverY)
          .attr("y2", drawHeight);

        focus.select(".y-hover-line")
          .attr("x1", 0)
          .attr("x2", mouseX)
          .attr("y1", hoverY)
          .attr("y2", hoverY);

        setTooltip({
          x: tooltipX,
          y: tooltipY,
          content: (
            <>
              <div className="font-semibold text-blue-800 text-lg">{closestCountryData.country}</div>
              <div className="text-blue-700 text-lg">{d3.format(",.0f")(interpolatedValue)}</div>
            </>
          ),
        });
      } else {
        focus.style("display", "none");
        setTooltip(null);
      }
    }

    g.append("rect")
      .attr("class", "overlay")
      .attr("width", drawWidth)
      .attr("height", drawHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => {
        focus.style("display", "none");
        setTooltip(null);
      })
      .on("mousemove", mousemove);

    // Legend
    const legend = g.selectAll(".legend")
      .data(dataForChart)
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${drawWidth + 20},${i * 20})`);

    legend.each(function(this: SVGGElement, d: SlopeDataPoint) {
      const group = d3.select(this);
      group.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color(d.country));

      group.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(d.country);
    });


  }, [chartData, years, containerWidth, selectedCountries]);

  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedCountries(newSelection);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border rounded p-4">
      <MultiSelectDropdown
        options={chartData.allNames}
        selected={selectedCountries}
        onChange={handleSelectionChange}
      />
      <div ref={containerRef} className="w-full h-full flex items-center justify-center relative min-h-[500px] min-w-[400px] overflow-hidden p-0 mt-4">
        <svg ref={svgRef} />
        {tooltip && (
          <div style={{ position: "absolute", left: tooltip.x + 10, top: tooltip.y, pointerEvents: "none" }}>
            <Tooltip content={tooltip.content} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SlopeChart;
