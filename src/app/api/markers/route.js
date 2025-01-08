// src/app/api/markers/route.js

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * 1) CREATE (POST /api/markers)
 *    - Expects a JSON body: { songId, ...markerData }
 *    - If <songId>-markers.json already exists, returns an error
 *    - Otherwise, writes the new file
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { songId, ...rest } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 },
      );
    }

    // Path to the 'public/markers' folder
    const markersDir = path.join(process.cwd(), "public", "markers");
    const newFilePath = path.join(markersDir, `${songId}-markers.json`);

    // Check if file already exists
    try {
      await fs.access(newFilePath);
      // If we get here, the file exists -> error
      return NextResponse.json(
        { error: "Markers file already exists. Use PUT to update instead." },
        { status: 409 },
      );
    } catch {
      // File does NOT exist, so we can create it
    }

    // Write brand new file
    await fs.writeFile(
      newFilePath,
      JSON.stringify({ songId, ...rest }, null, 2),
      "utf-8",
    );

    return NextResponse.json({
      success: true,
      message: "Markers file created.",
    });
  } catch (err) {
    console.error("Error in POST /api/markers:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * 2) UPDATE (PUT /api/markers)
 *    - Expects JSON body: { songId, ...markerData }
 *    - If <songId>-markers.json exists, rename old version => <songId>-markersNN.json
 *    - Writes a fresh <songId>-markers.json
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { songId, ...rest } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 },
      );
    }

    // Path to the 'public/markers' folder
    const markersDir = path.join(process.cwd(), "public", "markers");
    const mainFilePath = path.join(markersDir, `${songId}-markers.json`);

    // Read existing files
    let maxVer = 0;
    let hasMainFile = false;
    try {
      const files = await fs.readdir(markersDir);
      // e.g. "Amarras-markers.json", "Amarras-markers01.json", etc.
      files.forEach((file) => {
        if (file.startsWith(`${songId}-markers`)) {
          if (file === `${songId}-markers.json`) {
            hasMainFile = true;
          } else {
            // Could be "Amarras-markers02.json", parse "02"
            const match = file.match(/markers(\d+)\.json$/);
            if (match) {
              const verNum = parseInt(match[1], 10);
              if (verNum > maxVer) maxVer = verNum;
            }
          }
        }
      });
    } catch (err) {
      console.warn("Could not read markers directory:", err);
      // We'll still attempt to create or update below
    }

    // If main file exists => rename it to next version
    if (hasMainFile) {
      const oldVer = (maxVer + 1).toString().padStart(2, "0");
      const newFile = path.join(markersDir, `${songId}-markers${oldVer}.json`);
      await fs.rename(mainFilePath, newFile);
    } else {
      // If main file doesn't exist, we might interpret that as
      // an error or just let user "create" with PUT. Let's choose:
      return NextResponse.json(
        { error: "No existing markers file. Use POST to create first." },
        { status: 404 },
      );
    }

    // Write the new data to <songId>-markers.json
    await fs.writeFile(
      mainFilePath,
      JSON.stringify({ songId, ...rest }, null, 2),
      "utf-8",
    );

    return NextResponse.json({
      success: true,
      message: `Markers updated. Old file renamed to version ${maxVer + 1}.`,
    });
  } catch (err) {
    console.error("Error in PUT /api/markers:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
