"use client";

import { useState, useCallback, useEffect } from "react";

export default function useMarkerEditor(songData) {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (songData?.sections) {
      // Deep clone so we don't mutate the original
      setSections(JSON.parse(JSON.stringify(songData.sections)));
    }
  }, [songData]);

  /**
   * applyNewBarLengthAfterBar(barId, newLen):
   *   - Once we find barId across any section, we:
   *       1) Set found = true
   *       2) Then every subsequent bar (including next sections) is assigned
   *          newLen for length => bar.end = bar.start + newLen
   *       3) We keep a "lastKnownEnd" so if we cross sections, the first bar
   *          in that new section starts exactly where the old section ended.
   *   - We also round to 1 decimal each time (to reduce floating drift).
   */
  const applyNewBarLengthAfterBar = useCallback((barId, newLen) => {
    console.info(
      "applyNewBarLengthAfterBar searching for",
      barId,
      "newLen=",
      newLen,
    );
    setSections((prevSections) => {
      const newSecs = JSON.parse(JSON.stringify(prevSections));

      let found = false;
      let lastKnownEnd = null; // track the last bar's end across sections

      for (const sec of newSecs) {
        for (let i = 0; i < sec.markers.length; i++) {
          const bar = sec.markers[i];
          if (!bar) continue;

          if (!found) {
            // If not found yet, we check if this is the barId
            if (bar.id === barId) {
              console.info(
                `Found barId ${barId} in section ${sec.id} index ${i}`,
              );
              found = true;
              lastKnownEnd = bar.end; // we store the end of the "found" bar
              continue;
            }
            // If still not found, do nothing; keep going
          } else {
            // We have found = true => update subsequent bars
            // If we're at the first bar of the new section, or we simply keep chaining
            // from the last bar's end:
            if (lastKnownEnd !== null) {
              bar.start = parseFloat(lastKnownEnd.toFixed(1));
              bar.end = parseFloat((bar.start + newLen).toFixed(1));
            } else {
              // missing previous bar scenario => set bar.start as it was?
              console.warn(`No lastKnownEnd, skipping bar ${bar.id}`);
            }

            lastKnownEnd = bar.end; // update for the next iteration
          }
        }
      }

      if (!found) {
        console.warn(`Bar ID ${barId} was not found. No changes applied.`);
      }

      console.info(
        "Updated sections after apply:",
        JSON.stringify(newSecs, null, 2),
      );
      return newSecs;
    });
  }, []);

  const adjustBarTime = useCallback((barId, delta) => {
    setSections((prevSections) => {
      const newSecs = JSON.parse(JSON.stringify(prevSections));

      for (const sec of newSecs) {
        for (let i = 0; i < sec.markers.length; i++) {
          const bar = sec.markers[i];
          if (bar.id === barId) {
            const oldLength = bar.end - bar.start;
            bar.start += delta;
            bar.end = bar.start + oldLength;

            // ripple subsequent bars
            let currentEnd = bar.end;
            for (let j = i + 1; j < sec.markers.length; j++) {
              const nb = sec.markers[j];
              const nbLen = nb.end - nb.start;
              nb.start = currentEnd;
              nb.end = nb.start + nbLen;
              currentEnd = nb.end;
            }
            return newSecs; // Return early, once the bar is found/updated
          }
        }
      }
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
    applyNewBarLengthAfterBar,
    finalizeAndGetJSON,
    adjustBarTime
  };
}
