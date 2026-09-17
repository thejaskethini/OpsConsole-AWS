export type COCOMOProjectScale = "small" | "moderate" | "large";

export function calculateCOCOMO(input: {
  functionPoints: number;
  projectScale: COCOMOProjectScale;
}): {
  estimatedPersonMonths: number;
  effortMultiplier: number;
  breakdown: Array<{ label: string; value: number }>; 
} {
  const scaleFactor: Record<COCOMOProjectScale, number> = {
    small: 1.1,
    moderate: 1.35,
    large: 1.7,
  };

  const effortMultiplier = scaleFactor[input.projectScale] ?? 1.35;
  const estimatedPersonMonths = Number((input.functionPoints * effortMultiplier * 0.2).toFixed(2));

  return {
    estimatedPersonMonths,
    effortMultiplier,
    breakdown: [
      { label: "Function points", value: input.functionPoints },
      { label: "Scale factor", value: effortMultiplier },
      { label: "Estimated person months", value: estimatedPersonMonths },
    ],
  };
}
