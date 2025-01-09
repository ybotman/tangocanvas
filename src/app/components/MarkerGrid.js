"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Grid,
  LinearProgress,
  Typography,
  Divider,
} from "@mui/material";

export default function MarkerGrid({ sections, onPlayBar }) {
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const snippetDuration = 4.5;

  useEffect(() => {
    let timer = null;
    if (activeMarkerId) {
      setElapsed(0);
      timer = setInterval(() => {
        setElapsed((prev) => {
          const nextVal = prev + 0.1;
          if (nextVal >= snippetDuration) {
            clearInterval(timer);
            return snippetDuration;
          }
          return nextVal;
        });
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeMarkerId]);

  /**
   * Break an array into chunks of size "chunkSize"
   */
  function chunkArray(arr, chunkSize) {
    const result = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  const handleBarClick = (bar) => {
    setActiveMarkerId(bar.id);
    onPlayBar(bar);
  };

  const progressValue = (elapsed / snippetDuration) * 100;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        All Bars (3 Sections × 32 bars each = 96 total)
      </Typography>

      {sections.map((section) => {
        // chunk each section's 32 markers into 4 rows of 8
        const chunked = chunkArray(section.markers, 8);

        return (
          <Box key={section.id} sx={{ mb: 3 }}>
            {/* Horizontal Divider + label */}
            <Divider sx={{ my: 2 }}>
              <Typography variant="subtitle1" sx={{ color: "gray" }}>
                {section.label} [{section.type}]
              </Typography>
            </Divider>

            {chunked.map((rowBars, rowIdx) => (
              <Grid container spacing={1} key={rowIdx} sx={{ mb: 2 }}>
                {rowBars.map((bar) => {
                  // label is just the number, e.g., "Bar 7" => "7"
                  const barNumber = bar.label.replace("Bar ", "");

                  return (
                    <Grid item xs={1} sm={1} md={1} key={bar.id}>
                      <Button
                        variant={
                          bar.id === activeMarkerId ? "contained" : "outlined"
                        }
                        size="small"
                        onClick={() => handleBarClick(bar)}
                        fullWidth
                      >
                        {barNumber}
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
            ))}
          </Box>
        );
      })}

      {/* If a bar is playing, show progress */}
      {activeMarkerId && (
        <Box sx={{ mt: 2, width: "100%", maxWidth: 400 }}>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Playing snippet... {elapsed.toFixed(2)} / {snippetDuration} s
          </Typography>
        </Box>
      )}
    </Box>
  );
}

MarkerGrid.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      markers: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          end: PropTypes.number.isRequired,
        }),
      ).isRequired,
    }),
  ).isRequired,
  onPlayBar: PropTypes.func.isRequired,
};
