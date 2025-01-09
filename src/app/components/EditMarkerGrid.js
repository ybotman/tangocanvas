//------------------------------------------------------------------------------
//src/app/components/EditMarkerGrid2.js
//------------------------------------------------------------------------------

"use client";

import React from "react";
import PropTypes from "prop-types";
import { Box, Grid2, Typography, Divider, IconButton } from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

export default function EditMarkerGrid2({
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
      {sections.map((section) => (
        <Box key={section.id} sx={{ mb: 3 }}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {section.label} ({section.type})
          </Typography>

          <Grid2 container spacing={1}>
            {section.markers.map((bar, idx) => {
              const nextBar = section.markers[idx + 1] || null;
              const duration = (bar.end - bar.start).toFixed(2);

              return (
                <Grid2 item="true" xs={12} sm={6} md={4} lg={3} key={bar.id}>
                  <Box
                    sx={{
                      border: "1px solid #ccc",
                      borderRadius: 1,
                      p: 0.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    {/* ROW 1: Bar label (click) and Shift icons (right) */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: "bold",
                          cursor: "pointer",
                          textDecoration: "underline",
                          mr: 1,
                        }}
                        onClick={() => handlePlay(bar, nextBar)}
                      >
                        {bar.label}
                      </Typography>

                      {bar.id !== "bar-1" && (
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleShift(bar, -0.1)}
                          >
                            <RemoveCircleOutlineIcon fontSize="inherit" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleShift(bar, 0.1)}
                          >
                            <AddCircleOutlineIcon fontSize="inherit" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>

                    {/* ROW 2: start → end (duration) */}
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {bar.start.toFixed(2)}s
                      </Typography>
                      <KeyboardArrowRightIcon fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {bar.end.toFixed(2)}s
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ ml: 1, color: "green", fontWeight: "bold" }}
                      >
                        ({duration}s)
                      </Typography>
                    </Box>
                  </Box>
                </Grid2>
              );
            })}
          </Grid2>
        </Box>
      ))}
    </Box>
  );
}

EditMarkerGrid2.propTypes = {
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
  onAdjustBarTime: PropTypes.func.isRequired,
  onPlayBar: PropTypes.func.isRequired,
};
