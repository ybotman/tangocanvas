"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import WaveSurfer from "wavesurfer.js";

import { useSongContext } from "@/context/SongContext";

/**
 * Page that loads the selectedSong, displays a waveform,
 * lets the user click to pick times, auto-plays a snippet,
 * and auto-generates a minimal JSON.
 */
export default function AutoGenPage() {
  const router = useRouter();
  const { selectedSong } = useSongContext();

  // ---- Local States ----
  const [songError, setSongError] = useState("");
  const [loading, setLoading] = useState(true);

  // The actual WaveSurfer instance & container
  const waveSurferRef = useRef(null);
  const waveformContainerRef = useRef(null);

  // For storing the total duration from WaveSurfer
  const [duration, setDuration] = useState(0);

  // The user’s last clicked time (seconds.tenths)
  const [lastClickTime, setLastClickTime] = useState(0.0);

  // The two chosen times for “Section 1” and “Section 2”
  const [section1Time, setSection1Time] = useState(null);
  const [section2Time, setSection2Time] = useState(null);

  // Snackbar feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /** 
   * 1) If no song is in context => show an error
   */
  useEffect(() => {
    if (!selectedSong) {
      setSongError("No song selected. Please return to the main page and select a song.");
      setLoading(false);
      return;
    }
    setSongError("");
    setLoading(false);
  }, [selectedSong]);

  /**
   * 2) Initialize WaveSurfer once => no double wave
   *    and load the selectedSong.
   */
  useEffect(() => {
    if (!selectedSong || songError || loading) return;
    if (waveSurferRef.current) return; // Already created => skip

    const audioUrl = `/songs/${selectedSong.filename}`;

    // Create a single WaveSurfer instance
    waveSurferRef.current = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: "#999",
      progressColor: "#f50057",
      cursorColor: "#333",
      height: 120,
      responsive: true,
      backend: "WebAudio",
    });

    // On ready => store duration
    waveSurferRef.current.on("ready", () => {
      const dur = waveSurferRef.current.getDuration();
      setDuration(dur);
      // Optional: console.log("Duration:", dur);
    });

    // On error => log
    waveSurferRef.current.on("error", (err) => {
      console.error("WaveSurfer error:", err);
    });

    // On user click/scrub => compute time => snippet playback
    waveSurferRef.current.on("seek", (progress) => {
      const dur = waveSurferRef.current.getDuration();
      const clickedSec = dur * progress;
      handleWaveClick(clickedSec);
    });

    // Load the track
    waveSurferRef.current.load(audioUrl);

    // Cleanup to avoid double wave
    return () => {
      waveSurferRef.current?.destroy();
      waveSurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSong, songError, loading]);

  /**
   * 3) handleWaveClick => sets lastClickTime + plays a 5s snippet
   */
  const handleWaveClick = useCallback(
    (timeSec) => {
      // Round to 1 decimal
      const secTenths = parseFloat(timeSec.toFixed(1));
      setLastClickTime(secTenths);
      playSnippet(secTenths, 5.0);
    },
    // No deps except the snippet function
    [],
  );

  /**
   * 4) playSnippet => plays from startSec..(startSec + snippetLen)
   *    Then stops playback automatically
   */
  const playSnippet = (startSec, snippetLen = 5.0) => {
    if (!waveSurferRef.current) return;
    const ws = waveSurferRef.current;
    const totalDur = ws.getDuration();
    if (startSec >= totalDur) return;

    // Stop if playing
    ws.stop();

    // Seek & play
    ws.seekTo(startSec / totalDur);
    ws.play();

    // Stop after snippetLen
    setTimeout(() => {
      ws.stop();
    }, snippetLen * 1000);
  };

  /**
   * 5) Section 1 / 2 => store lastClickTime
   */
  const handleSetSection1 = () => {
    setSection1Time(lastClickTime);
  };
  const handleSetSection2 = () => {
    setSection2Time(lastClickTime);
  };

  /**
   * 6) Once both are set, Generate a minimal JSON
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

    // Build JSON
    const baseName = selectedSong.filename.replace(/\.\w+$/, "");
    const finalJson = buildSongJson(baseName, section1Time, section2Time, duration);

    // Save to /api/markers as a brand new file
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
      // Return to root after short delay
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
   * 7) buildSongJson => create a minimal example, using your logic
   */
  const buildSongJson = (songId, sec1, sec2, dur) => {
    // For demonstration, we show a possible approach:
    // - If sec1 > 0.3 => create an "intro" from 0..sec1
    // - Then a "Section1" from sec1..sec2
    // - Then a "Section2" from sec2..end
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

    // Section 1
    sections.push({
      id: "section-2",
      type: "section",
      label: "Section 1",
      start: hasIntro ? sec1 : 0,
      end: sec2,
      markers: generateBars(hasIntro ? sec1 : 0, sec2),
    });

    // Section 2 => from sec2..(duration or sec2+someConstant)
    // We'll assume user wants sec2..dur as the final part
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
      songId,
      title: songId,
      duration: parseFloat(dur.toFixed(2)),
      sections,
    };
  };

  /**
   * generateBars => create contiguous bars. For example 32 bars total
   * The bar length is (end-start)/32
   */
  const generateBars = (start, end) => {
    const barCount = 32;
    const totalLen = end - start;
    const barLen = totalLen / barCount;
    let current = start;
    const bars = [];
    for (let i = 1; i <= barCount; i++) {
      let next = current + barLen;
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

  /**
   * Close the snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
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
      <Typography variant="h4" gutterBottom>
        Auto Generate Markers
      </Typography>
      {selectedSong && (
        <Typography variant="body1" sx={{ mb: 2 }}>
          Current Song: <strong>{selectedSong.filename}</strong>
        </Typography>
      )}

      {/* Waveform container */}
      <div
        ref={waveformContainerRef}
        style={{
          width: "100%",
          maxWidth: 800,
          backgroundColor: "#eee",
          height: 120,
          marginBottom: 16,
        }}
      />

      <Typography variant="body1" sx={{ mb: 1 }}>
        Duration: {duration.toFixed(1)}s
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Last Clicked Time: <strong>{lastClickTime.toFixed(1)}</strong> s
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={handleSetSection1}>
          Section 1
        </Button>
        <Button variant="contained" onClick={handleSetSection2}>
          Section 2
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

      <Typography variant="body2">
        Section 1:{" "}
        {section1Time != null ? section1Time.toFixed(1) : "--"} s
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Section 2:{" "}
        {section2Time != null ? section2Time.toFixed(1) : "--"} s
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