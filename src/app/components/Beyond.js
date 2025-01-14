"use client";

import React from "react";
import PropTypes from "prop-types";
import { TextField } from "@mui/material";

/**
 * Beyond:
 * A reusable integer text field for "seconds beyond."
 * - Range: 0..30
 * - Defaults to 0 if user enters invalid or out-of-range values.
 * - Calls onChange(intValue) whenever the field changes.
 */
export default function Beyond({
  label = "Beyond",
  value = 0,
  onChange,
  min = 0,
  max = 30,
}) {
  const handleChange = (event) => {
    let val = event.target.value;
    let intVal = parseInt(val, 10);

    // If parse fails or is NaN => default to 0
    if (Number.isNaN(intVal)) {
      intVal = 0;
    }
    // Clamp to [min..max]
    if (intVal < min) intVal = min;
    if (intVal > max) intVal = max;

    onChange(intVal);
  };

  return (
    <TextField
      label={label}
      type="number"
      variant="outlined"
      size="small"
      value={value}
      onChange={handleChange}
      inputProps={{
        min,
        max,
        style: { textAlign: "center" },
      }}
      sx={{ width: 80 }}
    />
  );
}

Beyond.propTypes = {
  label: PropTypes.string,
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired, // Must provide a callback for changes
  min: PropTypes.number,
  max: PropTypes.number,
};
