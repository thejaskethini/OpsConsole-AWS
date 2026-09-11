import { NextResponse } from "next/server";
import { ListPipelinesCommand, GetPipelineStateCommand } from "@aws-sdk/client-codepipeline";
import { getCodePipelineClient, hasAwsCredentials } from "@/lib/aws-clients";
import { mockCodePipelines } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      return NextResponse.json(mockCodePipelines);
    }

    const cp = getCodePipelineClient(region);
    const pipelines: Record<string, unknown>[] = [];

    let nextToken: string | undefined;
    do {
      const res = await cp.send(new ListPipelinesCommand({ nextToken }));
      const items = res.pipelines || [];

      // Enrich with pipeline state (latest execution)
      await Promise.all(
        items.map(async (p) => {
          try {
            const state = await cp.send(new GetPipelineStateCommand({ name: p.name! }));
            const stageState = state.stageStates?.[0];
            const latest = stageState?.latestExecution;
            const lastActionTime = stageState?.actionStates?.[0]?.latestExecution?.lastStatusChange;
            pipelines.push({
              Name: p.name,
              Created: p.created?.toISOString(),
              Updated: p.updated?.toISOString(),
              LastExecutionStatus: latest?.status,
              LastExecutionTime: lastActionTime instanceof Date ? lastActionTime.toISOString() : null,
            });
          } catch {
            pipelines.push({ Name: p.name, Created: p.created?.toISOString(), Updated: p.updated?.toISOString() });
          }
        })
      );

      nextToken = res.nextToken;
    } while (nextToken);

    return NextResponse.json(pipelines);
  } catch (error: unknown) {
    logger.error("CodePipeline API Error", error);
    return handleAwsError(error, "Failed to fetch CodePipeline data");
  }
}
