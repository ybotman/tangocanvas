"use client";

import React from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";
import { usePathname } from "next/navigation";

const Header = () => {
  const pathname = usePathname();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Tango Canvas
        </Typography>
        <Typography variant="body2" component="div">
          Path: {pathname}
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;