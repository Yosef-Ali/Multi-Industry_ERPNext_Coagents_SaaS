import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file in upload request." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty." },
        { status: 400 }
      );
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
    const uniqueName = `${Date.now()}-${safeName}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json(
      {
        url: `/uploads/${uniqueName}`,
        pathname: file.name,
        contentType: file.type || "application/octet-stream",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to handle file upload:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
