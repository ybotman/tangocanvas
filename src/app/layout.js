/**
 * src/app/layout.js
 *
 * Wraps the entire app with SongProvider & WaveSurferProvider.
 * Ensures single wave context and single song context.
 */

"use client";

import React from "react";
import PropTypes from "prop-types";
import { CssBaseline } from "@mui/material";
import HomeButton from "@/components/HomeButton";
import { SongProvider } from "@/context/SongContext";
import { WaveSurferProvider } from "@/context/WaveSurferContext";

export default function RootLayout({ children }) {
  console.log("entering RootLayout with children");
  return (
    <html lang="en">
      <body>
        <CssBaseline />
        <WaveSurferProvider>
          <SongProvider>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                }}
              >
                <HomeButton />
                {/* Additional site nav or brand here */}
              </div>

              <div style={{ flex: 1 }}>{children}</div>
            </div>
          </SongProvider>
        </WaveSurferProvider>
      </body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
