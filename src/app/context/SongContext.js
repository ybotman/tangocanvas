// src/app/context/SongContext.js

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { assembleNestedJSON, assembleFlatJSON } from "@/utils/jsonHandler";

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
            `/api/markers?songID=${encodeURIComponent(baseName)}`,
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
      setSelectedSong({ songInfo: { songID: lastSel } });
    }
  }, []);

  /**
   * 3) If we have partial `selectedSong`, refine it once `songs` is loaded
   */
  useEffect(() => {
    if (!loading && selectedSong?.songInfo?.songID) {
      const found = songs.find(
        (s) => s.songInfo?.songID === selectedSong.songInfo.songID,
      );
      if (found) {
        setSelectedSong(found);
      }
    }
  }, [loading, selectedSong, songs]);

  // Keep localStorage in sync
  useEffect(() => {
    if (selectedSong?.songInfo?.songID) {
      localStorage.setItem("lastSelectedSongId", selectedSong.songInfo.songID);
    }
  }, [selectedSong]);

  /**
   * 4) readMarkerData / saveMarkerData if needed
   */
  async function readMarkerDataXXX(songID) {
    const url = `/api/markers?songID=${encodeURIComponent(songID)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed GET /api/markers => ${resp.status}`);
    }
    const flatData = await resp.json();
    console.log("SongContext => readMarkerDataXXX => flat:", flatData);

    const nested = await assembleNestedJSON(flatData);
    console.log("SongContext => readMarkerDataXXX => nested:", nested);
    return nested;
  }

  async function saveMarkerDataXXX(nestedJson) {
    console.log("SongContext => saveMarkerData => nested:", nestedJson);
    // disassemble => PUT
    const flatData = await assembleFlatJSON(nestedJson);
    const sid = nestedJson.songInfo?.songID || "Unknown";
    flatData.songID = sid;

    const resp = await fetch("/api/markers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flatData),
    });
    if (!resp.ok) {
      const out = await resp.json().catch(() => ({}));
      throw new Error(out.error || "PUT /api/markers failed");
    }
    console.log("SongContext => saveMarkerData => success.");
  }

  const value = {
    songs,
    loading,
    error,
    selectedSong,
    setSelectedSong,
    readMarkerDataXXX,
    saveMarkerDataXXX,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

SongProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useSongContext() {
  return useContext(SongContext);
}
