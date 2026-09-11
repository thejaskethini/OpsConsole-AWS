import { NextResponse } from "next/server";
import { getCloudWatchClient, hasAwsCredentials } from "@/lib/aws-clients";
import { GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { generateMockLiveMetrics } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get("instanceId");
  const resourceType = (searchParams.get("type") || "ec2") as "ec2" | "rds";
  const hours = parseInt(searchParams.get("hours") || "6");

  if (!instanceId) {
    return NextResponse.json({ error: "instanceId is required" }, { status: 400 });
  }

  // Offline / Local Development Fallback
  if (!hasAwsCredentials()) {
    return NextResponse.json(generateMockLiveMetrics(instanceId, resourceType));
  }

  try {
    const region = searchParams.get("region") || undefined;
    const cw = getCloudWatchClient(region);
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600000);
    // 5-min periods for <=6h, 1h periods for >6h
    const period = hours <= 6 ? 300 : 3600;

    const metricsToFetch: { name: string; namespace: string; metric: string; dimName: string; stat: string; unit?: string }[] = [];

    if (resourceType === "ec2") {
      metricsToFetch.push(
        { name: "CPU Utilization", namespace: "AWS/EC2", metric: "CPUUtilization", dimName: "InstanceId", stat: "Average", unit: "%" },
        { name: "Network In", namespace: "AWS/EC2", metric: "NetworkIn", dimName: "InstanceId", stat: "Average", unit: "bytes" },
        { name: "Network Out", namespace: "AWS/EC2", metric: "NetworkOut", dimName: "InstanceId", stat: "Average", unit: "bytes" },
        { name: "Disk Read Ops", namespace: "AWS/EC2", metric: "DiskReadOps", dimName: "InstanceId", stat: "Sum", unit: "ops" },
        { name: "Disk Write Ops", namespace: "AWS/EC2", metric: "DiskWriteOps", dimName: "InstanceId", stat: "Sum", unit: "ops" },
        { name: "Disk Read Bytes", namespace: "AWS/EC2", metric: "DiskReadBytes", dimName: "InstanceId", stat: "Average", unit: "bytes" },
        { name: "Disk Write Bytes", namespace: "AWS/EC2", metric: "DiskWriteBytes", dimName: "InstanceId", stat: "Average", unit: "bytes" },
        { name: "CPU Credit Balance", namespace: "AWS/EC2", metric: "CPUCreditBalance", dimName: "InstanceId", stat: "Average" },
        { name: "Status Check Failed", namespace: "AWS/EC2", metric: "StatusCheckFailed", dimName: "InstanceId", stat: "Maximum" },
      );
    } else if (resourceType === "rds") {
      metricsToFetch.push(
        { name: "CPU Utilization", namespace: "AWS/RDS", metric: "CPUUtilization", dimName: "DBInstanceIdentifier", stat: "Average", unit: "%" },
        { name: "Free Storage", namespace: "AWS/RDS", metric: "FreeStorageSpace", dimName: "DBInstanceIdentifier", stat: "Average", unit: "bytes" },
        { name: "Database Connections", namespace: "AWS/RDS", metric: "DatabaseConnections", dimName: "DBInstanceIdentifier", stat: "Average" },
        { name: "Read IOPS", namespace: "AWS/RDS", metric: "ReadIOPS", dimName: "DBInstanceIdentifier", stat: "Average", unit: "ops/s" },
        { name: "Write IOPS", namespace: "AWS/RDS", metric: "WriteIOPS", dimName: "DBInstanceIdentifier", stat: "Average", unit: "ops/s" },
        { name: "Read Latency", namespace: "AWS/RDS", metric: "ReadLatency", dimName: "DBInstanceIdentifier", stat: "Average", unit: "sec" },
        { name: "Write Latency", namespace: "AWS/RDS", metric: "WriteLatency", dimName: "DBInstanceIdentifier", stat: "Average", unit: "sec" },
        { name: "Freeable Memory", namespace: "AWS/RDS", metric: "FreeableMemory", dimName: "DBInstanceIdentifier", stat: "Average", unit: "bytes" },
        { name: "Swap Usage", namespace: "AWS/RDS", metric: "SwapUsage", dimName: "DBInstanceIdentifier", stat: "Average", unit: "bytes" },
      );
    }

    // Parallelize CloudWatch queries
    const results = await Promise.all(
      metricsToFetch.map(async (m) => {
        try {
          const res = await cw.send(
            new GetMetricStatisticsCommand({
              Namespace: m.namespace,
              MetricName: m.metric,
              Dimensions: [{ Name: m.dimName, Value: instanceId }],
              StartTime: start,
              EndTime: end,
              Period: period,
              Statistics: [m.stat as any],
            })
          );

          const dps = (res.Datapoints || [])
            .sort((a, b) => (a.Timestamp?.getTime() || 0) - (b.Timestamp?.getTime() || 0))
            .map((d: any) => ({
              timestamp: d.Timestamp?.toISOString() || "",
              value: parseFloat((d[m.stat] || 0).toFixed(2)),
            }));

          const lastVal = dps[dps.length - 1]?.value || 0;
          const avgVal = dps.length ? dps.reduce((s: number, p: any) => s + p.value, 0) / dps.length : 0;
          const maxVal = dps.length ? Math.max(...dps.map((p: any) => p.value)) : 0;

          return {
            name: m.name,
            unit: m.unit,
            datapoints: dps,
            current: lastVal,
            avg: parseFloat(avgVal.toFixed(2)),
            max: parseFloat(maxVal.toFixed(2)),
          };
        } catch (e) {
          logger.warn(`CloudWatch metric fetch error for ${m.name}`, { error: String(e) });
          return {
            name: m.name,
            unit: m.unit,
            datapoints: [],
            current: 0,
            avg: 0,
            max: 0,
          };
        }
      })
    );

    return NextResponse.json(results);
  } catch (error: unknown) {
    logger.error("Live Metrics API Error", error);
    return handleAwsError(error, "Failed to fetch live metrics");
  }
}
