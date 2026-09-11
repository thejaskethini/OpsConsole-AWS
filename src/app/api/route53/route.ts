import { NextResponse } from "next/server";
import { ListHostedZonesCommand } from "@aws-sdk/client-route-53";
import { getRoute53Client, hasAwsCredentials } from "@/lib/aws-clients";
import { mockRoute53Zones } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      return NextResponse.json(mockRoute53Zones);
    }

    const r53 = getRoute53Client();
    const zones: Record<string, unknown>[] = [];
    let marker: string | undefined;

    do {
      const res = await r53.send(new ListHostedZonesCommand({ Marker: marker }));
      for (const z of res.HostedZones || []) {
        zones.push({
          Id: z.Id,
          Name: z.Name,
          RecordCount: z.ResourceRecordSetCount,
          PrivateZone: z.Config?.PrivateZone ?? false,
          Comment: z.Config?.Comment || "",
        });
      }
      marker = res.IsTruncated ? res.NextMarker : undefined;
    } while (marker);

    return NextResponse.json(zones);
  } catch (error: unknown) {
    logger.error("Route53 API Error", error);
    return handleAwsError(error, "Failed to fetch Route53 data");
  }
}
