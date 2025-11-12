/**
 * Mastra Lance Vector Store for Evidence Search
 * Uses Mastra's LanceVectorStore for seamless integration
 */
import path from "path";
import { LanceVectorStore } from "@mastra/lance";

const DB_PATH = path.join(process.cwd(), ".lancedb");
const TABLE_NAME = "evidence_vectors";

let vectorStore: LanceVectorStore | null = null;

/**
 * Initialize or get existing LanceVectorStore instance
 */
async function getVectorStore(): Promise<LanceVectorStore> {
  if (vectorStore) {
    return vectorStore;
  }

  vectorStore = await LanceVectorStore.create(DB_PATH);
  return vectorStore;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  evidenceId: string;
  title: string;
  chunkIndex: number;
  text: string;
  metadata?: Record<string, any>;
}

/**
 * Upsert evidence vectors into Lance DB
 */
export async function upsertEvidenceVectors(vectors: VectorPoint[]): Promise<void> {
  if (vectors.length === 0) return;

  try {
    // Import lancedb to directly access table for better control
    const { connect } = await import("@lancedb/lancedb");
    const db = await connect(DB_PATH);
    const tableNames = await db.tableNames();

    // Prepare data in flat format for Lance
    const data = vectors.map((v) => ({
      id: v.id,
      vector: v.vector,
      evidenceId: v.evidenceId,
      title: v.title,
      chunkIndex: v.chunkIndex,
      text: v.text,
      ...v.metadata,
    }));

    if (!tableNames.includes(TABLE_NAME)) {
      // Create table with flat schema using LanceDB directly
      await db.createTable(TABLE_NAME, data, { mode: "create" });
    } else {
      // Add data to existing table (append mode)
      const table = await db.openTable(TABLE_NAME);
      await table.add(data);
    }
  } catch (error) {
    console.error("Error upserting vectors:", error);
    throw error;
  }
}

/**
 * Search for similar evidence using vector similarity
 */
export async function searchSimilarEvidence(
  queryVector: number[],
  limit: number = 15,
  scoreThreshold: number = 0.7,
): Promise<Array<{ id: string; score: number; payload: VectorPoint }>> {
  try {
    // Use native LanceDB API for querying (consistent with how we store data)
    const { connect } = await import("@lancedb/lancedb");
    const db = await connect(DB_PATH);
    const tableNames = await db.tableNames();

    if (!tableNames.includes(TABLE_NAME)) {
      return [];
    }

    const table = await db.openTable(TABLE_NAME);

    // Perform vector search using native LanceDB
    const results = await table.vectorSearch(queryVector).limit(limit).toArray();

    // Convert LanceDB distance to similarity score
    // LanceDB uses L2 distance by default (lower = more similar)
    // Convert to similarity: similarity = 1 / (1 + distance)
    const resultsWithSimilarity = results.map((r: any) => {
      const distance = r._distance || 0;
      const similarity = 1 / (1 + distance);

      return {
        id: r.id,
        score: similarity,
        distance,
        payload: {
          id: r.id,
          vector: r.vector || [],
          evidenceId: r.evidenceId,
          title: r.title,
          chunkIndex: r.chunkIndex ?? 0,
          text: r.text,
          metadata: r.metadata || {},
        },
      };
    });

    // Sort by similarity (higher is better) and filter by threshold
    return resultsWithSimilarity
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.score >= scoreThreshold)
      .map(({ distance, ...rest }) => rest); // Remove internal distance field
  } catch (error) {
    console.error("Error searching similar evidence:", error);
    return [];
  }
}

/**
 * Clear all evidence vectors
 */
export async function clearEvidenceCollection(): Promise<void> {
  try {
    // Use LanceDB directly to drop table
    const { connect } = await import("@lancedb/lancedb");
    const db = await connect(DB_PATH);
    const tableNames = await db.tableNames();

    if (tableNames.includes(TABLE_NAME)) {
      await db.dropTable(TABLE_NAME);
      console.log("✓ Vector store cleared");
    }
  } catch (error) {
    console.error("Error clearing collection:", error);
    // Don't throw - clearing a non-existent table is okay
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<{
  vectorCount: number;
  lastUpdated: string;
}> {
  try {
    // Import lancedb to directly access table for row counting
    const { connect } = await import("@lancedb/lancedb");

    // Connect directly to LanceDB
    const db = await connect(DB_PATH);
    const tableNames = await db.tableNames();

    if (!tableNames.includes(TABLE_NAME)) {
      return {
        vectorCount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Get table and count rows
    const table = await db.openTable(TABLE_NAME);
    const count = await table.countRows();

    return {
      vectorCount: count,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting collection stats:", error);
    return {
      vectorCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}
