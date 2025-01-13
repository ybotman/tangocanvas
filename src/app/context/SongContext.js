// src/app/context/SongContext.js

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const SongContext = createContext();

/**
 * SongProvider:
 *  - fetches all .mp3/.wav from /api/songs
 *  - for each, does GET /api/markers? so each has a basic marker file
 *  - stores them in `songs`
 *  - tracks `selectedSong`, letting pages set or read that
 *  - provides readMarkerData / saveMarkerData for pages that want to manipulate sections/bars
 */
export function SongProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * 1) Fetch audio files => auto-create markers => store results
   */
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/songs");
        if (!resp.ok) {
          throw new Error(`Failed /api/songs => ${resp.status}`);
        }
        const data = await resp.json();
        const audioFiles = data.songs || [];

        const results = [];
        for (const fileObj of audioFiles) {
          const filename = fileObj.filename;
          const baseName = filename.replace(/\.\w+$/, "");

          // GET /api/markers? => auto-creates markers if missing
          const markerResp = await fetch(
            `/api/markers?songId=${encodeURIComponent(baseName)}`,
          );
          if (!markerResp.ok) {
            console.warn(
              `Markers fetch for ${baseName} => status ${markerResp.status}`,
            );
            continue;
          }

          const markerJson = await markerResp.json();
          results.push(markerJson);
        }
        setSongs(results);
      } catch (err) {
        console.error("SongContext =>", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * 2) Attempt localStorage restore
   */
  useEffect(() => {
    const lastSel = localStorage.getItem("lastSelectedSongId");
    if (lastSel) {
      setSelectedSong({ songInfo: { songId: lastSel } });
    }
  }, []);

  /**
   * 3) If we have partial `selectedSong`, refine it once `songs` is loaded
   */
  useEffect(() => {
    if (!loading && selectedSong?.songInfo?.songId) {
      const found = songs.find(
        (s) => s.songInfo?.songId === selectedSong.songInfo.songId,
      );
      if (found) {
        setSelectedSong(found);
      }
    }
  }, [loading, selectedSong, songs]);

  // Keep localStorage in sync
  useEffect(() => {
    if (selectedSong?.songInfo?.songId) {
      localStorage.setItem("lastSelectedSongId", selectedSong.songInfo.songId);
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
