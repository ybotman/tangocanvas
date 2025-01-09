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
  FormControlLabel,
  Switch,
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

  // **New**: Filter states
  const [filterMatched, setFilterMatched] = useState(false);
  const [filterApproved, setFilterApproved] = useState(false);

  // Snackbar for the "Generate" and "Copy-Latest" placeholder actions
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Filters
  // ─────────────────────────────────────────────────────────────────────────────

  // Filtering logic: OR approach (if either filter is set, keep items that match either):
  //   - If neither filter is on => show all
  //   - If filterMatched is on => pass if state === "Matched"
  //   - If filterApproved is on => pass if state === "Approved"
  //   - If both are on => pass if "Matched" OR "Approved"
  const filteredSongs = songs.filter((song) => {
    const noFilters = !filterMatched && !filterApproved;
    if (noFilters) return true;

    const isMatched = filterMatched && song.state === "Matched";
    const isApproved = filterApproved && song.state === "Approved";
    return isMatched || isApproved;
  });

  /**
   * If the currently selectedSong is no longer in filteredSongs,
   * we can reset it to null. That ensures toggling a filter
   * immediately affects the selection.
   */
  useEffect(() => {
    if (
      selectedSong &&
      !filteredSongs.find((s) => s.filename === selectedSong.filename)
    ) {
      setSelectedSong(null);
    }
    // Only run when toggles or songs/selectedSong change
  }, [filterMatched, filterApproved, filteredSongs, selectedSong, setSelectedSong]);

  // ─────────────────────────────────────────────────────────────────────────────
  // UI logic for load/error/no-songs
  // ─────────────────────────────────────────────────────────────────────────────

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
          No songs found. Please check your <code>public/songs</code> folder and{" "}
          <code>approvedSongs.json</code>.
        </Typography>
      </Box>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Handler placeholders
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleGenerate = () => {
    setSnackbar({
      open: true,
      message: "Generate function is under development.",
      severity: "warning",
    });
  };

  const handleCopyLatest = () => {
    setSnackbar({
      open: true,
      message: "Copy-Latest function is under development.",
      severity: "warning",
    });
  };

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
      case "autogen":
        router.push("/autogen");
        break;
      default:
        break;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Main UI
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

      {/* TWO SWITCHES (toggle filters) */}
      <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={filterMatched}
              onChange={(e) => setFilterMatched(e.target.checked)}
              color="secondary"
            />
          }
          label="Matched Only"
        />
        <FormControlLabel
          control={
            <Switch
              checked={filterApproved}
              onChange={(e) => setFilterApproved(e.target.checked)}
              color="secondary"
            />
          }
          label="Approved Only"
        />
      </Box>

      {/* SONG SELECTION DROPDOWN (filteredSongs) */}
      <Box className={styles.searchSection}>
        <Autocomplete
          options={filteredSongs}
          // We'll show "filename (state)" in the dropdown
          getOptionLabel={(option) => `${option.filename} (${option.state})`}
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

          {/* Matched => Verify + Edit + AutoGen */}
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
              <Button
                variant="outlined"
                color="info"
                onClick={() => handleNavigation("autogen")}
              >
                AutoGen
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