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
import Beyond from "@/components/Beyond";   //  <-- import the new component
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

  // Example local UI states
  const [barLenSeconds, setBarLenSeconds] = useState(3.0);
  const [afterBarNum, setAfterBarNum] = useState("");

  // NEW: "seconds beyond" from 0..30
  const [beyondSec, setBeyondSec] = useState(0);

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
    enableClickableWaveform: true,
  });

  // 1) If no selectedSong => error
  useEffect(() => {
    console.log("EditPage => check selectedSong");
    if (!selectedSong) {
      setLoading(false);
      setErrMsg("No song selected. Please go back and select a song.");
    }
  }, [selectedSong]);

  // 2) Load marker data => nested
  useEffect(() => {
    async function loadMarkers() {
      if (!selectedSong?.songInfo?.songPathFile) {
        setErrMsg("No song file path found. Cannot load markers.");
        return;
      }
      setLoading(true);
      try {
        const filePath = selectedSong.songInfo.songPathFile;
        const baseName = filePath
          .replace(/^\/songs\//, "")
          .replace(/\.\w+$/, "");

        const markerUrl = `/api/markers?songId=${encodeURIComponent(baseName)}`;
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

  // 3) On unmount => cleanup wave
  useEffect(() => {
    return () => {
      console.log("EditPage => unmount => stop & cleanup wave");
      stopAudio();
      cleanupWaveSurfer();
    };
  }, [stopAudio, cleanupWaveSurfer]);

  // 4) Waveform init => onInit
  const handleWaveformViewerInit = useCallback(
    (waveRef, tRef) => {
      console.log("EditPage => handleWaveformViewerInit => init wave");
      waveformContainerRef.current = waveRef.current;
      timelineContainerRef.current = tRef.current;
      initWaveSurfer();
    },
    [initWaveSurfer],
  );

  // 5) Auto-load track once wave is ready
  const [autoLoadedDone, setAutoLoadedDone] = useState(false);
  useEffect(() => {
    if (!autoLoadedDone && songData?.songInfo?.songPathFile) {
      console.log("EditPage => auto-load track:", songData.songInfo.songPathFile);
      loadSong(songData.songInfo.songPathFile);
      setAutoLoadedDone(true);
    }
  }, [isReady, autoLoadedDone, songData, loadSong]);

  // Marker editor
  const { sections, finalizeAndGetJSON, applyBarLengthFromBar, adjustBarTime } =
    useMarkerEditor(songData || {});

  // snippet playback from a bar
  const handlePlayBar = useCallback(
    (startSec, endSec) => {
      console.log("EditPage => handlePlayBar =>", startSec, endSec);
      const length = endSec - startSec;
      if (length > 0) {
        // pass the beyondSec from our local state => playSnippet
        playSnippet(startSec, length, beyondSec);
      }
    },
    [playSnippet, beyondSec],
  );

  // handle Save => put markers
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
      console.log("EditPage => handleSave => assembleFlatJSON");
      const updatedFlat = assembleFlatJSON(updatedNested);
      console.log("EditPage => ready to PUT =>", updatedFlat);

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

  // handle Export
  const handleExportAsFlat = () => {
    console.log("EditPage => handleExportAsFlat =>");
    const updatedNested = finalizeAndGetJSON();
    if (!updatedNested) return;
    const updatedFlat = assembleFlatJSON(updatedNested);
    downloadJSONFile(updatedFlat, `${updatedNested.songId || "Song"}_edited.json`);
  };

  // handle applyBarLen
  const handleApplyBarLen = () => {
    console.log("EditPage => handleApplyBarLen => afterBarNum:", afterBarNum);
    if (!afterBarNum) {
      console.warn("No bar number typed => skipping applyBarLen");
      return;
    }
    const barId = afterBarNum;
    const newLen = parseFloat(barLenSeconds.toFixed(2));
    applyBarLengthFromBar(barId, newLen);
  };

  // RENDER
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
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Marker data not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      <Header />

      <Typography variant="h5" sx={{ mb: 1 }}>
        Edit Page – {songData.songInfo?.songId || "NoSong"}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
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
      </Box>
      

      {!isReady && (
        <Typography sx={{ color: "orange", mb: 2 }}>
          Waveform not ready – will auto-init. Hang tight...
        </Typography>
      )}

      {/* Waveform container => calls handleWaveformViewerInit */}
      <Box sx={{ display: isReady ? "block" : "none" }}>
        <WaveformViewer onInit={handleWaveformViewerInit} />
      </Box>

      {/* Example slider for barLenSeconds */}
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
          sx={{ width: 100 }}
        />
        <Button variant="contained" size="small" onClick={handleApplyBarLen}>
          Apply
        </Button>
      </Box>

      {/* Our NEW Beyond integer input => 0..30, default=0 */}
      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>Seconds Beyond:</Typography>
        <Beyond
          label="Beyond"
          value={beyondSec}
          onChange={(val) => setBeyondSec(val)}
          min={0}
          max={30}
        />
      </Box>



      {/* The bar grid editor => snippet playback calls handlePlayBar */}
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
