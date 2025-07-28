import React from "react";
import BubbleChart from "./BubbleChart";
import BarChart from "./BarChart";
import MapChart from "./MapChart";
import ProportionalMapChart from "./BubbleMapChart";
import { ChartDatum, ChartData, AnimationChartDatum, AnimationChartData } from "./ChartInterfaces";
import { getTextWidth } from "../utils/chartHelpers"
import { useState, useEffect } from 'react';

interface ChartRendererProps {
  chartType: string;
  data: any;
  year: number;
  onlyCountries: boolean;
}


function constructChartData(data: any, year: number, onlyCountries: boolean): ChartData {
  const yearStr = String(year);
  const allSamples = onlyCountries ? data["only_countries"] : data["data"];
  const maxValue = onlyCountries ? data["only_countries_max_value"] : data["max_value"];
  const totalSampleCount = allSamples.length;
  const samples = allSamples
    .map((d: any) => ({
      country: d.country,
      code: d.code,
      value: d.values[yearStr],
    }))
    .filter((d: { value: number | undefined | null; code: string }) =>
      typeof d.value === "number" &&
      !isNaN(d.value)
    )
    .sort((a: ChartDatum, b: ChartDatum) => b.value - a.value);
  const allNames = allSamples.map((sample: { country: string }) => sample.country);

  return {
    "totalSize": totalSampleCount,
    "maxValue": maxValue,
    "data": samples,
    "allNames": allNames
  };
}

function getChart(chartType: string, chartData: ChartData, year: number, animationChartData: AnimationChartData) {
  if (chartType === "bubble") {
    return <BubbleChart chartData={chartData} />
  }
  if (chartType === "bar") {
    return <BarChart chartData={chartData} />
  }
  if (chartType === "map") {
    return <MapChart chartData={chartData} />
  }
  if (chartType === "proportional-map") {
    return <ProportionalMapChart animationChartData={animationChartData} year={year} />
  }
}

function constructAnimationChartData(data: any, onlyCountries: boolean): AnimationChartData {
  const allSamples = onlyCountries ? data["only_countries"] : data["data"];
  const maxValue = onlyCountries ? data["only_countries_max_value"] : data["max_value"];
  const totalSampleCount = allSamples.length;
  const samples = allSamples
    .map((d: any) => ({
      country: d.country,
      code: d.code,
      values: d.values,
    }))

  return {
    "totalSize": totalSampleCount,
    "maxValue": maxValue,
    "data": samples,
  };
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartType, data, year, onlyCountries }) => {
  const chartData = constructChartData(data, year, onlyCountries)
  const animationChartData = constructAnimationChartData(data, onlyCountries)
  // Responsive: observe container width
  const chart = getChart(chartType, chartData, year, animationChartData);
  return chart;
};

export default ChartRenderer; 