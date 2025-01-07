//----------------------------------------------------------------
// src/app/edit/components/WaveformEditorWithRegions.js
//----------------------------------------------------------------
"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Box } from "@mui/material";
import PropTypes from "prop-types";
import dynamic from "next/dynamic";

// Force dynamic import so Next doesn't SSR
// Also import the ESM version of the plugin explicitly
const WaveSurfer = dynamic(() => import("wavesurfer.js"), { ssr: false });
const RegionsPlugin = dynamic(
  () => import("wavesurfer.js/dist/plugins/regions.esm.js"),
  { ssr: false },
);

export default function WaveformEditor({
  sections,
  audioUrl,
  onBarRegionUpdate,
}) {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);

  const initWaveSurfer = useCallback(async () => {
    if (!containerRef.current || waveSurferRef.current) return;

    // "await" the dynamic imports so we actually get the plugin classes
    const [WS, RP] = await Promise.all([WaveSurfer, RegionsPlugin]);

    waveSurferRef.current = WS.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#f50057",
      cursorColor: "#333",
      backend: "WebAudio",
      height: 150,
      fillParent: true,
      scrollParent: false,
      plugins: [
        RP.create({
          drag: true,
          resize: false,
        }),
      ],
    });

    waveSurferRef.current.on("error", (err) => {
      if (err.name === "AbortError") {
        console.info("WaveSurfer fetch aborted - ignoring...");
        return;
      }
      console.error("WaveSurfer error:", err);
    });

    waveSurferRef.current.load(audioUrl);

    waveSurferRef.current.on("ready", () => {
      // Dynamically create regions for each bar
      sections.forEach((section) => {
        section.markers.forEach((bar) => {
          waveSurferRef.current.addRegion({
            id: bar.id,
            start: bar.start,
            end: bar.end,
            color: "rgba(100,150,255,0.2)",
            drag: true,
            resize: false,
          });
        });
      });
    });

    waveSurferRef.current.on("region-update-end", (region) => {
      onBarRegionUpdate(region.id, region.start);
    });

    waveSurferRef.current.on("region-click", (region, e) => {
      e.stopPropagation();
      const snippetDuration = Math.min(region.end - region.start, 4.5);
      waveSurferRef.current.play(region.start, region.start + snippetDuration);
    });
  }, [audioUrl, sections, onBarRegionUpdate]);

  const cleanupWaveSurfer = useCallback(() => {
    if (waveSurferRef.current) {
      try {
        waveSurferRef.current.destroy();
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("WaveSurfer destroy error:", err);
        } else {
          console.info("AbortError during cleanup - ignoring");
        }
      }
      waveSurferRef.current = null;
    }
  }, []);

  useEffect(() => {
    initWaveSurfer();
    return () => cleanupWaveSurfer();
  }, [initWaveSurfer, cleanupWaveSurfer]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        maxWidth: 800,
        backgroundColor: "#eee",
      }}
    />
  );
}

WaveformEditor.propTypes = {
  sections: PropTypes.array.isRequired,
  audioUrl: PropTypes.string.isRequired,
  onBarRegionUpdate: PropTypes.func.isRequired,
};
