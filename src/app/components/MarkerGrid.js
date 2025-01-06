"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Grid,
  LinearProgress,
  Typography,
  Divider
} from "@mui/material";

/**
 * Each bar has {id, label, start, end, sectionLabel, sectionId, sectionType}.
 */
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

      {sections.map((section) => (
        <Box key={section.id} sx={{ mb: 3 }}>
          {/* Horizontal Divider to label each new section */}
          <Divider sx={{ my: 2 }}>
            <Typography variant="subtitle1" sx={{ color: "gray" }}>
              {section.label} [{section.type}]
            </Typography>
          </Divider>

          {/* 32 bars in an 8×4 grid */}
          <Grid container spacing={1}>
            {section.markers.map((bar, idx) => {
              // We'll add a right border after columns 4, 12, 20, 28, ... 
              // i.e. if ( (idx+1) % 8 === 4 ), we put a border
              // But we only want 8 columns total, so let's see how that lines up:
              // Actually simpler: (idx % 8 === 3) => place border
              const col = idx % 8; 
              const borderRight = col === 3 ? "2px dashed #aaa" : "none";

              return (
                <Grid item xs={3} key={bar.id}>
                  <Button
                    variant={
                      bar.id === activeMarkerId ? "contained" : "outlined"
                    }
                    color={bar.id === activeMarkerId ? "secondary" : "primary"}
                    onClick={() => handleBarClick(bar)}
                    fullWidth
                    sx={{
                      borderRight,
                      borderRadius: 0 // so dashed line looks continuous
                    }}
                  >
                    {bar.label}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}

      {/* If a bar is playing, show progress */}
      {activeMarkerId && (
        <Box sx={{ mt: 2, width: "100%", maxWidth: 400 }}>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Playing snippet... {elapsed.toFixed(1)} / {snippetDuration} s
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
          end: PropTypes.number.isRequired
        })
      ).isRequired
    })
  ).isRequired,
  onPlayBar: PropTypes.func.isRequired
};