/* --------------------------------------------
 * @/hooks/useSection.js
 * --------------------------------------------
 */

import { useState } from "react";
import {
  createNewSection,
  extractBarRange,
  deleteSectionByIndex,
  updateAllSectionBoundaries,
} from "@/utils/sectionHelper";

export default function useSection() {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const showError = (msg) => {
    setSnackbar({ open: true, message: msg, severity: "error" });
  };
  const showSuccess = (msg) => {
    setSnackbar({ open: true, message: msg, severity: "success" });
  };

  /**
   * ADD SECTION: user chooses sectionType, barIdStart, barIdEnd
   *  1) find all markers from barIdStart..barIdEnd,
   *  2) remove them from old sections,
   *  3) create a new section with those markers,
   *  4) push the new section into the array,
   *  5) recalc boundaries
   */
  const addSection = (songData, sectionType, barIdStart, barIdEnd) => {
    if (!songData) {
      showError("No song data found.");
      return null;
    }
    if (!sectionType) {
      showError("No section type chosen.");
      return null;
    }
    if (!barIdStart || !barIdEnd) {
      showError("Please choose a Start Bar and End Bar.");
      return null;
    }

    const updatedData = JSON.parse(JSON.stringify(songData));
    const { sections } = updatedData;

    // 1) extract bars from barIdStart..barIdEnd
    const extracted = extractBarRange(sections, barIdStart, barIdEnd);
    if (extracted.length === 0) {
      showError(
        "No bars found in that range. Possibly invalid IDs or out-of-range.",
      );
      return null;
    }

    // 2) create new section
    const newSec = createNewSection(sectionType);
    // put these extracted bars in the new section
    newSec.markers = extracted;
    // if you want them sorted by start time, you can do that as well:
    newSec.markers.sort((a, b) => a.start - b.start);

    // 3) push newSec into sections array
    sections.push(newSec);

    // 4) recalc boundaries
    updateAllSectionBoundaries(sections);

    return updatedData;
  };

  /**
   * DELETE SECTION => merges markers to previous section, then removes.
   */
  const deleteSection = (songData, sectionId) => {
    if (!songData) {
      showError("No song data found.");
      return null;
    }
    if (!sectionId) {
      showError("No section selected.");
      return null;
    }

    const updatedData = JSON.parse(JSON.stringify(songData));
    const { sections } = updatedData;
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) {
      showError("Section not found.");
      return null;
    }

    try {
      deleteSectionByIndex(sections, idx);
      updateAllSectionBoundaries(sections);
      return updatedData;
    } catch (err) {
      showError(err.message || "Error removing section");
      return null;
    }
  };
  const addSectionBetweenBars = (
    songData,
    oldSectionId,
    newSectionType,
    barIdStart,
    barIdEnd,
  ) => {
    if (!songData) {
      showError("No song data provided.");
      return null;
    }
    if (!oldSectionId) {
      showError("No 'old' section chosen to split.");
      return null;
    }

    // find the old section
    const updatedData = JSON.parse(JSON.stringify(songData));
    const sections = updatedData.sections || [];
    const idx = sections.findIndex((s) => s.id === oldSectionId);
    if (idx < 0) {
      showError("Section not found in data.");
      return null;
    }

    // perform the split
    const oldSec = sections[idx];
    const result = splitSectionByBarRange(
      oldSec,
      barIdStart,
      barIdEnd,
      newSectionType,
    );
    if (!result) {
      showError("Failed to split; bar IDs not found or invalid range.");
      return null;
    }

    const { newSection, updatedOriginalSection } = result;

    // update the oldSec in place
    sections[idx] = updatedOriginalSection;

    // insert the newSection right after oldSec
    sections.splice(idx + 1, 0, newSection);

    showSuccess(
      `Created a new ${newSectionType} from bar:${barIdStart}..${barIdEnd}`,
    );

    return updatedData;
  };

  /**
   * Example: saving to /api/markers
   */
  const saveToApi = async (updatedData) => {
    try {
      const resp = await fetch("/api/markers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || "Failed to update markers");
      }
      showSuccess("Successfully saved updated sections!");
    } catch (err) {
      showError(err.message);
    }
  };

  return {
    snackbar,
    setSnackbar,
    showError,
    showSuccess,
    addSectionBetweenBars,
    saveToApi,
  };
}
