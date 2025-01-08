"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
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
import SnippetWaveSurfer from "@/components/SnippetWaveSurfer";
import EditMarkerGrid from "@/components/EditMarkerGrid";
import { downloadJSONFile } from "@/utils/jsonHandler";

import styles from "./EditPage.module.css";

export default function EditPage() {
  const router = useRouter();
  const { selectedSong } = useSongContext();

  // We’ll fetch the marker data after we confirm `selectedSong`.
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // WaveSurfer reference for snippet playback
  const waveSurferRef = useRef(null);

  // For the "bar length" cascade feature
  const [barLenSeconds, setBarLenSeconds] = useState(3.0);
  const [afterBarNum, setAfterBarNum] = useState("");

  // Snackbar for showing success/error on saves
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * 1) If no song selected => show error message right away
   */
  useEffect(() => {
    if (!selectedSong) {
      setLoading(false);
      setErrMsg("No song selected. Please go back and select a song.");
    }
  }, [selectedSong]);

  /**
   * 2) Fetch marker data from `/markers/<baseName>-markers.json`
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
        console.error("Error fetching marker data:", err);
        setErrMsg(err.message || "Error fetching marker data.");
      } finally {
        setLoading(false);
      }
    }

    loadMarkers();
  }, [selectedSong]);

  /**
   * 3) useMarkerEditor for local editing
   *    - sections, shift bars, apply new bar length
   */
  const {
    sections,
    finalizeAndGetJSON,
    applyNewBarLengthAfterBar,
    adjustBarTime,
  } = useMarkerEditor(songData || {});

  /**
   * 4) Snippet Playback
   *    - We pass (start, end) to waveSurferRef.current?.playSnippet(...)
   */
  const handlePlayBar = useCallback((start, end) => {
    waveSurferRef.current?.playSnippet(start, end);
  }, []);

  /**
   * 5) Save Markers => calls the `PUT /api/markers` endpoint to update existing markers
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
      // The API expects => { songId, ...rest }
      // We assume updated.songId is present
      const resp = await fetch("/api/markers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to update markers");
      }
      console.log("Markers updated:", result);
      setSnackbar({
        open: true,
        message: "Markers updated successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("Save error:", err);
      setSnackbar({
        open: true,
        message: `Save failed: ${err.message}`,
        severity: "error",
      });
    }
  };

  /**
   * 6) (Optional) Save Old => downloads a local JSON file for backup
   */
  const handleSaveOld = () => {
    const updated = finalizeAndGetJSON();
    if (!updated) return;
    downloadJSONFile(updated, `${updated.songId || "Song"}_edited.json`);
  };

  /**
   * 7) Apply new bar length after a specific bar
   */
  const handleApplyBarLen = () => {
    if (!afterBarNum) {
      console.warn("No bar number typed in the text field!");
      return;
    }
    const barId = `bar-${afterBarNum}`;
    const roundedLen = parseFloat(barLenSeconds.toFixed(1));
    applyNewBarLengthAfterBar(barId, roundedLen);
  };

  /**
   * 8) UI Rendering
   */
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
      {/* TOP SECTION / HEADER */}
      <div className={styles.topSection}>
        <Typography variant="h4" gutterBottom>
          Edit: {selectedSong.filename}
        </Typography>

        {/* WaveSurfer snippet player */}
        <SnippetWaveSurfer
          audioUrl={`/songs/${selectedSong.filename}`}
          ref={waveSurferRef}
        />

        {/* Bar length slider */}
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>
            Bar Length: {barLenSeconds.toFixed(1)} sec
          </Typography>
          <Slider
            min={0.1}
            max={12}
            step={0.1}
            value={barLenSeconds}
            onChange={(_, val) => setBarLenSeconds(val)}
            sx={{ width: 250 }}
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
        </Box>

        {/* Save Buttons */}
        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleSave}>
            Save Markers
          </Button>
          <Button variant="outlined" onClick={handleSaveOld}>
            Export JSON
          </Button>
        </Box>
      </div>

      {/* SCROLLABLE BARS for editing */}
      <div className={styles.barsScroll}>
        <EditMarkerGrid
          sections={sections}
          onAdjustBarTime={adjustBarTime}
          onPlayBar={handlePlayBar}
        />
      </div>

      {/* Snackbar for success/error messages */}
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

EditPage.propTypes = {
  // no external props, using SongContext
};
