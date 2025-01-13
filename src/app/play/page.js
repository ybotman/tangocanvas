/**
 * src/app/play/page.js
 *
 * - Renders the WaveformViewer, hides it if !isReady
 * - Calls initWaveSurfer in handleWaveformViewerInit
 * - loadSong / snippet logic
 * - Tracks isReady / isPlaying
 * - Snippet playback from PlaybackGrid
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import WaveformViewer from "@/components/WaveFormViewer";
import PlaybackGrid from "@/components/PlayBarGrid";
import { assembleNestedJSON } from "@/utils/jsonHandler";
import Header from "@/components/Header";
import styles from "@/styles/Page.module.css";

export default function PlayPage() {
  console.log("entering PlayPage");

  const router = useRouter();
  const { selectedSong } = useSongContext();

  const [markerData, setMarkerData] = useState(null);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Used so we auto-load the track only once
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Refs for WaveformViewer
  const waveformContainerRef = useRef(null);
  const timelineContainerRef = useRef(null);

  // Our local wave Surfer hook
  const {
    isReady,
    isPlaying,
    initWaveSurfer,
    loadSong,
    loadSongAndSnippet,
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
    console.log("PlayPage => useEffect for selectedSong check");
    if (!selectedSong) {
      setSongError("No song selected. Return to main page.");
      setSongLoading(false);
    }
  }, [selectedSong]);

  /**
   * 2) On unmount => cleanup wave
   */
  useEffect(() => {
    console.log("PlayPage => useEffect => return => cleanupWaveSurfer");
    return () => {
      stopAudio();
      cleanupWaveSurfer();
    };
  }, [stopAudio, cleanupWaveSurfer]);

  /**
   * 3) Once user picks a song => fetch marker data => markerData
   */
  useEffect(() => {
    console.log("PlayPage => useEffect => doFetch marker data");
    async function doFetch() {
      if (!selectedSong?.songInfo?.songID) {
        return;
      }
      setSongLoading(true);
      try {
        const baseName = selectedSong.songInfo.songID;
        const resp = await fetch(
          `/api/markers?songID=${encodeURIComponent(baseName)}`,
        );
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
   * 3b) Auto-load the track when markerData is ready and the WaveSurfer container is initialized.
   */
  useEffect(() => {
    if (
      !autoLoaded &&
      markerData?.songInfo?.songPathFile &&
      waveformContainerRef.current
    ) {
      console.log("PlayPage => auto-loading the full song...");
      handleFullLoad();
      setAutoLoaded(true);
    }
  }, [autoLoaded, markerData]);

  /**
   * 4) handleWaveformViewerInit => call initWaveSurfer once
   */
  const handleWaveformViewerInit = useCallback(
    (waveRef, tRef) => {
      console.log(
        "PlayPage => handleWaveformViewerInit => waveRef, tRef",
        waveRef,
        tRef,
      );
      waveformContainerRef.current = waveRef.current;
      timelineContainerRef.current = tRef.current;
      initWaveSurfer();
    },
    [initWaveSurfer],
  );

  /**
   * 5) Handler: fully load entire track
   */
  const handleFullLoad = () => {
    console.log("PlayPage => handleFullLoad clicked");
    if (!markerData?.songInfo?.songPathFile) {
      setSnackbar({
        open: true,
        message: "No songPathFile found in markerData.",
        severity: "error",
      });
      return;
    }
    loadSong(markerData.songInfo.songPathFile);
    setSnackbar({
      open: true,
      message: "Loading track...",
      severity: "info",
    });
  };

  /**
   * 6) Handler: bar snippet
   */
  const handlePlayBar = (bar) => {
    console.log("PlayPage => handlePlayBar => bar", bar);
    if (!markerData?.songInfo?.songPathFile) return;

    const snippetLen = bar.end - bar.start + 3;
    const start = Math.max(bar.start - 0.2, 0);
    playSnippet(start, snippetLen);

    setSnackbar({
      open: true,
      message: `Request snippet: ${start.toFixed(2)} - ${bar.end.toFixed(2)}`,
      severity: "success",
    });
  };

  /**
   * 7) Render states
   */
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
    <Box className={styles.container}>
      <Header />

      <Typography variant="h5" sx={{ mb: 1 }}>
        Play Page – {markerData.songInfo.songID || "NoSong"}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        isReady:{" "}
        <strong style={{ color: isReady ? "green" : "red" }}>
          {String(isReady)}
        </strong>{" "}
        | isPlaying:{" "}
        <strong style={{ color: isPlaying ? "green" : "red" }}>
          {String(isPlaying)}
        </strong>
      </Typography>

      {/* Hide the waveform if not ready. Could also show a "Loading Wave..." message. */}
      {!isReady && (
        <Typography sx={{ color: "orange", mb: 2 }}>
          Waveform not ready – please load a track or wait...
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        {isReady && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => stopAudio()}
            disabled={!isPlaying}
          >
            Stop
          </Button>
        )}
      </Box>
      <Box sx={{ display: isReady ? "block" : "none" }}>
        <WaveformViewer onInit={handleWaveformViewerInit} />
      </Box>

      {/* Marker grid => snippet playback (only if isReady, but optional) */}
      {!isReady && <Typography>(Grid disabled until isReady)</Typography>}
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
