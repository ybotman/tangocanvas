// src/app/utils/jsonHandler.js
"use client";

export function downloadJSONFile(jsonData, fileName = "updatedMarkers.json") {
  const jsonStr = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}
