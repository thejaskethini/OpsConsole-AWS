import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Helper functions that mirror the selection & flow computation logic in src/app/infrastructure/page.tsx

interface RawNode {
  id: string;
  type: string;
  label: string;
  subLabel?: string;
  status?: string;
}

interface RawEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
}

function computeDirectNeighborNodeIds(selectedNodeId: string | null, rawEdges: RawEdge[]): Set<string> {
  if (!selectedNodeId) return new Set<string>();
  const neighbors = new Set<string>();
  for (const e of rawEdges) {
    if (e.source === selectedNodeId && e.target !== selectedNodeId) {
      neighbors.add(e.target);
    } else if (e.target === selectedNodeId && e.source !== selectedNodeId) {
      neighbors.add(e.source);
    }
  }
  return neighbors;
}

function computeDirectEdgesCount(selectedNodeId: string | null, rawEdges: RawEdge[]): number {
  if (!selectedNodeId) return rawEdges.length;
  return rawEdges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId).length;
}

function computeNodeStates(nodes: RawNode[], selectedNodeId: string | null, directNeighbors: Set<string>) {
  return nodes.map(n => {
    const isSelected = selectedNodeId !== null && n.id === selectedNodeId;
    const isConnected = selectedNodeId !== null && directNeighbors.has(n.id);
    const isDimmed = selectedNodeId !== null && !isSelected && !isConnected;
    return {
      id: n.id,
      isSelected,
      isConnected,
      isDimmed,
    };
  });
}

function computeEdgeStyles(rawEdges: RawEdge[], selectedNodeId: string | null) {
  if (!selectedNodeId) {
    return rawEdges.map(e => ({
      id: e.id || `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      isHighlighted: false,
      isDimmed: false,
      animated: true,
      stroke: "#475569",
    }));
  }

  return rawEdges.map(e => {
    const isDirect = e.source === selectedNodeId || e.target === selectedNodeId;
    return {
      id: e.id || `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      isHighlighted: isDirect,
      isDimmed: !isDirect,
      animated: isDirect,
      stroke: isDirect ? "#38bdf8" : "#1e293b",
    };
  });
}

function formatHeaderText(
  totalResources: number,
  totalConnections: number,
  selectedNodeId: string | null,
  selectedNodeLabel: string,
  directCount: number
): string {
  if (!selectedNodeId) {
    return `${totalResources} resources · ${totalConnections} connections — Showing full infrastructure topology`;
  }
  return `${totalResources} resources · ${totalConnections} connections — Showing ${directCount} connection${directCount === 1 ? "" : "s"} for ${selectedNodeLabel}`;
}

describe("Infrastructure Flow Selection & Highlighting Logic", () => {
  const sampleNodes: RawNode[] = [
    { id: "internet", type: "internet", label: "Internet / Users" },
    { id: "alb-main", type: "alb", label: "prod-public-alb" },
    { id: "ecs-cluster", type: "ecs-cluster", label: "production-apps-cluster" },
    { id: "lm-webhooks", type: "ecs", label: "lm-webhooks" },
    { id: "rds-pg", type: "rds", label: "production-postgres-primary" },
    { id: "redis", type: "elasticache", label: "prod-redis-primary" },
    { id: "isolated-service", type: "ecs", label: "isolated-worker" },
  ];

  const sampleEdges: RawEdge[] = [
    { id: "e1", source: "internet", target: "alb-main", label: "HTTPS :443" },
    { id: "e2", source: "alb-main", target: "ecs-cluster", label: "Reverse Proxy" },
    { id: "e3", source: "ecs-cluster", target: "lm-webhooks", label: "runs" },
    { id: "e4", source: "lm-webhooks", target: "rds-pg", label: "SQL :5432" },
    { id: "e5", source: "ecs-cluster", target: "redis", label: "Cache :6379" },
  ];

  describe("Unselected state", () => {
    it("renders full topology with all edges active and no nodes dimmed", () => {
      const selectedNodeId = null;
      const neighbors = computeDirectNeighborNodeIds(selectedNodeId, sampleEdges);
      const nodeStates = computeNodeStates(sampleNodes, selectedNodeId, neighbors);
      const edgeStyles = computeEdgeStyles(sampleEdges, selectedNodeId);
      const header = formatHeaderText(sampleNodes.length, sampleEdges.length, selectedNodeId, "", sampleEdges.length);

      assert.strictEqual(neighbors.size, 0);
      assert.strictEqual(nodeStates.every(n => !n.isSelected && !n.isConnected && !n.isDimmed), true);
      assert.strictEqual(edgeStyles.length, sampleEdges.length);
      assert.strictEqual(edgeStyles.every(e => !e.isHighlighted && !e.isDimmed && e.animated), true);
      assert.strictEqual(header, "7 resources · 5 connections — Showing full infrastructure topology");
    });
  });

  describe("Selected state - Node with multiple direct connections", () => {
    it("highlights only direct connections for lm-webhooks and dims unrelated nodes/edges", () => {
      const selectedNodeId = "lm-webhooks";
      const selectedNode = sampleNodes.find(n => n.id === selectedNodeId)!;
      const neighbors = computeDirectNeighborNodeIds(selectedNodeId, sampleEdges);
      const directCount = computeDirectEdgesCount(selectedNodeId, sampleEdges);
      const nodeStates = computeNodeStates(sampleNodes, selectedNodeId, neighbors);
      const edgeStyles = computeEdgeStyles(sampleEdges, selectedNodeId);
      const header = formatHeaderText(sampleNodes.length, sampleEdges.length, selectedNodeId, selectedNode.label, directCount);

      // lm-webhooks connects to ecs-cluster (source) and rds-pg (target) = 2 connections
      assert.strictEqual(directCount, 2);
      assert.deepStrictEqual(Array.from(neighbors).sort(), ["ecs-cluster", "rds-pg"].sort());

      // Check node states
      const selectedState = nodeStates.find(n => n.id === "lm-webhooks")!;
      assert.strictEqual(selectedState.isSelected, true);
      assert.strictEqual(selectedState.isConnected, false);
      assert.strictEqual(selectedState.isDimmed, false);

      const ecsState = nodeStates.find(n => n.id === "ecs-cluster")!;
      assert.strictEqual(ecsState.isSelected, false);
      assert.strictEqual(ecsState.isConnected, true);
      assert.strictEqual(ecsState.isDimmed, false);

      const rdsState = nodeStates.find(n => n.id === "rds-pg")!;
      assert.strictEqual(rdsState.isSelected, false);
      assert.strictEqual(rdsState.isConnected, true);
      assert.strictEqual(rdsState.isDimmed, false);

      const internetState = nodeStates.find(n => n.id === "internet")!;
      assert.strictEqual(internetState.isDimmed, true);
      assert.strictEqual(internetState.isSelected, false);
      assert.strictEqual(internetState.isConnected, false);

      // Check edge styles: 2 direct highlighted, 3 unrelated dimmed
      const highlightedEdges = edgeStyles.filter(e => e.isHighlighted);
      const dimmedEdges = edgeStyles.filter(e => e.isDimmed);
      assert.strictEqual(highlightedEdges.length, 2);
      assert.strictEqual(dimmedEdges.length, 3);
      assert.deepStrictEqual(highlightedEdges.map(e => e.id).sort(), ["e3", "e4"].sort());

      // Header status
      assert.strictEqual(header, "7 resources · 5 connections — Showing 2 connections for lm-webhooks");
    });
  });

  describe("Selected state - Node with 1 connection", () => {
    it("handles 1 connection accurately", () => {
      const selectedNodeId = "internet";
      const selectedNode = sampleNodes.find(n => n.id === selectedNodeId)!;
      const neighbors = computeDirectNeighborNodeIds(selectedNodeId, sampleEdges);
      const directCount = computeDirectEdgesCount(selectedNodeId, sampleEdges);
      const edgeStyles = computeEdgeStyles(sampleEdges, selectedNodeId);
      const header = formatHeaderText(sampleNodes.length, sampleEdges.length, selectedNodeId, selectedNode.label, directCount);

      assert.strictEqual(directCount, 1);
      assert.deepStrictEqual(Array.from(neighbors), ["alb-main"]);
      assert.strictEqual(edgeStyles.filter(e => e.isHighlighted).length, 1);
      assert.strictEqual(edgeStyles.filter(e => e.isDimmed).length, 4);
      assert.strictEqual(header, "7 resources · 5 connections — Showing 1 connection for Internet / Users");
    });
  });

  describe("Selected state - Node with 0 connections (isolated)", () => {
    it("handles isolated node with 0 connections without crashing", () => {
      const selectedNodeId = "isolated-service";
      const selectedNode = sampleNodes.find(n => n.id === selectedNodeId)!;
      const neighbors = computeDirectNeighborNodeIds(selectedNodeId, sampleEdges);
      const directCount = computeDirectEdgesCount(selectedNodeId, sampleEdges);
      const edgeStyles = computeEdgeStyles(sampleEdges, selectedNodeId);
      const header = formatHeaderText(sampleNodes.length, sampleEdges.length, selectedNodeId, selectedNode.label, directCount);

      assert.strictEqual(directCount, 0);
      assert.strictEqual(neighbors.size, 0);
      assert.strictEqual(edgeStyles.filter(e => e.isHighlighted).length, 0);
      assert.strictEqual(edgeStyles.filter(e => e.isDimmed).length, sampleEdges.length);
      assert.strictEqual(header, "7 resources · 5 connections — Showing 0 connections for isolated-worker");
    });
  });

  describe("Switching node selection and clearing", () => {
    it("switches from node A to node B cleanly", () => {
      let currentSelection: string | null = "lm-webhooks";
      assert.strictEqual(computeDirectEdgesCount(currentSelection, sampleEdges), 2);

      // Select node B (redis)
      currentSelection = "redis";
      assert.strictEqual(computeDirectEdgesCount(currentSelection, sampleEdges), 1);
      assert.deepStrictEqual(Array.from(computeDirectNeighborNodeIds(currentSelection, sampleEdges)), ["ecs-cluster"]);

      // Clear selection
      currentSelection = null;
      assert.strictEqual(computeDirectNeighborNodeIds(currentSelection, sampleEdges).size, 0);
      assert.strictEqual(computeDirectEdgesCount(currentSelection, sampleEdges), 5);
    });
  });

  describe("Self-loop and duplicate edge safety", () => {
    it("handles self loops without putting the selected node into its own neighbor set", () => {
      const edgesWithLoop: RawEdge[] = [
        ...sampleEdges,
        { id: "e-self", source: "lm-webhooks", target: "lm-webhooks", label: "self" },
      ];
      const neighbors = computeDirectNeighborNodeIds("lm-webhooks", edgesWithLoop);
      assert.strictEqual(neighbors.has("lm-webhooks"), false);
      assert.deepStrictEqual(Array.from(neighbors).sort(), ["ecs-cluster", "rds-pg"].sort());
    });
  });
});
