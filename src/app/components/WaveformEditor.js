"use client";

import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

/**
 * A simple WaveSurfer display that DOES NOT use RegionsPlugin.
 * The wave is purely for reference.
 */
export default function WaveformEditor({ audioUrl, onReady }) {
  const waveRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (waveRef.current) return;

    // Create a basic WaveSurfer instance
    waveRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#f50057",
      cursorColor: "#333",
      backend: "WebAudio",
      height: 150,
      scrollParent: false,
      responsive: true,
    });

    waveRef.current.on("error", (err) => {
      if (err.name === "AbortError") {
        console.info("WaveSurfer fetch aborted (ignore).");
      } else {
        console.error("WaveSurfer error:", err);
      }
    });

    // Load the audio
    waveRef.current.load(audioUrl);

    // Fire onReady once wave is fully loaded
    waveRef.current.on("ready", () => {
      if (onReady) onReady(waveRef.current);
    });

    // Cleanup on unmount
    return () => {
      if (waveRef.current) {
        try {
          waveRef.current?.destroy();
        } catch (err) {
          if (err.name !== "AbortError") {
            console.error("Destroy error:", err);
          }
        }
        waveRef.current = null;
      }
    };
  }, [audioUrl, onReady]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: 800,
        backgroundColor: "#eee",
      }}
    />
  );
}

WaveformEditor.propTypes = {
  audioUrl: PropTypes.string.isRequired,
  onReady: PropTypes.func,
};

WaveformEditor.defaultProps = {
  onReady: null,
};
