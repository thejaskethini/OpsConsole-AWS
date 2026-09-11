import { NextResponse } from "next/server";
import { ListEndpointsCommand, ListNotebookInstancesCommand } from "@aws-sdk/client-sagemaker";
import { getSageMakerClient, hasAwsCredentials } from "@/lib/aws-clients";
import { mockSageMakerData } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      return NextResponse.json({
        endpoints: mockSageMakerData.endpoints,
        notebooks: [
          {
            NotebookInstanceName: "data-science-exploration-env",
            NotebookInstanceStatus: "InService",
            InstanceType: "ml.t3.medium",
            CreationTime: "2026-01-10T00:00:00.000Z",
            LastModifiedTime: "2026-03-01T00:00:00.000Z",
          },
        ],
      });
    }

    const sm = getSageMakerClient(region);

    // Paginate endpoints
    const endpoints: Record<string, unknown>[] = [];
    let nextToken: string | undefined;
    do {
      const res = await sm.send(new ListEndpointsCommand({ NextToken: nextToken, MaxResults: 100 }));
      for (const e of res.Endpoints || []) {
        endpoints.push({
          EndpointName: e.EndpointName,
          EndpointStatus: e.EndpointStatus,
          CreationTime: e.CreationTime?.toISOString(),
          LastModifiedTime: e.LastModifiedTime?.toISOString(),
        });
      }
      nextToken = res.NextToken;
    } while (nextToken);

    // Paginate notebook instances
    const notebooks: Record<string, unknown>[] = [];
    let nbToken: string | undefined;
    do {
      const res = await sm.send(new ListNotebookInstancesCommand({ NextToken: nbToken, MaxResults: 100 }));
      for (const n of res.NotebookInstances || []) {
        notebooks.push({
          NotebookInstanceName: n.NotebookInstanceName,
          NotebookInstanceStatus: n.NotebookInstanceStatus,
          InstanceType: n.InstanceType,
          CreationTime: n.CreationTime?.toISOString(),
          LastModifiedTime: n.LastModifiedTime?.toISOString(),
        });
      }
      nbToken = res.NextToken;
    } while (nbToken);

    return NextResponse.json({ endpoints, notebooks });
  } catch (error: unknown) {
    logger.error("SageMaker API Error", error);
    return handleAwsError(error, "Failed to fetch SageMaker data");
  }
}
