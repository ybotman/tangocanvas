/* --------------------------------------------
 * src/app/autogen/page.js
 * --------------------------------------------
 */

"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import { useSongContext } from "@/context/SongContext";

/**
 * The AutoGen page also references the single wave in context with #waveform.
 * We'll rely on the "lastClickTime" stored in context whenever the user clicks on the wave.
 */
export default function AutoGenPage() {
  const router = useRouter();
  const {
    selectedSong,
    loadSong,
    snippetPlayback,
    lastClickTime, // wave Surfer on("seek",...) updates this
    setLastClickTime, // if you want to manually reset
    cleanupWaveSurfer,
    error: contextError,
  } = useSongContext();

  const [songError, setSongError] = useState("");
  const [loading, setLoading] = useState(true);

  // The total wave duration from context or we do a separate approach.
  // But let's store a local "duration" if needed, or we can do snippet approach from context
  const [duration] = useState(180); // or fetch from markers

  // Section times
  const [section1Time, setSection1Time] = useState(null);
  const [section2Time, setSection2Time] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    if (!selectedSong) {
      setSongError(
        "No song selected. Please return to the main page and select a song.",
      );
      setLoading(false);
      return;
    }
    setSongError("");
    setLoading(false);
  }, [selectedSong]);

  /**
   * After we have a selectedSong => load it into wave Surfer context => #waveform
   */
  useEffect(() => {
    if (!songError && selectedSong) {
      const audioUrl = `/songs/${selectedSong.filename}`;
      loadSong(audioUrl);
    }
    return () => cleanupWaveSurfer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSong, songError]);

  /**
   * handleSetSection1 / Section2 => store wave Surfer's lastClickTime
   */
  const handleSetSection1 = () => {
    setSection1Time(lastClickTime);
  };
  const handleSetSection2 = () => {
    setSection2Time(lastClickTime);
  };

  /**
   * Example snippet: if user double clicks the wave, wave Surfer sets lastClickTime
   * We can snippet playback from context like:
   */
  const handleWaveClickSnippet = () => {
    snippetPlayback(lastClickTime, 4.0);
  };

  /**
   * Build final markers and POST /api/markers
   */
  const handleGenerate = async () => {
    if (section1Time == null || section2Time == null) {
      setSnackbar({
        open: true,
        message: "Pick both Section 1 & Section 2 times before generating.",
        severity: "warning",
      });
      return;
    }
    const baseName = selectedSong.filename.replace(/\.\w+$/, "");
    const finalJson = buildSongJson(
      baseName,
      section1Time,
      section2Time,
      duration,
    );
    try {
      const resp = await fetch("/api/markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalJson),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to create markers file");
      }
      setSnackbar({
        open: true,
        message: "Markers file created successfully!",
        severity: "success",
      });
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: "error",
      });
    }
  };

  /**
   * Helper: buildSongJson
   */
  const buildSongJson = (songID, sec1, sec2, dur) => {
    // Example logic
    const hasIntro = sec1 > 0.3;
    const sections = [];
    if (hasIntro) {
      sections.push({
        id: "section-1",
        type: "intro",
        label: "Intro",
        start: 0,
        end: sec1,
        markers: generateBars(0, sec1),
      });
    }
    sections.push({
      id: "section-2",
      type: "section",
      label: "Section 1",
      start: hasIntro ? sec1 : 0,
      end: sec2,
      markers: generateBars(hasIntro ? sec1 : 0, sec2),
    });
    if (sec2 < dur) {
      sections.push({
        id: "section-3",
        type: "section",
        label: "Section 2",
        start: sec2,
        end: dur,
        markers: generateBars(sec2, dur),
      });
    }
    return {
      songID,
      title: songID,
      duration: dur,
      sections,
    };
  };

  /**
   * generateBars => contiguous 32 bars, for demonstration
   */
  const generateBars = (start, end) => {
    const barCount = 32;
    const totalLen = end - start;
    const barLen = totalLen / barCount;
    let current = start;
    const bars = [];
    for (let i = 1; i <= barCount; i++) {
      const next = current + barLen;
      bars.push({
        id: `bar-${i}`,
        label: `Bar ${i}`,
        start: parseFloat(current.toFixed(2)),
        end: parseFloat(next.toFixed(2)),
      });
      current = next;
    }
    return bars;
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (songError || contextError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {songError || contextError}
        </Typography>
      </Box>
    );
  }
  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading audio data...</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Auto Generate Markers
      </Typography>
      {selectedSong && (
        <Typography variant="body1" sx={{ mb: 2 }}>
          Current Song: <strong>{selectedSong.filename}</strong>
        </Typography>
      )}

      {/* The wave from context => #waveform */}
      <Box
        id="waveform"
        sx={{
          width: "100%",
          maxWidth: 800,
          height: 120,
          backgroundColor: "#eee",
          marginBottom: 2,
        }}
      />

      {/* Last Clicked Time from context */}
      <Typography variant="body1">
        Last Clicked Time: <strong>{lastClickTime.toFixed(2)}</strong> s
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button variant="contained" onClick={handleSetSection1}>
          Section 1
        </Button>
        <Button variant="contained" onClick={handleSetSection2}>
          Section 2
        </Button>
        <Button
          variant="outlined"
          color="info"
          onClick={() => snippetPlayback(lastClickTime, 4.0)}
        >
          Snippet @ Last Time
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={section1Time == null || section2Time == null}
          onClick={handleGenerate}
        >
          Generate
        </Button>
      </Box>

      <Typography variant="body2" sx={{ mt: 2 }}>
        Section 1 time: {section1Time != null ? section1Time.toFixed(2) : "--"}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Section 2 time: {section2Time != null ? section2Time.toFixed(2) : "--"}
      </Typography>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
