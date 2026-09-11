import {
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

export const mockOverviewMetrics: OverviewMetricsData = {
  ec2Running: 6,
  ec2Total: 8,
  rdsRunning: 3,
  rdsTotal: 3,
  ecsServicesHealthy: 4,
  ecsServicesTotal: 5,
  albHealthy: 2,
  albTotal: 2,
  avgCpuPercent: 24.5,
  avgMemoryPercent: 58.2,
  criticalAlertsCount: 1,
  warningAlertsCount: 3,
  monthlySpendEstimate: 1248.5,
  degradedSources: [],
};

export const mockOverviewMetricsPayload = {
  region: "ap-south-1",
  degradedSources: [] as string[],
  ec2: {
    total: 8,
    running: 6,
    stopped: 2,
    avgCpu: 24.5,
    maxCpu: 64.8,
    hotCpuCount: 0,
    idleCount: 1,
    diskPressureCount: 0,
  },
  rds: {
    total: 3,
    available: 3,
    avgCpu: 20.3,
    maxCpu: 34.2,
    avgFreeStorageGB: 150.5,
    minFreeStorageGB: 85.0,
    totalConnections: 242,
  },
  ecs: {
    clusters: 1,
    services: 4,
    desiredTasks: 12,
    runningTasks: 11,
    failingDeployments: 0,
    activeDeployments: 1,
  },
  alb: {
    totalTargets: 8,
    unhealthy: 0,
    healthy: 8,
    targetGroups: 3,
    alb5xxTotal1h: 0,
    alb5xxTotal24h: 12,
  },
  waste: {
    unattachedEbs: 1,
    unusedEips: 1,
    idleEc2: 1,
    estimatedWaste: 34,
  },
  security: {
    totalSGs: 8,
    riskySGs: 2,
  },
  cost: {
    avgDaily: 41.9,
    total14: 586.6,
    forecast30: 1257,
    forecast60: 2514,
    forecast90: 3771,
    hasAnomaly: false,
    anomalyPct: 0,
    last3DayAvg: 43.0,
  },
  efficiency: {
    overall: 82,
    utilization: 75,
    costOptimization: 85,
    security: 80,
    reliability: 90,
  },
  incidents: {
    unhealthyTargets: 0,
    stoppedInstances: 2,
    degradedServices: 1,
    riskySGs: 2,
    totalAlerts: 5,
    highCpuServices: 0,
  },
  signals: [
    { signal: "Running EC2 Instances", value: 6, threshold: "N/A", status: "OK" },
    { signal: "Avg EC2 CPU (24h)", value: "24.5", threshold: "Warn >70%, Critical >85%", status: "OK" },
    { signal: "Hot EC2 (CPU >85%)", value: 0, threshold: ">0", status: "OK" },
    { signal: "Hot RDS (CPU >80%)", value: 0, threshold: ">0", status: "OK" },
    { signal: "Disk Pressure EC2 (>85%)", value: 0, threshold: ">0", status: "OK" },
    { signal: "ALB 5xx Total (1h) [Sum]", value: 0, threshold: ">0", status: "OK" },
    { signal: "ALB High 5xx (24h) [Sum]", value: 12, threshold: ">100", status: "OK" },
    { signal: "Unhealthy ALB Targets", value: 0, threshold: ">0", status: "OK" },
    { signal: "ECS Task Deficit", value: 1, threshold: ">0", status: "WARN" },
    { signal: "Risky Security Groups", value: 2, threshold: ">0", status: "WARN" },
  ],
};

export const mockCostData: CostData = {
  daily: [
    { date: "2026-03-01", amount: 41.2, cumulative: 41.2 },
    { date: "2026-03-02", amount: 42.8, cumulative: 84.0 },
    { date: "2026-03-03", amount: 39.5, cumulative: 123.5 },
    { date: "2026-03-04", amount: 44.1, cumulative: 167.6 },
    { date: "2026-03-05", amount: 40.0, cumulative: 207.6 },
    { date: "2026-03-06", amount: 43.5, cumulative: 251.1 },
    { date: "2026-03-07", amount: 38.9, cumulative: 290.0 },
    { date: "2026-03-08", amount: 41.7, cumulative: 331.7 },
    { date: "2026-03-09", amount: 45.2, cumulative: 376.9 },
    { date: "2026-03-10", amount: 42.1, cumulative: 419.0 },
  ],
  stats: {
    totalSpend: 419.0,
    days: 10,
    avgPerDay: 41.9,
    last3DayAvg: 43.0,
    forecast30: 1257.0,
    forecast60: 2514.0,
    forecast90: 3771.0,
  },
  topServices: [
    { service: "Amazon Relational Database Service", total: 184.2 },
    { service: "Amazon Elastic Compute Cloud - Compute", total: 132.5 },
    { service: "Amazon Simple Storage Service", total: 42.3 },
    { service: "Amazon Elastic Load Balancing", total: 36.8 },
    { service: "Amazon CloudWatch", total: 23.2 },
  ],
  rdsBreakdown: [
    { id: "production-postgres-primary", amount: 112.5 },
    { id: "production-postgres-replica", amount: 56.2 },
    { id: "analytics-db", amount: 15.5 },
  ],
};

export const mockEC2Instances: EC2InstanceItem[] = [
  {
    InstanceId: "i-09ab12cd34ef5678a",
    Name: "api-backend-prod-01",
    State: "running",
    InstanceType: "t3.medium",
    AvailabilityZone: "ap-south-1a",
    PrivateIpAddress: "10.0.1.42",
    PublicIpAddress: "13.232.12.89",
    LaunchTime: "2026-02-14T08:30:00.000Z",
    VpcId: "vpc-0123456789abcdef0",
    SubnetId: "subnet-01234a",
    CpuAvg: 28.4,
  },
  {
    InstanceId: "i-09ab12cd34ef5678b",
    Name: "api-backend-prod-02",
    State: "running",
    InstanceType: "t3.medium",
    AvailabilityZone: "ap-south-1b",
    PrivateIpAddress: "10.0.2.19",
    PublicIpAddress: "13.232.14.92",
    LaunchTime: "2026-02-14T08:31:00.000Z",
    VpcId: "vpc-0123456789abcdef0",
    SubnetId: "subnet-01234b",
    CpuAvg: 31.2,
  },
  {
    InstanceId: "i-09ab12cd34ef5678c",
    Name: "worker-celery-queue-01",
    State: "running",
    InstanceType: "c5.large",
    AvailabilityZone: "ap-south-1a",
    PrivateIpAddress: "10.0.1.88",
    LaunchTime: "2026-02-20T11:00:00.000Z",
    VpcId: "vpc-0123456789abcdef0",
    SubnetId: "subnet-01234a",
    CpuAvg: 64.8,
  },
  {
    InstanceId: "i-09ab12cd34ef5678d",
    Name: "bastion-host",
    State: "running",
    InstanceType: "t3.nano",
    AvailabilityZone: "ap-south-1a",
    PrivateIpAddress: "10.0.0.5",
    PublicIpAddress: "13.232.99.11",
    LaunchTime: "2026-01-10T04:15:00.000Z",
    VpcId: "vpc-0123456789abcdef0",
    SubnetId: "subnet-01234pub",
    CpuAvg: 1.2,
  },
  {
    InstanceId: "i-09ab12cd34ef5678e",
    Name: "legacy-reporting-service",
    State: "stopped",
    InstanceType: "m5.large",
    AvailabilityZone: "ap-south-1a",
    PrivateIpAddress: "10.0.1.99",
    LaunchTime: "2025-11-04T12:00:00.000Z",
    VpcId: "vpc-0123456789abcdef0",
    SubnetId: "subnet-01234a",
    CpuAvg: 0.0,
  },
];

export const mockRDSInstances: RDSInstanceItem[] = [
  {
    DBInstanceIdentifier: "production-postgres-primary",
    Engine: "postgres",
    EngineVersion: "16.1",
    DBInstanceClass: "db.r6g.xlarge",
    DBInstanceStatus: "available",
    AllocatedStorage: 250,
    MultiAZ: true,
    EndpointAddress: "prod-pg.opsconsole.internal",
    EndpointPort: 5432,
    CpuUtilization: 34.2,
    FreeStorageSpaceGB: 182.4,
    StoragePercentFree: 72.9,
    MaxConnections24h: 142,
  },
  {
    DBInstanceIdentifier: "production-postgres-replica",
    Engine: "postgres",
    EngineVersion: "16.1",
    DBInstanceClass: "db.r6g.large",
    DBInstanceStatus: "available",
    AllocatedStorage: 250,
    MultiAZ: false,
    EndpointAddress: "prod-pg-ro.opsconsole.internal",
    EndpointPort: 5432,
    CpuUtilization: 18.5,
    FreeStorageSpaceGB: 184.1,
    StoragePercentFree: 73.6,
    MaxConnections24h: 88,
  },
  {
    DBInstanceIdentifier: "analytics-db",
    Engine: "mysql",
    EngineVersion: "8.0.35",
    DBInstanceClass: "db.t4g.medium",
    DBInstanceStatus: "available",
    AllocatedStorage: 100,
    MultiAZ: false,
    EndpointAddress: "analytics.opsconsole.internal",
    EndpointPort: 3306,
    CpuUtilization: 8.4,
    FreeStorageSpaceGB: 85.0,
    StoragePercentFree: 85.0,
    MaxConnections24h: 12,
  },
];

export const mockECSClusters: ECSClusterItem[] = [
  {
    ClusterName: "production-apps-cluster",
    ClusterArn: "arn:aws:ecs:ap-south-1:123456789012:cluster/production-apps-cluster",
    Status: "ACTIVE",
    RegisteredContainerInstancesCount: 4,
    RunningTasksCount: 16,
    PendingTasksCount: 0,
    ActiveServicesCount: 4,
    Services: [
      { ServiceName: "auth-service", Status: "ACTIVE", DesiredCount: 2, RunningCount: 2, LaunchType: "FARGATE" },
      { ServiceName: "core-api", Status: "ACTIVE", DesiredCount: 6, RunningCount: 6, LaunchType: "FARGATE" },
      { ServiceName: "payment-gateway-proxy", Status: "ACTIVE", DesiredCount: 2, RunningCount: 2, LaunchType: "EC2" },
      { ServiceName: "event-indexer", Status: "ACTIVE", DesiredCount: 2, RunningCount: 1, LaunchType: "FARGATE" },
    ],
  },
];

export const mockS3Buckets: S3BucketItem[] = [
  {
    Name: "opsconsole-app-assets-prod",
    CreationDate: "2025-06-12T10:00:00.000Z",
    Region: "ap-south-1",
    Versioning: "Enabled",
    Encryption: "AWS:KMS",
    Lifecycle: "Configured",
    SizeBytes: 4289012300,
    ObjectCount: 1420,
  },
  {
    Name: "opsconsole-database-backups-archive",
    CreationDate: "2025-04-01T08:00:00.000Z",
    Region: "ap-south-1",
    Versioning: "Enabled",
    Encryption: "AES256",
    Lifecycle: "Configured",
    SizeBytes: 142890123000,
    ObjectCount: 380,
  },
  {
    Name: "opsconsole-audit-logs-cold",
    CreationDate: "2025-02-18T14:30:00.000Z",
    Region: "ap-south-1",
    Versioning: "Suspended",
    Encryption: "AES256",
    Lifecycle: "None",
    SizeBytes: 8901234500,
    ObjectCount: 8920,
  },
];

export const mockLoadBalancers: LoadBalancerItem[] = [
  {
    LoadBalancerName: "prod-public-alb",
    DNSName: "prod-public-alb-123456789.ap-south-1.elb.amazonaws.com",
    Type: "application",
    Scheme: "internet-facing",
    State: "active",
    VpcId: "vpc-0123456789abcdef0",
    Error5xxRate: 0.02,
    TargetGroups: [
      { TargetGroupName: "core-api-tg", TargetGroupArn: "arn:aws:elasticloadbalancing:ap-south-1:.../tg1", HealthyCount: 6, UnhealthyCount: 0, TotalCount: 6 },
      { TargetGroupName: "auth-svc-tg", TargetGroupArn: "arn:aws:elasticloadbalancing:ap-south-1:.../tg2", HealthyCount: 2, UnhealthyCount: 0, TotalCount: 2 },
    ],
  },
  {
    LoadBalancerName: "internal-services-nlb",
    DNSName: "internal-services-nlb-123.ap-south-1.elb.amazonaws.com",
    Type: "network",
    Scheme: "internal",
    State: "active",
    VpcId: "vpc-0123456789abcdef0",
    Error5xxRate: 0.0,
    TargetGroups: [
      { TargetGroupName: "legacy-worker-tg", TargetGroupArn: "arn:aws:elasticloadbalancing:ap-south-1:.../tg3", HealthyCount: 0, UnhealthyCount: 0, TotalCount: 0 },
    ],
  },
];

export const mockAlbPayload = {
  albs: [
    {
      Name: "prod-public-alb",
      Scheme: "internet-facing",
      State: "active",
      VpcId: "vpc-0123456789abcdef0",
      DNSName: "prod-public-alb-123456789.ap-south-1.elb.amazonaws.com",
      error5XX_24h: 12,
      error5XX_1h: 0,
    },
    {
      Name: "internal-services-nlb",
      Scheme: "internal",
      State: "active",
      VpcId: "vpc-0123456789abcdef0",
      DNSName: "internal-services-nlb-123.ap-south-1.elb.amazonaws.com",
      error5XX_24h: 0,
      error5XX_1h: 0,
    },
  ],
  targetGroups: [
    {
      AlbName: "prod-public-alb",
      TgName: "core-api-tg",
      Healthy: 6,
      Unhealthy: 0,
      Initial: 0,
      Draining: 0,
      Unused: 0,
      Total: 6,
      ZeroHealthy: false,
    },
    {
      AlbName: "prod-public-alb",
      TgName: "auth-svc-tg",
      Healthy: 2,
      Unhealthy: 0,
      Initial: 0,
      Draining: 0,
      Unused: 0,
      Total: 2,
      ZeroHealthy: false,
    },
    {
      AlbName: "internal-services-nlb",
      TgName: "legacy-worker-tg",
      Healthy: 0,
      Unhealthy: 0,
      Initial: 0,
      Draining: 0,
      Unused: 0,
      Total: 0,
      ZeroHealthy: false,
    },
  ],
};

export const mockLambdaFunctions: LambdaFunctionItem[] = [
  { FunctionName: "user-session-cleanup", Runtime: "nodejs20.x", MemorySize: 256, Timeout: 30, LastModified: "2026-02-28T09:12:00.000Z", CodeSize: 1048576, Invocations: 14200, Errors: 2, Duration: 182, Throttles: 0 },
  { FunctionName: "nightly-database-vacuum", Runtime: "python3.11", MemorySize: 512, Timeout: 300, LastModified: "2026-01-15T02:00:00.000Z", CodeSize: 4194304, Invocations: 30, Errors: 0, Duration: 42000, Throttles: 0 },
  { FunctionName: "s3-thumbnail-generator", Runtime: "nodejs20.x", MemorySize: 1024, Timeout: 60, LastModified: "2026-03-02T16:45:00.000Z", CodeSize: 2097152, Invocations: 8940, Errors: 14, Duration: 410, Throttles: 1 },
];

export const mockDynamoDBTables: DynamoDBTableItem[] = [
  { TableName: "SessionTokens", TableStatus: "ACTIVE", ItemCount: 1420, TableSizeBytes: 245760, BillingMode: "PAY_PER_REQUEST", CreationDateTime: "2025-05-10T00:00:00.000Z" },
  { TableName: "AuditTrailEvents", TableStatus: "ACTIVE", ItemCount: 894200, TableSizeBytes: 142857600, BillingMode: "PROVISIONED", CreationDateTime: "2025-05-10T00:00:00.000Z" },
];

export const mockElastiCacheClusters: ElastiCacheClusterItem[] = [
  { CacheClusterId: "prod-redis-primary", Engine: "redis", EngineVersion: "7.0", CacheNodeType: "cache.t4g.medium", NumCacheNodes: 2, Status: "available", EndpointAddress: "redis.opsconsole.internal", EndpointPort: 6379 },
];

export const mockCloudFrontDistributions: CloudFrontDistributionItem[] = [
  { Id: "E1234567890ABC", DomainName: "d123456.cloudfront.net", Status: "Deployed", PriceClass: "PriceClass_100", HttpVersion: "http2", Enabled: true, Aliases: ["app.opsconsole.example.com"], Origins: ["prod-public-alb-123456789.ap-south-1.elb.amazonaws.com"] },
];

export const mockRoute53Zones: Route53ZoneItem[] = [
  { Id: "Z0123456789ABCDEF", Name: "opsconsole.internal.", RecordCount: 18, PrivateZone: true, Comment: "Internal VPC DNS Service Discovery" },
  { Id: "Z0987654321FEDCBA", Name: "opsconsole.example.com.", RecordCount: 12, PrivateZone: false, Comment: "Public facing DNS zone" },
];

export const mockCodePipelines: CodePipelineItem[] = [
  { Name: "OpsConsole-Backend-CD", Created: "2026-01-10T00:00:00.000Z", Updated: "2026-03-08T14:22:00.000Z", LastExecutionStatus: "Succeeded", LastExecutionTime: "2026-03-08T14:25:30.000Z" },
  { Name: "OpsConsole-Frontend-CD", Created: "2026-01-12T00:00:00.000Z", Updated: "2026-03-10T11:05:00.000Z", LastExecutionStatus: "Succeeded", LastExecutionTime: "2026-03-10T11:08:12.000Z" },
];

export const mockAmplifyApps: AmplifyAppItem[] = [
  { AppId: "d123amplifyapp", Name: "opsconsole-portal", DefaultDomain: "d123amplifyapp.amplifyapp.com", Status: "VERIFIED", LastDeployTime: "2026-03-09T18:00:00.000Z", Branches: ["main", "staging"] },
];

export const mockSageMakerData: SageMakerData = {
  models: [{ ModelName: "anomaly-detector-v2", CreationTime: "2026-02-10T00:00:00.000Z", ExecutionRoleArn: "arn:aws:iam::123456789012:role/SageMakerRole" }],
  endpoints: [{ EndpointName: "anomaly-detection-endpoint", EndpointStatus: "InService", CreationTime: "2026-02-11T00:00:00.000Z" }],
  trainingJobs: [{ TrainingJobName: "train-anomaly-detector-2026-02", TrainingJobStatus: "Completed", CreationTime: "2026-02-09T00:00:00.000Z" }],
};

export const mockCloudWatchAlarms: CloudWatchAlarmItem[] = [
  { AlarmName: "RDS-HighCPU-ProductionPostgres", StateValue: "OK", MetricName: "CPUUtilization", Namespace: "AWS/RDS", Threshold: 85 },
  { AlarmName: "ALB-High5xxRate", StateValue: "OK", MetricName: "HTTPCode_Target_5XX_Count", Namespace: "AWS/ApplicationELB", Threshold: 10 },
  { AlarmName: "EC2-LowFreeDisk-Worker", StateValue: "ALARM", MetricName: "DiskSpaceUtilization", Namespace: "CWAgent", Threshold: 90 },
];

export const mockWasteData: WasteData = {
  unattachedEbs: [
    { VolumeId: "vol-0123456789abcdef0", Size: 100, VolumeType: "gp2", CreateTime: "2026-01-05T00:00:00.000Z", Name: "temp-migration-dump" },
  ],
  unusedEips: [
    { PublicIp: "13.232.88.91", AllocationId: "eipalloc-01234567", Domain: "vpc" },
  ],
  idleEc2: [
    { InstanceId: "i-09ab12cd34ef5678d", Name: "bastion-host", InstanceType: "t3.nano", CpuAvg7d: 1.2, MonthlyEstimate: 4.8 },
  ],
  zeroHealthyTg: [
    { TgName: "legacy-worker-tg", LbName: "internal-services-nlb" },
  ],
};

export const mockOptimizationFindings: OptimizationFinding[] = [
  {
    id: "opt-ebs-gp2-upgrade",
    severity: "warning",
    category: "Storage Optimization",
    resource: "vol-0123456789abcdef0",
    resourceType: "EBS Volume",
    finding: "Volume is using gp2 storage instead of current-generation gp3.",
    suggestion: "Migrate from gp2 to gp3 to save 20% on storage costs while gaining baseline 3,000 IOPS.",
    estimatedMonthlySavings: 24.0,
  },
  {
    id: "opt-ec2-stopped",
    severity: "info",
    category: "Compute Waste",
    resource: "i-09ab12cd34ef5678e (legacy-reporting-service)",
    resourceType: "EC2 Instance",
    finding: "Instance has been stopped for > 30 days while attached EBS volumes still incur costs.",
    suggestion: "Create an AMI snapshot and delete the instance & volumes to stop idle billing.",
    estimatedMonthlySavings: 32.5,
  },
  {
    id: "opt-s3-lifecycle",
    severity: "info",
    category: "S3 Lifecycle",
    resource: "opsconsole-audit-logs-cold",
    resourceType: "S3 Bucket",
    finding: "Bucket contains 8.9 GB of logs without a Glacier transition lifecycle rule.",
    suggestion: "Apply an S3 Lifecycle Rule to transition objects to Glacier Instant Retrieval after 90 days.",
    estimatedMonthlySavings: 18.0,
  },
];

export const mockFailureHistory: FailureHistoryEvent[] = [
  {
    eventId: "evt-01234a",
    eventName: "StopInstances",
    eventTime: "2026-03-08T04:12:00.000Z",
    username: "deployment-service-user",
    resourceType: "AWS::EC2::Instance",
    resourceName: "i-09ab12cd34ef5678e",
    severity: "warning",
    reason: "Instance was stopped via automation script during cost-reduction maintenance.",
    recovery: ["Verify if intentional", "Start instance via OpsConsole or AWS CLI if required"],
  },
  {
    eventId: "evt-01234b",
    eventName: "StopTask",
    eventTime: "2026-03-07T18:45:00.000Z",
    username: "ecs-agent",
    resourceType: "AWS::ECS::Task",
    resourceName: "task/event-indexer-1",
    severity: "warning",
    reason: "Container task was stopped due to memory limit breach (OOM).",
    recovery: ["Inspect CloudWatch logs for exit code 137 (OOM)", "Increase task memory in ECS Task Definition"],
  },
];

export const mockSecurityPosture: SecurityPostureData = {
  securityGroups: [
    {
      groupId: "sg-0123456789prod",
      groupName: "public-web-sg",
      description: "Security group for public Application Load Balancer",
      vpcId: "vpc-0123456789abcdef0",
      openPorts: [80, 443],
      severity: "HIGH",
      rules: [
        { port: 80, protocol: "tcp", cidr: "0.0.0.0/0", severity: "HIGH" },
        { port: 443, protocol: "tcp", cidr: "0.0.0.0/0", severity: "HIGH" },
      ],
    },
    {
      groupId: "sg-0987654321db",
      groupName: "database-internal-sg",
      description: "Internal Postgres and Redis security group",
      vpcId: "vpc-0123456789abcdef0",
      openPorts: [],
      severity: "MEDIUM",
      rules: [
        { port: 5432, protocol: "tcp", cidr: "10.0.0.0/16", severity: "LOW" },
        { port: 6379, protocol: "tcp", cidr: "10.0.0.0/16", severity: "LOW" },
      ],
    },
  ],
  iamUsers: [
    {
      userName: "admin-sre-lead",
      userId: "AIDA1234567890ABCDEF",
      createDate: "2025-01-10T00:00:00.000Z",
      passwordLastUsed: "2026-03-10T09:00:00.000Z",
      hasAdminAccess: true,
      hasPowerAccess: false,
      accessLevel: "ADMIN",
      policies: ["AdministratorAccess"],
    },
    {
      userName: "ci-deployer",
      userId: "AIDA1234567890CIUSER",
      createDate: "2025-02-01T00:00:00.000Z",
      hasAdminAccess: false,
      hasPowerAccess: true,
      accessLevel: "POWER",
      policies: ["PowerUserAccess"],
    },
  ],
  summary: {
    totalGroups: 8,
    criticalGroups: 0,
    highRiskGroups: 2,
    totalIamUsers: 6,
    adminUsers: 1,
  },
};

export const mockTopology: TopologyData = {
  nodes: [
    { id: "internet", type: "internet", label: "Internet / Users", subLabel: "Incoming HTTPS traffic", status: "active" },
    { id: "vpc-0123456789abcdef0", type: "vpc", label: "Production VPC", subLabel: "10.0.0.0/16", status: "available" },
    { id: "alb-prod-public", type: "alb", label: "prod-public-alb", subLabel: "Application Load Balancer", status: "active", vpcId: "vpc-0123456789abcdef0" },
    { id: "ecs-cluster", type: "ecs-cluster", label: "production-apps-cluster", subLabel: "4 Running Services", status: "active", vpcId: "vpc-0123456789abcdef0" },
    { id: "rds-postgres-primary", type: "rds", label: "production-postgres-primary", subLabel: "PostgreSQL 16.1 (Multi-AZ)", status: "available", vpcId: "vpc-0123456789abcdef0" },
    { id: "redis-primary", type: "elasticache", label: "prod-redis-primary", subLabel: "Redis 7.0 Cluster", status: "available", vpcId: "vpc-0123456789abcdef0" },
    { id: "s3-assets", type: "s3", label: "opsconsole-app-assets-prod", subLabel: "S3 Bucket (Encrypted)", status: "available" },
  ],
  edges: [
    { id: "e-internet-alb", source: "internet", target: "alb-prod-public", label: "HTTPS :443" },
    { id: "e-alb-ecs", source: "alb-prod-public", target: "ecs-cluster", label: "Reverse Proxy" },
    { id: "e-ecs-rds", source: "ecs-cluster", target: "rds-postgres-primary", label: "SQL :5432" },
    { id: "e-ecs-redis", source: "ecs-cluster", target: "redis-primary", label: "Cache :6379" },
    { id: "e-ecs-s3", source: "ecs-cluster", target: "s3-assets", label: "Blob Storage" },
  ],
};

export function generateMockLiveMetrics(resourceId: string, resourceType: "ec2" | "rds"): LiveMetricSeries[] {
  const points = 12;
  const now = Date.now();
  const step = 30 * 60 * 1000; // 30 min intervals

  const makePoints = (base: number, variance: number) => {
    return Array.from({ length: points }, (_, i) => ({
      timestamp: new Date(now - (points - 1 - i) * step).toISOString(),
      value: Math.max(0, parseFloat((base + (Math.sin(i) * variance) + (Math.random() * 2 - 1)).toFixed(2))),
    }));
  };

  if (resourceType === "ec2") {
    const cpuPoints = makePoints(28, 12);
    const netPoints = makePoints(420000, 150000);
    return [
      { name: "CPU Utilization", unit: "%", datapoints: cpuPoints, current: cpuPoints[cpuPoints.length - 1].value, avg: 28.5, max: 44.2 },
      { name: "Network In", unit: "bytes", datapoints: netPoints, current: netPoints[netPoints.length - 1].value, avg: 412000, max: 620000 },
      { name: "Network Out", unit: "bytes", datapoints: makePoints(280000, 90000), current: 275000, avg: 280000, max: 390000 },
      { name: "Disk Read Ops", unit: "ops", datapoints: makePoints(14, 8), current: 12, avg: 14, max: 24 },
      { name: "Disk Write Ops", unit: "ops", datapoints: makePoints(32, 14), current: 30, avg: 32, max: 48 },
    ];
  } else {
    const cpuPoints = makePoints(32, 10);
    const connPoints = makePoints(88, 30);
    return [
      { name: "CPU Utilization", unit: "%", datapoints: cpuPoints, current: cpuPoints[cpuPoints.length - 1].value, avg: 32.4, max: 46.1 },
      { name: "Database Connections", datapoints: connPoints, current: connPoints[connPoints.length - 1].value, avg: 88, max: 142 },
      { name: "Free Storage", unit: "bytes", datapoints: makePoints(182 * 1073741824, 2 * 1073741824), current: 182 * 1073741824, avg: 182 * 1073741824, max: 184 * 1073741824 },
      { name: "Read IOPS", unit: "ops/s", datapoints: makePoints(48, 20), current: 42, avg: 48, max: 74 },
      { name: "Write IOPS", unit: "ops/s", datapoints: makePoints(110, 40), current: 98, avg: 110, max: 165 },
    ];
  }
}
