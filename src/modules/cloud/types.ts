/**
 * Core Cloud Provider Domain Types and Interface.
 * Minimal abstraction enabling deterministic offline mock development
 * and strict read-only AWS SDK execution without UI coupling.
 */

export interface EC2InstanceItem {
  InstanceId: string;
  Name: string;
  State: string;
  InstanceType: string;
  AvailabilityZone?: string;
  PrivateIpAddress?: string;
  PublicIpAddress?: string;
  LaunchTime?: string;
  VpcId?: string;
  SubnetId?: string;
  CpuAvg?: number;
  [key: string]: unknown;
}

export interface RDSInstanceItem {
  DBInstanceIdentifier: string;
  Engine: string;
  EngineVersion?: string;
  DBInstanceClass: string;
  DBInstanceStatus: string;
  AllocatedStorage: number;
  MultiAZ: boolean;
  EndpointAddress?: string;
  EndpointPort?: number;
  CpuUtilization?: number;
  FreeStorageSpaceGB?: number;
  StoragePercentFree?: number;
  MaxConnections24h?: number;
  [key: string]: unknown;
}

export interface ECSClusterItem {
  ClusterName: string;
  ClusterArn: string;
  Status: string;
  RegisteredContainerInstancesCount: number;
  RunningTasksCount: number;
  PendingTasksCount: number;
  ActiveServicesCount: number;
  Services?: {
    ServiceName: string;
    Status: string;
    DesiredCount: number;
    RunningCount: number;
    LaunchType?: string;
  }[];
  [key: string]: unknown;
}

export interface S3BucketItem {
  Name: string;
  CreationDate?: string;
  Region: string;
  Versioning: string;
  Encryption: string;
  Lifecycle: string;
  SizeBytes: number;
  ObjectCount: number;
  [key: string]: unknown;
}

export interface LoadBalancerItem {
  LoadBalancerName: string;
  DNSName?: string;
  Type?: string;
  Scheme?: string;
  State?: string;
  VpcId?: string;
  TargetGroups?: {
    TargetGroupName: string;
    TargetGroupArn: string;
    HealthyCount: number;
    UnhealthyCount: number;
    TotalCount: number;
  }[];
  Error5xxRate?: number;
  [key: string]: unknown;
}

export interface LambdaFunctionItem {
  FunctionName: string;
  Runtime: string;
  MemorySize: number;
  Timeout: number;
  LastModified: string;
  CodeSize: number;
  Invocations?: number;
  Errors?: number;
  Duration?: number;
  Throttles?: number;
  [key: string]: unknown;
}

export interface DynamoDBTableItem {
  TableName: string;
  TableStatus: string;
  ItemCount: number;
  TableSizeBytes: number;
  BillingMode: string;
  CreationDateTime?: string;
  [key: string]: unknown;
}

export interface ElastiCacheClusterItem {
  CacheClusterId: string;
  Engine: string;
  EngineVersion?: string;
  CacheNodeType: string;
  NumCacheNodes: number;
  Status: string;
  EndpointAddress?: string;
  EndpointPort?: number;
  [key: string]: unknown;
}

export interface CloudFrontDistributionItem {
  Id: string;
  DomainName: string;
  Status: string;
  PriceClass: string;
  HttpVersion: string;
  Enabled: boolean;
  Aliases: string[];
  Origins: (string | undefined)[];
  [key: string]: unknown;
}

export interface Route53ZoneItem {
  Id: string;
  Name: string;
  RecordCount?: number;
  PrivateZone: boolean;
  Comment: string;
  [key: string]: unknown;
}

export interface CodePipelineItem {
  Name?: string;
  Created?: string;
  Updated?: string;
  LastExecutionStatus?: string;
  LastExecutionTime?: string | null;
  [key: string]: unknown;
}

export interface AmplifyAppItem {
  AppId: string;
  Name: string;
  DefaultDomain?: string;
  Status?: string;
  LastDeployTime?: string;
  Branches?: string[];
  [key: string]: unknown;
}

export interface SageMakerData {
  models: { ModelName: string; CreationTime?: string; ExecutionRoleArn?: string }[];
  endpoints: { EndpointName: string; EndpointStatus: string; CreationTime?: string; LastModifiedTime?: string }[];
  trainingJobs: { TrainingJobName: string; TrainingJobStatus: string; CreationTime?: string }[];
}

export interface CloudWatchAlarmItem {
  AlarmName: string;
  StateValue: "OK" | "ALARM" | "INSUFFICIENT_DATA" | string;
  MetricName?: string;
  Namespace?: string;
  Threshold?: number;
  StateUpdatedTimestamp?: string;
  [key: string]: unknown;
}

export interface CostData {
  daily: { date: string; amount: number; cumulative: number }[];
  stats: {
    totalSpend: number;
    days: number;
    avgPerDay: number;
    last3DayAvg: number;
    forecast30: number;
    forecast60: number;
    forecast90: number;
  };
  topServices: { service: string; total: number }[];
  rdsBreakdown: { id: string; amount: number }[];
}

export interface WasteData {
  unattachedEbs: { VolumeId: string; Size: number; VolumeType: string; CreateTime?: string; Name?: string | null }[];
  unusedEips: { PublicIp: string; AllocationId?: string; Domain?: string }[];
  idleEc2: { InstanceId: string; Name: string; InstanceType: string; CpuAvg7d: number; MonthlyEstimate: number }[];
  zeroHealthyTg: { TgName: string; LbName: string }[];
}

export interface OptimizationFinding {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  resource: string;
  resourceType: string;
  finding: string;
  suggestion: string;
  estimatedMonthlySavings?: number;
  data?: Record<string, unknown>;
}

export interface FailureHistoryEvent {
  eventId: string;
  eventName: string;
  eventTime: string;
  username: string;
  resourceType: string;
  resourceName: string;
  severity: "critical" | "warning" | "info";
  reason: string;
  recovery: string[];
}

export interface SecurityPostureData {
  securityGroups: {
    groupId: string;
    groupName: string;
    description: string;
    vpcId: string;
    openPorts: (number | null | undefined)[];
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    rules: { port: number | null | undefined; protocol: string; cidr: string; severity: string }[];
  }[];
  iamUsers: {
    userName: string;
    userId: string;
    createDate?: string;
    passwordLastUsed?: string;
    hasAdminAccess: boolean;
    hasPowerAccess: boolean;
    accessLevel: "ADMIN" | "POWER" | "ELEVATED" | "STANDARD";
    policies: string[];
  }[];
  summary: {
    totalGroups: number;
    criticalGroups: number;
    highRiskGroups: number;
    totalIamUsers: number;
    adminUsers: number;
  };
}

export interface TopologyNode {
  id: string;
  type: string;
  label: string;
  subLabel: string;
  status: string;
  vpcId?: string;
  [key: string]: unknown;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface LiveMetricSeries {
  name: string;
  unit?: string;
  datapoints: { timestamp: string; value: number }[];
  current: number;
  avg: number;
  max: number;
}

export interface OverviewMetricsData {
  ec2Running: number;
  ec2Total: number;
  rdsRunning: number;
  rdsTotal: number;
  ecsServicesHealthy: number;
  ecsServicesTotal: number;
  albHealthy: number;
  albTotal: number;
  avgCpuPercent: number;
  avgMemoryPercent: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  monthlySpendEstimate: number;
  degradedSources: string[];
}

/**
 * The standard CloudProvider interface that decouples all domain & UI logic from AWS SDK.
 */
export interface CloudProvider {
  getOverviewMetrics(region: string): Promise<OverviewMetricsData>;
  getCostData(region: string): Promise<CostData>;
  getEC2Instances(region: string): Promise<EC2InstanceItem[]>;
  getRDSInstances(region: string): Promise<RDSInstanceItem[]>;
  getECSClusters(region: string): Promise<ECSClusterItem[]>;
  getS3Buckets(region: string): Promise<S3BucketItem[]>;
  getLoadBalancers(region: string): Promise<LoadBalancerItem[]>;
  getLambdaFunctions(region: string): Promise<LambdaFunctionItem[]>;
  getDynamoDBTables(region: string): Promise<DynamoDBTableItem[]>;
  getElastiCacheClusters(region: string): Promise<ElastiCacheClusterItem[]>;
  getCloudFrontDistributions(region: string): Promise<CloudFrontDistributionItem[]>;
  getRoute53Zones(region: string): Promise<Route53ZoneItem[]>;
  getCodePipelines(region: string): Promise<CodePipelineItem[]>;
  getAmplifyApps(region: string): Promise<AmplifyAppItem[]>;
  getSageMakerData(region: string): Promise<SageMakerData>;
  getCloudWatchAlarms(region: string): Promise<CloudWatchAlarmItem[]>;
  getWaste(region: string): Promise<WasteData>;
  getOptimizationFindings(region: string): Promise<{ findings: OptimizationFinding[]; totalEstimatedSavings: number }>;
  getFailureHistory(region: string): Promise<FailureHistoryEvent[]>;
  getSecurityPosture(region: string): Promise<SecurityPostureData>;
  getInfrastructureTopology(region: string): Promise<TopologyData>;
  getLiveMetrics(region: string, resourceId: string, resourceType: "ec2" | "rds", hours: number): Promise<LiveMetricSeries[]>;
}
