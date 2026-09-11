import { NextResponse } from "next/server";
import {
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
  type Reservation,
  type InstanceStatus,
} from "@aws-sdk/client-ec2";
import { getEc2Client, hasAwsCredentials } from "@/lib/aws-clients";
import { mockEC2Instances } from "@/modules/cloud/mock-data";
import { logger } from "@/lib/logger";
import { handleAwsError } from "@/lib/api";

// Paginate through all EC2 reservations
async function getAllInstances(ec2: ReturnType<typeof getEc2Client>): Promise<Reservation[]> {
  const reservations: Reservation[] = [];
  let nextToken: string | undefined;
  do {
    const res = await ec2.send(
      new DescribeInstancesCommand({ NextToken: nextToken, MaxResults: 1000 })
    );
    reservations.push(...(res.Reservations || []));
    nextToken = res.NextToken;
  } while (nextToken);
  return reservations;
}

// Paginate through all instance statuses
async function getAllStatuses(ec2: ReturnType<typeof getEc2Client>): Promise<InstanceStatus[]> {
  const statuses: InstanceStatus[] = [];
  let nextToken: string | undefined;
  do {
    const res = await ec2.send(
      new DescribeInstanceStatusCommand({ IncludeAllInstances: true, NextToken: nextToken, MaxResults: 1000 })
    );
    statuses.push(...(res.InstanceStatuses || []));
    nextToken = res.NextToken;
  } while (nextToken);
  return statuses;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const summary = {
        total: mockEC2Instances.length,
        running: mockEC2Instances.filter((i) => i.State === "running").length,
        stopped: mockEC2Instances.filter((i) => i.State === "stopped").length,
        other: mockEC2Instances.filter((i) => i.State !== "running" && i.State !== "stopped").length,
      };
      return NextResponse.json({ instances: mockEC2Instances, summary });
    }

    const ec2 = getEc2Client(region);

    const [reservations, statuses] = await Promise.all([
      getAllInstances(ec2),
      getAllStatuses(ec2),
    ]);

    const statusMap: Record<string, string> = {};
    for (const s of statuses) {
      statusMap[s.InstanceId!] = s.InstanceState?.Name || "unknown";
    }

    const instances: Record<string, unknown>[] = [];
    for (const res of reservations) {
      for (const inst of (res.Instances || [])) {
        const nameTag = (inst.Tags || []).find((t) => t.Key === "Name")?.Value || inst.InstanceId;
        instances.push({
          InstanceId: inst.InstanceId,
          Name: nameTag,
          InstanceType: inst.InstanceType,
          State: inst.State?.Name,
          SystemStatus: statusMap[inst.InstanceId!] || inst.State?.Name || "unknown",
          PublicIp: inst.PublicIpAddress || null,
          PrivateIp: inst.PrivateIpAddress || null,
          LaunchTime: inst.LaunchTime,
          Platform: inst.PlatformDetails || "Linux/UNIX",
          AZ: inst.Placement?.AvailabilityZone,
          VpcId: inst.VpcId || null,
          Tags: inst.Tags || [],
        });
      }
    }

    const summary = {
      total: instances.length,
      running: instances.filter((i) => i.State === "running").length,
      stopped: instances.filter((i) => i.State === "stopped").length,
      other: instances.filter((i) => i.State !== "running" && i.State !== "stopped").length,
    };

    return NextResponse.json({ instances, summary });
  } catch (error: unknown) {
    logger.error("EC2 API Error", error);
    return handleAwsError(error, "Failed to fetch EC2 data");
  }
}
