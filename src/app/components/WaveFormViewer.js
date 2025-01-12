/**
 * src/app/components/WaveFormViewer.js
 *
 * Renders the WaveSurfer container and optional timeline container.
 * Calls onInit(waveformRef, timelineRef) once, preventing double init in React 18 dev mode.
 */

"use client";

import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";

export default function WaveformViewer({ onInit }) {
  console.log("entering WaveformViewer with onInit defined? =>", !!onInit);

  const waveformRef = useRef(null);
  const timelineRef = useRef(null);

  // Prevent double-init in React 18 dev mode
  const hasInitRef = useRef(false);

  useEffect(() => {
    console.log("WaveFormViewer => useEffect for onInit");
    if (onInit && !hasInitRef.current) {
      hasInitRef.current = true;
      onInit(waveformRef, timelineRef);
    }
  }, [onInit]);

  return (
    <Box sx={{ width: "100%", maxWidth: 900, mb: 2 }}>
      {/* Waveform container */}
      <Box
        ref={waveformRef}
        sx={{
          width: "100%",
          height: 120,
          backgroundColor: "#f5f5f5",
        }}
      />
      {/* Timeline container */}
      <Box
        ref={timelineRef}
        sx={{
          width: "100%",
          height: 30,
          backgroundColor: "#fafafa",
          mt: 1,
        }}
      />
    </Box>
  );
}

WaveformViewer.propTypes = {
  onInit: PropTypes.func.isRequired,
};
