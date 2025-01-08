"use client";

import React, { useState } from "react";
import PropTypes from "prop-types";
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
import { useSongContext } from "./context/SongContext";
import Header from "./components/Header";
import styles from "./styles/Page.module.css";

export default function Page() {
  const router = useRouter();

  // Pull data from context
  const { songs, loading, error, selectedSong, setSelectedSong } =
    useSongContext();

  // Snackbar for the "Generate" and "Copy-Latest" placeholder actions
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * Dismiss the Snackbar.
   */
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  /**
   * "Generate" placeholder
   */
  const handleGenerate = () => {
    setSnackbar({
      open: true,
      message: "Generate function is under development.",
      severity: "warning",
    });
  };

  /**
   * "Copy-Latest" placeholder
   */
  const handleCopyLatest = () => {
    setSnackbar({
      open: true,
      message: "Copy-Latest function is under development.",
      severity: "warning",
    });
  };

  /**
   * Navigate to the requested page if we have a valid selectedSong.
   */
  const handleNavigation = (target) => {
    if (!selectedSong) return; // guard

    switch (target) {
      case "play":
        router.push("/play");
        break;
      case "edit":
        router.push("/edit");
        break;
      case "verify":
        router.push("/verify");
        break;
      default:
        break;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Handle loading, errors, or empty song list first.
  // ─────────────────────────────────────────────────────────────────────────────

  // 1) Loading
  if (loading) {
    return (
      <Box>
        <Header />
        <Typography sx={{ p: 3 }}>Loading songs...</Typography>
      </Box>
    );
  }

  // 2) Error
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

  // 3) No songs
  if (songs.length === 0) {
    return (
      <Box>
        <Header />
        <Typography sx={{ p: 3 }}>
          No songs found. Please check your <code>public/songs</code> folder and{" "}
          <code>approvedSongs.json</code>.
        </Typography>
      </Box>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN UI
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Box className={styles.container}>
      <Header />

      {/* TOP LABEL: Current Song */}
      <Box sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h5">
          Current Song:{" "}
          <strong>{selectedSong ? selectedSong.filename : "None"}</strong>
        </Typography>
      </Box>

      {/* SONG SELECTION DROPDOWN */}
      <Box className={styles.searchSection}>
        <Autocomplete
          options={songs}
          // We'll show "filename (state)" in the dropdown
          getOptionLabel={(option) => `${option.filename} (${option.state})`}
          // Force the dropdown to start unselected by referencing "selectedSong" in context
          value={selectedSong || null}
          onChange={(_, newValue) => setSelectedSong(newValue || null)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Song"
              variant="outlined"
              fullWidth
            />
          )}
          autoHighlight
          isOptionEqualToValue={(opt, val) => opt.filename === val.filename}
        />

        {selectedSong && (
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            State: {selectedSong.state}
          </Typography>
        )}
      </Box>

      {/* ACTION BUTTONS */}
      {selectedSong && (
        <Box className={styles.buttonGroup}>
          {/* Approved => Play */}
          {selectedSong.state === "Approved" && (
            <Button
              variant="contained"
              onClick={() => handleNavigation("play")}
            >
              Play
            </Button>
          )}

          {/* Matched => Verify-Play + Edit */}
          {selectedSong.state === "Matched" && (
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
            </>
          )}

          {/* Unmatched => Copy-Latest, Generate, Edit */}
          {selectedSong.state === "Unmatched" && (
            <>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleCopyLatest}
              >
                Copy-Latest
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleGenerate}
              >
                Generate
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleNavigation("edit")}
              >
                Edit
              </Button>
            </>
          )}

          {/* NoJson => Generate */}
          {selectedSong.state === "NoJson" && (
            <Button variant="outlined" color="warning" onClick={handleGenerate}>
              Generate
            </Button>
          )}
        </Box>
      )}

      {/* SNACKBAR for placeholders */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

Page.propTypes = {
  // no external props currently
};
