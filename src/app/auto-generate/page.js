"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import WaveformViewer from "@/components/WaveFormViewer";

/**
 * A new page to pick two "section" times from a waveform and auto-generate markers JSON.
 */
export default function AutoGeneratePage() {
  const router = useRouter();
  const { selectedSong } = useSongContext();

  // For WaveSurfer
  const containerRef = useRef(null);
  const { initWaveSurfer, loadSong, playSnippet, cleanupWaveSurfer, isReady } =
    useWaveSurfer({ containerRef });

  // Local states
  const [songError, setSongError] = useState("");
  const [loading, setLoading] = useState(true);

  // The last clicked time on the wave (in seconds.tenths)
  const [lastClickTime, setLastClickTime] = useState(0);

  // The user’s chosen times for each section
  const [section1Time, setSection1Time] = useState(null);
  const [section2Time, setSection2Time] = useState(null);

  // Feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * If no selectedSong, show an error. Otherwise, load the wave.
   */
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
   * Initialize WaveSurfer, load the track once not loading & no error
   */
  useEffect(() => {
    if (!selectedSong || songError || loading) return;
    initWaveSurfer();
    loadSong(`/songs/${selectedSong.filename}`);

    return cleanupWaveSurfer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSong, songError, loading]);

  /**
   * Called when user clicks on the waveform:
   * - We compute a “clicked time” (1 decimal),
   * - We play a 5-second snippet from that time.
   */
  const handleWaveClick = useCallback(
    (timeSec) => {
      // Round to 1 decimal
      const secTenths = parseFloat(timeSec.toFixed(1));
      setLastClickTime(secTenths);
      // Play 5-second snippet
      playSnippet(secTenths, 5.0);
    },
    [playSnippet],
  );

  /**
   * “Section 1” and “Section 2” buttons
   */
  const handleSetSection1 = () => {
    setSection1Time(lastClickTime);
  };
  const handleSetSection2 = () => {
    setSection2Time(lastClickTime);
  };

  /**
   * Generate logic: only if both section times exist
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

    // Build the JSON with your logic
    const songId = selectedSong.filename.replace(/\.\w+$/, "");
    const generated = buildSongJson(songId, section1Time, section2Time);

    try {
      // Save to /api/markers? (POST or PUT)
      const resp = await fetch("/api/markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generated),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to create markers file");
      }

      setSnackbar({
        open: true,
        message: "Successfully created new marker file!",
        severity: "success",
      });
      // Optionally redirect after short delay
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
   * Local function to build a minimal JSON with:
   * - Possibly an intro if section1Time > 0.3
   * - A 32-bar section from section1..section2
   * - Another 32-bar section from section2..end
   * (You can adapt the logic to your real approach.)
   */
  const buildSongJson = (songId, sec1, sec2) => {
    const hasIntro = sec1 > 0.3;
    const sections = [];

    // Possibly an intro
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

    // Possibly create more or stop here
    // We'll do a second "section" from sec2..(sec2+32) for demonstration
    const secondEnd = sec2 + 32;
    sections.push({
      id: "section-3",
      type: "section",
      label: "Section 2",
      start: sec2,
      end: secondEnd,
      markers: generateBars(sec2, secondEnd),
    });

    return {
      songId,
      title: "Auto-Generated Song",
      duration: secondEnd,
      sections,
    };
  };

  /**
   * Generate 32 bars from start..end, contiguous
   */
  const generateBars = (startTime, endTime) => {
    const barCount = 32;
    const totalLen = endTime - startTime;
    const barLen = totalLen / barCount;

    const bars = [];
    let current = startTime;
    for (let i = 1; i <= barCount; i++) {
      let next = current + barLen;
      bars.push({
        id: `bar-${i}`,
        label: `Bar ${i}`,
        start: parseFloat(current.toFixed(3)),
        end: parseFloat(next.toFixed(3)),
      });
      current = next;
    }
    return bars;
  };

  /**
   * Close snackbar
   */
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // ─────────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────────
  if (songError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {songError}
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading audio data...</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Auto Generate Markers
      </Typography>
      {selectedSong && (
        <Typography variant="body1" sx={{ mb: 2 }}>
          Current Song: <strong>{selectedSong.filename}</strong>
        </Typography>
      )}

      <WaveformViewer
        onInit={(ref) => {
          containerRef.current = ref.current;
        }}
      />

      {/* Listen for user clicks on the wave once it's ready */}
      {isReady && waveSurferRefHack({ containerRef, handleWaveClick })}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body1">
          Last Clicked Time: <strong>{lastClickTime.toFixed(1)}</strong> s
        </Typography>
      </Box>

      {/* Buttons */}
      <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
        <Button variant="contained" onClick={handleSetSection1}>
          Section 1
        </Button>
        <Button variant="contained" onClick={handleSetSection2}>
          Section 2
        </Button>
        <Button
          variant="contained"
          color="warning"
          disabled={section1Time == null || section2Time == null}
          onClick={handleGenerate}
        >
          Generate
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          Section 1: {section1Time != null ? section1Time.toFixed(1) : "--"} s
        </Typography>
        <Typography variant="body2">
          Section 2: {section2Time != null ? section2Time.toFixed(1) : "--"} s
        </Typography>
      </Box>

      {/* Snackbar */}
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

/**
 * Quick hack to track user clicking on the wave.
 * We reuse the existing waveSurferRef from your useWaveSurfer
 * by hooking into the "seek" or "interaction" event.
 */
function waveSurferRefHack({ containerRef, handleWaveClick }) {
  const waveSurfer = containerRef.current?.wavesurfer;
  if (!waveSurfer) return null;

  // Attach an event once
  waveSurfer.on("seek", function (progress) {
    const duration = waveSurfer.getDuration();
    const clickedTime = progress * duration;
    handleWaveClick(clickedTime);
  });

  return null;
}
