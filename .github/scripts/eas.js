const {
  EAS,
  NO_EXPIRATION,
  SchemaEncoder,
} = require("@ethereum-attestation-service/eas-sdk");
const ethers = require("ethers");
require("dotenv").config();

module.exports = async ({ data }) => {
  const EAS_CONTRACT = "0x4200000000000000000000000000000000000021";
  const SCHEMA_UID =
    "0xaec128d2b0ed11303f1d7ca6c0a7387607b61f1181c36b378022b4fda73df68f";
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = "https://sepolia.base.org";

  const eas = new EAS(EAS_CONTRACT);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    "uint256 evidence_id,string title,string description,string[] results,string strength,string version,string[] methodologies,string[] datasets,string[] citation,string[] tags,string author"
  );
  const encodedData = schemaEncoder.encodeData([
    {
      name: "evidence_id",
      value: BigInt(data.meta.evidence_id) || BigInt(0),
      type: "uint256",
    },
    { name: "title", value: data.meta.title || "Untitled", type: "string" },
    { name: "description", value: data.content, type: "string" },
    {
      name: "results",
      value: Array.isArray(data.meta.results)
        ? data.meta.results.map((r) =>
            typeof r === "object" ? JSON.stringify(r) : r
          )
        : [data.meta.results]
            .filter(Boolean)
            .map((r) => (typeof r === "object" ? JSON.stringify(r) : r)),
      type: "string[]",
    },
    { name: "strength", value: data.meta.strength || "", type: "string" },
    { name: "version", value: data.meta.version || "", type: "string" },
    {
      name: "methodologies",
      value: Array.isArray(data.meta.methodologies)
        ? data.meta.methodologies
        : [data.meta.methodologies].filter(Boolean),
      type: "string[]",
    },
    {
      name: "datasets",
      value: Array.isArray(data.meta.datasets)
        ? data.meta.datasets
        : [data.meta.datasets].filter(Boolean),
      type: "string[]",
    },
    {
      name: "citation",
      value: Array.isArray(data.meta.citation)
        ? data.meta.citation.map((c) =>
            typeof c === "object" ? JSON.stringify(c) : c
          )
        : [data.meta.citation]
            .filter(Boolean)
            .map((c) => (typeof c === "object" ? JSON.stringify(c) : c)),
      type: "string[]",
    },
    {
      name: "tags",
      value: Array.isArray(data.meta.tags)
        ? data.meta.tags
        : [data.meta.tags].filter(Boolean),
      type: "string[]",
    },
    {
      name: "author",
      value: data.meta.author || "Unknown",
      type: "string",
    },
  ]);

  // Get current nonce to ensure proper transaction ordering
  const nonce = await signer.getNonce("pending");
  console.log("Using nonce:", nonce);

  const transaction = await eas.attest({
    schema: SCHEMA_UID,
    data: {
      recipient: ethers.ZeroAddress,
      expirationTime: NO_EXPIRATION,
      revocable: true,
      data: encodedData,
      refUID:
        data.refUID ||
        "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
  });
  
  console.log("Transaction submitted, waiting for confirmation...");
  const newAttestationUID = await transaction.wait();
  console.log("Attestation created with UID:", newAttestationUID);
  console.log("Transaction hash:", transaction.receipt?.hash);
  console.log("Block number:", transaction.receipt?.blockNumber);

  return newAttestationUID;
};
