//--------------------------------------------
// src/app/components/SnippetWaveSurfer.js
//--------------------------------------------
"use client";

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

/**
 * A single WaveSurfer instance that:
 *  - Displays a visible waveform
 *  - Allows snippet playback via a parent ref => .playSnippet(start, end)
 *  - No Regions plugin
 */
function SnippetWaveSurferInner({ audioUrl }, ref) {
  const waveSurferRef = useRef(null);
  const containerRef = useRef(null);

  // Expose "playSnippet" to the parent
  useImperativeHandle(ref, () => ({
    playSnippet: (startSec, endSec) => {
      if (!waveSurferRef.current) return;
      const ws = waveSurferRef.current;
      const totalDur = ws.getDuration();
      if (!totalDur || startSec >= totalDur) return;

      // Stop any previous playback
      if (ws.isPlaying()) {
        ws.stop();
      }
      // Seek & play
      ws.seekTo(startSec / totalDur);
      ws.play();

      // Stop after (endSec - startSec)
      const snippetLenMs = (endSec - startSec) * 1000;
      setTimeout(() => {
        if (waveSurferRef.current) {
          waveSurferRef.current.pause();
        }
      }, snippetLenMs);
    },
  }));

  useEffect(() => {
    // Create WaveSurfer only once
    if (!containerRef.current) return;
    if (waveSurferRef.current) return;

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#f50057",
      cursorColor: "#333",
      height: 100,
      backend: "WebAudio",
      responsive: true,
    });

    // Load the audio
    waveSurferRef.current.load(audioUrl);

    // Clean up
    return () => {
      try {
        waveSurferRef.current?.destroy();
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("WaveSurfer destroy error:", err);
        }
      }
      waveSurferRef.current = null;
    };
  }, [audioUrl]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: "600px",
        backgroundColor: "#eee",
      }}
    />
  );
}

SnippetWaveSurferInner.propTypes = {
  audioUrl: PropTypes.string.isRequired,
};

// We wrap in forwardRef to let parent call .playSnippet(...)
export default forwardRef(SnippetWaveSurferInner);
