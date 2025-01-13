/**
 * src/app/hooks/useMarkerEditor.js
 *
 * Handles local editing of marker data: bar shifting, bar lengths, etc.
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
      // Deep clone so we don’t mutate original
      setSections(JSON.parse(JSON.stringify(songData.sections)));
    }
  }, [songData]);

  /**
   * adjustBarTime(barId, delta):
   *  1) If barId === "1", do nothing.
   *  2) Shift that bar’s start by ±delta => new end = new start + oldLength
   *  3) Set the previous bar’s .end to this bar’s .start
   *  4) Forward-ripple across all subsequent bars in all subsequent sections
   *  5) Then update each section’s boundaries
   */
  const adjustBarTime = useCallback((barId, delta) => {
    console.log("useMarkerEditor => adjustBarTime =>", barId, delta);
    setSections((prevSecs) => {
      const newSecs = JSON.parse(JSON.stringify(prevSecs));

      // Flatten all sections
      const globalMarkers = [];
      newSecs.forEach((sec, sIdx) => {
        sec.markers.forEach((m) => {
          globalMarkers.push({
            ...m,
            __sectionIndex: sIdx,
          });
        });
      });

      // Find the bar
      const targetIndex = globalMarkers.findIndex((m) => m.id === barId);
      if (targetIndex < 0) {
        console.info(`Bar : ${barId} not found => no shift applied`);
        return newSecs;
      }
      if (barId === "1") {
        console.info("Bar 1 cannot shift => ignoring");
        return newSecs;
      }

      // Shift this bar’s start
      const foundBar = globalMarkers[targetIndex];
      const oldLen = foundBar.end - foundBar.start;
      foundBar.start = parseFloat((foundBar.start + delta).toFixed(2));
      foundBar.end = parseFloat((foundBar.start + oldLen).toFixed(2));

      // Fix the previous bar’s end
      if (targetIndex > 0) {
        const prevBar = globalMarkers[targetIndex - 1];
        prevBar.end = parseFloat(foundBar.start.toFixed(2));
      }

      // Forward-ripple
      let currentEnd = foundBar.end;
      for (let i = targetIndex + 1; i < globalMarkers.length; i++) {
        const nb = globalMarkers[i];
        const nbLen = parseFloat((nb.end - nb.start).toFixed(2));
        nb.start = parseFloat(currentEnd.toFixed(2));
        nb.end = parseFloat((nb.start + nbLen).toFixed(2));
        currentEnd = nb.end;
      }

      // Put them back
      newSecs.forEach((sec) => {
        sec.markers = [];
      });
      globalMarkers.forEach((gm) => {
        const sIdx = gm.__sectionIndex;
        delete gm.__sectionIndex;
        newSecs[sIdx].markers.push(gm);
      });

      // Update boundaries
      updateSectionBoundaries(newSecs);
      return newSecs;
    });
  }, []);

  /**
   * applyNewBarLengthAfterBar(barId, newLen):
   *   - Once we find barId, every bar after that gets newLen
   *   - Then update sections’ .start/.end
   */
/**
 * applyBarLengthFromBar(barId, newLen):
 *   - Starting at the specified barId, set the new length for that bar and all subsequent bars.
 *   - Updates each section's `.start` and `.end` boundaries after changes.
 */
const applyBarLengthFromBar = useCallback((barId, newLen) => {
  console.log("useMarkerEditor => applyBarLengthFromBar =>", barId, newLen);

  setSections((prevSecs) => {
    const newSecs = JSON.parse(JSON.stringify(prevSecs));

    let found = false;
    let lastEnd = null;

    for (const sec of newSecs) {
      const markers = sec.markers || [];
      for (let i = 0; i < markers.length; i++) {
        const bar = markers[i];
        // If we have not yet found the starting bar
        if (!found) {
          if (bar.id === barId) {
            found = true; // Start changes at this bar
            lastEnd = bar.start; // Store this bar's start
          }
        }

        // If found, update this bar's length and position
        if (found) {
          bar.start = parseFloat(lastEnd.toFixed(2));
          bar.end = parseFloat((bar.start + newLen).toFixed(2));
          lastEnd = bar.end; // Move forward to the next bar's start
        }
      }
    }

    if (!found) {
      console.warn(`Bar ID: ${barId} was not found => no changes applied`);
    }

    // Update each section's boundaries
    updateSectionBoundaries(newSecs);
    return newSecs;
  });
}, []);


  /**
   * finalizeAndGetJSON => merges local sections back into the original
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
    applyBarLengthFromBar,
    finalizeAndGetJSON,
  };
}
