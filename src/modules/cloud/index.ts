import { CloudProvider } from "./types";
import { MockCloudProvider } from "./mock-provider";
import { AwsCloudProvider } from "./aws-provider";
import { hasAwsCredentials } from "@/lib/aws-clients";

let mockProviderInstance: MockCloudProvider | null = null;
let awsProviderInstance: AwsCloudProvider | null = null;

/**
 * Returns the appropriate CloudProvider based on environment.
 * If AWS credentials or an IAM role are present, returns AwsCloudProvider.
 * Otherwise, seamlessly provides deterministic MockCloudProvider for local development with zero AWS keys.
 */
export function getCloudProvider(_region?: string): CloudProvider {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !hasAwsCredentials()) {
    if (!mockProviderInstance) {
      mockProviderInstance = new MockCloudProvider();
    }
    return mockProviderInstance;
  }

  if (!awsProviderInstance) {
    awsProviderInstance = new AwsCloudProvider();
  }
  return awsProviderInstance;
}

export * from "./types";
export * from "./mock-data";
