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
import { useSongContext } from "@/context/SongContext";
import Header from "@/components/Header";
import styles from "@/styles/Page.module.css";

export default function Page() {
  const router = useRouter();

  // Pull data from context
  const { songs, loading, error, selectedSong, setSelectedSong } =
    useSongContext();

  // Snackbar for "Generate" and "Copy-Latest" placeholder actions
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  /**
   * 1) Early returns for loading/error/no-songs
   */
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

  /**
   * 2) Handler placeholders & navigation
   */
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
      case "autogen":
        router.push("/autogen");
        break;
      case "sections":
        router.push("/sections");
        break;
      default:
        break;
    }
  };

  /**
   * 3) Helper: does selectedSong have a particular status in songInfo.state?
   */
  const hasState = (status) =>
    Array.isArray(selectedSong?.songInfo?.state) &&
    selectedSong.songInfo.state.includes(status);

  /**
   * 4) Render
   */
  return (
    <Box className={styles.container}>
      <Header />

      {/* TOP LABEL: Current Song */}
      <Box sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h5">
          Selected Song:{" "}
          <strong>
            {selectedSong?.songInfo?.songId
              ? selectedSong.songInfo.songId
              : "None"}
          </strong>
        </Typography>
      </Box>

      {/* SONG SELECTION DROPDOWN */}
      <Box className={styles.searchSection}>
        <Autocomplete
          options={songs}
          // Example: songs[i].songInfo => { songId, state, ... }
          getOptionLabel={(option) => {
            const sid = option.songInfo?.songId || "Unknown";
            const st = option.songInfo?.state?.join(", ") || "NoState";
            return `${sid} (${st})`;
          }}
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
          // Ensure the "same" item is recognized if the songId matches
          isOptionEqualToValue={(opt, val) =>
            opt.songInfo?.songId === val.songInfo?.songId
          }
        />

        {selectedSong?.songInfo && (
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            State: {selectedSong.songInfo.state?.join(", ") || "N/A"}
          </Typography>
        )}
      </Box>

      {/* ACTION BUTTONS */}
      {selectedSong?.songInfo && (
        <Box className={styles.buttonGroup}>
          {/* If "approved" => show Play */}
          {hasState("approved") && (
            <Button
              variant="contained"
              onClick={() => handleNavigation("play")}
            >
              Play
            </Button>
          )}

          {/* If "matched" => show Verify + Edit + AutoGen + Sections */}
          {hasState("matched") && (
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
              <Button
                variant="outlined"
                color="success"
                onClick={() => handleNavigation("sections")}
              >
                Sections
              </Button>
            </>
          )}

          {/* If "unmatched" => Copy-Latest, Generate, Edit */}
          {hasState("unmatched") && (
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

          {/* If "nojson" => Generate */}
          {hasState("nojson") && (
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
  // no external props
};
