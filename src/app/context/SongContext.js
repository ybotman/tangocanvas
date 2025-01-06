 "use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * SongContext: loads the "pocSong" info from JSON plus an audioUrl.
 */
const SongContext = createContext();

export function SongProvider({ children }) {
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hardcode the audio file location
  const audioUrl = "/audio/Amarras.mp3";
  const jsonUrl = "/markers/Amarras-markers.json";

  useEffect(() => {
    async function fetchMarkerData() {
      try {
        const resp = await fetch(jsonUrl);
        if (!resp.ok) {
          throw new Error(`Failed to load JSON: ${resp.status}`);
        }
        const data = await resp.json();
        // Attach audioUrl so we can reference it
        data.audioUrl = audioUrl;
        setSongData(data);
      } catch (err) {
        console.error("Marker JSON load error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMarkerData();
  }, [jsonUrl]);

  const value = { songData, loading };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

SongProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useSongContext() {
  return useContext(SongContext);
}