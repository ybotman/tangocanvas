/**
 * src/app/components/PlayBarGrid.js
 *
 * Displays bar buttons for each 'section', calls onPlayBar(bar).
 */

"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Divider,
} from "@mui/material";
import Grid2 from "@mui/material/Grid2"; // MUI's "Grid v2"

export default function PlaybackGrid({ sections, onPlayBar }) {
  //console.log("entering PlaybackGrid with sections.length =", sections.length);

  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const snippetDuration = 4.5;

  useEffect(() => {
    //console.log("PlaybackGrid => useEffect for timer");
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

  // Helper: chunk the array
  function chunkArray(arr, chunkSize) {
    const result = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  const handleBarClick = (bar) => {
    //console.log("PlaybackGrid => handleBarClick with bar.id =", bar.id);
    setActiveMarkerId(bar.id);
    onPlayBar(bar);
  };

  const progressValue = (elapsed / snippetDuration) * 100;

  return (
    <Box sx={{ mt: 2 }}>
      {sections.map((section) => {
        const markers = Array.isArray(section.markers) ? section.markers : [];
        const chunked = chunkArray(markers, 8);

        return (
          <Box key={section.id} sx={{ mb: 3 }}>
            {/* Section title */}
            <Divider sx={{ my: 2 }}>
              <Typography variant="subtitle1" sx={{ color: "gray" }}>
                {section.label} [{section.type}]
              </Typography>
            </Divider>

            {chunked.map((rowBars, rowIdx) => (
              <Grid2 container spacing={1} key={rowIdx} sx={{ mb: 2 }}>
                {rowBars.map((bar) => {
                  // label e.g. "Bar 7" => "7"
                  const barNumber = bar.label.replace("Bar ", "");

                  return (
                    <Grid2 item="true" xs={1} sm={1} md={1} key={bar.id}>
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
                    </Grid2>
                  );
                })}
              </Grid2>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

PlaybackGrid.propTypes = {
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
