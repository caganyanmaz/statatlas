// Placeholder for chart helper functions

export function getColorForValue(value: number): string {
  // Example: return a color based on value
  return value > 10000 ? "#2563eb" : "#60a5fa";
} 

export function getTextWidth(text: string, font: string) {
  if (typeof window === "undefined") return 0;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
}