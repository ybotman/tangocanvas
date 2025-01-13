"use client";

import { useRef, useCallback, useState } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

/**
 * useWaveSurfer
 *
 * - Default snippet length = (snippetDuration + 5)
 * - Fade out in the last 0.5s
 * - If snippet is shorter than 0.5s, we skip fade and just stop.
 */
export default function useWaveSurfer({
  containerRef,
  timelineRef = null,
  enableClickableWaveform = true,
}) {
  const waveSurferRef = useRef(null);

  const snippetRequestRef = useRef(null);
  const snippetTimeoutRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // We'll always fade for 0.5s at the end
  const fadeOutDuration = 0.5; // in seconds

  /**
   * playSnippet:
   *   - If no "extra" param is provided, we add 5 by default
   *   - Fade out in the last 0.5s
   */
  const playSnippet = useCallback(
    (
      startSec,
      snippetDuration = 4.5,
      extraPad = 5, // default 5 extra seconds
    ) => {
      console.log(
        "useWaveSurfer => playSnippet => time:",
        startSec,
        "duration:",
        snippetDuration,
        "extraPad:",
        extraPad,
        "isReady?",
        isReady
      );

      if (!waveSurferRef.current) {
        console.warn("useWaveSurfer => wave is null => skip snippet");
        return;
      }
      if (!isReady) {
        console.warn("useWaveSurfer => wave not ready => queue snippet");
        snippetRequestRef.current = {
          startSec,
          snippetLen: snippetDuration,
          extraPad,
        };
        return;
      }

      // Clear old timer
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

      // Final snippet length = user snippet + default 5s (if not provided)
      let finalLen = snippetDuration + extraPad;

      // If it exceeds the wave's end, clamp it
      if (startSec + finalLen > dur) {
        finalLen = dur - startSec;
      }

      // Stop current wave, seek, and play
      ws.stop();
      ws.seekTo(startSec / dur);
      ws.play();
      console.log(
        "useWaveSurfer => snippet start @",
        startSec,
        "for",
        finalLen,
        "s (includes extraPad)."
      );

      // We'll fade out over last 0.5s
      // If finalLen < 0.5 => skip fade, just do immediate stop
      if (finalLen <= fadeOutDuration) {
        // Entire snippet is shorter than fade
        snippetTimeoutRef.current = setTimeout(() => {
          ws.stop();
          console.log("useWaveSurfer => snippet ended (too short for fade).");
        }, finalLen * 1000);
        return;
      }

      // Otherwise, let's do a fade in the last 0.5s
      const fadeStartMs = (finalLen - fadeOutDuration) * 1000;
      const originalVolume = ws.getVolume();
      const stepCount = 10; // # steps in the fade
      const stepTimeMs = (fadeOutDuration / stepCount) * 1000; // ms per step
      const volumeDecrement = originalVolume / stepCount;

      // 1) Wait until snippet's last 0.5s => then start fade
      snippetTimeoutRef.current = setTimeout(() => {
        console.log("useWaveSurfer => fade-out begins...");

        for (let i = 1; i <= stepCount; i++) {
          setTimeout(() => {
            const newVol = Math.max(
              originalVolume - volumeDecrement * i,
              0
            );
            ws.setVolume(newVol);
          }, i * stepTimeMs);
        }

        // After fade completes => stop wave + restore volume
        setTimeout(() => {
          ws.stop();
          // optional: restore wave volume for next snippet
          ws.setVolume(originalVolume);
          console.log("useWaveSurfer => snippet ended after fade-out");
        }, fadeOutDuration * 1000);
      }, fadeStartMs);
    },
    [isReady]
  );

  /**
   * initWaveSurfer => create wave once, set up listeners
   */
  const initWaveSurfer = useCallback(() => {
    if (waveSurferRef.current) {
      console.warn("useWaveSurfer => waveSurfer already created => skip init");
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
              container: timelineRef.current,
              primaryColor: "#666",
              primaryFontColor: "#666",
              height: 20,
            })
          : null,
        RegionsPlugin.create({}),
      ].filter(Boolean),
    });

    waveSurferRef.current.on("loading", (pct) => {
      console.log("useWaveSurfer => loading =>", pct, "%");
    });

    waveSurferRef.current.on("ready", () => {
      console.log("useWaveSurfer => wave is READY => setIsReady(true)");
      setIsReady(true);

      // If user queued snippet earlier
      if (snippetRequestRef.current) {
        const { startSec, snippetLen, extraPad } = snippetRequestRef.current;
        snippetRequestRef.current = null;
        playSnippet(startSec, snippetLen, extraPad);
      }
    });

    waveSurferRef.current.on("error", (err) => {
      console.error("useWaveSurfer => wave error:", err);
    });

    waveSurferRef.current.on("play", () => {
      setIsPlaying(true);
      console.log("useWaveSurfer => wave playing event");
    });
    waveSurferRef.current.on("pause", () => {
      setIsPlaying(false);
      console.log("useWaveSurfer => wave paused event");
    });
    waveSurferRef.current.on("finish", () => {
      setIsPlaying(false);
      console.log("useWaveSurfer => wave finished event");
    });

    if (enableClickableWaveform) {
      waveSurferRef.current.on("interaction", () => {
        const ws = waveSurferRef.current;
        const time = ws.getCurrentTime();
        console.log("useWaveSurfer => user clicked => time:", time);
        // Click => snippet of 4.5 + default 5 => 9.5s total (minus fade).
        playSnippet(time, 4.5);
      });
    }

    console.log("useWaveSurfer => waveSurfer instance created OK.");
  }, [containerRef, timelineRef, enableClickableWaveform, playSnippet]);

  /** loadSong => waveSurfer.load(url) + reset isReady */
  const loadSong = useCallback((url) => {
    console.log("useWaveSurfer => loadSong =>", url);
    if (!waveSurferRef.current) return;
    setIsReady(false);
    waveSurferRef.current.load(url);
  }, []);

  /** loadSongAndSnippet => same, but queue snippet */
  const loadSongAndSnippet = useCallback((url, startSec, snippetLen, extraPad) => {
    console.log("useWaveSurfer => loadSongAndSnippet =>", url, startSec, snippetLen, extraPad);
    if (!waveSurferRef.current) return;
    setIsReady(false);
    snippetRequestRef.current = { startSec, snippetLen, extraPad };
    waveSurferRef.current.load(url);
  }, []);

  /** stopAudio => manual stop */
  const stopAudio = useCallback(() => {
    console.log("useWaveSurfer => stopAudio called");
    if (waveSurferRef.current) {
      waveSurferRef.current.stop();
      console.log("useWaveSurfer => wave manually stopped");
    }
  }, []);

  /** cleanupWaveSurfer => destroy wave, reset states */
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
        console.log("useWaveSurfer => wave destroyed in cleanup");
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
    loadSong,             // loadSong(url)
    loadSongAndSnippet,   // loadSongAndSnippet(url, startSec, snippetLen, extraPad)
    playSnippet,          // playSnippet(startSec, snippetDuration, extraPad)
    stopAudio,
    cleanupWaveSurfer,
  };
}

useWaveSurfer.propTypes = {
  containerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) })
    .isRequired,
  timelineRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  enableClickableWaveform: PropTypes.bool,
};
