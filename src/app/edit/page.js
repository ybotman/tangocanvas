"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { Box, Typography, Button, Slider } from "@mui/material";
import HiddenSnippetPlayer from "@/components/HiddenSnippetPlayer";
import WaveformEditorNoRegions from "@/components/WaveformEditorNoRegions";
import EditMarkerGrid from "@/components/EditMarkerGrid";
import useMarkerEditor from "@/hooks/useMarkerEditor";
import { downloadJSONFile } from "@/utils/jsonHandler";

export default function EditPage() {
  const snippetPlayerRef = useRef(null);

  // Local state for the fetched JSON
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, fetch the markers JSON from public/markers/Amarras-markers.json
  useEffect(() => {
    async function loadMarkers() {
      try {
        const resp = await fetch("/markers/Amarras-markers.json");
        if (!resp.ok) {
          throw new Error(`Failed to fetch markers: ${resp.status}`);
        }
        const data = await resp.json();
        // data should have { songId, title, duration, sections: [...] }
        setSongData(data);
      } catch (err) {
        console.error("Error fetching marker data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMarkers();
  }, []);

    
  // Use the markerEditor hook (it will handle bar shifting, etc.)
  // If songData is still null, pass an empty object
  const {
    sections,
    adjustBarTime,
    defaultBarLength,
    setDefaultBarLength,
    finalizeAndGetJSON,
  } = useMarkerEditor(songData || {});

  // For snippet playback
const handlePlayBar = useCallback((start, end) => {
  snippetPlayerRef.current?.playSnippet(start, end);
}, []);


  // Save updated JSON
  const handleSave = () => {
    const updated = finalizeAndGetJSON();
    if (!updated) return;
    downloadJSONFile(updated, `${updated.songId || "Song"}_edited.json`);
  };

  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading markers...</Typography>;
  }
  if (!songData) {
    return <Typography sx={{ p: 3 }}>No marker data found.</Typography>;
  }

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: "auto" }}>
      {/* Hidden snippet player (headless WaveSurfer instance) */}
      <HiddenSnippetPlayer
        audioUrl="/audio/Amarras.mp3" 
        ref={snippetPlayerRef}
      />

      <Typography variant="h4" gutterBottom>
        Edit Page (No Regions)
      </Typography>

      {/* 1) Slider for default bar length (1–6s, step=0.1) */}
      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Default Bar Length: {defaultBarLength.toFixed(1)} sec
        </Typography>
        <Slider
          min={1}
          max={6}
          step={0.1}
          value={defaultBarLength}
          onChange={(_, newVal) => setDefaultBarLength(newVal)}
          sx={{ width: 300 }}
        />
      </Box>

      {/* 2) Basic wave display (read-only) */}
      <WaveformEditorNoRegions audioUrl="/audio/Amarras.mp3" />

      {/* 3) Manual ±0.1s shifts + snippet "Play" button */}
      <EditMarkerGrid
        sections={sections}
        onAdjustBarTime={adjustBarTime}
        onPlayBar={handlePlayBar}
      />
<HiddenSnippetPlayer
  audioUrl="/audio/Amarras.mp3"
  ref={snippetPlayerRef}
/>;
      {/* 4) Save to updated JSON */}
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleSave}>
        Save Markers
      </Button>
    </Box>
  );
}