//src/app/components/WaveFormViewer.js

"use client";

import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";

/**
 * Renders the WaveSurfer waveform inside this <Box>.
 */
export default function WaveformViewer({ onInit }) {
  const waveformRef = useRef(null);

  useEffect(() => {
    if (onInit) {
      onInit(waveformRef);
    }
  }, [onInit]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 800,
        height: 100,
        backgroundColor: "#eee",
      }}
      ref={waveformRef}
    />
  );
}

WaveformViewer.propTypes = {
  onInit: PropTypes.func.isRequired,
};
