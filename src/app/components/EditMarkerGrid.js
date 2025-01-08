"use client";

import React from "react";
import PropTypes from "prop-types";
import { Box, Button, Grid, Typography, Divider } from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

export default function EditMarkerGrid({
  sections,
  onAdjustBarTime,
  onPlayBar,
}) {
  /**
   * Shift the bar’s start time by ±0.1s, except if bar is "bar-1".
   */
  const handleShift = (bar, delta) => {
    if (bar.id === "bar-1") {
      console.info("Bar 1 cannot shift. Ignoring request.");
      return;
    }
    onAdjustBarTime(bar.id, delta);
  };

  /**
   * Play from bar.start..bar.end, or up to the next bar’s start if desired.
   */
  const handlePlay = (bar, nextBar) => {
    if (nextBar) {
      onPlayBar(bar.start, nextBar.start);
    } else {
      onPlayBar(bar.start, bar.end);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Edit Markers (Compact)
      </Typography>

      {sections.map((section) => (
        <Box key={section.id} sx={{ mb: 3 }}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {section.label} ({section.type})
          </Typography>

          <Grid container spacing={1}>
            {section.markers.map((bar, idx) => {
              const nextBar = section.markers[idx + 1] || null;

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={bar.id}>
                  <Box
                    sx={{
                      border: "1px solid #ccc",
                      borderRadius: 1,
                      p: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    {/* Top row: Bar label + shift buttons */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handlePlay(bar, nextBar)}
                        sx={{ textTransform: "none", fontWeight: "bold" }}
                      >
                        {bar.label}
                      </Button>

                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleShift(bar, -0.1)}
                        >
                          -0.1s
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleShift(bar, 0.1)}
                        >
                          +0.1s
                        </Button>
                      </Box>
                    </Box>

                    {/* Second row: Range start → end */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}
                      >
                        {bar.start.toFixed(2)}s
                      </Typography>
                      <KeyboardArrowRightIcon fontSize="small" />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}
                      >
                        {bar.end.toFixed(2)}s
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

EditMarkerGrid.propTypes = {
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
        })
      ).isRequired,
    })
  ).isRequired,
  onAdjustBarTime: PropTypes.func.isRequired,
  onPlayBar: PropTypes.func.isRequired,
};