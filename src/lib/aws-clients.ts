import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { ECSClient } from "@aws-sdk/client-ecs";
import { ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { RDSClient } from "@aws-sdk/client-rds";
import { EC2Client } from "@aws-sdk/client-ec2";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { IAMClient } from "@aws-sdk/client-iam";
import { CloudTrailClient } from "@aws-sdk/client-cloudtrail";
import { ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { Route53Client } from "@aws-sdk/client-route-53";
import { CodePipelineClient } from "@aws-sdk/client-codepipeline";
import { AmplifyClient } from "@aws-sdk/client-amplify";
import { SageMakerClient } from "@aws-sdk/client-sagemaker";

/**
 * Checks whether AWS credentials or an environment flag indicates AWS connectivity.
 */
export function hasAwsCredentials(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return false;
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return true;
  // If running on EC2 instance with IAM role (IMDSv2), credentials are provided by default provider chain
  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_EXECUTION_ENV) return true;
  return false;
}

export function getAwsRegion(region?: string | null): string {
  return region || process.env.AWS_DEFAULT_REGION || "ap-south-1";
}

// Load credentials from environment (Next.js automatically loads .env files)
export const getAwsConfig = (region?: string) => {
  return {
    region: getAwsRegion(region),
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
          secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
          ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN.trim() } : {}),
        }
      : undefined, // Falls back to IAM role / IMDSv2 provider chain
  };
};

// Global services require us-east-1 endpoint
export const getCostExplorerClient = () => new CostExplorerClient(getAwsConfig("us-east-1"));
export const getIamClient = () => new IAMClient(getAwsConfig("us-east-1"));
export const getCloudFrontClient = () => new CloudFrontClient(getAwsConfig("us-east-1"));
export const getRoute53Client = () => new Route53Client(getAwsConfig("us-east-1"));

// Regional service factories
export const getEcsClient = (region?: string) => new ECSClient(getAwsConfig(region));
export const getElbClient = (region?: string) => new ElasticLoadBalancingV2Client(getAwsConfig(region));
export const getRdsClient = (region?: string) => new RDSClient(getAwsConfig(region));
export const getEc2Client = (region?: string) => new EC2Client(getAwsConfig(region));
export const getS3Client = (region?: string) => new S3Client(getAwsConfig(region));
export const getCloudWatchClient = (region?: string) => new CloudWatchClient(getAwsConfig(region));
export const getLambdaClient = (region?: string) => new LambdaClient(getAwsConfig(region));
export const getCloudTrailClient = (region?: string) => new CloudTrailClient(getAwsConfig(region));
export const getElastiCacheClient = (region?: string) => new ElastiCacheClient(getAwsConfig(region));
export const getDynamoDBClient = (region?: string) => new DynamoDBClient(getAwsConfig(region));
export const getCodePipelineClient = (region?: string) => new CodePipelineClient(getAwsConfig(region));
export const getAmplifyClient = (region?: string) => new AmplifyClient(getAwsConfig(region));
export const getSageMakerClient = (region?: string) => new SageMakerClient(getAwsConfig(region));
