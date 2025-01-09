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
        throw new Error(
          `Failed to load approvedSongs.json: ${approvedResp.status}`
        );
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
            const headResp = await fetch(
              `/markers/${baseName}-markers.json`,
              { method: "HEAD" }
            );
            if (headResp.ok) {
              // Good => we can consider it "Matched"
              return { filename, state: "Matched" };
            }

            if (headResp.status === 404) {
              // 404 => Create a minimal marker file so we won't see 404 again
              const created = await createEmptyMarkerFile(baseName);
              if (created) {
                // If creation succeeded => consider it "Matched"
                return { filename, state: "Matched" };
              } else {
                // If creation failed => fallback
                return { filename, state: "NoJson" };
              }
            }

            // If it's not 200 or 404 => some 5xx or 403 => "Unmatched"
            return { filename, state: "Unmatched" };
          } catch {
            // network or other error => "Unmatched"
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
 * Helper: Creates a minimal <songId>-markers.json
 * by POST /api/markers with:
 * {
 *   "songId": baseName,
 *   "title": baseName,
 *   "duration": 0,
 *   "sections": []
 * }
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

  useEffect(() => {
    if (!loading && selectedSong?.state === "Loading") {
      // We only do this once loading is done AND user is in "Loading" state
      const found = songs.find((s) => s.filename === selectedSong.filename);
      if (found) {
        // Found the real state among processed songs
        setSelectedSong(found);
      } else {
        // The lastChosen isn't valid anymore
        setSelectedSong(null);
      }
    }
  }, [loading, selectedSong, songs, setSelectedSong]);

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

SongProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useSongContext() {
  return useContext(SongContext);
}
