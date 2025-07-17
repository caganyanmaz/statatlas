import React from "react";

interface DropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ label, options, value, onChange }) => (
  <div className="mb-4">
    <label className="block mb-1 font-medium">{label}</label>
    <select
      className="border rounded px-3 py-2 w-full"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default Dropdown; 