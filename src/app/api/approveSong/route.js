// src/app/api/approveSong/route.js

import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

/**
 * POST /api/approveSong
 * Body: { filename: "someSong.mp3" }
 *
 *  - Reads /public/songs/approvedSongs.json
 *  - Checks if filename is already present
 *  - If not, pushes it to the array
 *  - Writes the updated array back
 */
export async function POST(request) {
  try {
    const { filename } = await request.json();
    if (!filename) {
      return NextResponse.json(
        { error: "No filename provided" },
        { status: 400 },
      );
    }

    const approvedPath = path.join(
      process.cwd(),
      "public",
      "songs",
      "approvedSongs.json",
    );
    const raw = await fs.readFile(approvedPath, "utf-8");
    const approvedData = JSON.parse(raw);

    // Ensure "songs" array exists
    if (!Array.isArray(approvedData.songs)) {
      approvedData.songs = [];
    }

    // Check if it's already approved
    const alreadyApproved = approvedData.songs.some(
      (s) => s.filename === filename,
    );
    if (alreadyApproved) {
      return NextResponse.json({
        message: `Song "${filename}" is already approved.`,
      });
    }

    // Otherwise, add it
    approvedData.songs.push({ filename });
    await fs.writeFile(
      approvedPath,
      JSON.stringify(approvedData, null, 2),
      "utf-8",
    );

    return NextResponse.json({
      success: true,
      message: `Song "${filename}" has been approved.`,
    });
  } catch (err) {
    console.error("Error in POST /api/approveSong:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
