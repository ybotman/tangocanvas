/* --------------------------------------------
 * src/app/edit/page.js
 * --------------------------------------------
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Slider,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";

import { useSongContext } from "@/context/SongContext";
import useMarkerEditor from "@/hooks/useMarkerEditor";
import { downloadJSONFile } from "@/utils/jsonHandler";
import EditPlaybackGrid from "@/components/EditPlaybackGrid";

import styles from "./EditPage.module.css";

/**
 * The Edit Page uses the single wave from context with #waveform.
 * Double-click or snippet logic is handled in context if needed.
 */
export default function EditPage() {
  const router = useRouter();
  const {
    selectedSong,
    loadSong,
    snippetPlayback, // if you want snippet approach
    stopAudio,
    cleanupWaveSurfer,
  } = useSongContext();

  // local states
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // For the "bar length" cascade feature
  const [barLenSeconds, setBarLenSeconds] = useState(3.0);
  const [afterBarNum, setAfterBarNum] = useState("");

  // Snackbar for success/error
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * If no selectedSong => show error
   */
  useEffect(() => {
    if (!selectedSong) {
      setLoading(false);
      setErrMsg("No song selected. Please go back and select a song.");
    }
  }, [selectedSong]);

  /**
   * Fetch marker data for the chosen song
   */
  useEffect(() => {
    if (!selectedSong) return;

    async function loadMarkers() {
      setLoading(true);
      setErrMsg("");
      setSongData(null);

      try {
        const baseName = selectedSong.filename.replace(/\.\w+$/, "");
        const markerUrl = `/markers/${baseName}-markers.json`;
        const resp = await fetch(markerUrl);
        if (!resp.ok) {
          throw new Error(`Failed to fetch markers: ${resp.status}`);
        }
        const data = await resp.json();
        setSongData(data);
      } catch (err) {
        setErrMsg(err.message || "Error fetching marker data.");
      } finally {
        setLoading(false);
      }
    }
    loadMarkers();
  }, [selectedSong]);

  /**
   * load the wave from context => #waveform
   */
  useEffect(() => {
    if (songData && !errMsg) {
      const audioUrl = `/songs/${selectedSong.filename}`;
      loadSong(audioUrl);
    }
    // On unmount => stop or cleanup wave
    return () => stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songData, errMsg]);

  /**
   * Our marker editing hook
   */
  const {
    sections,
    finalizeAndGetJSON,
    applyNewBarLengthAfterBar,
    adjustBarTime,
  } = useMarkerEditor(songData || {});

  /**
   * snippet or bar playback. If you want double-click on the wave => do in context.
   * This is just for the bar playback in the UI.
   */
  const handlePlayBar = useCallback(
    (startSec, endSec) => {
      snippetPlayback(startSec, endSec - startSec);
    },
    [snippetPlayback],
  );

  /**
   * Save Markers => PUT /api/markers
   */
  const handleSave = async () => {
    const updated = finalizeAndGetJSON();
    if (!updated) {
      setSnackbar({
        open: true,
        message: "No marker data to save.",
        severity: "warning",
      });
      return;
    }
    try {
      const resp = await fetch("/api/markers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to update markers");
      }
      setSnackbar({
        open: true,
        message: "Markers updated successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Save failed: ${err.message}`,
        severity: "error",
      });
    }
  };

  /**
   * Download older version of the JSON for local backups
   */
  const handleSaveOld = () => {
    const updated = finalizeAndGetJSON();
    if (!updated) return;
    downloadJSONFile(updated, `${updated.songId || "Song"}_edited.json`);
  };

  /**
   * applyNewBarLengthAfterBar => barId => bar-##, newLen => barLenSeconds
   */
  const handleApplyBarLen = () => {
    if (!afterBarNum) {
      console.warn("No bar number typed!");
      return;
    }
    const barId = `bar-${afterBarNum}`;
    const roundedLen = parseFloat(barLenSeconds.toFixed(2));
    applyNewBarLengthAfterBar(barId, roundedLen);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading markers...</Typography>;
  }
  if (errMsg) {
    return (
      <Typography sx={{ p: 3 }} color="error">
        {errMsg}
      </Typography>
    );
  }
  if (!songData) {
    return <Typography sx={{ p: 3 }}>No marker data found.</Typography>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <Typography variant="h4" gutterBottom>
          Edit: {selectedSong.filename}
        </Typography>

        {/* The wave container => #waveform */}
        <Box
          id="waveform"
          sx={{
            width: "100%",
            height: 100,
            backgroundColor: "#eee",
            mb: 2,
          }}
        />

        {/* Bar length slider */}
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>
            Bar Length: {barLenSeconds.toFixed(2)} sec
          </Typography>
          <Slider
            min={0.1}
            max={6}
            step={0.01}
            value={barLenSeconds}
            onChange={(_, val) => setBarLenSeconds(val)}
            sx={{ width: 500 }}
          />
        </Box>

        {/* After Bar input => "12" => bar-12 */}
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            label="After Bar Number"
            variant="outlined"
            size="small"
            value={afterBarNum}
            onChange={(e) => setAfterBarNum(e.target.value)}
          />
          <Button variant="contained" onClick={handleApplyBarLen}>
            Apply
          </Button>
          <Button variant="contained" onClick={handleSave}>
            Save Markers
          </Button>
          <Button variant="outlined" onClick={handleSaveOld}>
            Export JSON
          </Button>
        </Box>
      </div>

      {/* SCROLLABLE BARS */}
      <div className={styles.barsScroll}>
        <EditPlaybackGrid
          sections={sections}
          onAdjustBarTime={adjustBarTime}
          onPlayBar={(start, end) => handlePlayBar(start, end)}
        />
      </div>

      {/* Snackbar */}
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
    </div>
  );
}
