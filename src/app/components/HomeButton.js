"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";

export default function HomeButton() {
  const router = useRouter();

  const goHome = () => {
    router.push("/");
  };

  return (
    <IconButton
      color="primary"
      onClick={goHome}
      sx={{ mr: 2 }}
      title="Go to Home"
    >
      <HomeIcon />
    </IconButton>
  );
}
