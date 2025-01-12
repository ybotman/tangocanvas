/* --------------------------------------------
 * src/app/hooks/useMarkerEditor.js
 * --------------------------------------------
 */

"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * Helper: updates each section’s .start/.end based on first/last bar
 */
function updateSectionBoundaries(sections) {
  sections.forEach((sec) => {
    if (!sec.markers || sec.markers.length === 0) return;
    const firstBar = sec.markers[0];
    const lastBar = sec.markers[sec.markers.length - 1];
    sec.start = parseFloat(firstBar.start.toFixed(2));
    sec.end = parseFloat(lastBar.end.toFixed(2));
  });
}

export default function useMarkerEditor(songData) {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (songData?.sections) {
      // Deep clone so we don't mutate original
      setSections(JSON.parse(JSON.stringify(songData.sections)));
    }
  }, [songData]);

  /**
   * adjustBarTime(barId, delta):
   *  1) If barId === "bar-1", do nothing.
   *  2) Shift that bar’s start by ±delta => new end = new start + oldLength
   *  3) Set the previous bar’s `.end` = this bar’s `.start` (remove gap/overlap),
   *  4) Forward-ripple across *all remaining bars* in *all subsequent sections*,
   *  5) Then update each section’s boundaries.
   */
  const adjustBarTime = useCallback((barId, delta) => {
    setSections((prevSecs) => {
      const newSecs = JSON.parse(JSON.stringify(prevSecs));

      // Step A: Flatten all sections into a single "global" markers array
      //         while remembering which section each marker belongs to.
      const globalMarkers = [];
      newSecs.forEach((sec, sIdx) => {
        sec.markers.forEach((m) => {
          globalMarkers.push({
            ...m,
            __sectionIndex: sIdx, // track which section we belong to
          });
        });
      });

      // Step B: Find the bar in globalMarkers
      let targetIndex = globalMarkers.findIndex((m) => m.id === barId);
      if (targetIndex < 0) {
        console.info(`Bar ${barId} not found. Aborting shift.`);
        return newSecs;
      }

      // "bar-1" never shifts
      if (barId === "bar-1") {
        console.info("Bar 1 cannot shift. Aborting shift.");
        return newSecs;
      }

      // Step C: Shift the found bar’s start
      const foundBar = globalMarkers[targetIndex];
      const oldLen = foundBar.end - foundBar.start;
      foundBar.start = parseFloat((foundBar.start + delta).toFixed(2));
      foundBar.end = parseFloat((foundBar.start + oldLen).toFixed(2));

      // Step D: Fix the previous bar’s .end
      if (targetIndex > 0) {
        const prevBar = globalMarkers[targetIndex - 1];
        prevBar.end = parseFloat(foundBar.start.toFixed(2));
      }

      // Step E: Forward-ripple all subsequent markers (including next sections)
      let currentEnd = foundBar.end;
      for (let i = targetIndex + 1; i < globalMarkers.length; i++) {
        const nb = globalMarkers[i];
        const nbLen = parseFloat((nb.end - nb.start).toFixed(2));
        nb.start = parseFloat(currentEnd.toFixed(2));
        nb.end = parseFloat((nb.start + nbLen).toFixed(2));
        currentEnd = nb.end;
      }

      // Step F: Copy the updated globalMarkers back into each section’s marker array
      //         so each section has the updated times
      //         (use the .__sectionIndex to place them).
      //         First, empty out each sec.markers = []
      newSecs.forEach((sec) => {
        sec.markers = [];
      });
      globalMarkers.forEach((gm) => {
        const sIdx = gm.__sectionIndex;
        // remove the helper property
        delete gm.__sectionIndex;
        newSecs[sIdx].markers.push(gm);
      });

      // Step G: Update each section’s .start/.end
      updateSectionBoundaries(newSecs);

      return newSecs;
    });
  }, []);

  /**
   * applyNewBarLengthAfterBar(barId, newLen):
   *   - Once we find barId, every bar after that bar
   *     (even crossing into subsequent sections) is assigned newLen
   *   - Also updates all sections’ boundaries once done
   */
  const applyNewBarLengthAfterBar = useCallback((barId, newLen) => {
    setSections((prevSecs) => {
      const newSecs = JSON.parse(JSON.stringify(prevSecs));

      let found = false;
      let lastEnd = null;

      for (const sec of newSecs) {
        const markers = sec.markers || [];
        for (let i = 0; i < markers.length; i++) {
          const bar = markers[i];
          if (!found) {
            // If we haven't found barId yet:
            if (bar.id === barId) {
              found = true;
              lastEnd = bar.end; // store the bar’s end
            }
          } else {
            // We have found => apply newLen for each subsequent bar
            if (lastEnd !== null) {
              bar.start = parseFloat(lastEnd.toFixed(2));
              bar.end = parseFloat((bar.start + newLen).toFixed(2));
            }
            lastEnd = bar.end; // move forward
          }
        }
      }

      if (!found) {
        console.warn(`Bar ID ${barId} was not found. No changes applied.`);
      }

      // After mass update, update all sections’ .start/.end
      updateSectionBoundaries(newSecs);
      return newSecs;
    });
  }, []);

  /**
   * finalizeAndGetJSON => merges local sections back into original
   */
  const finalizeAndGetJSON = useCallback(() => {
    if (!songData) return null;
    const newData = JSON.parse(JSON.stringify(songData));
    newData.sections = sections;
    return newData;
  }, [songData, sections]);

  return {
    sections,
    adjustBarTime,
    applyNewBarLengthAfterBar,
    finalizeAndGetJSON,
  };
}
