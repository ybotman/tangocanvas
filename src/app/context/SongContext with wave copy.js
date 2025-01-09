"use client";

import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import WaveSurfer from "wavesurfer.js";

const SongContext = createContext();

export function SongProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);

  // **New Audio State**
  const waveSurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Initialize WaveSurfer
   */
  const initWaveSurfer = () => {
    if (!waveSurferRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: "#waveform", // You can dynamically inject this container
        waveColor: "#999",
        progressColor: "#f50057",
        cursorColor: "#333",
        height: 120,
        responsive: true,
        backend: "WebAudio",
      });

      waveSurferRef.current.on("play", () => setIsPlaying(true));
      waveSurferRef.current.on("pause", () => setIsPlaying(false));
      waveSurferRef.current.on("finish", () => setIsPlaying(false));
    }
  };

  /**
   * Load a Song into WaveSurfer
   */
  const loadSong = (url) => {
    if (!waveSurferRef.current) initWaveSurfer();
    waveSurferRef.current.load(url);
  };

  /**
   * Play/Pause Audio
   */
  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  /**
   * Stop Audio
   */
  const stopAudio = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.stop();
    }
  };

  /**
   * Cleanup Audio
   */
  const cleanupAudio = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
      waveSurferRef.current = null;
    }
  };

  /**
   * Example: Fetch Songs (Already in Your Context)
   */
  useEffect(() => {
    async function fetchSongs() {
      // Fetch logic here
    }
    fetchSongs();
  }, []);

  const value = {
    songs,
    loading,
    error,
    selectedSong,
    setSelectedSong,
    waveSurfer: waveSurferRef.current,
    isPlaying,
    initWaveSurfer,
    loadSong,
    togglePlay,
    stopAudio,
    cleanupAudio,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

SongProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useSongContext() {
  return useContext(SongContext);
}