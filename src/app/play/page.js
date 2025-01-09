/* --------------------------------------------
 * src/app/play/page.js
 * --------------------------------------------
 */

"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useSongContext } from "@/context/SongContext";
import MarkerGrid from "@/components/MarkerGrid";

/**
 * PlayPage:
 * - Renders a single wave container (#waveform) used by SongContext
 * - Removes the manual "Play / Pause" button
 * - Each bar click triggers snippetPlayback from context
 */
export default function PlayPage() {
  const {
    selectedSong,
    loadSong,
    snippetPlayback, // from context for snippet
    stopAudio,
    cleanupWaveSurfer,
  } = useSongContext();

  // Marker JSON
  const [markerData, setMarkerData] = useState(null);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");

  /**
   * 1) If user navigated here without a selectedSong => show error
   */
  useEffect(() => {
    if (!selectedSong) {
      setSongError("No song selected. Please return to the main page.");
      setSongLoading(false);
    }
  }, [selectedSong]);

  /**
   * 2) Load the marker data for the chosen song
   */
  useEffect(() => {
    if (!selectedSong) return;

    async function loadMarkerData() {
      setSongLoading(true);
      setSongError("");
      setMarkerData(null);

      try {
        const baseName = selectedSong.filename.replace(/\.\w+$/, "");
        const markerUrl = `/markers/${baseName}-markers.json`;

        const resp = await fetch(markerUrl);
        if (!resp.ok) {
          throw new Error(
            `Failed to load marker data at ${markerUrl}. Status: ${resp.status}`
          );
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
   * 3) Once markers loaded => ask SongContext to load the audio
   *    We'll rely on snippetPlayback for bar clicks
   */
  useEffect(() => {
    if (!songLoading && markerData && !songError) {
      const audioUrl = `/songs/${selectedSong.filename}`;
      loadSong(audioUrl);
    }

    // On unmount => stop or cleanup wave
    return () => {
      stopAudio();
      cleanupWaveSurfer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songLoading, markerData, songError]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * snippet playback from a bar => 4.5s
   */
  const handlePlayBar = (bar) => {
    if (!markerData) return;
    snippetPlayback(bar.start, 4.5);
  };

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

      {/* The single wave container from context => #waveform */}
      <Box
        id="waveform"
        sx={{
          width: "100%",
          height: 100,
          backgroundColor: "#eee",
          mb: 2,
        }}
      />

      {/* Marker Grid for bar listing; each bar triggers snippetPlayback */}
      <MarkerGrid
        sections={markerData.sections || []}
        onPlayBar={handlePlayBar}
      />
    </Box>
  );
}