"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import WaveformViewer from "@/components/WaveFormViewer";
import MarkerGrid from "@/components/MarkerGrid";

export default function PlayPage() {
  const { selectedSong } = useSongContext();

  // Local states to handle marker JSON
  const [markerData, setMarkerData] = useState(null);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");

  // WaveSurfer integration
  const containerRef = useRef(null);
  const {
    initWaveSurfer,
    loadSong,
    playSnippet,
    zoomToBar,
    cleanupWaveSurfer,
    isReady,
  } = useWaveSurfer({ containerRef });

  /**
   * 1) If no selectedSong is present, user might have navigated here manually
   *    without choosing a song. Show an error message or redirect.
   */
  useEffect(() => {
    if (!selectedSong) {
      setSongError(
        "No song selected. Please return to the main page and select a song.",
      );
      setSongLoading(false);
    }
  }, [selectedSong]);

  /**
   * 2) Fetch the marker JSON for the selectedSong, along with audio
   */
  useEffect(() => {
    if (!selectedSong) return;

    async function loadMarkerData() {
      setSongLoading(true);
      setSongError("");
      setMarkerData(null);

      try {
        const baseName = selectedSong.filename.replace(/\.\w+$/, "");
        const audioUrl = `/songs/${selectedSong.filename}`;
        const markerUrl = `/markers/${baseName}-markers.json`;

        // Fetch marker JSON
        const resp = await fetch(markerUrl);
        if (!resp.ok) {
          throw new Error(
            `Failed to load marker JSON at ${markerUrl} (${resp.status})`,
          );
        }
        const data = await resp.json();

        // Insert the audioUrl so MarkerGrid or waveSurfer can use it
        data.audioUrl = audioUrl;

        setMarkerData(data);
      } catch (err) {
        setSongError(err.message || "Error fetching marker data");
      } finally {
        setSongLoading(false);
      }
    }

    loadMarkerData();
  }, [selectedSong]);

  /**
   * 3) Once markerData is fetched, initialize WaveSurfer & load the audio
   */
  useEffect(() => {
    if (songLoading || !markerData || songError) return;

    initWaveSurfer();
    loadSong(markerData.audioUrl);

    // Cleanup
    return cleanupWaveSurfer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songLoading, markerData, songError]);

  /**
   * 4) Handle "play snippet" from a bar
   */
  const handlePlayBar = useCallback(
    (bar) => {
      if (!isReady || !markerData) return;
      const { start } = bar;

      // Example snippet: 4.5 seconds
      playSnippet(start, 4.5);

      // Zoom to ~3 bars around
      // If your markerData includes full `duration`, you can pass it here
      zoomToBar(start, markerData.duration || 180, 3);
    },
    [isReady, markerData, playSnippet, zoomToBar],
  );

  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * RENDER LOGIC
   */
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
          Marker data not found or empty.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Play Page – {markerData.songId || selectedSong.filename}
      </Typography>

      {/* Waveform Container */}
      <WaveformViewer
        onInit={(ref) => {
          containerRef.current = ref.current;
        }}
      />

      {/* Marker Grid */}
      <MarkerGrid
        sections={markerData.sections || []}
        onPlayBar={handlePlayBar}
      />
    </Box>
  );
}
