/**
 * src/app/edit/page.js
 *
 * - Fetch marker data in flat JSON format
 * - Convert to nested JSON
 * - Render WaveformViewer with onInit => initWaveSurfer
 * - Auto-load MP3 once wave is ready
 * - Show isReady / isPlaying
 * - Use useMarkerEditor for marker editing
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Slider,
  TextField,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import {
  assembleNestedJSON,
  assembleFlatJSON,
  downloadJSONFile,
} from "@/utils/jsonHandler";
import useMarkerEditor from "@/hooks/useMarkerEditor";
import EditPlayBarGrid from "@/components/EditPlayBarGrid";
import WaveformViewer from "@/components/WaveFormViewer";
import Header from "@/components/Header";
import styles from "./EditPage.module.css";

export default function EditPage() {
  console.log("entering EditPage");

  const router = useRouter();
  const { selectedSong } = useSongContext();

  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // For auto-loading track once
  const [autoLoaded, setAutoLoaded] = useState(false);

  // UI states
  const [barLenSeconds, setBarLenSeconds] = useState(3.0);
  const [afterBarNum, setAfterBarNum] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // WaveSurfer
  const waveformContainerRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const {
    isReady,
    isPlaying,
    initWaveSurfer,
    loadSong,
    playSnippet,
    stopAudio,
    cleanupWaveSurfer,
  } = useWaveSurfer({
    containerRef: waveformContainerRef,
    timelineRef: timelineContainerRef,
    enableClickableWaveform: true, // or false
  });

  /**
   * 1) If no selectedSong => show error
   */
  useEffect(() => {
    console.log("EditPage => check selectedSong");
    if (!selectedSong) {
      setLoading(false);
      setErrMsg("No song selected. Please go back and select a song.");
    }
  }, [selectedSong]);

  /**
   * 2) Fetch marker data => assemble => store in songData
   */
  useEffect(() => {
    async function loadMarkers() {
      if (!selectedSong?.songInfo?.songPathFile) {
        setErrMsg("No song file path found. Cannot load markers.");
        return;
      }
      setLoading(true);
      try {
        const filePath = selectedSong.songInfo.songPathFile; // e.g. "/songs/Germaine.mp3"
        const baseName = filePath
          .replace(/^\/songs\//, "")
          .replace(/\.\w+$/, "");
        const markerUrl = `/api/markers?songID=${encodeURIComponent(baseName)}`;

        console.log("EditPage => fetching marker data =>", markerUrl);
        const resp = await fetch(markerUrl);
        if (!resp.ok) {
          throw new Error(`Failed to fetch markers: ${resp.status}`);
        }
        const flatData = await resp.json();
        const nestedData = await assembleNestedJSON(flatData);
        setSongData(nestedData);
        console.log("EditPage => nested marker data loaded");
      } catch (err) {
        setErrMsg(err.message || "Error fetching marker data.");
      } finally {
        setLoading(false);
      }
    }
    if (selectedSong) {
      loadMarkers();
    }
  }, [selectedSong]);

  /**
   * 3) Clean up wave on unmount
   */
  useEffect(() => {
    return () => {
      console.log("EditPage => unmount => stop & cleanup wave");
      stopAudio();
      cleanupWaveSurfer();
    };
  }, [stopAudio, cleanupWaveSurfer]);

  /**
   * 4) handleWaveformViewerInit => call initWaveSurfer once
   */
  const handleWaveformViewerInit = useCallback(
    (waveRef, tRef) => {
      console.log("EditPage => handleWaveformViewerInit => init wave");
      waveformContainerRef.current = waveRef.current;
      timelineContainerRef.current = tRef.current;
      initWaveSurfer();
    },
    [initWaveSurfer],
  );

  /**
   * 5) Auto-load the track once wave is ready & not yet loaded
   */
  useEffect(() => {
    if (!autoLoaded && songData?.songInfo?.songPathFile) {
      console.log(
        "EditPage => auto-load track:",
        songData.songInfo.songPathFile,
      );
      loadSong(songData.songInfo.songPathFile);
      setAutoLoaded(true);
    }
  }, [isReady, autoLoaded, songData, loadSong]);

  /**
   * useMarkerEditor for local marker editing
   */
  const { sections, finalizeAndGetJSON, applyBarLengthFromBar, adjustBarTime } =
    useMarkerEditor(songData || {});

  /**
   * snippet playback: play from start..end
   */
  const handlePlayBar = useCallback(
    (startSec, endSec) => {
      console.log("EditPage => handlePlayBar =>", startSec, endSec);
      const length = endSec - startSec;
      if (length > 0) {
        playSnippet(startSec, length);
      }
    },
    [playSnippet],
  );

  /**
   * handleSave => asassembleFlat => PUT
   */
  const handleSave = async () => {
    console.log("EditPage => handleSave => finalizeAndGetJSON");
    const updatedNested = finalizeAndGetJSON();
    if (!updatedNested) {
      setSnackbar({
        open: true,
        message: "No marker data to save.",
        severity: "warning",
      });
      return;
    }
    try {
      console.log("EditPage => handleSave s => AssembleFlatJSON");
      const updatedFlat = assembleFlatJSON(updatedNested);
      console.log("EditPage => handleSave2  => ready to send to PUT", flatJson.songID, updatedFlat);
      const resp = await fetch("/api/markers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFlat),
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
   * handleSaveAsFlat => local JSON backup
   */
  const handleExportAsFlat = () => {
    console.log("EditPage => handleExportAsFlat => export JSON");
    const updatedNested = finalizeAndGetJSON();
    if (!updatedNested) return;
    const updatedFlat = assembleFlatJSON(updatedNested);
    downloadJSONFile(
      updatedFlat,
      `${updatedNested.songID || "Song"}_edited.json`,
    );
  };

  /**
   * handleApplyBarLen => "Bar <num>" => apply new length
   */
  const handleApplyBarLen = () => {
    console.log("EditPage => handleApplyBarLen => afterBarNum:", afterBarNum);
    if (!afterBarNum) {
      console.warn("No bar number typed => skipping applyNewBarLen");
      return;
    }
    const barId = afterBarNum;
    const newLen = parseFloat(barLenSeconds.toFixed(2));
    applyBarLengthFromBar(barId, newLen);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading markers...</Typography>;
  }
  if (errMsg) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {errMsg}
        </Typography>
      </Box>
    );
  }
  if (!songData) {
    return <Typography sx={{ p: 3 }}>No marker data found.</Typography>;
  }

  return (
    <Box className={styles.container}>
      <Header />

      <Typography variant="h5" sx={{ mb: 1 }}>
        Edit Page – {songData.songInfo?.songID || "NoSong"}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        isReady:{" "}
        <strong style={{ color: isReady ? "green" : "red" }}>
          {String(isReady)}
        </strong>
        {" | "}
        isPlaying:{" "}
        <strong style={{ color: isPlaying ? "green" : "red" }}>
          {String(isPlaying)}
        </strong>
      </Typography>

      {!isReady && (
        <Typography sx={{ color: "orange", mb: 2 }}>
          Waveform not ready – will auto-init. Hang tight...
        </Typography>
      )}

      {/* Waveform container => calls handleWaveformViewerInit */}
      <Box sx={{ display: isReady ? "block" : "none" }}>
        <WaveformViewer onInit={handleWaveformViewerInit} />
      </Box>

      {/* Controls */}
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
          sx={{ width: 400 }}
        />
      </Box>

      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <TextField
          label="@Bar"
          variant="outlined"
          size="small"
          value={afterBarNum}
          onChange={(e) => setAfterBarNum(e.target.value)}
          sx={{ width: 100 }} // Make the text field smaller
        />
        <Button variant="contained" size="small" onClick={handleApplyBarLen}>
          Apply
        </Button>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleSave}>
          Save Markers
        </Button>
      </Box>

      {/* The bar grid editor */}
      <Box className={styles.barsScroll}>
        <EditPlayBarGrid
          sections={sections}
          onAdjustBarTime={adjustBarTime}
          onPlayBar={(start, end) => handlePlayBar(start, end)}
        />

        <Button variant="outlined" onClick={handleExportAsFlat}>
          Export JSON
        </Button>
      </Box>

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
