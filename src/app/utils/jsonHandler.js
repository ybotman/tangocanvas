// src/app/utils/jsonHandler.js
"use client";

export function downloadJSONFile(jsonData, fileName = "updatedMarkers.json") {
  const jsonStr = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * assembleNestedJSON(flatJson)
 * Transforms "flatJSON" into "nestedJSON":
 *  - Builds `sections[].markers` from global bars[].
 */
export async function assembleNestedJSON(flatJson) {
  // Example structure:
  // flatJson = {
  //   songInfo: { songID, songDuration, ...},
  //   sections: [{ id, startBarId, endBarId, ... }, ...],
  //   bars: [{ id, start, end, label }, ...]
  // }
  console.log("flatJson assemble request", flatJson);
  const { sections, bars } = flatJson;
  if (!sections || !bars) return flatJson; // fallback

  const nestedSections = sections.map((sec) => {
    const startNum = parseInt(sec.startBarId, 10);
    const endNum = parseInt(sec.endBarId, 10);
    const markers = bars
      .filter((bar) => {
        const barNum = parseInt(bar.id, 10);
        return barNum >= startNum && barNum <= endNum;
      })
      .map((bar) => ({
        id: bar.id, // "1", "2", etc.
        label: bar.label,
        start: bar.start,
        end: bar.end,
      }));
    return {
      ...sec,
      markers,
    };
  });

  return {
    ...flatJson,
    sections: nestedSections,
  };
}

/**
 * disassembleFlatJSON(nestedJson)
 * Transforms "nestedJSON" into "flatJSON":
 *  - Pulls all bar data out of sections[].markers => bars[]
 *  - Each section references bars by startBarId/endBarId
 */
export async function disassembleFlatJSON(nestedJson) {
  // Example structure:
  // nestedJson = {
  //   songInfo: { songID, ... },
  //   sections: [{ id, markers: [{id, start, end}, ...], ...}],
  // }
  console.log("nestedJson disassemble request", nestedJson);
  const { sections } = nestedJson;
  if (!sections) return nestedJson; // fallback

  const barsMap = {};
  const flatSections = sections.map((sec) => {
    if (!sec.markers || sec.markers.length === 0) {
      return { ...sec, startBarId: "0", endBarId: "0" };
    }
    // Sort by start time to keep them contiguous
    const sorted = sec.markers.slice().sort((a, b) => a.start - b.start);

    // first->startBarId, last->endBarId
    const startBarId = sorted[0].id;
    const endBarId = sorted[sorted.length - 1].id;

    // accumulate all bars
    sorted.forEach((bar) => {
      barsMap[bar.id] = {
        id: bar.id,
        label: bar.label,
        start: bar.start,
        end: bar.end,
      };
    });

    return {
      ...sec,
      markers: undefined, // remove nested
      startBarId,
      endBarId,
    };
  });

  // Flatten all bars from barsMap
  const barsArray = Object.values(barsMap).sort((a, b) => a.start - b.start);

  return {
    ...nestedJson,
    sections: flatSections,
    bars: barsArray,
  };
}

/**
 * copyDefaultMarkerFile(songId)
 * Copies /public/masterData/defaultSong.json => /public/markers/<songId>-markers.json
 */
export async function copyDefaultMarkerFile(songId) {
  const masterDir = path.join(process.cwd(), "public", "masterData");
  const defaultPath = path.join(masterDir, "defaultSong.json");
  const markersDir = path.join(process.cwd(), "public", "markers");
  const newFilePath = path.join(markersDir, `${songId}-markers.json`);

  // read default
  const defaultRaw = await fs.readFile(defaultPath, "utf-8");
  const defaultJson = JSON.parse(defaultRaw);

  // rename inside JSON if needed
  defaultJson.songInfo.songID = songId;
  console.log("Building defaultSong.json to", newFilePath);
  await fs.writeFile(
    newFilePath,
    JSON.stringify(defaultJson, null, 2),
    "utf-8",
  );
  return true;
}
