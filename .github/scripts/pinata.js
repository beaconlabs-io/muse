module.exports = async ({ text, filename }) => {
  try {
    // Create Blob from text
    const blob = new Blob([text], { type: "text/plain" });

    // Create File object from Blob
    const file = new File([blob], filename, { type: "text/plain" });

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);

    // Set metadata
    const metadata = JSON.stringify({
      name: filename,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        contentSize: text.length,
      },
    });
    formData.append("pinataMetadata", metadata);

    // Set Pinata options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append("pinataOptions", options);

    // Send API request
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: formData,
    });

    // Check response
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const resData = await res.json();

    // Validate response
    if (!resData.IpfsHash) {
      throw new Error("No IPFS hash returned");
    }

    return {
      hash: resData.IpfsHash,
      size: resData.PinSize,
      timestamp: resData.Timestamp,
    };
  } catch (error) {
    console.error("Pinata upload error:", error);
    throw error;
  }
};
