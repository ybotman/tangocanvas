/**
 * src/app/hooks/useWaveSurfer.js
 *
 * This version uses WaveSurfer 7’s "interaction" event
 * to detect user clicks on the waveform. 
 * On click => log + play from that point for 10 seconds.
 */

"use client";

import { useRef, useCallback, useState } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

export default function useWaveSurfer({
  containerRef,
  timelineRef = null,
  enableClickableWaveform = true,
}) {
  console.log("entering useWaveSurfer with containerRef=", containerRef);

  const waveSurferRef = useRef(null);

  // If user tries to play before wave is ready, we store snippet for later
  const snippetRequestRef = useRef(null);
  const snippetTimeoutRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * playSnippet:
   *  - Plays from `startSec` for `snippetDuration`.
   *  - If wave not ready => queue it until wave is "ready".
   */
  const playSnippet = useCallback(
    (startSec, snippetDuration = 4.5) => {
      console.log(
        "useWaveSurfer => entering playSnippet with",
        startSec,
        snippetDuration,
        "isReady?",
        isReady
      );

      if (!waveSurferRef.current) {
        console.warn("useWaveSurfer => waveSurferRef is null => skip snippet");
        return;
      }

      if (!isReady) {
        // queue snippet
        console.warn("useWaveSurfer => wave not ready => queue snippet request");
        snippetRequestRef.current = { startSec, snippetLen: snippetDuration };
        return;
      }

      // clear old snippet timer
      if (snippetTimeoutRef.current) {
        clearTimeout(snippetTimeoutRef.current);
        snippetTimeoutRef.current = null;
      }

      const ws = waveSurferRef.current;
      const dur = ws.getDuration();
      if (!dur) {
        console.warn("useWaveSurfer => wave duration=0 => skip snippet");
        return;
      }
      if (startSec >= dur) {
        console.warn("useWaveSurfer => startSec >= wave dur => skip snippet");
        return;
      }

      let finalSnippet = snippetDuration;
      if (startSec + finalSnippet > dur) {
        finalSnippet = dur - startSec;
      }

      // do playback
      ws.stop();
      ws.seekTo(startSec / dur);
      ws.play();
      console.log(
        `useWaveSurfer => snippet start @ ${startSec} for ${finalSnippet}s`
      );

      snippetTimeoutRef.current = setTimeout(() => {
        if (waveSurferRef.current) {
          waveSurferRef.current.stop();
          console.log("useWaveSurfer => snippet ended after timer");
        }
      }, finalSnippet * 1000);
    },
    [isReady]
  );

  /**
   * initWaveSurfer:
   * - Create if not created
   * - Attach "ready", "play", "pause", "finish" listeners
   * - If enableClickableWaveform => attach "interaction"
   */
  const initWaveSurfer = useCallback(() => {
    console.log(
      "useWaveSurfer => initWaveSurfer() called with waveSurferRef.current:",
      waveSurferRef.current
    );

    if (waveSurferRef.current) {
      console.warn("useWaveSurfer => waveSurfer already created => skipping");
      return;
    }
    if (!containerRef.current) {
      console.warn("useWaveSurfer => containerRef is null => skip init");
      return;
    }

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#999",
      progressColor: "#f50057",
      cursorColor: "#333",
      height: 100,
      responsive: true,
      backend: "WebAudio",
      plugins: [
        timelineRef
          ? TimelinePlugin.create({
              container: timelineRef,
              primaryColor: "#666",
              primaryFontColor: "#666",
              height: 20,
            })
          : null,
        RegionsPlugin.create({}),
      ].filter(Boolean),
    });

    waveSurferRef.current.on("ready", () => {
      console.log("useWaveSurfer => on('ready') event => wave is loaded");
      setIsReady(true);

      // If user tried to snippet while wave not ready
      if (snippetRequestRef.current) {
        const { startSec, snippetLen } = snippetRequestRef.current;
        snippetRequestRef.current = null;
        playSnippet(startSec, snippetLen);
      }
    });

    waveSurferRef.current.on("error", (err) => {
      console.error("useWaveSurfer => wave error:", err);
    });

    waveSurferRef.current.on("play", () => {
      setIsPlaying(true);
      console.log("useWaveSurfer => wave playing");
    });
    waveSurferRef.current.on("pause", () => {
      setIsPlaying(false);
      console.log("useWaveSurfer => wave paused");
    });
    waveSurferRef.current.on("finish", () => {
      setIsPlaying(false);
      console.log("useWaveSurfer => wave finished");
    });

    // For WaveSurfer 7, "interaction" is a good event to detect user clicks
    if (enableClickableWaveform) {
      waveSurferRef.current.on("interaction", () => {
        const ws = waveSurferRef.current;
        if (!ws) return;

        const clickTime = ws.getCurrentTime();
        console.log("useWaveSurfer => user clicked => time", clickTime);
        playSnippet(clickTime, 10); // 10-second snippet
      });
    }

    console.log("useWaveSurfer => waveSurfer instance created OK.");
  }, [containerRef, timelineRef, enableClickableWaveform, playSnippet]);

  /** loadSong => resets isReady => waveSurfer.load(url) */
  const loadSong = useCallback((url) => {
    console.log("useWaveSurfer => loadSong with url:", url);
    if (!waveSurferRef.current) {
      console.warn("useWaveSurfer => wave not inited => skipping load");
      return;
    }
    setIsReady(false);
    waveSurferRef.current.load(url);
  }, []);

  /** loadSongAndSnippet => same but queue snippet after wave loads */
  const loadSongAndSnippet = useCallback((url, startSec, snippetLen) => {
    console.log("useWaveSurfer => loadSongAndSnippet => requesting snippet", startSec, snippetLen);
    if (!waveSurferRef.current) {
      console.warn("useWaveSurfer => wave not inited => skip loadSongAndSnippet");
      return;
    }
    setIsReady(false);
    snippetRequestRef.current = { startSec, snippetLen };
    waveSurferRef.current.load(url);
  }, []);

  /** stopAudio => manual stop */
  const stopAudio = useCallback(() => {
    console.log("useWaveSurfer => stopAudio called");
    if (waveSurferRef.current) {
      waveSurferRef.current.stop();
      console.log("useWaveSurfer => wave stopped by user");
    }
  }, []);

  /** cleanupWaveSurfer => destroy wave & reset states */
  const cleanupWaveSurfer = useCallback(() => {
    console.log("useWaveSurfer => cleanupWaveSurfer called");
    if (snippetTimeoutRef.current) {
      clearTimeout(snippetTimeoutRef.current);
      snippetTimeoutRef.current = null;
    }
    snippetRequestRef.current = null;

    if (waveSurferRef.current) {
      try {
        waveSurferRef.current.destroy();
        console.log("useWaveSurfer => wave destroyed");
      } catch (err) {
        console.error("useWaveSurfer => destroy error:", err);
      }
      waveSurferRef.current = null;
    }
    setIsReady(false);
    setIsPlaying(false);
  }, []);

  return {
    isReady,
    isPlaying,
    initWaveSurfer,
    loadSong,
    loadSongAndSnippet,
    playSnippet,
    stopAudio,
    cleanupWaveSurfer,
  };
}

useWaveSurfer.propTypes = {
  containerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) })
    .isRequired,
  timelineRef: PropTypes.oneOfType([
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
    PropTypes.oneOf([null]),
  ]),
  enableClickableWaveform: PropTypes.bool,
};
