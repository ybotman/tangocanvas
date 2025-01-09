"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useSongContext } from "@/context/SongContext";
import MarkerGrid from "@/components/MarkerGrid";

export default function PlayPage() {
  const {
    selectedSong,
    loadSong,
    togglePlay,
    stopAudio,
    // If you want to do snippet playback from context, you can expose a “playSnippet” method too
  } = useSongContext();

  // Local states to handle marker JSON
  const [markerData, setMarkerData] = useState(null);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");

  /**
   * 1) If user navigated here without selecting a song, show error.
   */
  useEffect(() => {
    if (!selectedSong) {
      setSongError("No song selected. Please return to the main page.");
      setSongLoading(false);
    }
  }, [selectedSong]);

  /**
   * 2) Load marker data once we have a selectedSong
   */
  useEffect(() => {
    if (!selectedSong) return;

    async function loadMarkerData() {
      setSongError("");
      setSongLoading(true);
      setMarkerData(null);

      try {
        const baseName = selectedSong.filename.replace(/\.\w+$/, "");
        const markerUrl = `/markers/${baseName}-markers.json`;

        // 1) Fetch marker JSON
        const resp = await fetch(markerUrl);
        if (!resp.ok) {
          throw new Error(`Marker JSON not found (${resp.status}) at ${markerUrl}`);
        }
        const data = await resp.json();

        setMarkerData(data);
      } catch (err) {
        setSongError(err.message || "Error loading marker data.");
      } finally {
        setSongLoading(false);
      }
    }

    loadMarkerData();
  }, [selectedSong]);

  /**
   * 3) Once we have a selectedSong + markerData => ask SongContext to load the audio
   *    The container for WaveSurfer is #waveform (see below).
   */
  useEffect(() => {
    if (!songLoading && markerData && !songError) {
      // The URL to load in WaveSurfer
      const audioUrl = `/songs/${selectedSong.filename}`;
      loadSong(audioUrl); // from SongContext
    }

    // Stop audio on unmount
    return () => stopAudio();
  }, [songLoading, markerData, songError, selectedSong, loadSong, stopAudio]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (songLoading) {
    return <Typography sx={{ p: 3 }}>Loading markers...</Typography>;
  }

  if (songError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {songError}
        </Typography>
      </Box>
    );
  }

  if (!markerData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          No marker data found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Play Page – {markerData.songId || selectedSong.filename}
      </Typography>

      {/* 1) The WaveSurfer container must match container: "#waveform" in SongContext */}
      <div
        id="waveform"
        style={{ width: "100%", marginBottom: "16px", backgroundColor: "#eee" }}
      />

      {/* 2) Example control: togglePlay from context */}
      <Button variant="contained" onClick={togglePlay} sx={{ mb: 2 }}>
        Play / Pause
      </Button>

      {/* 3) MarkerGrid (just for demonstration) */}
      {Array.isArray(markerData.sections) && (
        <MarkerGrid
          sections={markerData.sections}
          onPlayBar={(bar) => {
            // If you want snippet playback, you can create a context method,
            // e.g. "playSnippet(bar.start, 4.5)" inside SongContext
            console.log("Clicked bar:", bar);
          }}
        />
      )}
    </Box>
  );
}