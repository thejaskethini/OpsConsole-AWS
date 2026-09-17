export function calculateFunctionPoints(input: {
  internalFiles?: number;
  externalFiles?: number;
  transactions?: number;
  interfaces?: number;
  externalInputs?: number;
  externalOutputs?: number;
  externalInquiries?: number;
  internalLogicalFiles?: number;
  externalInterfaceFiles?: number;
}): number {
  const weights = {
    internalFiles: 3.5,
    externalFiles: 4.2,
    transactions: 4.5,
    interfaces: 5.1,
  };

  const internalFiles = input.internalFiles ?? input.internalLogicalFiles ?? 0;
  const externalFiles = input.externalFiles ?? input.externalInterfaceFiles ?? 0;
  const transactions = input.transactions ?? ((input.externalInputs ?? 0) + (input.externalOutputs ?? 0) + (input.externalInquiries ?? 0));
  const interfaces = input.interfaces ?? input.externalInterfaceFiles ?? 0;
  const total = internalFiles * weights.internalFiles + externalFiles * weights.externalFiles + transactions * weights.transactions + interfaces * weights.interfaces;

  return Number(total.toFixed(2));
}
