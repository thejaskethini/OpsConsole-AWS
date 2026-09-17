export function calculateNPV(input: {
  initialInvestment: number;
  cashFlows: number[];
  discountRate: number;
}): number {
  if (input.initialInvestment < 0) {
    throw new Error("Initial investment must not be negative.");
  }

  const pv = input.cashFlows.reduce((sum, cashFlow, index) => {
    const discountFactor = 1 / Math.pow(1 + input.discountRate, index + 1);
    return sum + cashFlow * discountFactor;
  }, 0);

  return Number((pv - input.initialInvestment).toFixed(2));
}
