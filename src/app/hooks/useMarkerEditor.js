// src/app/hooks/useMarkerEditor.js
"use client";

import { useState, useCallback, useEffect } from "react";

export default function useMarkerEditor(songData) {
  const [sections, setSections] = useState([]);
  const [defaultBarLength, setDefaultBarLength] = useState(3); // for your slider if needed

  useEffect(() => {
    if (songData?.sections) {
      // Deep clone so we don't mutate the original
      setSections(JSON.parse(JSON.stringify(songData.sections)));
    }
  }, [songData]);

  /**
   * adjustBarTime(barId, delta):
   *   - shift the bar's start by `delta`
   *   - keep bar length the same
   *   - ripple subsequent bars
   */
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
            return newSecs;
          }
        }
      }
      return newSecs;
    });
  }, []);

  const finalizeAndGetJSON = useCallback(() => {
    if (!songData) return null;
    const newData = JSON.parse(JSON.stringify(songData));
    newData.sections = sections;
    return newData;
  }, [songData, sections]);

  return {
    sections,
    adjustBarTime,
    defaultBarLength,
    setDefaultBarLength,
    finalizeAndGetJSON,
  };
}
