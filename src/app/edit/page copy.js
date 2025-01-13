/**
 * src/app/edit/page.js
 *
 * - Loads marker data from the selectedSong
 * - Uses WaveSurfer to load and display the audio on page load
 * - Offers snippet playback for each bar
 * - Maintains all marker-editing logic via useMarkerEditor
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,/**
 * src/app/edit/page.js
 *
 * - Loads marker data from the selectedSong
 * - Uses WaveSurfer to load and display the audio on page load
 * - Offers snippet playback for each bar
 * - Maintains all marker-editing logic via useMarkerEditor
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import useWaveSurfer from "@/hooks/useWaveSurfer";
import { downloadJSONFile } from "@/utils/jsonHandler";
import useMarkerEditor from "@/hooks/useMarkerEditor";
import EditPlayBarGrid from "@/components/EditPlayBarGrid";
import styles from "./EditPage.module.css";

export default function EditPage() {
  console.log("entering EditPage");

  const router = useRouter();
  const { selectedSong } = useSongContext();

  // Marker data once fetched
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // Local "bar length" editor
  const [barLenSeconds, setBarLenSeconds] = useState(3.0);
  const [afterBarNum, setAfterBarNum] = useState("");

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // WaveSurfer hooks & references
  const waveformRef = useRef(null);   // wave container
  const timelineRef = useRef(null);   // timeline container (optional)

  const {
    isReady,
    isPlaying,
    initWaveSurfer,
    loadSong,
    playSnippet,
    stopAudio,
    cleanupWaveSurfer,
  } = useWaveSurfer({
    containerRef: waveformRef,
    timelineRef, // not used if you don't need a timeline
    enableClickableWaveform: false, // or true if you want waveform clicks
  });

  /**
   * 1) If no selectedSong => show error
   */
  useEffect(() => {
    console.log("EditPage => useEffect => check selectedSong");
    if (!selectedSong) {
      setLoading(false);
      setErrMsg("No song selected. Please go back and select a song.");
    }
  }, [selectedSong]);

  /**
   * 2) Fetch marker data for the chosen song
   */
  useEffect(() => {
    async function loadMarkers() {
      if (!selectedSong) return;
      setLoading(true);
      setErrMsg("");
      setSongData(null);

      try {
        // Example: selectedSong might have "filename": "MySong.mp3"
        const baseName = selectedSong.filename.replace(/\.\w+$/, "");
        // e.g. /markers/MySong-markers.json
        const markerUrl = `/markers/${baseName}-markers.json`;
        console.log("EditPage => fetching marker data =>", markerUrl);

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
   * 3) Initialize WaveSurfer once, then load the song if we have marker data
   */
  const handleWaveInit = useCallback(
    () => {
      console.log("EditPage => handleWaveInit => initWaveSurfer");
      initWaveSurfer();
    },
    [initWaveSurfer],
  );

  useEffect(() => {
    console.log("EditPage => useEffect => wave container check");
    if (waveformRef.current) {
      // container is ready => init wave
      handleWaveInit();
    }
  }, [waveformRef, handleWaveInit]);

  /**
   * 4) Once we have marker data => auto-load the .mp3
   */
  useEffect(() => {
    if (songData && !errMsg) {
      // e.g. /songs/MySong.mp3
      const audioUrl = `/songs/${selectedSong.filename}`;
      console.log("EditPage => auto-load the track =>", audioUrl);
      loadSong(audioUrl);
    }
  }, [songData, errMsg, selectedSong, loadSong]);

  /**
   * 5) On unmount => stop audio & cleanup wave
   */
  useEffect(() => {
    return () => {
      console.log("EditPage => unmount => stop & cleanup wave");
      stopAudio();
      cleanupWaveSurfer();
    };
  }, [stopAudio, cleanupWaveSurfer]);

  /**
   * 6) Our marker editing hook
   */
  const {
    sections,
    finalizeAndGetJSON,
    applyNewBarLengthAfterBar,
    adjustBarTime,
  } = useMarkerEditor(songData || {});

  /**
   * 7) snippet playback for a bar
   */
  const handlePlayBar = useCallback(
    (startSec, endSec) => {
      console.log("EditPage => handlePlayBar =>", startSec, endSec);
      const duration = endSec - startSec;
      if (duration > 0) {
        playSnippet(startSec, duration);
      }
    },
    [playSnippet],
  );

  /**
   * 8) Save Markers => PUT /api/markers
   */
  const handleSave = async () => {
    console.log("EditPage => handleSave => finalizeAndGetJSON");
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
   * 9) Download older version of the JSON for local backups
   */
  const handleSaveOld = () => {
    console.log("EditPage => handleSaveOld => export JSON");
    const updated = finalizeAndGetJSON();
    if (!updated) return;
    downloadJSONFile(updated, `${updated.songId || "Song"}_edited.json`);
  };

  /**
   * 10) applyNewBarLengthAfterBar => "bar-<num>", barLenSeconds
   */
  const handleApplyBarLen = () => {
    console.log("EditPage => handleApplyBarLen => afterBarNum:", afterBarNum);
    if (!afterBarNum) {
      console.warn("No bar number typed => skipping applyNewBarLen");
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

        {/* The wave container => bound to waveSurferRef */}
        <Box
          ref={waveformRef}
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
          // We pass in handlePlayBar as (start, end) => ...
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

  Typography,
  Button,
  Slider,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";

import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import { downloadJSONFile } from "@/utils/jsonHandler";
import useMarkerEditor from "@/hooks/useMarkerEditor";
import EditPlayBarGrid from "@/components/EditPlayBarGrid";
import styles from "./EditPage.module.css";

export default function EditPage() {
  console.log("entering EditPage");

  const router = useRouter();
  const { selectedSong } = useSongContext();

  // Marker data once fetched
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // Local "bar length" editor
  const [barLenSeconds, setBarLenSeconds] = useState(3.0);
  const [afterBarNum, setAfterBarNum] = useState("");

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // WaveSurfer hooks & references
  const waveformRef = useRef(null);   // wave container
  const timelineRef = useRef(null);   // timeline container (optional)

  const {
    isReady,
    isPlaying,
    initWaveSurfer,
    loadSong,
    playSnippet,
    stopAudio,
    cleanupWaveSurfer,
  } = useWaveSurfer({
    containerRef: waveformRef,
    timelineRef, // not used if you don't need a timeline
    enableClickableWaveform: false, // or true if you want waveform clicks
  });

  /**
   * 1) If no selectedSong => show error
   */
  useEffect(() => {
    console.log("EditPage => useEffect => check selectedSong");
    if (!selectedSong) {
      setLoading(false);
      setErrMsg("No song selected. Please go back and select a song.");
    }
  }, [selectedSong]);

  /**
   * 2) Fetch marker data for the chosen song
   */
  useEffect(() => {
    async function loadMarkers() {
      if (!selectedSong) return;
      setLoading(true);
      setErrMsg("");
      setSongData(null);

      try {
        // Example: selectedSong might have "filename": "MySong.mp3"
        const baseName = selectedSong.filename.replace(/\.\w+$/, "");
        // e.g. /markers/MySong-markers.json
        const markerUrl = `/markers/${baseName}-markers.json`;
        console.log("EditPage => fetching marker data =>", markerUrl);

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
   * 3) Initialize WaveSurfer once, then load the song if we have marker data
   */
  const handleWaveInit = useCallback(
    () => {
      console.log("EditPage => handleWaveInit => initWaveSurfer");
      initWaveSurfer();
    },
    [initWaveSurfer],
  );

  useEffect(() => {
    console.log("EditPage => useEffect => wave container check");
    if (waveformRef.current) {
      // container is ready => init wave
      handleWaveInit();
    }
  }, [waveformRef, handleWaveInit]);

  /**
   * 4) Once we have marker data => auto-load the .mp3
   */
  useEffect(() => {
    if (songData && !errMsg) {
      // e.g. /songs/MySong.mp3
      const audioUrl = `/songs/${selectedSong.filename}`;
      console.log("EditPage => auto-load the track =>", audioUrl);
      loadSong(audioUrl);
    }
  }, [songData, errMsg, selectedSong, loadSong]);

  /**
   * 5) On unmount => stop audio & cleanup wave
   */
  useEffect(() => {
    return () => {
      console.log("EditPage => unmount => stop & cleanup wave");
      stopAudio();
      cleanupWaveSurfer();
    };
  }, [stopAudio, cleanupWaveSurfer]);

  /**
   * 6) Our marker editing hook
   */
  const {
    sections,
    finalizeAndGetJSON,
    applyNewBarLengthAfterBar,
    adjustBarTime,
  } = useMarkerEditor(songData || {});

  /**
   * 7) snippet playback for a bar
   */
  const handlePlayBar = useCallback(
    (startSec, endSec) => {
      console.log("EditPage => handlePlayBar =>", startSec, endSec);
      const duration = endSec - startSec;
      if (duration > 0) {
        playSnippet(startSec, duration);
      }
    },
    [playSnippet],
  );

  /**
   * 8) Save Markers => PUT /api/markers
   */
  const handleSave = async () => {
    console.log("EditPage => handleSave => finalizeAndGetJSON");
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
   * 9) Download older version of the JSON for local backups
   */
  const handleSaveOld = () => {
    console.log("EditPage => handleSaveOld => export JSON");
    const updated = finalizeAndGetJSON();
    if (!updated) return;
    downloadJSONFile(updated, `${updated.songId || "Song"}_edited.json`);
  };

  /**
   * 10) applyNewBarLengthAfterBar => "bar-<num>", barLenSeconds
   */
  const handleApplyBarLen = () => {
    console.log("EditPage => handleApplyBarLen => afterBarNum:", afterBarNum);
    if (!afterBarNum) {
      console.warn("No bar number typed => skipping applyNewBarLen");
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

        {/* The wave container => bound to waveSurferRef */}
        <Box
          ref={waveformRef}
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
          // We pass in handlePlayBar as (start, end) => ...
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
