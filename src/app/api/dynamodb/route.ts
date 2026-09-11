import { NextResponse } from "next/server";
import { getDynamoDBClient, hasAwsCredentials } from "@/lib/aws-clients";
import { ListTablesCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { mockDynamoDBTables } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const results = mockDynamoDBTables.map((t) => ({
        TableName: t.TableName,
        Status: t.TableStatus,
        ItemCount: t.ItemCount,
        SizeBytes: t.TableSizeBytes,
        BillingMode: t.BillingMode,
        ReadCapacity: 5,
        WriteCapacity: 5,
        Replicas: 0,
      }));
      return NextResponse.json(results);
    }

    const dynamo = getDynamoDBClient(region);
    const tables: Record<string, unknown>[] = [];

    // Paginate table names
    let lastKey: string | undefined;
    const tableNames: string[] = [];
    do {
      const res = await dynamo.send(new ListTablesCommand({ ExclusiveStartTableName: lastKey, Limit: 100 }));
      tableNames.push(...(res.TableNames || []));
      lastKey = res.LastEvaluatedTableName;
    } while (lastKey);

    // Describe each table for details
    await Promise.all(
      tableNames.map(async (name) => {
        try {
          const desc = await dynamo.send(new DescribeTableCommand({ TableName: name }));
          const t = desc.Table!;
          tables.push({
            TableName: t.TableName,
            Status: t.TableStatus,
            ItemCount: t.ItemCount || 0,
            SizeBytes: t.TableSizeBytes || 0,
            BillingMode: t.BillingModeSummary?.BillingMode || "PROVISIONED",
            ReadCapacity: t.ProvisionedThroughput?.ReadCapacityUnits,
            WriteCapacity: t.ProvisionedThroughput?.WriteCapacityUnits,
            Replicas: (t.Replicas || []).length,
          });
        } catch {
          tables.push({ TableName: name, Status: "UNKNOWN", ItemCount: 0, SizeBytes: 0, BillingMode: "UNKNOWN" });
        }
      })
    );

    return NextResponse.json(tables.sort((a, b) => String(a.TableName).localeCompare(String(b.TableName))));
  } catch (error: unknown) {
    logger.error("DynamoDB API Error", error);
    return handleAwsError(error, "Failed to fetch DynamoDB data");
  }
}
