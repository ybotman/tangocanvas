/**
 * src/app/page.js
 *
 * Root selection page for songs. Maintains "selectedSong" in context.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useSongContext } from "@/context/SongContext";
import Header from "@/components/Header";
import styles from "./styles/Page.module.css";

export default function Page() {
  const router = useRouter();
  const { songs, loading, error, selectedSong, setSelectedSong } =
    useSongContext();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  if (loading) {
    return (
      <Box>
        <Header />
        <Typography sx={{ p: 3 }}>Loading songs...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Header />
        <Typography sx={{ p: 3 }} color="error">
          Error loading songs: {error}
        </Typography>
      </Box>
    );
  }

  if (songs.length === 0) {
    return (
      <Box>
        <Header />
        <Typography sx={{ p: 3 }}>
          No songs found or marker creation failed.
        </Typography>
      </Box>
    );
  }

  const getSongState = selectedSong?.songInfo?.state || "Unknown";

  const handleNavigation = (route) => {
    if (!selectedSong) return;
    router.push(`/${route}`);
  };

  return (
    <Box className={styles.container}>
      <Header />

      <Box sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h5">
          Current Song:{" "}
          <strong>{selectedSong?.songInfo?.songID || "None"}</strong>
        </Typography>
      </Box>

      <Box className={styles.searchSection}>
        <Autocomplete
          options={songs}
          getOptionLabel={(opt) => {
            const id = opt.songInfo?.songID || "???";
            const st = opt.songInfo?.state || "???";
            return `${id} (${st})`;
          }}
          value={selectedSong || null}
          onChange={(_, newVal) => setSelectedSong(newVal)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Song"
              variant="outlined"
              fullWidth
            />
          )}
          autoHighlight
          isOptionEqualToValue={(opt, val) =>
            opt.songInfo?.songID === val.songInfo?.songID
          }
        />
      </Box>

      {selectedSong && (
        <Box className={styles.buttonGroup}>
          {getSongState === "Approved" && (
            <Button
              variant="contained"
              onClick={() => handleNavigation("play")}
            >
              Play
            </Button>
          )}
          {getSongState === "Matched" && (
            <>
              <Button
                variant="contained"
                onClick={() => handleNavigation("verify")}
              >
                Verify
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleNavigation("edit")}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="info"
                onClick={() => handleNavigation("autogen")}
              >
                AutoGen
              </Button>
            </>
          )}
          {getSongState === "Sectioned" && (
            <Button
              variant="outlined"
              color="success"
              onClick={() => handleNavigation("sections")}
            >
              Sections
            </Button>
          )}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() =>
          setSnackbar({ open: false, message: "", severity: "info" })
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
