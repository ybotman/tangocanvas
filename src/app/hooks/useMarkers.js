/**
 * For a 3-section, 32 bars each, 3 seconds per bar => 96s per section => total 288s
 * This helper returns an array of [sectionIndex, startTime] to help build minimal UI.
 */

export function getSectionStartTimes() {
  // 3 sections, each 96 seconds
  // section 1 starts at 0s
  // section 2 starts at 96s
  // section 3 starts at 192s
  return [
    { label: "Section 1", start: 0 },
    { label: "Section 2", start: 96 },
    { label: "Section 3", start: 192 },
  ];
}