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
    "0xec36c273dbad9291925f533236d8d637e2dfbb4ede1f2d44665cf35f265373c3";
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = "https://sepolia.base.org";

  const eas = new EAS(EAS_CONTRACT);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    "uint256 evidence_id,string title,string description,string strength, string effectiveness, string[] methodologies, string[] data_sources, string citation, string[] tags, string author"
  );
  const encodedData = schemaEncoder.encodeData([
    {
      name: "evidence_id",
      value: BigInt(data.meta.evidence_id) || BigInt(0),
      type: "uint256",
    },
    { name: "title", value: data.meta.title || "Untitled", type: "string" },
    { name: "description", value: data.content, type: "string" },
    { name: "strength", value: data.meta.strength || "", type: "string" },
    {
      name: "effectiveness",
      value: data.meta.effectiveness || "",
      type: "string",
    },
    {
      name: "methodologies",
      value: Array.isArray(data.meta.methodologies)
        ? data.meta.methodologies
        : [data.meta.methodologies].filter(Boolean),
      type: "string[]",
    },
    {
      name: "data_sources",
      value: Array.isArray(data.meta.data_sources)
        ? data.meta.data_sources
        : [data.meta.data_sources].filter(Boolean),
      type: "string[]",
    },
    { name: "citation", value: data.meta.citation || "", type: "string" },
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

  const transaction = await eas.attest({
    schema: SCHEMA_UID,
    data: {
      recipient: ethers.ZeroAddress,
      expirationTime: NO_EXPIRATION,
      revocable: false,
      data: encodedData,
      // refUID : ""
    },
  });
  const newAttestationUID = await transaction.wait();
  console.log("Attestation created with UID:", newAttestationUID);
  console.log("Transaction receipt:", transaction.receipt);

  return newAttestationUID;
};
