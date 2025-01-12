/**
 * src/app/hooks/useWaveSurfer.js
 *
 * Production-ready local-wave approach for the PlayPage.
 * In your steps:
 *   - onInit => initWaveSurfer => loadSong => snippet, etc.
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

  // Stores snippet request if wave not ready yet
  const snippetRequestRef = useRef(null);

  // snippet auto-stop timer
  const snippetTimeoutRef = useRef(null);

  // local states
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * playSnippet:
   *  - If wave not ready => queue the snippet request (so we don't skip).
   *  - Otherwise, plays the snippet from `startSec` for `snippetDuration`.
   */
  const playSnippet = useCallback(
    (startSec, snippetDuration = 4.5) => {
      console.log(
        "useWaveSurfer => entering playSnippet with",
        startSec,
        snippetDuration,
        isReady
      );

      if (!waveSurferRef.current) {
        console.warn("useWaveSurfer => no wave => skip snippet");
        return;
      }

      // If wave is not yet loaded, queue the snippet
      if (!isReady) {
        console.warn("useWaveSurfer => wave not ready => queue snippet request");
        snippetRequestRef.current = {
          startSec,
          snippetLen: snippetDuration,
        };
        return;
      }

      // Clear old snippet timer
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

      // Highlight region
  //    ws.clearRegions();
  //    ws.addRegion({
  //      start: startSec,
  //      end: startSec + finalSnippet,
  //      color: "rgba(255, 0, 0, 0.15)",
   //   });

      // Stop, then play
      ws.stop();
      ws.seekTo(startSec / dur);
      ws.play();
      console.log(
        `useWaveSurfer => snippet start @ ${startSec} for ${finalSnippet}`,
      );

      snippetTimeoutRef.current = setTimeout(() => {
        if (waveSurferRef.current) {
          waveSurferRef.current.stop();
          console.log("useWaveSurfer => snippet ended after timer");
        }
      }, finalSnippet * 1000);
    },
    [isReady],
  );

  /**
   * initWaveSurfer:
   *  - Creates the WaveSurfer instance if not yet created.
   *  - Sets up event handlers, including an "on('ready')" that checks snippetRequestRef.
   */
  const initWaveSurfer = useCallback(() => {
    console.log(
      "useWaveSurfer => initWaveSurfer() called with waveSurferRef.current:",
      waveSurferRef.current,
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
      console.log("useWaveSurfer => on('ready') event");
      setIsReady(true);

      // If we previously queued a snippet, play it immediately now
      if (snippetRequestRef.current) {
        const { startSec, snippetLen } = snippetRequestRef.current;
        snippetRequestRef.current = null;
        console.log(
          "useWaveSurfer => wave is now ready => playing queued snippet",
          startSec,
          snippetLen,
        );
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

    if (enableClickableWaveform) {
      waveSurferRef.current.on("seek", () => {
        const clickTime = waveSurferRef.current.getCurrentTime();
        console.log("useWaveSurfer => waveform clicked => time", clickTime);
        // By calling playSnippet directly, if isReady is false, it will queue it.
        playSnippet(clickTime, 5);
      });
    }

    console.log("useWaveSurfer => waveSurfer instance created OK.");
  }, [containerRef, timelineRef, enableClickableWaveform, playSnippet]);

  /**
   * loadSong:
   *  - Resets isReady to false, calls waveSurfer.load(url).
   *  - The "on('ready')" callback will set isReady = true.
   */
  const loadSong = useCallback((url) => {
    console.log("useWaveSurfer => loadSong with url:", url);
    if (!waveSurferRef.current) {
      console.warn("useWaveSurfer => wave not inited => skipping load");
      return;
    }
    setIsReady(false);
    waveSurferRef.current.load(url);
  }, []);

  /**
   * loadSongAndSnippet:
   *  - Also sets isReady=false, queues snippet in snippetRequestRef, then loads the wave.
   */
  const loadSongAndSnippet = useCallback((url, startSec, snippetLen) => {
    console.log(
      "useWaveSurfer => loadSongAndSnippet => requesting snippet",
      startSec,
      snippetLen,
    );
    if (!waveSurferRef.current) {
      console.warn(
        "useWaveSurfer => wave not inited => skip loadSongAndSnippet",
      );
      return;
    }
    setIsReady(false);

    // Store snippet request
    snippetRequestRef.current = { startSec, snippetLen };
    waveSurferRef.current.load(url);
  }, []);

  /**
   * stopAudio:
   *  - Manual stop
   */
  const stopAudio = useCallback(() => {
    console.log("useWaveSurfer => stopAudio called");
    if (waveSurferRef.current) {
      waveSurferRef.current.stop();
      console.log("useWaveSurfer => wave stopped by user");
    }
  }, []);

  /**
   * cleanupWaveSurfer:
   *  - Destroy wave instance & reset states.
   */
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
