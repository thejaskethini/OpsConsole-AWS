import { NextResponse } from "next/server";
import { DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { getCloudWatchClient, hasAwsCredentials } from "@/lib/aws-clients";
import { mockCloudWatchAlarms } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const alarms = mockCloudWatchAlarms.map((a) => ({
        AlarmName: a.AlarmName,
        AlarmDescription: "Monitored production threshold alarm",
        StateValue: a.StateValue,
        Namespace: a.Namespace || "AWS/EC2",
        MetricName: a.MetricName || "CPUUtilization",
        ComparisonOperator: "GreaterThanThreshold",
        Threshold: a.Threshold || 80,
        Period: 300,
        EvaluationPeriods: 2,
        StateUpdatedTimestamp: "2026-03-10T12:00:00.000Z",
      }));
      return NextResponse.json(alarms);
    }

    const cw = getCloudWatchClient(region);
    const alarms: Record<string, unknown>[] = [];
    let nextToken: string | undefined;

    do {
      const res = await cw.send(new DescribeAlarmsCommand({ NextToken: nextToken, MaxRecords: 100 }));
      for (const a of res.MetricAlarms || []) {
        alarms.push({
          AlarmName: a.AlarmName,
          AlarmDescription: a.AlarmDescription,
          StateValue: a.StateValue,
          Namespace: a.Namespace,
          MetricName: a.MetricName,
          ComparisonOperator: a.ComparisonOperator,
          Threshold: a.Threshold,
          Period: a.Period,
          EvaluationPeriods: a.EvaluationPeriods,
          StateUpdatedTimestamp: a.StateUpdatedTimestamp?.toISOString(),
        });
      }
      nextToken = res.NextToken;
    } while (nextToken);

    return NextResponse.json(alarms);
  } catch (error: unknown) {
    logger.error("CloudWatch API Error", error);
    return handleAwsError(error, "Failed to fetch CloudWatch data");
  }
}
