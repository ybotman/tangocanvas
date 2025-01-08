"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import WaveformViewer from "@/components/WaveFormViewer";
import MarkerGrid from "@/components/MarkerGrid";

export default function VerifyPage() {
  const { songs, selectedSong, setSelectedSong } = useSongContext();

  const [markerData, setMarkerData] = useState(null);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");

  // For the Approve button feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

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
   * 1) If no selectedSong => try localStorage
   */
  useEffect(() => {
    if (!selectedSong) {
      const lastSong = localStorage.getItem("lastSelectedSong");
      if (lastSong && songs.length > 0) {
        // see if it's in our songs list
        const found = songs.find((s) => s.filename === lastSong);
        if (found) {
          setSelectedSong(found);
          return;
        }
      }
      // If we can’t find it
      setSongError(
        "No song selected. Please return to the main page and select a song.",
      );
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
          throw new Error(
            `Failed to load marker JSON at ${markerUrl} (${resp.status})`,
          );
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
   * 3) WaveSurfer init once markerData is loaded
   */
  useEffect(() => {
    if (songLoading || !markerData || songError) return;
    initWaveSurfer();
    loadSong(markerData.audioUrl);

    return cleanupWaveSurfer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songLoading, markerData, songError]);

  /**
   * 4) snippet playback
   */
  const handlePlayBar = useCallback(
    (bar) => {
      if (!isReady || !markerData) return;
      const { start } = bar;
      playSnippet(start, 4.5);
      zoomToBar(start, markerData.duration || 180, 3);
    },
    [isReady, markerData, playSnippet, zoomToBar],
  );

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

      <WaveformViewer
        onInit={(ref) => {
          containerRef.current = ref.current;
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
