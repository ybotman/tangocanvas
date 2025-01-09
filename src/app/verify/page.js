/* --------------------------------------------
 * src/app/verify/page.js
 * --------------------------------------------
 */

"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { useSongContext } from "@/context/SongContext";
import MarkerGrid from "@/components/MarkerGrid";

/**
 * The Verify page uses SongContext's single wave, loaded into #waveform.
 * We do not create a local wave. We simply call loadSong(...) from context.
 */
export default function VerifyPage() {
  const {
    songs,
    selectedSong,
    setSelectedSong,
    loadSong,
    snippetPlayback,
    cleanupWaveSurfer,
    error: contextError,
  } = useSongContext();

  const [markerData, setMarkerData] = useState(null);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");

  // For the Approve button feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * 1) If no selectedSong => attempt to restore from localStorage, or error out
   */
  useEffect(() => {
    if (!selectedSong) {
      const lastSong = localStorage.getItem("lastSelectedSong");
      if (lastSong && songs.length > 0) {
        const found = songs.find((s) => s.filename === lastSong);
        if (found) {
          setSelectedSong(found);
          return;
        }
      }
      setSongError("No song selected. Please return to the main page.");
      setSongLoading(false);
    }
  }, [selectedSong, songs, setSelectedSong]);

  /**
   * 2) Once we have a valid selectedSong, fetch marker data
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
          throw new Error(`Failed to load marker JSON at ${markerUrl} (${resp.status})`);
        }
        const data = await resp.json();
        data.audioUrl = audioUrl;
        setMarkerData(data);
      } catch (err) {
        setSongError(err.message || "Error fetching marker data.");
      } finally {
        setSongLoading(false);
      }
    }
    loadMarkerData();
  }, [selectedSong]);

  /**
   * 3) Once markerData is loaded, wave is created in context referencing #waveform
   *    => loadSong() with the audio URL. Then we can snippet-play from context.
   */
  useEffect(() => {
    if (!songLoading && markerData && !songError) {
      const audioUrl = `/songs/${selectedSong.filename}`;
      loadSong(audioUrl);
    }

    // Cleanup wave on unmount
    return () => cleanupWaveSurfer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songLoading, markerData, songError]);

  /**
   * 4) snippet playback from a bar
   */
  const handlePlayBar = (bar) => {
    if (!markerData) return;
    snippetPlayback(bar.start, 4.5);
  };

  /**
   * 5) Approve => /api/approveSong
   */
  const handleApprove = async () => {
    if (!selectedSong) return;
    try {
      const resp = await fetch("/api/approveSong", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: selectedSong.filename }),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to approve song");
      }
      setSnackbar({
        open: true,
        message: result.message || "Song approved!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Approve failed: ${err.message}`,
        severity: "error",
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (songLoading) {
    return <Typography sx={{ p: 3 }}>Loading markers...</Typography>;
  }

  if (songError || contextError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {songError || contextError}
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
        Verify Page – {markerData.songId || selectedSong.filename}
      </Typography>

      <Button
        variant="contained"
        color="success"
        sx={{ mb: 2 }}
        onClick={handleApprove}
      >
        Approve This Song
      </Button>

      {/* The wave container from context => #waveform */}
      <Box
        id="waveform"
        sx={{
          width: "100%",
          height: 100,
          backgroundColor: "#eee",
          mb: 2,
        }}
      />

      <MarkerGrid
        sections={markerData.sections || []}
        onPlayBar={handlePlayBar}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}