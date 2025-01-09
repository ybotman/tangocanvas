"use client";

import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

const SongContext = createContext();

export function SongProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const waveSurferRef = useRef(null);

  /**
   * Initialize WaveSurfer (if not already initialized).
   */
  const initWaveSurfer = () => {
    if (!waveSurferRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: "#waveform", // Dynamically replace if necessary
        waveColor: "#999",
        progressColor: "#f50057",
        cursorColor: "#333",
        height: 100,
        responsive: true,
        backend: "WebAudio",
      });

      waveSurferRef.current.on("play", () => setIsPlaying(true));
      waveSurferRef.current.on("pause", () => setIsPlaying(false));
      waveSurferRef.current.on("finish", () => setIsPlaying(false));
    }
  };

  /**
   * Load a Song into WaveSurfer.
   */
  const loadSong = (url) => {
    if (!waveSurferRef.current) initWaveSurfer();
    waveSurferRef.current.load(url);
  };

  /**
   * Toggle Play/Pause.
   */
  const togglePlay = () => {
    waveSurferRef.current?.playPause();
  };

  /**
   * Stop Audio Playback.
   */
  const stopAudio = () => {
    waveSurferRef.current?.stop();
  };

  /**
   * Cleanup WaveSurfer (e.g., when leaving a page).
   */
  const cleanupWaveSurfer = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
      waveSurferRef.current = null;
      setIsPlaying(false);
    }
  };

  /**
   * Fetch and Process Songs
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

            // If it's in approvedSongs.json => Approved
            if (approvedFilenames.includes(filename)) {
              return { filename, state: "Approved" };
            }

            // Otherwise check for marker file (HEAD)
            const baseName = filename.replace(/\.\w+$/, "");
            try {
              const headResp = await fetch(`/markers/${baseName}-markers.json`, { method: "HEAD" });
              if (headResp.ok) {
                return { filename, state: "Matched" };
              }

              if (headResp.status === 404) {
                // 404 => Create a minimal marker file so we won't see 404 again
                const created = await createEmptyMarkerFile(baseName);
                if (created) {
                  return { filename, state: "Matched" };
                } else {
                  return { filename, state: "NoJson" };
                }
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
   * Create a minimal <songId>-markers.json
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
   * Sync localStorage with selectedSong
   */
  useEffect(() => {
    if (selectedSong?.filename) {
      localStorage.setItem("lastSelectedSong", selectedSong.filename);
    }
  }, [selectedSong]);

  /**
   * Restore last selected song after fetching songs
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

  const value = {
    songs,
    selectedSong,
    setSelectedSong,
    isPlaying,
    waveSurfer: waveSurferRef.current,
    initWaveSurfer,
    loadSong,
    togglePlay,
    stopAudio,
    cleanupWaveSurfer,
    loading,
    error,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

SongProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useSongContext() {
  return useContext(SongContext);
}