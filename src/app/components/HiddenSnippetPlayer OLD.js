//--------------------------------------------
//src/app/components/HiddenSnippetPlayer.js
//--------------------------------------------
// HiddenSnippetPlayer.js
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import WaveSurfer from "wavesurfer.js";

function HiddenSnippetPlayerInner({ audioUrl }, ref) {
  const waveRef = useRef(null);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    containerRef.current = document.createElement("div");
    containerRef.current.style.display = "none";
    document.body.appendChild(containerRef.current);

    waveRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "transparent",
      progressColor: "transparent",
      cursorWidth: 0,
      height: 0,
      backend: "WebAudio",
    });

    waveRef.current.on("ready", () => setReady(true));

    waveRef.current.on("error", (err) => {
      if (err.name === "AbortError") {
        console.info("Snippet fetch aborted - ignoring");
      } else {
        console.error("Snippet wave error:", err);
      }
    });

    return () => {
      // Cleanup
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
      if (containerRef.current?.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  // Whenever audioUrl changes, load
  useEffect(() => {
    if (waveRef.current) {
      setReady(false);
      waveRef.current.load(audioUrl);
    }
  }, [audioUrl]);

  const fadeVolume = useCallback((fromVol, toVol, durationSec, callback) => {
    const steps = 15;
    const stepTime = (durationSec * 1000) / steps;
    let currentStep = 0;
    let currentVol = fromVol;
    const volDiff = (toVol - fromVol) / steps;

    const intervalId = setInterval(() => {
      currentStep++;
      currentVol += volDiff;
      waveRef.current?.setVolume(Math.max(0, currentVol));
      if (currentStep >= steps) {
        clearInterval(intervalId);
        if (callback) callback();
      }
    }, stepTime);
  }, []);
  // Provide a function for parent to call => waveRef.current.playSnippet
  const playSnippet = useCallback(
    (startSec, endSec) => {
      if (!waveRef.current || !ready) return;
      const ws = waveRef.current;
      const totalDur = ws.getDuration();
      if (startSec >= totalDur) return;

      ws.stop();
      ws.seekTo(startSec / totalDur);
      ws.setVolume(1.0);
      ws.play();

      const snippetLen = endSec - startSec;
      const fadeTime = 0.5;
      const playTime = (snippetLen - fadeTime) * 1000;

      // optional fade out
      setTimeout(() => {
        fadeVolume(1.0, 0.0, fadeTime, () => ws.pause());
      }, playTime);
    },
    [ready, fadeVolume],
  );

  // Expose methods via "useImperativeHandle"
  useImperativeHandle(ref, () => ({
    playSnippet,
  }));

  return null;
}

// Wrap in forwardRef
export default forwardRef(HiddenSnippetPlayerInner);
