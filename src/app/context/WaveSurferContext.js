/**
 * src/app/context/WaveSurferContext.js
 *
 * Provides a single WaveSurfer instance if you want a global approach.
 * Currently we do not rely heavily on this if you're using useWaveSurfer in PlayPage,
 * but it remains here for reference.
 */

"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

const WaveSurferContext = createContext(null);

export function useWaveSurferContext() {
  return useContext(WaveSurferContext);
}

export function WaveSurferProvider({ children }) {
  // console.log("entering WaveSurferProvider with children");
  const waveSurferRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const initWaveSurfer = useCallback((containerEl) => {
    console.log(
      "WaveSurferContext => initWaveSurfer with containerEl:",
      containerEl,
    );
    if (waveSurferRef.current) {
      console.warn("WaveSurferContext => waveSurferRef already inited => skip");
      return;
    }
    if (!containerEl) {
      console.warn("WaveSurferContext => no containerEl => cannot init wave");
      return;
    }

    waveSurferRef.current = WaveSurfer.create({
      container: containerEl,
      waveColor: "#999",
      progressColor: "#f50057",
      cursorColor: "#333",
      backend: "WebAudio",
      responsive: true,
      height: 100,
    });

    waveSurferRef.current.on("ready", () => {
      setIsReady(true);
      //    console.log("WaveSurferContext => wave is ready (event).");
    });

    waveSurferRef.current.on("error", (err) => {
      console.error("WaveSurferContext => wave error:", err);
    });
  }, []);

  const loadSong = useCallback((url) => {
    //   console.log("WaveSurferContext => loadSong with url", url);
    if (!waveSurferRef.current) {
      console.warn(
        "WaveSurferContext => waveSurfer not inited => cannot loadSong",
      );
      return;
    }
    setIsReady(false);
    waveSurferRef.current.load(url);
  }, []);

  const playSnippet = useCallback(
    (startSec, snippetDuration = 5) => {
      //    console.log("WaveSurferContext => playSnippet with startSec, snippetDuration" startSec,snippetDuration, );
      if (!waveSurferRef.current) return;
      if (!isReady) return;

      const ws = waveSurferRef.current;
      const dur = ws.getDuration();
      if (startSec >= dur) return;

      ws.stop();
      ws.seekTo(startSec / dur);
      ws.play();

      setTimeout(() => {
        ws.stop();
        //  console.log("WaveSurferContext => snippet ended");
      }, snippetDuration * 1000);
    },
    [isReady],
  );

  const value = {
    waveSurferRef,
    isReady,
    initWaveSurfer,
    loadSong,
    playSnippet,
  };

  return (
    <WaveSurferContext.Provider value={value}>
      {children}
    </WaveSurferContext.Provider>
  );
}

WaveSurferProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
