export function calculateFunctionPoints(input: {
  internalFiles: number;
  externalFiles: number;
  transactions: number;
  interfaces: number;
}): number {
  const weights = {
    internalFiles: 3.5,
    externalFiles: 4.2,
    transactions: 4.5,
    interfaces: 5.1,
  };

  const total =
    input.internalFiles * weights.internalFiles +
    input.externalFiles * weights.externalFiles +
    input.transactions * weights.transactions +
    input.interfaces * weights.interfaces;

  return Number(total.toFixed(2));
}
