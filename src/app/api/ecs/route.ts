import { NextResponse } from "next/server";
import { getEcsClient, hasAwsCredentials } from "@/lib/aws-clients";
import { ListClustersCommand, ListServicesCommand, DescribeServicesCommand } from "@aws-sdk/client-ecs";
import { mockECSClusters } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const results: Record<string, unknown>[] = [];
      for (const cluster of mockECSClusters) {
        for (const svc of cluster.Services || []) {
          results.push({
            Cluster: cluster.ClusterName,
            Service: svc.ServiceName,
            Desired: svc.DesiredCount,
            Running: svc.RunningCount,
            Pending: 0,
            Status: svc.Status,
            Unhealthy: svc.DesiredCount !== svc.RunningCount,
          });
        }
      }
      return NextResponse.json(results);
    }

    const ecs = getEcsClient(region);

    // 1. List Clusters
    const listClustersCmd = new ListClustersCommand({});
    const clustersRes = await ecs.send(listClustersCmd);
    const clusterArns = clustersRes.clusterArns || [];

    const results: Record<string, unknown>[] = [];

    for (const clusterArn of clusterArns) {
      const clusterName = clusterArn.split("/").pop();

      // 2. List Services
      const listSvcCmd = new ListServicesCommand({ cluster: clusterArn });
      const svcRes = await ecs.send(listSvcCmd);
      const serviceArns = svcRes.serviceArns || [];

      if (serviceArns.length === 0) continue;

      // 3. Describe Services (in chunks of 10)
      const chunkSize = 10;
      for (let i = 0; i < serviceArns.length; i += chunkSize) {
        const chunk = serviceArns.slice(i, i + chunkSize);
        const descCmd = new DescribeServicesCommand({ cluster: clusterArn, services: chunk });
        const descRes = await ecs.send(descCmd);

        (descRes.services || []).forEach((svc: any) => {
          const running = Number(svc.runningCount || 0);
          const desired = Number(svc.desiredCount || 0);
          const pending = Number(svc.pendingCount || 0);

          let failedTasks = 0;
          ((svc.deployments as Record<string, unknown>[]) || []).forEach((d: Record<string, unknown>) => {
            failedTasks += Number(d.failedTasks || 0);
          });

          const unhealthy = running !== desired || failedTasks > 0;

          results.push({
            Cluster: clusterName,
            Service: svc.serviceName,
            Desired: desired,
            Running: running,
            Pending: pending,
            Status: svc.status,
            Unhealthy: unhealthy,
          });
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    logger.error("ECS API Error", error);
    return handleAwsError(error, "Failed to fetch ECS data");
  }
}
