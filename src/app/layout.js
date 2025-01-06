"use client";

import React from "react";
import PropTypes from "prop-types";
import { SongProvider } from "./context/SongContext";
import { CssBaseline } from "@mui/material";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CssBaseline />
        <SongProvider>{children}</SongProvider>
      </body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired
};