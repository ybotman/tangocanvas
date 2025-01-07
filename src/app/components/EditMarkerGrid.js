// src/app/edit/components/EditMarkerGrid.js
"use client";

import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, Grid, Divider } from "@mui/material";

export default function EditMarkerGrid({
  sections,
  onAdjustBarTime,
  onPlayBar,
}) {
  const handleShift = (bar, delta) => {
    onAdjustBarTime(bar.id, delta);
  };

  const handlePlay = (bar, nextBar) => {
    if (nextBar) {
      // play from bar.start → nextBar.start
      onPlayBar(bar.start, nextBar.start);
    } else {
      // last bar => bar.start → bar.end
      onPlayBar(bar.start, bar.end);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Edit Markers (Manual)
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
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {bar.label}
                    </Typography>
                    <Typography variant="body2">
                      Start: {bar.start.toFixed(2)}s
                    </Typography>
                    <Typography variant="body2">
                      End: {bar.end.toFixed(2)}s
                    </Typography>

                    {/* SHIFT Buttons */}
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleShift(bar, -0.1)}
                      >
                        -0.1s
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleShift(bar, 0.1)}
                      >
                        +0.1s
                      </Button>
                    </Box>

                    {/* PLAY Button */}
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => handlePlay(bar, nextBar)}
                    >
                      Play
                    </Button>
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
  sections: PropTypes.array.isRequired,
  onAdjustBarTime: PropTypes.func.isRequired,
  onPlayBar: PropTypes.func.isRequired,
};
