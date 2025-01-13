import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * GET /api/markers?songId=<songId>
 *  1. If /public/markers/<songId>-markers.json does NOT exist => auto-create from /public/masterData/defaultSong.json
 *     - Overwrites defaultJson.songInfo => {songId, songPathFile, jsonPathFile, state = ["matched"], etc.}
 *  2. Finally read <songId>-markers.json and return it.
 *
 * Example: fetch("/api/markers?songId=Los Mareados") => returns the JSON for "Los Mareados-markers.json".
 */
export async function GET(request) {
  console.log("GET /api/markers");
  try {
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get("songId");
    if (!songId) {
      return NextResponse.json(
        { error: "Missing songId query param" },
        { status: 400 },
      );
    }

    // Paths
    const markersDir = path.join(process.cwd(), "public", "markers");
    const markerFile = path.join(markersDir, `${songId}-markers.json`);
    let fileExists = false;

    // Check if the file exists
    try {
      await fs.access(markerFile);
      fileExists = true;
    } catch {
      // Not found => will auto-create from default
    }

    if (!fileExists) {
      // 1) Read defaultSong.json
      const masterDir = path.join(process.cwd(), "public", "masterData");
      const defaultPath = path.join(masterDir, "defaultSong.json");
      const defaultRaw = await fs.readFile(defaultPath, "utf-8");
      const defaultJson = JSON.parse(defaultRaw);

      // 2) Overwrite relevant fields
      defaultJson.songInfo.songId = songId;
      defaultJson.songInfo.songPathFile = `/songs/${songId}.mp3`; // or .wav
      defaultJson.songInfo.jsonPathFile = `/markers/${songId}-markers.json`;
      if (!defaultJson.songInfo.state) {
        defaultJson.songInfo.state = "matched"; // or any default state
      }

      // 3) Write the new marker file
      await fs.writeFile(
        markerFile,
        JSON.stringify(defaultJson, null, 2),
        "utf-8",
      );
    }

    // 4) Now read the file and return it
    const raw = await fs.readFile(markerFile, "utf-8");
    const json = JSON.parse(raw);
    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    console.error("Error in GET /api/markers:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/markers
 *  - Body: { songId, ...markerData }
 *  - If <songId>-markers.json exists => 409
 *  - Otherwise => writes a brand-new file
 */
export async function POST(request) {
  console.log("POST /api/markers");
  try {
    const body = await request.json();
    const { songId, ...rest } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 },
      );
    }

    const markersDir = path.join(process.cwd(), "public", "markers");
    const newFilePath = path.join(markersDir, `${songId}-markers.json`);

    // If file exists => 409
    try {
      await fs.access(newFilePath);
      return NextResponse.json(
        { error: "Markers file already exists. Use PUT to update instead." },
        { status: 409 },
      );
    } catch {
      // does not exist => proceed
    }

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
 * PUT /api/markers
 *  - Body: { songId, ...markerData }
 *  - If <songId>-markers.json exists => rename old => <songId>-markersNN.json
 *  - Then writes new <songId>-markers.json
 */
export async function PUT(request) {
  console.log("PUT /api/markers");

  try {
    const body = await request.json();
    const { songId, ...rest } = body;
    console.log("PUT /api/markers =>", songId, rest, body);

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 },
      );
    }

    const markersDir = path.join(process.cwd(), "public", "markers");
    const mainFilePath = path.join(markersDir, `${songId}-markers.json`);

    let maxVer = 0;
    let hasMainFile = false;
    try {
      const files = await fs.readdir(markersDir);
      files.forEach((file) => {
        if (file.startsWith(`${songId}-markers`)) {
          if (file === `${songId}-markers.json`) {
            hasMainFile = true;
          } else {
            // parse "markersNN.json"
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
    }

    if (hasMainFile) {
      // rename => version
      const oldVer = (maxVer + 1).toString().padStart(2, "0");
      const newFile = path.join(markersDir, `${songId}-markers${oldVer}.json`);
      await fs.rename(mainFilePath, newFile);
    } else {
      // if no main file => must create first
      return NextResponse.json(
        { error: "No existing markers file. Use POST to create first." },
        { status: 404 },
      );
    }

    // write new
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
