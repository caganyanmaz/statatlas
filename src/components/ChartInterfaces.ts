export interface ChartDatum {
  country: string;
  code: string;
  value: number;
}

export interface ChartData {
  totalSize: number,
  maxValue: number,
  data: ChartDatum[],
  allNames: string[]
}


export interface AnimationChartDatum {
  country: string,
  code: string,
  values: Record<string, number>
};

export interface AnimationChartData {
  totalSize: number,
  maxValue: number,
  data: AnimationChartDatum[]
};