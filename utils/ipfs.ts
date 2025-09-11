import { LogicModel, IPFSStorageResult } from "@/types";

export async function uploadToIPFS(
  logicModel: LogicModel
): Promise<IPFSStorageResult> {
  try {
    const jsonData = JSON.stringify(logicModel, null, 2);
    const filename = `logic-model-${logicModel.id}.json`;

    const blob = new Blob([jsonData], { type: "application/json" });
    const file = new File([blob], filename, { type: "application/json" });

    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({
      name: filename,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        contentSize: jsonData.length,
        logicModelId: logicModel.id,
        title: logicModel.title,
        version: logicModel.metadata.version,
      },
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", options);

    const response = await fetch("/api/upload-to-ipfs", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.hash) {
      throw new Error("No IPFS hash returned");
    }

    return {
      hash: result.hash,
      size: result.size,
      timestamp: result.timestamp,
    };
  } catch (error) {
    console.error("IPFS upload error:", error);
    throw error;
  }
}

export async function fetchFromIPFS(hash: string): Promise<LogicModel> {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const logicModel = await response.json();
    
    // Validate the structure
    if (!logicModel.id || !logicModel.cards || !logicModel.arrows) {
      throw new Error("Invalid logic model structure");
    }

    return logicModel as LogicModel;
  } catch (error) {
    console.error("IPFS fetch error:", error);
    throw error;
  }
}

export function generateLogicModelId(): string {
  return `lm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function createLogicModelFromCanvas(
  cards: any[],
  arrows: any[],
  cardMetrics: Record<string, any[]>,
  selectedGoal?: string,
  title?: string,
  description?: string,
  author?: string
): LogicModel {
  const id = generateLogicModelId();
  const now = new Date().toISOString();

  return {
    id,
    title: title || `Logic Model ${new Date().toLocaleDateString()}`,
    description,
    cards,
    arrows,
    cardMetrics,
    selectedGoal,
    metadata: {
      createdAt: now,
      updatedAt: now,
      version: "1.0.0",
      author,
    },
  };
}