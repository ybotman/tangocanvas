// src/app/api/songs/route.js

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const songsDir = path.join(process.cwd(), "public", "songs");
    const files = await fs.readdir(songsDir);

    // Filter for audio extensions
    const audioExtensions = [".mp3", ".wav", ".flac", ".aac", ".ogg"];
    const audioFiles = files.filter((file) =>
      audioExtensions.includes(path.extname(file).toLowerCase()),
    );

    // Return as JSON
    return NextResponse.json({
      songs: audioFiles.map((filename) => ({ filename })),
    });
  } catch (err) {
    console.error("Error reading songs folder:", err);
    return NextResponse.json(
      { error: "Failed to list songs." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/songs
 * - Expects JSON: { filename, base64Data }
 *   where `base64Data` is the base64-encoded audio content
 * - Saves the file to /public/songs/<filename>
 */
export async function POST(request) {
  try {
    const { filename, base64Data } = await request.json();
    if (!filename || !base64Data) {
      return NextResponse.json(
        { error: "filename and base64Data are required" },
        { status: 400 },
      );
    }

    const songsDir = path.join(process.cwd(), "public", "songs");
    const filePath = path.join(songsDir, filename);

    // Check if file already exists
    try {
      await fs.access(filePath);
      // If we get here, file is found
      return NextResponse.json(
        { error: "File already exists. Use a different filename." },
        { status: 409 },
      );
    } catch {
      // File not found, so we can proceed
    }

    // Convert base64 to Buffer
    const fileBuffer = Buffer.from(base64Data, "base64");

    // Write file
    await fs.writeFile(filePath, fileBuffer);
    return NextResponse.json({ success: true, message: "Song uploaded." });
  } catch (err) {
    console.error("Error in POST /api/songs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/songs?filename=<filename>
 * - Deletes the specified file from /public/songs
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    if (!filename) {
      return NextResponse.json(
        { error: "Missing 'filename' query param" },
        { status: 400 },
      );
    }

    const songsDir = path.join(process.cwd(), "public", "songs");
    const filePath = path.join(songsDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // If not found, respond 404
      return NextResponse.json(
        { error: `Song ${filename} not found.` },
        { status: 404 },
      );
    }

    // Remove file
    await fs.unlink(filePath);

    return NextResponse.json({ success: true, message: `Deleted ${filename}` });
  } catch (err) {
    console.error("Error in DELETE /api/songs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
