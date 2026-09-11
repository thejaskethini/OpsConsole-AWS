import { NextResponse } from "next/server";
import { getRdsClient, getCloudWatchClient, hasAwsCredentials } from "@/lib/aws-clients";
import { DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { mockRDSInstances } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const results = mockRDSInstances.map((db) => {
        const allocatedGB = db.AllocatedStorage || 100;
        const storageMin = (db.FreeStorageSpaceGB || 50) * 1024 * 1024 * 1024;
        const isRisky = (db.CpuUtilization || 0) > 80 || storageMin < allocatedGB * 1024 * 1024 * 1024 * 0.1;
        return {
          Identifier: db.DBInstanceIdentifier,
          Class: db.DBInstanceClass,
          Engine: db.Engine,
          Status: db.DBInstanceStatus,
          AllocatedStorageGB: allocatedGB,
          CpuAvg: db.CpuUtilization || 20,
          FreeStorageBytesMin: storageMin,
          ConnectionsMax: db.MaxConnections24h || 50,
          IsRisky: isRisky,
        };
      });
      return NextResponse.json(results);
    }

    const rds = getRdsClient(region);
    const cw = getCloudWatchClient(region);

    const dbCmd = new DescribeDBInstancesCommand({});
    const dbRes = await rds.send(dbCmd);

    const results: Record<string, unknown>[] = [];
    const endTime = new Date();
    const startTime24h = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    for (const db of dbRes.DBInstances || []) {
      const dbId = db.DBInstanceIdentifier!;
      let cpuAvg = 0;
      let storageMin = 0;
      let connectionsMax = 0;

      try {
        const dimensions = [{ Name: "DBInstanceIdentifier", Value: dbId }];

        const [cpuRes, storageRes, connRes] = await Promise.all([
          cw.send(new GetMetricStatisticsCommand({
            Namespace: "AWS/RDS", MetricName: "CPUUtilization", Dimensions: dimensions,
            StartTime: startTime24h, EndTime: endTime, Period: 86400, Statistics: ["Average"],
          })),
          cw.send(new GetMetricStatisticsCommand({
            Namespace: "AWS/RDS", MetricName: "FreeStorageSpace", Dimensions: dimensions,
            StartTime: startTime24h, EndTime: endTime, Period: 86400, Statistics: ["Minimum"],
          })),
          cw.send(new GetMetricStatisticsCommand({
            Namespace: "AWS/RDS", MetricName: "DatabaseConnections", Dimensions: dimensions,
            StartTime: startTime24h, EndTime: endTime, Period: 86400, Statistics: ["Maximum"],
          })),
        ]);

        cpuAvg = cpuRes.Datapoints?.[0]?.Average || 0;
        storageMin = storageRes.Datapoints?.[0]?.Minimum || 0;
        connectionsMax = connRes.Datapoints?.[0]?.Maximum || 0;
      } catch (e) {
        logger.warn(`Metric error for RDS ${dbId}`, { error: String(e) });
      }

      const allocatedGB = db.AllocatedStorage || 0;
      const allocatedBytes = allocatedGB * 1024 * 1024 * 1024;
      const isRisky = cpuAvg > 80 || (storageMin > 0 && storageMin < allocatedBytes * 0.1);

      results.push({
        Identifier: dbId,
        Class: db.DBInstanceClass,
        Engine: db.Engine,
        Status: db.DBInstanceStatus,
        AllocatedStorageGB: allocatedGB,
        CpuAvg: cpuAvg,
        FreeStorageBytesMin: storageMin,
        ConnectionsMax: connectionsMax,
        IsRisky: isRisky,
      });
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    logger.error("RDS API Error", error);
    return handleAwsError(error, "Failed to fetch RDS data");
  }
}
