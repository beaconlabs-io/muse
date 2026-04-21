// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { FILE_UPLOAD_MAX_IMAGE_BYTES, FILE_UPLOAD_MAX_PDF_BYTES } from "@/lib/constants";

const createPdfFile = (byteLength: number, name = "proposal.pdf"): File => {
  const buffer = new Uint8Array(byteLength);
  buffer[0] = 0x25;
  buffer[1] = 0x50;
  buffer[2] = 0x44;
  buffer[3] = 0x46;
  buffer[4] = 0x2d;
  return new File([buffer], name, { type: "application/pdf" });
};

const createPngFile = (byteLength: number, name = "image.png"): File => {
  const buffer = new Uint8Array(byteLength);
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  return new File([buffer], name, { type: "image/png" });
};

const createRequest = (formData: FormData) =>
  new NextRequest("https://muse.test/api/workflow/stream", {
    method: "POST",
    body: formData,
  });

describe("POST /api/workflow/stream — upload validation", () => {
  it("rejects a PDF exceeding the size limit with 413", async () => {
    const formData = new FormData();
    formData.append("file", createPdfFile(FILE_UPLOAD_MAX_PDF_BYTES + 1));

    const response = await POST(createRequest(formData));

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toBe("File too large");
  });

  it("rejects an image exceeding the size limit with 413", async () => {
    const formData = new FormData();
    formData.append("file", createPngFile(FILE_UPLOAD_MAX_IMAGE_BYTES + 1));

    const response = await POST(createRequest(formData));

    expect(response.status).toBe(413);
  });

  it("rejects an unsupported MIME type with 400", async () => {
    const formData = new FormData();
    formData.append("file", new File(["hello"], "note.txt", { type: "text/plain" }));

    const response = await POST(createRequest(formData));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Unsupported file type");
  });

  it("rejects a file whose magic bytes don't match declared MIME with 400", async () => {
    const formData = new FormData();
    const png = createPngFile(1024);
    const spoofed = new File([await png.arrayBuffer()], "fake.pdf", { type: "application/pdf" });
    formData.append("file", spoofed);

    const response = await POST(createRequest(formData));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("File content does not match declared type");
  });

  it("rejects a multipart request with no file field with 400", async () => {
    const formData = new FormData();
    formData.append("enableExternalSearch", "true");

    const response = await POST(createRequest(formData));

    expect(response.status).toBe(400);
  });
});
