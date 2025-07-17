import React from "react";

interface TooltipProps {
  content: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content }) => (
  <div className="absolute bg-white border rounded shadow px-3 py-2 text-sm z-50">
    {content}
  </div>
);

export default Tooltip; 