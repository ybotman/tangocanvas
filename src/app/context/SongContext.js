/* --------------------------------------------
 * src/app/context/SongContext.js
 * --------------------------------------------
 */

"use client";

import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

/**
 * SongContext:
 *  - Manages a single WaveSurfer instance for the entire app
 *  - Tracks songs, selectedSong, and isPlaying
 *  - Provides snippet playback, capture of wave clicks, etc.
 */
const SongContext = createContext();

export function SongProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For capturing wave clicks / double clicks, used by pages like AutoGen
  const [lastClickTime, setLastClickTime] = useState(0);

  const waveSurferRef = useRef(null);

  /**
   * 1) Create or re-use WaveSurfer instance in the container: "#waveform"
   */
  const initWaveSurfer = () => {
    if (!waveSurferRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: "#waveform",
        waveColor: "#999",
        progressColor: "#f50057",
        cursorColor: "#333",
        height: 100,
        responsive: true,
        backend: "WebAudio",
      });

      // Playback state
      waveSurferRef.current.on("play", () => setIsPlaying(true));
      waveSurferRef.current.on("pause", () => setIsPlaying(false));
      waveSurferRef.current.on("finish", () => setIsPlaying(false));

      // Optional: capture "seek" event to detect user clicks or scrubs
      waveSurferRef.current.on("seek", (progress) => {
        const duration = waveSurferRef.current.getDuration();
        const clickedSec = duration * progress;
        const secTenths = parseFloat(clickedSec.toFixed(2));
        setLastClickTime(secTenths);
      });
    }
  };

  /**
   * 2) Load an audio file into WaveSurfer
   */
  const loadSong = (url) => {
    if (!waveSurferRef.current) initWaveSurfer();
    waveSurferRef.current.load(url);
  };

  /**
   * 3) Toggle Play/Pause
   */
  const togglePlay = () => {
    if (!waveSurferRef.current) return;
    waveSurferRef.current.playPause();
  };

  /**
   * 4) Stop Playback
   */
  const stopAudio = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.stop();
    }
  };

  /**
   * 5) snippetPlayback => play from startSec..(startSec + snippetLen)
   */
  const snippetPlayback = (startSec, snippetLen = 4.5) => {
    if (!waveSurferRef.current) return;
    const ws = waveSurferRef.current;
    const totalDur = ws.getDuration();
    if (!totalDur || startSec >= totalDur) return;

    ws.stop(); // ensure a clean start
    ws.seekTo(startSec / totalDur);
    ws.play();

    setTimeout(() => {
      ws.stop();
    }, snippetLen * 1000);
  };

  /**
   * 6) Cleanup WaveSurfer
   */
  const cleanupWaveSurfer = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
      waveSurferRef.current = null;
      setIsPlaying(false);
    }
  };

  /**
   * 7) Fetch & process the songs + marker logic
   */
  useEffect(() => {
    async function fetchSongsData() {
      try {
        // 1) Load approved filenames
        const approvedResp = await fetch("/songs/approvedSongs.json");
        if (!approvedResp.ok) {
          throw new Error(`Failed to load approvedSongs.json: ${approvedResp.status}`);
        }
        const approvedData = await approvedResp.json();
        const approvedFilenames = approvedData.songs.map((s) => s.filename);

        // 2) Load all audio files from /api/songs
        const allResp = await fetch("/api/songs");
        if (!allResp.ok) {
          throw new Error(`Failed to load audio files: ${allResp.status}`);
        }
        const allData = await allResp.json();

        // 3) Derive each song's state
        const processedSongs = await Promise.all(
          allData.songs.map(async (song) => {
            const { filename } = song;
            if (approvedFilenames.includes(filename)) {
              return { filename, state: "Approved" };
            }
            // Check marker file
            const baseName = filename.replace(/\.\w+$/, "");
            try {
              const headResp = await fetch(`/markers/${baseName}-markers.json`, {
                method: "HEAD",
              });
              if (headResp.ok) {
                return { filename, state: "Matched" };
              }
              if (headResp.status === 404) {
                const created = await createEmptyMarkerFile(baseName);
                return created
                  ? { filename, state: "Matched" }
                  : { filename, state: "NoJson" };
              }
              return { filename, state: "Unmatched" };
            } catch {
              return { filename, state: "Unmatched" };
            }
          })
        );

        setSongs(processedSongs);
      } catch (err) {
        console.error("SongContext Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSongsData();
  }, []);

  /**
   * Create a minimal <songId>-markers.json if missing
   */
  async function createEmptyMarkerFile(songId) {
    const defaultJson = {
      songId,
      title: songId,
      duration: 0,
      sections: [],
    };

    try {
      const resp = await fetch("/api/markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultJson),
      });
      if (!resp.ok) {
        const result = await resp.json().catch(() => ({}));
        console.warn("Failed to create empty marker file:", result.error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error creating marker file:", err);
      return false;
    }
  }

  /**
   * 8) localStorage sync for selectedSong
   */
  useEffect(() => {
    if (selectedSong?.filename) {
      localStorage.setItem("lastSelectedSong", selectedSong.filename);
    }
  }, [selectedSong]);

  /**
   * 9) If we had a "Loading" state for a leftover selection, we fix it after loading
   */
  useEffect(() => {
    if (!loading && selectedSong?.state === "Loading") {
      const found = songs.find((s) => s.filename === selectedSong.filename);
      if (found) {
        setSelectedSong(found);
      } else {
        setSelectedSong(null);
      }
    }
  }, [loading, selectedSong, songs]);

  // Provide everything
  const value = {
    songs,
    selectedSong,
    setSelectedSong,
    isPlaying,
    loadSong,
    togglePlay,
    stopAudio,
    snippetPlayback,
    cleanupWaveSurfer,
    lastClickTime, // for pages like AutoGen to read if needed
    setLastClickTime,
    error,
    loading,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

SongProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useSongContext() {
  return useContext(SongContext);
}