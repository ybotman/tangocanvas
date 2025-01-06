"use client";

import { useRef, useCallback, useState } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

export default function useWaveSurfer({ containerRef }) {
  const waveSurferRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // 1) Initialize
  const initWaveSurfer = useCallback(() => {
    if (waveSurferRef.current || !containerRef.current) return;

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#f50057",
      barWidth: 2,
      height: 100,
      responsive: true,
      backend: "WebAudio"
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

  // 3) Play a snippet (4.5s)
  const playSnippet = useCallback(
    (startSec, snippetDuration = 4.5) => {
      if (!waveSurferRef.current || !isReady) return;
      // waveSurfer 7+ can do .play(start, end)
      waveSurferRef.current.setVolume(1.0);
      waveSurferRef.current.play(startSec, startSec + snippetDuration);
    },
    [isReady]
  );

  // 4) Zoom to highlight bar in context
  const zoomToBar = useCallback(
    (startSec, totalDuration, barsToShow = 3) => {
      if (!waveSurferRef.current || !isReady) return;

      // each bar ~3s => if we show 3 bars, that's ~9s wide
      const widthSec = barsToShow * 3; 
      // waveSurfer .zoom() => pixels-per-second
      const PPS = 30; 
      waveSurferRef.current.zoom(PPS);

      // try to center startSec in that 9s window
      const halfSpan = widthSec / 2; 
      let centerTime = startSec + halfSpan;
      if (centerTime > totalDuration) centerTime = totalDuration;

      const ratio = centerTime / totalDuration;
      waveSurferRef.current.seekTo(Math.min(ratio, 1));
    },
    [isReady]
  );

  // 5) Cleanup
  const cleanupWaveSurfer = useCallback(() => {
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
    isReady
  };
}

useWaveSurfer.propTypes = {
  containerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) })
};