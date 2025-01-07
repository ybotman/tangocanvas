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
  /**
   * handleShift => called when user clicks ±0.1
   *   - if bar is "bar-1" => do nothing (cannot shift)
   *   - else => call onAdjustBarTime(bar.id, delta)
   */
  const handleShift = (bar, delta) => {
    // If this is bar-1 (i.e. the first bar in the entire track), do nothing
    if (bar.id === "bar-1") {
      console.info("Bar 1 cannot shift. Ignoring request.");
      return;
    }
    onAdjustBarTime(bar.id, delta);
  };

  /**
   * handlePlay => bar label is now a button to snippet-play from bar.start..bar.end
   *   - or up to nextBar.start if you prefer that approach
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
              const isBar1 = bar.id === "bar-1";

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
                    {/* Instead of plain text, we make the bar label a button for playback */}
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handlePlay(bar, nextBar)}
                      sx={{ 
                        textTransform: "none", 
                        fontWeight: "bold", 
                        justifyContent: "flex-start" 
                      }}
                    >
                      {bar.label}
                    </Button>

                    <Typography variant="body2">
                      Start: {bar.start.toFixed(2)}s
                    </Typography>
                    <Typography variant="body2">
                      End: {bar.end.toFixed(2)}s
                    </Typography>

                    {/* SHIFT Buttons (hidden if bar-1) */}
                    {!isBar1 && (
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
                    )}
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