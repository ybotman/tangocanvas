"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Button, Box, LinearProgress, Typography } from "@mui/material";
import { getSectionStartTimes } from "@/app/utils/markerUtils";

/**
 * Renders 3 "section" buttons. On click, calls onPlaySnippet(startSec).
 * Also shows a 4.5 second progress bar while a snippet is playing.
 */
export default function PlaybackGrid({ onPlaySnippet }) {
  const [activeStart, setActiveStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // If we’re playing, run a simple 100ms interval for up to 4.5s
  useEffect(() => {
    let timer = null;
    if (activeStart !== null) {
      setElapsed(0);
      timer = setInterval(() => {
        setElapsed((prev) => {
          const nextVal = prev + 0.1;
          if (nextVal >= 4.5) {
            clearInterval(timer);
            return 4.5;
          }
          return nextVal;
        });
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeStart]);

  const handleButtonClick = (start) => {
    setActiveStart(start);
    onPlaySnippet(start);
  };

  const progressValue = (elapsed / 4.5) * 100;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Play Sections (4.5s each)
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        {getSectionStartTimes().map((section) => (
          <Button
            key={section.label}
            variant="contained"
            onClick={() => handleButtonClick(section.start)}
          >
            {section.label}
          </Button>
        ))}
      </Box>
      {activeStart !== null && (
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Playing snippet from {activeStart.toFixed(1)}s to{" "}
            {(activeStart + 4.5).toFixed(1)}s
          </Typography>
        </Box>
      )}
    </Box>
  );
}

PlaybackGrid.propTypes = {
  onPlaySnippet: PropTypes.func.isRequired,
};