//--------------------------------------------
//src/app/components/SnippetWaveSurfer.js
//--------------------------------------------

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

/**
 * A hidden WaveSurfer instance for audio-only or snippet playback.
 * No waveform is rendered on-screen, but you can still call 'playSnippet'.
 */
export default function SnippetWaveSurfer({ audioUrl, onReady }) {
  // waveRef -> the WaveSurfer instance
  const waveRef = useRef(null);

  // hiddenContainerRef -> the invisible <div> we dynamically create
  const hiddenContainerRef = useRef(null);

  /**
   * Initialize WaveSurfer with a hidden container
   */
  useEffect(() => {
    // 1) Create a hidden <div> that WaveSurfer can attach to
    hiddenContainerRef.current = document.createElement("div");
    hiddenContainerRef.current.style.display = "none";
    document.body.appendChild(hiddenContainerRef.current);

    // 2) Create WaveSurfer with that container
    waveRef.current = WaveSurfer.create({
      container: hiddenContainerRef.current,
      waveColor: "transparent",
      progressColor: "transparent",
      cursorWidth: 0,
      height: 0,
      backend: "WebAudio",
    });

    // 3) Load the audio file
    waveRef.current.load(audioUrl);

    // 4) Listen for “ready” event
    waveRef.current.on("ready", () => {
      if (onReady) onReady();
    });

    // 5) Handle cleanup on unmount
    return () => {
      // Destroy WaveSurfer instance
      if (waveRef.current) {
        waveRef.current.destroy();
        waveRef.current = null;
      }
      // Remove hidden <div> from the DOM
      if (hiddenContainerRef.current && hiddenContainerRef.current.parentNode) {
        hiddenContainerRef.current.parentNode.removeChild(
          hiddenContainerRef.current,
        );
        hiddenContainerRef.current = null;
      }
    };
  }, [audioUrl, onReady]);

  /**
   * Public method to play a snippet from 'startSec' → 'endSec'
   */
  const playSnippet = useCallback((startSec, endSec) => {
    if (!waveRef.current) return;
    const totalDur = waveRef.current.getDuration();
    if (!totalDur || startSec >= totalDur) return;

    // Stop any previous playback
    if (waveRef.current.isPlaying()) {
      waveRef.current.stop();
    }

    // Seek to 'startSec'
    waveRef.current.seekTo(startSec / totalDur);
    // Start playback
    waveRef.current.play();

    // Pause after (endSec - startSec)
    const snippetLength = (endSec - startSec) * 1000;
    setTimeout(() => {
      if (waveRef.current) {
        waveRef.current.pause();
      }
    }, snippetLength);
  }, []);

  /**
   * We return nothing visually — this component is purely functional
   * But we expose 'playSnippet' via a ref or a callback if needed.
   */
  return null;
}

SnippetWaveSurfer.propTypes = {
  audioUrl: PropTypes.string.isRequired,
  onReady: PropTypes.func,
};
SnippetWaveSurfer.defaultProps = {
  onReady: null,
};
