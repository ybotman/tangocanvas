"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Typography, Button, Slider, TextField } from "@mui/material";
import SnippetWaveSurfer from "@/components/SnippetWaveSurfer";
import EditMarkerGrid from "@/components/EditMarkerGrid";
import useMarkerEditor from "@/hooks/useMarkerEditor";
import { downloadJSONFile } from "@/utils/jsonHandler";
import { useRouter } from "next/navigation";
import styles from "./EditPage.module.css";

export default function EditPage() {
  const waveSurferRef = useRef(null);
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);

  // We have 2 inputs:
  // 1) The bar length in seconds (with .1 steps).
  // 2) The "After Bar" text input, e.g., "12" => bar-12.
  const [barLenSeconds, setBarLenSeconds] = useState(3.0);
  const [afterBarNum, setAfterBarNum] = useState("");

  // Fetch markers
  useEffect(() => {
    async function loadMarkers() {
      try {
        const resp = await fetch("/markers/Amarras-markers.json");
        if (!resp.ok) {
          throw new Error(`Failed to fetch markers: ${resp.status}`);
        }
        const data = await resp.json();
        setSongData(data);
      } catch (err) {
        console.error("Error fetching marker data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMarkers();
  }, []);

  // Our marker editing hook
  const {
    sections,
    finalizeAndGetJSON,
    applyNewBarLengthAfterBar,
    adjustBarTime,
  } = useMarkerEditor(songData || {});

  // Snippet playback (play bar from start..end)
  const handlePlayBar = useCallback((start, end) => {
    waveSurferRef.current?.playSnippet(start, end);
  }, []);

  const handleSave = async () => {
    const updated = finalizeAndGetJSON();
    if (!updated) return;

    try {
      // Post to /api/markers
      const resp = await fetch("/api/markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to save markers");
      }

      console.log("Markers saved to public/markers, with versioning:", result);
      // Optionally navigate or show a success message
      // router.push("/play") or similar
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save markers. Check console for details.");
    }
  };

  const handleSaveOld = () => {
    const updated = finalizeAndGetJSON();
    if (!updated) return;
    downloadJSONFile(updated, `${updated.songId || "Song"}_edited.json`);
  };

  // Apply new bar length
  const handleApplyBarLen = () => {
    // e.g., if user typed "12", we do "bar-12"
    const barId = `bar-${afterBarNum}`;
    if (!afterBarNum) {
      console.warn("No bar number typed in the text field!");
      return;
    }
    console.info(
      "Applying new bar length from",
      barId,
      "with length:",
      barLenSeconds,
    );

    // Convert barLenSeconds to a number with single decimal:
    const roundedLen = parseFloat(barLenSeconds.toFixed(1));
    applyNewBarLengthAfterBar(barId, roundedLen);
  };

  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading markers...</Typography>;
  }
  if (!songData) {
    return <Typography sx={{ p: 3 }}>No marker data found.</Typography>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <Typography variant="h4" gutterBottom>
          Edit Page (Rounded Cascade)
        </Typography>

        {/* 1) Slider for bar length */}
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

        {/* 2) Text input for bar ID number (like "12" => bar-12) */}
        <Box sx={{ mb: 2 }}>
          <TextField
            label="After Bar Number"
            variant="outlined"
            size="small"
            value={afterBarNum}
            onChange={(e) => setAfterBarNum(e.target.value)}
            sx={{ mr: 2 }}
          />
          <Button variant="contained" onClick={handleApplyBarLen}>
            Apply
          </Button>
        </Box>

        <SnippetWaveSurfer audioUrl="/songs/Amarras.mp3" ref={waveSurferRef} />

        <Button variant="contained" sx={{ mt: 3 }} onClick={handleSave}>
          Save Markers
        </Button>
      </div>

      {/* SCROLLABLE BARS */}
      <div className={styles.barsScroll}>
        <EditMarkerGrid
          sections={sections}
          onAdjustBarTime={adjustBarTime}
          onPlayBar={handlePlayBar}
        />
      </div>
    </div>
  );
}
