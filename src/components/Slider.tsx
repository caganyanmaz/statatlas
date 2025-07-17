import React from "react";

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ min, max, value, onChange }) => (
  <div className="mb-4">
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full"
    />
    <div className="text-center text-sm text-gray-600">Year: {value}</div>
  </div>
);

export default Slider; 