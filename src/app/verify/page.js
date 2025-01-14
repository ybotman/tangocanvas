"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import { assembleNestedJSON, assembleFlatJSON } from "@/utils/jsonHandler";
import PlaybackGrid from "@/components/PlayBarGrid";
import WaveformViewer from "@/components/WaveFormViewer";
import Beyond from "@/components/Beyond"; // optional if you want the "beyond" input
import Header from "@/components/Header";
import styles from "@/styles/Page.module.css";

export default function VerifyPage() {
  console.log("entering VerifyPage");

  const router = useRouter();
  const { selectedSong } = useSongContext();

  // Marker data once fetched
  const [markerData, setMarkerData] = useState(null);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");

  // For auto-loading the track only once
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Optional “seconds beyond” input
  const [beyondSec, setBeyondSec] = useState(0);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // WaveSurfer references
  const waveformContainerRef = useRef(null);
  const timelineContainerRef = useRef(null);

  // Our local wave Surfer hook
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

  /**
   * 1) If no selectedSong => show error
   */
  useEffect(() => {
    console.log("VerifyPage => check selectedSong");
    if (!selectedSong) {
      setSongError("No song selected. Return to main page.");
      setSongLoading(false);
    }
  }, [selectedSong]);

  /**
   * 2) On unmount => cleanup wave
   */
  useEffect(() => {
    console.log("VerifyPage => unmount => cleanupWaveSurfer");
    return () => {
      stopAudio();
      cleanupWaveSurfer();
    };
  }, [stopAudio, cleanupWaveSurfer]);

  /**
   * 3) Once user picks a song => fetch marker data => markerData
   */
  useEffect(() => {
    console.log("VerifyPage => doFetch marker data");
    async function doFetch() {
      if (!selectedSong?.songInfo?.songId) {
        return;
      }
      setSongLoading(true);
      try {
        const baseName = selectedSong.songInfo.songId;
        const resp = await fetch(`/api/markers?songId=${encodeURIComponent(baseName)}`);
        if (!resp.ok) {
          throw new Error(`Failed fetch => ${resp.status}`);
        }
        const flat = await resp.json();
        const nested = await assembleNestedJSON(flat);
        setMarkerData(nested);
      } catch (err) {
        setSongError(err.message);
      } finally {
        setSongLoading(false);
      }
    }
    if (selectedSong) {
      doFetch();
    }
  }, [selectedSong]);

  /**
   * 3b) Once markerData is loaded, auto-load the track if wave is inited
   */
  useEffect(() => {
    if (
      !autoLoaded &&
      markerData?.songInfo?.songPathFile &&
      waveformContainerRef.current
    ) {
      console.log("VerifyPage => auto-loading the track...");
      loadSong(markerData.songInfo.songPathFile);
      setAutoLoaded(true);
    }
  }, [autoLoaded, markerData, loadSong]);

  /**
   * 4) handleWaveformViewerInit => call initWaveSurfer once
   */
  const handleWaveformViewerInit = useCallback(
    (waveRef, tRef) => {
      console.log("VerifyPage => handleWaveformViewerInit => waveRef, tRef", waveRef, tRef);
      waveformContainerRef.current = waveRef.current;
      timelineContainerRef.current = tRef.current;
      initWaveSurfer();
    },
    [initWaveSurfer],
  );

  /**
   * 5) snippet playback for a bar
   */
  const handlePlayBar = (bar) => {
    console.log("VerifyPage => handlePlayBar => bar:", bar);
    if (!markerData?.songInfo?.songPathFile) return;

    // snippet length from bar
    const snippetLen = bar.end - bar.start;
    const start = bar.start;

    // pass beyondSec from local state
    playSnippet(start, snippetLen, beyondSec);

    setSnackbar({
      open: true,
      message: `Playing snippet from ${start.toFixed(2)} to ${bar.end.toFixed(
        2
      )} + beyond(${beyondSec}s)`,
      severity: "success",
    });
  };

  /**
   * 6) Handler: Approve => sets state="Approved" (example),
   *    then PUT /api/markers with updated JSON
   */
  const handleApprove = async () => {
    if (!markerData) return;
    console.log("VerifyPage => handleApprove => set state=Approved");
    try {
      // 1) Mark in-memory
      const newData = { ...markerData };
      newData.songInfo = {
        ...newData.songInfo,
        state: "Approved",
      };

      // 2) Convert to FLAT => PUT /api/markers
      const flat = await assembleFlatJSON(newData);
      const resp = await fetch("/api/markers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flat),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to update markers");
      }
      setSnackbar({
        open: true,
        message: "Song state set to 'Approved'!",
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
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (songLoading) {
    return <Typography sx={{ p: 3 }}>Loading marker data...</Typography>;
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
          Marker data not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.container} sx={{ p: 2 }}>
      <Header />

      <Typography variant="h4" gutterBottom>
        Verify Page – {markerData.songInfo?.songId || "NoSong"}
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

      {/* Approve button => sets state="Approved" in marker JSON */}
      <Button
        variant="contained"
        color="success"
        sx={{ mb: 2 }}
        onClick={handleApprove}
      >
        Approve This Song
      </Button>

      {/* Optional "seconds beyond" input => default 0..30 */}
      <Box sx={{ mb: 2 }}>
        <Beyond
          label="Beyond"
          value={beyondSec}
          onChange={(val) => setBeyondSec(val)}
          min={0}
          max={30}
        />
      </Box>

      {/* Waveform container => calls handleWaveformViewerInit */}
      {!isReady && (
        <Typography sx={{ color: "orange", mb: 2 }}>
          Waveform not ready – please wait...
        </Typography>
      )}
      <Box sx={{ display: isReady ? "block" : "none", mb: 2 }}>
        <WaveformViewer onInit={handleWaveformViewerInit} />
        <Button
          variant="outlined"
          disabled={!isPlaying}
          onClick={() => stopAudio()}
        >
          Stop
        </Button>
      </Box>

      {/* PlaybackGrid => bar snippet playback */}
      {isReady && (
        <PlaybackGrid
          sections={markerData.sections || []}
          onPlayBar={handlePlayBar}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
