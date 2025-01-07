// --------------------------------------------
// src/app/api/markers/route.js
// --------------------------------------------

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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

    // 1) Find existing versions (e.g., <songId>-markers.json, <songId>-markers01.json, etc.)
    // We'll do a naive read of the directory:
    const files = await fs.readdir(markersDir);
    const prefix = `${songId}-markers`;
    let maxVer = 0;
    let hasMainFile = false;

    files.forEach((file) => {
      // e.g., "Amarras-markers.json", "Amarras-markers01.json"
      if (file.startsWith(prefix)) {
        // Check if it's the main file
        if (file === `${songId}-markers.json`) {
          hasMainFile = true;
        } else {
          // Attempt to parse version from file name suffix
          // e.g., "Amarras-markers02.json" => "02"
          const match = file.match(/markers(\d+)\.json$/);
          if (match) {
            const verNum = parseInt(match[1], 10);
            if (verNum > maxVer) {
              maxVer = verNum;
            }
          }
        }
      }
    });

    // 2) If <songId>-markers.json exists, rename it to the next version
    if (hasMainFile) {
      const oldVer = (maxVer + 1).toString().padStart(2, "0");
      const oldFile = path.join(markersDir, `${songId}-markers.json`);
      const newFile = path.join(markersDir, `${songId}-markers${oldVer}.json`);
      await fs.rename(oldFile, newFile);
    }

    // 3) Write the new data to <songId>-markers.json
    const newPath = path.join(markersDir, `${songId}-markers.json`);
    await fs.writeFile(
      newPath,
      JSON.stringify({ songId, ...rest }, null, 2),
      "utf-8",
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in /api/markers POST:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
