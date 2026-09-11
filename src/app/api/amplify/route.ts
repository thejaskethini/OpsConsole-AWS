import { NextResponse } from "next/server";
import { ListAppsCommand } from "@aws-sdk/client-amplify";
import { getAmplifyClient, hasAwsCredentials } from "@/lib/aws-clients";
import { mockAmplifyApps } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const apps = mockAmplifyApps.map((app) => ({
        AppId: app.AppId,
        Name: app.Name,
        DefaultDomain: app.DefaultDomain,
        Repository: "github.com/example/opsconsole-portal",
        Platform: "WEB",
        CreateTime: "2025-06-01T00:00:00.000Z",
        UpdateTime: app.LastDeployTime,
        ProductionBranch: "main",
      }));
      return NextResponse.json(apps);
    }

    const amplify = getAmplifyClient(region);
    const apps: Record<string, unknown>[] = [];
    let nextToken: string | undefined;

    do {
      const res = await amplify.send(new ListAppsCommand({ nextToken, maxResults: 100 }));
      for (const app of res.apps || []) {
        apps.push({
          AppId: app.appId,
          Name: app.name,
          DefaultDomain: app.defaultDomain,
          Repository: app.repository,
          Platform: app.platform,
          CreateTime: app.createTime?.toISOString(),
          UpdateTime: app.updateTime?.toISOString(),
          ProductionBranch: app.productionBranch?.branchName,
        });
      }
      nextToken = res.nextToken;
    } while (nextToken);

    return NextResponse.json(apps);
  } catch (error: unknown) {
    logger.error("Amplify API Error", error);
    return handleAwsError(error, "Failed to fetch Amplify data");
  }
}
