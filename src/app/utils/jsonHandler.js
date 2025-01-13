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
 *
 * 1) Reads the flat JSON, with "sectionsList" as the array of section metadata.
 * 2) Builds "sections" by merging the "bars" data into each section's .markers.
 * 3) Returns a nested structure that the app can use (i.e. "sections" with .markers).
 *    The original "sectionsList" remains in the object if you need it for reference,
 *    but the app will primarily look at "sections".
 */
export async function assembleNestedJSON(flatJson) {
  console.log("flatJson => assembleNestedJSON =>", flatJson);

  // 1) Extract what we need
  const { sectionsList, bars } = flatJson;
  if (!Array.isArray(sectionsList) || !Array.isArray(bars)) {
    console.warn(
      "assembleNestedJSON => Missing sectionsList or bars. Returning flatJson directly."
    );
    return flatJson; // fallback, no transformation
  }

  // 2) Convert each item in sectionsList to a "section" with .markers
  const nestedSections = sectionsList.map((sec) => {
    // parse the numeric bar range
    const startNum = parseInt(sec.startBarId, 10);
    const endNum = parseInt(sec.endBarId, 10);

    // find all bars that fall into [startNum..endNum]
    const markers = bars
      .filter((bar) => {
        const barNum = parseInt(bar.id, 10);
        return barNum >= startNum && barNum <= endNum;
      })
      .map((bar) => ({
        id: bar.id,
        label: bar.label,
        start: bar.start,
        end: bar.end,
      }));

    return {
      ...sec, // keep name, type, id, etc.
      markers, // the nested markers array
    };
  });

  // 3) Return the entire object, but add "sections" for the app
  return {
    ...flatJson,
    sections: nestedSections, // the app uses "sections" with .markers
  };
}

/**
 * assembleFlatJSON(nestedJson)
 *
 * Converts the nested data (the app's "sections" with .markers) back into
 * the "flat" data on disk, which has "sectionsList" plus "bars".
 *
 * Steps:
 *  - read nestedJson.sections[] with .markers
 *  - produce a top-level .bars array
 *  - produce a .sectionsList array (like the old "sectionsList" in flat JSON)
 *  - preserve other top-level fields (songInfo, Rhythms, chordNotation, etc.)
 *  - add top-level "songID" for server usage
 */
export async function assembleFlatJSON(nestedJson) {
  console.log("nestedJson => assembleFlatJSON =>", nestedJson);

  // 1) Clone so we don't mutate
  const result = JSON.parse(JSON.stringify(nestedJson));

  // 2) Destructure known fields
  const {
    songInfo = {},
    sections = [],
    Rhythms = [],
    chordNotation = [],
  } = result;

  // If no sections => do minimal transformation
  if (!Array.isArray(sections) || sections.length === 0) {
    const sid = songInfo?.songID || "UnknownSong";
    result.songID = sid;
    return result;
  }

  // We'll gather all bars from each "section[].markers"
  const barsMap = {};

  // We'll rebuild sectionsList from each "section"
  const flatSectionsList = sections.map((sec) => {
    // if no markers, fallback
    const markers = Array.isArray(sec.markers) ? sec.markers : [];
    if (markers.length === 0) {
      return {
        ...sec,
        // remove the nested markers
        markers: undefined,
        startBarId: "0",
        endBarId: "0",
      };
    }

    // Sort markers by .start
    const sortedMarkers = markers.slice().sort((a, b) => a.start - b.start);

    // first & last bar => startBarId, endBarId
    const startBarId = sortedMarkers[0].id;
    const endBarId = sortedMarkers[sortedMarkers.length - 1].id;

    // Accumulate all bars
    sortedMarkers.forEach((bar) => {
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
      // recalc startTime / endTime from first/last marker
      startTime: sortedMarkers[0].start,
      endTime: sortedMarkers[sortedMarkers.length - 1].end,
    };
  });

  // Flatten bars => barsArray
  const barsArray = Object.values(barsMap).sort((a, b) => a.start - b.start);

  // Now build final "flat" object with the new fields
  const flatJson = {
    ...nestedJson, // keep other top-level fields (songInfo, etc.)
    sectionsList: flatSectionsList, // rename "sections" => "sectionsList"
    bars: barsArray,                // gather all bars
    Rhythms,
    chordNotation,
  };

  // add top-level "songID" from songInfo
  const sid = songInfo?.songID || "UnknownSong";
  flatJson.songID = sid;

  // You may optionally remove the old "sections" field if you don't want it in the final JSON:
  delete flatJson.sections; // if you want to remove "sections"

  console.log("assembleFlatJSON => final FLAT =>", flatJson);
  return flatJson;
}

/**
 * Optionally, any Node-based code here must run on the server, so if
 * you use "fs" or "path", that logic must live in a server environment,
 * not in a "use client" file.
 *
 * copyDefaultMarkerFile(songID) => ...
 */
