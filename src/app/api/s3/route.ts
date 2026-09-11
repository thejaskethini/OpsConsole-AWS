import { NextResponse } from "next/server";
import { getS3Client, getCloudWatchClient, hasAwsCredentials } from "@/lib/aws-clients";
import {
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetBucketVersioningCommand,
  GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketTaggingCommand,
} from "@aws-sdk/client-s3";
import { GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { mockS3Buckets } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const results = mockS3Buckets.map((b) => ({
        Name: b.Name,
        CreationDate: b.CreationDate,
        Region: b.Region,
        Versioning: b.Versioning,
        Encryption: b.Encryption,
        Lifecycle: b.Lifecycle,
        Tags: "Environment=Production",
        SizeBytes: b.SizeBytes,
        NumObjects: b.ObjectCount,
      }));
      return NextResponse.json(results);
    }

    const s3 = getS3Client(region);
    const listCmd = new ListBucketsCommand({});
    const bucketsRes = await s3.send(listCmd);

    const endTime = new Date();
    const startTime24h = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    // Parallelize bucket metadata lookups
    const bucketPromises = (bucketsRes.Buckets || []).map(async (b) => {
      const name = b.Name!;
      let bucketRegion = "unknown";
      let versioning = "unknown";
      let encryption = "unknown";
      let lifecycle = "unknown";
      let tags = "None";
      let sizeBytes = 0;
      let numObjects = 0;

      try {
        const locRes = await s3.send(new GetBucketLocationCommand({ Bucket: name }));
        bucketRegion = locRes.LocationConstraint || "us-east-1";
      } catch { /* ignored */ }

      try {
        const verRes = await s3.send(new GetBucketVersioningCommand({ Bucket: name }));
        versioning = verRes.Status || "Suspended/NotEnabled";
      } catch { /* ignored */ }

      try {
        await s3.send(new GetBucketEncryptionCommand({ Bucket: name }));
        encryption = "Enabled";
      } catch {
        encryption = "Disabled/Denied";
      }

      try {
        await s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket: name }));
        lifecycle = "Configured";
      } catch {
        lifecycle = "None/Denied";
      }

      try {
        const tagsRes = await s3.send(new GetBucketTaggingCommand({ Bucket: name }));
        tags = (tagsRes.TagSet || []).map((t: any) => `${String(t.Key)}=${String(t.Value)}`).join(", ") || "None";
      } catch {
        tags = "Denied/None";
      }

      try {
        const cwBucket = getCloudWatchClient(bucketRegion !== "unknown" ? bucketRegion : region);
        const [sizeRes, objRes] = await Promise.all([
          cwBucket.send(new GetMetricStatisticsCommand({
            Namespace: "AWS/S3", MetricName: "BucketSizeBytes",
            Dimensions: [{ Name: "BucketName", Value: name }, { Name: "StorageType", Value: "StandardStorage" }],
            StartTime: startTime24h, EndTime: endTime, Period: 86400, Statistics: ["Maximum"],
          })),
          cwBucket.send(new GetMetricStatisticsCommand({
            Namespace: "AWS/S3", MetricName: "NumberOfObjects",
            Dimensions: [{ Name: "BucketName", Value: name }, { Name: "StorageType", Value: "AllStorageTypes" }],
            StartTime: startTime24h, EndTime: endTime, Period: 86400, Statistics: ["Maximum"],
          })),
        ]);
        sizeBytes = sizeRes.Datapoints?.[0]?.Maximum || 0;
        numObjects = objRes.Datapoints?.[0]?.Maximum || 0;
      } catch { /* ignored */ }

      return {
        Name: name,
        CreationDate: b.CreationDate,
        Region: bucketRegion,
        Versioning: versioning,
        Encryption: encryption,
        Lifecycle: lifecycle,
        Tags: tags,
        SizeBytes: sizeBytes,
        NumObjects: numObjects,
      };
    });

    const settled = await Promise.allSettled(bucketPromises);
    const results = settled
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json(results);
  } catch (error: unknown) {
    logger.error("S3 API Error", error);
    return handleAwsError(error, "Failed to fetch S3 data");
  }
}
