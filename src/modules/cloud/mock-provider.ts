import {
  CloudProvider,
  OverviewMetricsData,
  CostData,
  EC2InstanceItem,
  RDSInstanceItem,
  ECSClusterItem,
  S3BucketItem,
  LoadBalancerItem,
  LambdaFunctionItem,
  DynamoDBTableItem,
  ElastiCacheClusterItem,
  CloudFrontDistributionItem,
  Route53ZoneItem,
  CodePipelineItem,
  AmplifyAppItem,
  SageMakerData,
  CloudWatchAlarmItem,
  WasteData,
  OptimizationFinding,
  FailureHistoryEvent,
  SecurityPostureData,
  TopologyData,
  LiveMetricSeries,
} from "./types";
import {
  mockOverviewMetrics,
  mockCostData,
  mockEC2Instances,
  mockRDSInstances,
  mockECSClusters,
  mockS3Buckets,
  mockLoadBalancers,
  mockLambdaFunctions,
  mockDynamoDBTables,
  mockElastiCacheClusters,
  mockCloudFrontDistributions,
  mockRoute53Zones,
  mockCodePipelines,
  mockAmplifyApps,
  mockSageMakerData,
  mockCloudWatchAlarms,
  mockWasteData,
  mockOptimizationFindings,
  mockFailureHistory,
  mockSecurityPosture,
  mockTopology,
  generateMockLiveMetrics,
} from "./mock-data";

export class MockCloudProvider implements CloudProvider {
  async getOverviewMetrics(_region: string): Promise<OverviewMetricsData> {
    return mockOverviewMetrics;
  }

  async getCostData(_region: string): Promise<CostData> {
    return mockCostData;
  }

  async getEC2Instances(_region: string): Promise<EC2InstanceItem[]> {
    return mockEC2Instances;
  }

  async getRDSInstances(_region: string): Promise<RDSInstanceItem[]> {
    return mockRDSInstances;
  }

  async getECSClusters(_region: string): Promise<ECSClusterItem[]> {
    return mockECSClusters;
  }

  async getS3Buckets(_region: string): Promise<S3BucketItem[]> {
    return mockS3Buckets;
  }

  async getLoadBalancers(_region: string): Promise<LoadBalancerItem[]> {
    return mockLoadBalancers;
  }

  async getLambdaFunctions(_region: string): Promise<LambdaFunctionItem[]> {
    return mockLambdaFunctions;
  }

  async getDynamoDBTables(_region: string): Promise<DynamoDBTableItem[]> {
    return mockDynamoDBTables;
  }

  async getElastiCacheClusters(_region: string): Promise<ElastiCacheClusterItem[]> {
    return mockElastiCacheClusters;
  }

  async getCloudFrontDistributions(_region: string): Promise<CloudFrontDistributionItem[]> {
    return mockCloudFrontDistributions;
  }

  async getRoute53Zones(_region: string): Promise<Route53ZoneItem[]> {
    return mockRoute53Zones;
  }

  async getCodePipelines(_region: string): Promise<CodePipelineItem[]> {
    return mockCodePipelines;
  }

  async getAmplifyApps(_region: string): Promise<AmplifyAppItem[]> {
    return mockAmplifyApps;
  }

  async getSageMakerData(_region: string): Promise<SageMakerData> {
    return mockSageMakerData;
  }

  async getCloudWatchAlarms(_region: string): Promise<CloudWatchAlarmItem[]> {
    return mockCloudWatchAlarms;
  }

  async getWaste(_region: string): Promise<WasteData> {
    return mockWasteData;
  }

  async getOptimizationFindings(_region: string): Promise<{ findings: OptimizationFinding[]; totalEstimatedSavings: number }> {
    const total = mockOptimizationFindings.reduce((s, f) => s + (f.estimatedMonthlySavings || 0), 0);
    return { findings: mockOptimizationFindings, totalEstimatedSavings: total };
  }

  async getFailureHistory(_region: string): Promise<FailureHistoryEvent[]> {
    return mockFailureHistory;
  }

  async getSecurityPosture(_region: string): Promise<SecurityPostureData> {
    return mockSecurityPosture;
  }

  async getInfrastructureTopology(_region: string): Promise<TopologyData> {
    return mockTopology;
  }

  async getLiveMetrics(_region: string, resourceId: string, resourceType: "ec2" | "rds", _hours: number): Promise<LiveMetricSeries[]> {
    return generateMockLiveMetrics(resourceId, resourceType);
  }
}
