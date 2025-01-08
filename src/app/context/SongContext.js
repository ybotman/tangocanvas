//-----------------------------------
// src/app/context/SongContext.js
//-----------------------------------

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const SongContext = createContext();

export function SongProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // NEW: Keep track of the user’s selectedSong in context
  const [selectedSong, setSelectedSong] = useState(null);

  useEffect(() => {
    // Attempt to load last chosen from localStorage
    const lastChosen = localStorage.getItem("lastSelectedSong");
    if (lastChosen) {
      // We'll find it later once we have "songs"
      setSelectedSong({ filename: lastChosen, state: "Loading" });
    }
  }, []);

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
            // Check for marker file
            const baseName = filename.replace(/\.\w+$/, "");
            try {
              const markerResp = await fetch(`/markers/${baseName}-markers.json`);
              if (markerResp.ok) {
                return { filename, state: "Matched" };
              }
              if (markerResp.status === 404) {
                return { filename, state: "NoJson" };
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

  // Keep localStorage in sync with selectedSong
  useEffect(() => {
    if (selectedSong?.filename) {
      localStorage.setItem("lastSelectedSong", selectedSong.filename);
    }
  }, [selectedSong]);

  const value = {
    songs,
    loading,
    error,
    selectedSong,
    setSelectedSong,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

SongProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useSongContext() {
  return useContext(SongContext);
}