/* --------------------------------------------
 * @/utils/sectionHelper.js
 * --------------------------------------------
 */

export function createNewSection(sectionType) {
  return {
    id: `section-${Date.now()}`, // or your own ID generator
    type: sectionType.toLowerCase(), // e.g., "intro", "bridge"
    label: `${sectionType} Section`,
    start: 0,
    end: 0,
    markers: [],
  };
}

/**
 * Returns the array of bars (markers) between barIdStart..barIdEnd (inclusive).
 * Also removes them from their original location in the "sections".
 * @param {Array} sections  The array of sections
 * @param {String} barIdStart  e.g. "bar-9"
 * @param {String} barIdEnd    e.g. "bar-14"
 * @returns {Array} an array of extracted markers
 */
export function extractBarRange(sections, barIdStart, barIdEnd) {
  const extractedMarkers = [];
  let collecting = false; // once we see barIdStart => collecting = true
  let done = false; // once we see barIdEnd => collecting = false => break

  for (const sec of sections) {
    const newMarkers = [];
    for (const bar of sec.markers || []) {
      if (!collecting && bar.id === barIdStart) {
        // Start collecting
        collecting = true;
      }
      if (collecting) {
        // Add this bar to the extracted set
        extractedMarkers.push(bar);

        // If we just reached barIdEnd => mark done
        if (bar.id === barIdEnd) {
          done = true;
          continue; // we still remove from original
        }
      } else {
        // Not collecting => keep in original
        newMarkers.push(bar);
      }

      // If collecting is done, any subsequent bars remain in the old section
      if (done) {
        newMarkers.push(bar);
      }
    }
    // Overwrite the section’s markers with the ones that were NOT extracted
    if (collecting || done) {
      // We remove from old section only the bars that have been extracted
      // so we skip them in the final
      sec.markers = newMarkers;
    }
    if (done) break; // optional, if you only want one contiguous block
  }

  return extractedMarkers;
}

/**
 * Merges the markers of `sectionToRemove` into the previous section,
 * then removes `sectionToRemove` from the array.
 */
export function deleteSectionByIndex(sections, sectionIndex) {
  if (sections.length <= 1) {
    throw new Error("Cannot delete the only section in the song");
  }
  if (sectionIndex === 0) {
    throw new Error("Cannot delete the first section");
  }

  const prevSec = sections[sectionIndex - 1];
  const targetSec = sections[sectionIndex];

  // Merge targetSec's markers into prevSec
  prevSec.markers = [...(prevSec.markers || []), ...(targetSec.markers || [])];

  // Remove the target section from array
  sections.splice(sectionIndex, 1);
  return sections;
}

/**
 * Recalculate each section's .start and .end from its markers.
 */
export function updateAllSectionBoundaries(sections) {
  sections.forEach((sec) => {
    if (!sec.markers || sec.markers.length === 0) {
      sec.start = 0;
      sec.end = 0;
    } else {
      const firstBar = sec.markers[0];
      const lastBar = sec.markers[sec.markers.length - 1];
      sec.start = firstBar.start;
      sec.end = lastBar.end;
    }
  });
}

export function splitSectionByBarRange(
  originalSection,
  barIdStart,
  barIdEnd,
  newSectionType,
) {
  /**
   * This function:
   *   1. Finds the sub-range of markers from barIdStart..barIdEnd (inclusive).
   *   2. Creates a new “intro” (or any new type) section from those markers.
   *   3. Removes those markers from the originalSection’s markers array.
   *   4. Adjusts start/end times in both sections to remain contiguous.
   *
   * Returns: { newSection, updatedOriginalSection } or null if invalid.
   */

  // Defensive copy so we don’t mutate the original
  const updatedOriginal = JSON.parse(JSON.stringify(originalSection));

  // find indexes of barIdStart..barIdEnd
  const markers = updatedOriginal.markers || [];
  let startIndex = markers.findIndex((m) => m.id === barIdStart);
  let endIndex = markers.findIndex((m) => m.id === barIdEnd);

  if (startIndex < 0 || endIndex < 0) {
    // e.g., user typed bar IDs that are not found
    return null;
  }
  if (startIndex > endIndex) {
    // If user reversed them, swap
    [startIndex, endIndex] = [endIndex, startIndex];
  }

  // Extract the range
  const extractedMarkers = markers.slice(startIndex, endIndex + 1);

  // Remove them from the original
  updatedOriginal.markers = [
    ...markers.slice(0, startIndex),
    ...markers.slice(endIndex + 1),
  ];

  // Create the new section
  const newSection = {
    id: `section-${Date.now()}`,
    type: newSectionType.toLowerCase(), // e.g. "intro"
    label: `${newSectionType} Section`,
    start: 0,
    end: 0,
    markers: extractedMarkers,
  };

  // Now fix up times for each section based on first/last markers
  // 1) newSection
  if (extractedMarkers.length > 0) {
    const firstBar = extractedMarkers[0];
    const lastBar = extractedMarkers[extractedMarkers.length - 1];
    newSection.start = firstBar.start;
    newSection.end = lastBar.end;
  }

  // 2) updatedOriginal
  if (updatedOriginal.markers.length > 0) {
    const f = updatedOriginal.markers[0];
    const l = updatedOriginal.markers[updatedOriginal.markers.length - 1];
    updatedOriginal.start = f.start;
    updatedOriginal.end = l.end;
  } else {
    // If user took all bars => original is now empty
    updatedOriginal.start = 0;
    updatedOriginal.end = 0;
  }

  return { newSection, updatedOriginal };
}

/**
 * A helper that scans all markers in the entire JSON to produce
 * an array of { id, label } for UI picks (barIdStart / barIdEnd).
 */
export function getAllBarsFromSections(sections) {
  const allBars = [];
  sections.forEach((sec) => {
    (sec.markers || []).forEach((bar) => {
      allBars.push({
        id: bar.id,
        label: bar.label,
      });
    });
  });
  return allBars;
}
