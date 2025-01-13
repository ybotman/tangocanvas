// src/app/utils/jsonHandler.js

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
  //   songInfo: { songId, songDuration, ...},
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
 * assembleFlatJSON(nestedJson)
 *
 * Converts "nested" data (what your app edits) back into the "flat" data structure
 * that you store on disk.
 *
 *  - Copies `songInfo`, `Rhythms`, `chordNotation` from nested
 *  - Builds a top-level `bars` array from all sections[].markers
 *  - Builds a top-level `sections` array, setting each startBarId/endBarId
 *    from the first/last marker
 *  - Preserves any other top-level fields (like .bars, if it existed) by spreading
 *  - Inserts a top-level `songId` to please your server PUT usage
 */
export async function assembleFlatJSON(nestedJson) {
  console.log("nestedJson disassemble request", nestedJson);

  // 1) Clone so we don't mutate the original data
  const result = JSON.parse(JSON.stringify(nestedJson));

  // 2) Extract fields we know about
  const {
    songInfo = {},
    sections = [],
    Rhythms = [],
    chordNotation = [],
  } = result;

  // If no sections => just return the result
  // (the user might not have sections or something)
  if (!Array.isArray(sections) || sections.length === 0) {
    // Insert a top-level "songId" from the nested "songInfo.songId" (if it exists)
    const sid = songInfo?.songId || "UnknownSong";
    result.songId = sid;
    return result;
  }

  // 3) We'll gather all bars from each nested section[].markers
  const barsMap = {};

  // 4) Create a new "flatSections" array that references bar IDs
  const flatSections = sections.map((sec) => {
    // Make sure we have markers
    const markers = Array.isArray(sec.markers) ? sec.markers : [];
    if (markers.length === 0) {
      // If no markers => startBarId/endBarId = "0"
      return {
        ...sec,
        markers: undefined,
        startBarId: "0",
        endBarId: "0",
      };
    }

    // Sort markers by .start time
    const sortedMarkers = [...markers].sort((a, b) => a.start - b.start);

    // The first & last bar in this section
    const startBarId = sortedMarkers[0].id;
    const endBarId = sortedMarkers[sortedMarkers.length - 1].id;

    // Collect all bars from this section => barsMap
    sortedMarkers.forEach((bar) => {
      barsMap[bar.id] = {
        id: bar.id,
        label: bar.label,
        start: bar.start,
        end: bar.end,
      };
    });

    // Remove the nested "markers" array, store just startBarId/endBarId
    return {
      ...sec,
      markers: undefined,
      startBarId,
      endBarId,

      // Optionally recalc startTime/endTime from the first & last marker
      startTime: sortedMarkers[0].start,
      endTime: sortedMarkers[sortedMarkers.length - 1].end,
    };
  });

  // 5) Flatten barsMap into a bars[] array, sorted by start
  const barsArray = Object.values(barsMap).sort((a, b) => a.start - b.start);

  // 6) Build final flat JSON
  //    - Keep "songInfo", "Rhythms", "chordNotation" from nested
  //    - Overwrite "sections" with flatSections
  //    - Overwrite "bars" with barsArray
  const flatJson = {
    // Spread all top-level fields from nestedJson, so we keep e.g. "songInfo", "Rhythms"
    ...nestedJson,

    // Overwrite these with our newly built arrays
    sections: flatSections,
    bars: barsArray,

    // Ensure these exist even if they were empty
    Rhythms,
    chordNotation,
  };

  // 7) Insert a top-level "songId" from songInfo
  const sid = songInfo?.songId || "UnknownSong";
  flatJson.songId = sid;

  console.log("assembleFlatJSON => final FLAT =>", flatJson);
  return flatJson;
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
  defaultJson.songInfo.songId = songId;
  console.log("Building defaultSong.json to", newFilePath);
  await fs.writeFile(
    newFilePath,
    JSON.stringify(defaultJson, null, 2),
    "utf-8",
  );
  return true;
}
