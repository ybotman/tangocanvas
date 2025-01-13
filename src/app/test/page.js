/**
 * src/app/page.js (Root selection page)
 * - Once user picks a song, call waveSurfer.initWaveSurfer() + waveSurfer.loadSong().
 * - The wave is physically rendered in an invisible container or a small widget.
 */

"use client";
import React, { useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Button,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useSongContext } from "@/context/SongContext"; // your existing SongContext
import { useWaveSurferContext } from "@/context/WaveSurferContext";
import styles from "@/styles/Page.module.css";

export default function Page() {
  const router = useRouter();
  const { songs, loading, error, selectedSong, setSelectedSong } =
    useSongContext();

  // We'll store a hidden containerRef for WaveSurfer
  const waveContainerRef = useRef(null);
  const { isReady, initWaveSurfer, loadSong } = useWaveSurferContext();

  if (loading) {
    return <Typography sx={{ p: 3 }}>Loading songs...</Typography>;
  }
  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!songs.length) {
    return <Typography>No songs found.</Typography>;
  }

  // Called when user clicks "Load & Go"
  function handleLoadSong() {
    if (!selectedSong?.songInfo?.songPathFile) return;

    // 1) Make sure wave is inited (once)
    initWaveSurfer(waveContainerRef.current);
    // 2) Load the chosen .mp3 or .wav
    loadSong(selectedSong.songInfo.songPathFile);
  }

  function handleGoPlay() {
    // Just navigate to /play
    router.push("/play");
  }

  return (
    <Box className={styles.container}>
      <Typography variant="h5">Root Page - Single Load Demo</Typography>

      <Autocomplete
        options={songs}
        getOptionLabel={(opt) => opt.songInfo?.songId || ""}
        value={selectedSong || null}
        onChange={(_, newVal) => setSelectedSong(newVal)}
        renderInput={(params) => (
          <TextField {...params} label="Pick a song" variant="outlined" />
        )}
      />

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleLoadSong}>
          Init &amp; Load Song
        </Button>
        <Button variant="outlined" onClick={handleGoPlay} sx={{ ml: 2 }}>
          Go to Play
        </Button>
      </Box>

      <Typography sx={{ mt: 2 }}>isReady: {String(isReady)}</Typography>

      {/* Invisible container for waveSurfer */}
      <Box ref={waveContainerRef} sx={{ display: "none" }} />
    </Box>
  );
}
