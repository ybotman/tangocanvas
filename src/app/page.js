"use client";

import React from "react";
import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";

export default function HomePage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        TangoCanvas Demo
      </Typography>
      <Link href="/play" style={{ textDecoration: "none" }}>
        <Button variant="contained">Go to Play Page</Button>
      </Link>
    </Box>
  );
}