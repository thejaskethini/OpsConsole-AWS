export function calculateROI(input: {
  initialInvestment: number;
  netProfit: number;
}): number {
  if (input.initialInvestment <= 0) {
    throw new Error("Initial investment must be greater than zero.");
  }

  return Number((((input.netProfit - input.initialInvestment) / input.initialInvestment) * 100).toFixed(2));
}
