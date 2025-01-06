"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { useSongContext } from "@/context/SongContext";
import useWaveSurfer from "@/hooks/useWaveSurfer";
import WaveformViewer from "@/components/WaveFormViewer";
import MarkerGrid from "@/components/MarkerGrid";

export default function PlayPage() {
  const { songData, loading } = useSongContext();
  const containerRef = useRef(null);

  const {
    initWaveSurfer,
    loadSong,
    playSnippet,
    zoomToBar,
    cleanupWaveSurfer,
    isReady
  } = useWaveSurfer({ containerRef });

  useEffect(() => {
    if (loading || !songData) return;
    initWaveSurfer();
    loadSong(songData.audioUrl);

    return cleanupWaveSurfer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, songData]);

  const handlePlayBar = useCallback(
    (bar) => {
      if (!isReady || !songData) return;
      const { start } = bar;
      // 1) Start playing 4.5s snippet
      playSnippet(start, 4.5);
      // 2) Zoom in to see ~3 bars around it
      zoomToBar(start, songData.duration, 3);
    },
    [isReady, songData, playSnippet, zoomToBar]
  );

  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading markers...</Typography>;
  }

  if (!songData) {
    return <Typography sx={{ p: 3 }}>Error: no song data found.</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Play Page – {songData.title}
      </Typography>

      <WaveformViewer
        onInit={(ref) => {
          containerRef.current = ref.current;
        }}
      />

      {/* Render the MarkerGrid by passing the entire "sections" array */}
      <MarkerGrid sections={songData.sections} onPlayBar={handlePlayBar} />
    </Box>
  );
}