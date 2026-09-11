import { NextResponse } from "next/server";
import { ListDistributionsCommand } from "@aws-sdk/client-cloudfront";
import { getCloudFrontClient, hasAwsCredentials } from "@/lib/aws-clients";
import { mockCloudFrontDistributions } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      return NextResponse.json(mockCloudFrontDistributions);
    }

    // CloudFront is a global service pinned to us-east-1
    const cf = getCloudFrontClient();

    const distributions: Record<string, unknown>[] = [];
    let marker: string | undefined;

    do {
      const res = await cf.send(new ListDistributionsCommand({ Marker: marker }));
      const list = res.DistributionList;
      const items = list?.Items || [];
      for (const d of items) {
        distributions.push({
          Id: d.Id,
          DomainName: d.DomainName,
          Status: d.Status,
          PriceClass: d.PriceClass,
          HttpVersion: d.HttpVersion,
          Enabled: d.Enabled,
          Aliases: d.Aliases?.Items || [],
          Origins: (d.Origins?.Items || []).map((o: { DomainName?: string }) => o.DomainName),
        });
      }
      marker = list?.IsTruncated ? list.NextMarker : undefined;
    } while (marker);

    return NextResponse.json(distributions);
  } catch (error: unknown) {
    logger.error("CloudFront API Error", error);
    return handleAwsError(error, "Failed to fetch CloudFront data");
  }
}
