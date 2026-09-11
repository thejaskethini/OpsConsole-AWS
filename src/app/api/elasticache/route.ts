import { NextResponse } from "next/server";
import { DescribeCacheClustersCommand } from "@aws-sdk/client-elasticache";
import { getElastiCacheClient, hasAwsCredentials } from "@/lib/aws-clients";
import { mockElastiCacheClusters } from "@/modules/cloud/mock-data";
import { handleAwsError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    // Offline / Local Development Fallback
    if (!hasAwsCredentials()) {
      const clusters = mockElastiCacheClusters.map((c) => ({
        ClusterId: c.CacheClusterId,
        Engine: c.Engine,
        EngineVersion: c.EngineVersion,
        Status: c.Status,
        NodeType: c.CacheNodeType,
        NumNodes: c.NumCacheNodes,
        ReplicationGroupId: null,
        Endpoint: c.EndpointAddress,
        Port: c.EndpointPort,
        CreatedAt: "2025-08-01T00:00:00.000Z",
      }));

      const summary = {
        total: clusters.length,
        available: clusters.filter((c) => c.Status === "available").length,
        redis: clusters.filter((c) => c.Engine === "redis").length,
        memcached: clusters.filter((c) => c.Engine === "memcached").length,
      };

      return NextResponse.json({ clusters, summary });
    }

    const client = getElastiCacheClient(region);
    const res = await client.send(new DescribeCacheClustersCommand({ ShowCacheNodeInfo: true }));

    const clusters = (res.CacheClusters || []).map((c: any) => ({
      ClusterId: c.CacheClusterId,
      Engine: c.Engine,
      EngineVersion: c.EngineVersion,
      Status: c.CacheClusterStatus,
      NodeType: c.CacheNodeType,
      NumNodes: c.NumCacheNodes,
      ReplicationGroupId: c.ReplicationGroupId,
      Endpoint: c.ConfigurationEndpoint?.Address || c.CacheNodes?.[0]?.Endpoint?.Address,
      Port: c.ConfigurationEndpoint?.Port || c.CacheNodes?.[0]?.Endpoint?.Port,
      CreatedAt: c.CacheClusterCreateTime,
    }));

    const summary = {
      total: clusters.length,
      available: clusters.filter((c: any) => c.Status === "available").length,
      redis: clusters.filter((c: any) => c.Engine === "redis").length,
      memcached: clusters.filter((c: any) => c.Engine === "memcached").length,
    };

    return NextResponse.json({ clusters, summary });
  } catch (error: unknown) {
    logger.error("ElastiCache API Error", error);
    return handleAwsError(error, "Failed to fetch ElastiCache data");
  }
}
