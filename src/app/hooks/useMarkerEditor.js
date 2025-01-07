// src/app/hooks/useMarkerEditor.js
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
   * adjustBarTime(barId, delta):
   *   1) If barId === "bar-1", we do nothing (bar 1 always starts at 0).
   *   2) Else, shift bar i’s start by delta => new end = new start + oldLength.
   *   3) Set bar (i-1).end = bar i.start (removing gap/overlap).
   *   4) Forward ripple => bar (i+1)... remain contiguous.
   */
  const adjustBarTime = useCallback((barId, delta) => {
    setSections((prevSections) => {
      const newSecs = JSON.parse(JSON.stringify(prevSections));

      for (const sec of newSecs) {
        const markers = sec.markers;
        for (let i = 0; i < markers.length; i++) {
          const bar = markers[i];
          if (bar.id === barId) {
            // 1) If bar-1 => do nothing, return
            if (barId === "bar-1") {
              console.info("Bar 1 cannot shift. Aborting shift.");
              return newSecs;
            }

            // 2) shift this bar's start
            const oldLen = bar.end - bar.start;
            bar.start += delta;
            bar.end = bar.start + oldLen;

            // 3) "Back ripple" => set bar i-1’s end = bar i.start
            //    only if i > 0
            if (i > 0) {
              const prevBar = markers[i - 1];
              prevBar.end = bar.start;
              // We do NOT change prevBar.start => so bar i-1 might lengthen or shrink
            }

            // 4) “Forward ripple” => bar i+1.. must remain contiguous
            //    i.e., each next bar’s start = previous bar’s end
            let currentEnd = bar.end;
            for (let j = i + 1; j < markers.length; j++) {
              const nb = markers[j];
              const nbLen = nb.end - nb.start;
              nb.start = currentEnd;
              nb.end = nb.start + nbLen;
              currentEnd = nb.end;
            }
            return newSecs; // Done
          }
        }
      }
      return newSecs;
    });
  }, []);

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
