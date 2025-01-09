"use client";

import React from "react";
import PropTypes from "prop-types";
import { SongProvider } from "@/context/SongContext";
import { CssBaseline } from "@mui/material";
import HomeButton from "@/components/HomeButton";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CssBaseline />
        <SongProvider>
          {/* You can style this container however you like */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            {/* A small header bar with the HomeButton */}
            <div style={{ 
              display: "flex", 
              alignItems: "center",
              borderBottom: "1px solid #ccc",
              padding: "8px"
            }}>
              <HomeButton />
              {/* Optionally, you might put a site title or other nav items here */}
            </div>

            {/* The rest of the app */}
            <div style={{ flex: 1 }}>
              {children}
            </div>
          </div>
        </SongProvider>
      </body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};