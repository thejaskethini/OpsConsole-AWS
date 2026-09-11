import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockCloudProvider } from "../src/modules/cloud/mock-provider";
import { getCloudProvider } from "../src/modules/cloud";
import { hasAwsCredentials } from "../src/lib/aws-clients";

describe("Cloud Provider Boundary & Mock Offline Tests", () => {
  const provider = new MockCloudProvider();

  it("safely indicates credentials status without throwing", () => {
    const hasCreds = hasAwsCredentials();
    assert.equal(typeof hasCreds, "boolean");
  });

  it("returns a working CloudProvider implementation", () => {
    const activeProvider = getCloudProvider();
    assert.ok(activeProvider);
    assert.equal(typeof activeProvider.getOverviewMetrics, "function");
    assert.equal(typeof activeProvider.getEC2Instances, "function");
    assert.equal(typeof activeProvider.getRDSInstances, "function");
  });

  it("provides deterministic EC2 instances offline", async () => {
    const instances = await provider.getEC2Instances("us-east-1");
    assert.ok(Array.isArray(instances));
    assert.ok(instances.length > 0);
    const first = instances[0];
    assert.ok(first.InstanceId);
    assert.ok(first.InstanceType);
    assert.ok(first.State);
  });

  it("provides deterministic Overview Metrics offline", async () => {
    const overview = await provider.getOverviewMetrics("us-east-1");
    assert.ok(overview);
    assert.equal(typeof overview.ec2Running, "number");
    assert.equal(typeof overview.monthlySpendEstimate, "number");
    assert.ok(Array.isArray(overview.degradedSources));
    assert.equal(overview.degradedSources.length, 0);
  });

  it("provides deterministic RDS instances offline", async () => {
    const rds = await provider.getRDSInstances("us-east-1");
    assert.ok(Array.isArray(rds));
    assert.ok(rds.length > 0);
    assert.ok(rds[0].DBInstanceIdentifier);
  });

  it("provides deterministic S3 buckets offline", async () => {
    const buckets = await provider.getS3Buckets("us-east-1");
    assert.ok(Array.isArray(buckets));
    assert.ok(buckets.length > 0);
    assert.ok(buckets[0].Name);
    assert.ok(buckets[0].Region);
  });

  it("provides deterministic Security posture offline", async () => {
    const sec = await provider.getSecurityPosture("us-east-1");
    assert.ok(sec);
    assert.ok(Array.isArray(sec.securityGroups));
    assert.ok(Array.isArray(sec.iamUsers));
    assert.ok(sec.summary);
    assert.ok(sec.summary.totalIamUsers > 0);
  });

  it("provides deterministic Waste resources offline", async () => {
    const waste = await provider.getWaste("us-east-1");
    assert.ok(waste);
    assert.ok(Array.isArray(waste.unattachedEbs));
    assert.ok(Array.isArray(waste.unusedEips));
  });

  it("provides deterministic Optimization findings offline", async () => {
    const opt = await provider.getOptimizationFindings("us-east-1");
    assert.ok(opt);
    assert.ok(Array.isArray(opt.findings));
    assert.ok(typeof opt.totalEstimatedSavings === "number");
  });

  it("provides deterministic Infrastructure topology offline", async () => {
    const topo = await provider.getInfrastructureTopology("us-east-1");
    assert.ok(topo);
    assert.ok(Array.isArray(topo.nodes));
    assert.ok(Array.isArray(topo.edges));
    assert.ok(topo.nodes.length > 0);
  });

  it("provides deterministic Live Metrics without AWS CloudWatch credentials", async () => {
    const live = await provider.getLiveMetrics("us-east-1", "i-0a1b2c3d4e5f67890", "ec2", 1);
    assert.ok(Array.isArray(live));
    assert.ok(live.length > 0);
    assert.ok(live[0].name);
    assert.ok(Array.isArray(live[0].datapoints));
  });
});
