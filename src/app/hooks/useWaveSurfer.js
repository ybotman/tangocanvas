"use client";

import { useRef, useCallback, useState } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

/**
 * Updated: manually pause after snippetDuration so it truly stops.
 */
export default function useWaveSurfer({ containerRef }) {
  const waveSurferRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const snippetTimeoutRef = useRef(null);

  // 1) Initialize
  const initWaveSurfer = useCallback(() => {
    if (waveSurferRef.current || !containerRef.current) return;

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#f50057",
      pixelRatio: 2,
      barWidth: 0, // or remove barWidth to let WaveSurfer draw a continuous wave
      minPxPerSec: 50, // or higher
      scrollParent: true, // if you have enough horizontal space
      height: 100,
      responsive: true,
      backend: "WebAudio",
    });

    waveSurferRef.current.on("ready", () => setIsReady(true));
    waveSurferRef.current.on("error", (err) => {
      console.error("WaveSurfer error:", err);
    });
  }, [containerRef]);

  // 2) Load a track
  const loadSong = useCallback((url) => {
    if (!waveSurferRef.current) return;
    setIsReady(false);
    waveSurferRef.current.load(url);
  }, []);

  // 3) Play a snippet manually and then pause
  const playSnippet = useCallback(
    (startSec, snippetDuration = 4.5) => {
      if (!waveSurferRef.current || !isReady) return;

      // Clear any previous timeout
      if (snippetTimeoutRef.current) {
        clearTimeout(snippetTimeoutRef.current);
        snippetTimeoutRef.current = null;
      }

      const ws = waveSurferRef.current;
      ws.setVolume(1.0);

      // Ensure we're not out of bounds
      const totalDur = ws.getDuration();
      if (startSec >= totalDur) return;

      // Seek & play
      ws.pause();
      ws.seekTo(startSec / totalDur);
      ws.play();

      // Manually pause after snippetDuration
      snippetTimeoutRef.current = setTimeout(() => {
        if (waveSurferRef.current) {
          waveSurferRef.current.pause();
        }
      }, snippetDuration * 1000);
    },
    [isReady],
  );

  // 4) Zoom to highlight bar in context
  const zoomToBar = useCallback(
    (startSec, totalDuration, barsToShow = 3) => {
      if (!waveSurferRef.current || !isReady) return;

      // each bar ~3s => 3 bars => ~9s wide
      const widthSec = barsToShow * 3;
      const PPS = 30;
      waveSurferRef.current.zoom(PPS);

      // Center startSec in the 9s window
      const halfSpan = widthSec / 2;
      let centerTime = startSec + halfSpan;
      if (centerTime > totalDuration) centerTime = totalDuration;

      const ratio = centerTime / totalDuration;
      waveSurferRef.current.seekTo(Math.min(ratio, 1));
    },
    [isReady],
  );

  // 5) Cleanup
  const cleanupWaveSurfer = useCallback(() => {
    if (snippetTimeoutRef.current) {
      clearTimeout(snippetTimeoutRef.current);
      snippetTimeoutRef.current = null;
    }
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
      waveSurferRef.current = null;
    }
    setIsReady(false);
  }, []);

  return {
    initWaveSurfer,
    loadSong,
    playSnippet,
    zoomToBar,
    cleanupWaveSurfer,
    isReady,
  };
}

useWaveSurfer.propTypes = {
  containerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
};
