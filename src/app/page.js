//--------------------------------------------------------------
//src/app/page.js
//--------------------------------------------------------------

"use client";

import React, { useState, useEffect } from "react";
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

  // Pull song data and loading/error states from context
  const { songs, loading, error } = useSongContext();

  // Local state for the currently selected song
  const [selectedSong, setSelectedSong] = useState(null);

  // Snackbar state for the "Generate" and "Copy-Latest" placeholder actions
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * Load the last selected song from localStorage, if any,
   * once we have the 'songs' array.
   */
  useEffect(() => {
    const lastSong = localStorage.getItem("lastSelectedSong");
    if (lastSong && songs.length > 0) {
      const found = songs.find((s) => s.filename === lastSong);
      if (found) setSelectedSong(found);
    }
  }, [songs]);

  /**
   * Whenever 'selectedSong' changes, store it in localStorage.
   */
  useEffect(() => {
    if (selectedSong) {
      localStorage.setItem("lastSelectedSong", selectedSong.filename);
    }
  }, [selectedSong]);

  /**
   * Show a warning Snackbar for "Generate" — placeholder.
   */
  const handleGenerate = () => {
    setSnackbar({
      open: true,
      message: "Generate function is under development.",
      severity: "warning",
    });
  };

  /**
   * Show a warning Snackbar for "Copy-Latest" — placeholder.
   */
  const handleCopyLatest = () => {
    setSnackbar({
      open: true,
      message: "Copy-Latest function is under development.",
      severity: "warning",
    });
  };

  /**
   * Dismiss the Snackbar.
   */
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  /**
   * Navigate to the requested page if we have a valid selectedSong.
   */
  const handleNavigation = (target) => {
    if (!selectedSong) return;

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

  /**
   * 1) If we're still loading, show a loading message.
   */
  if (loading) {
    return (
      <Box>
        <Header />
        <Typography sx={{ p: 3 }}>Loading songs...</Typography>
      </Box>
    );
  }

  /**
   * 2) If there's an error, show it.
   */
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

  /**
   * 3) If no songs at all, show a fallback message.
   */
  if (songs.length === 0) {
    return (
      <Box>
        <Header />
        <Typography sx={{ p: 3 }}>
          No songs found. Please check your <code>public/songs</code> folder and{' '}
          <code>approvedSongs.json</code>.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      <Header />

      {/* SONG SELECTION */}
      <Box className={styles.searchSection}>
        <Autocomplete
          options={songs}
          getOptionLabel={(option) => `${option.filename} (${option.state})`}
          value={selectedSong}
          onChange={(_, newValue) => setSelectedSong(newValue)}
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
            <Button variant="contained" onClick={() => handleNavigation("play")}>
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
                Verify-Play
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
              <Button variant="outlined" onClick={() => handleNavigation("edit")}>
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

      {/* SNACKBAR */}
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

// OPTIONAL: Define PropTypes for clarity and ESLint compliance
Page.propTypes = {
  // no external props currently needed
};