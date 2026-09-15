/**
 * Test layout configuration.
 *
 * Each element defines how many fake nodes to place on that strength band.
 * Index 0 = band 0 (strength 90–100, closest to center).
 * Index 9 = band 9 (strength 0–9, outermost).
 *
 * Tweak these numbers and save — the page hot-reloads.
 */
export const nodesPerBand: number[] = [
  2,  // band 0  (strength 90–100)
  4,  // band 1  (strength 80–89)
  5,  // band 2  (strength 70–79)
  7,  // band 3  (strength 60–69)
  10, // band 4  (strength 50–59)
  8,  // band 5  (strength 40–49)
  6,  // band 6  (strength 30–39)
  12, // band 7  (strength 20–29)
  4,  // band 8  (strength 10–19)
  3,  // band 9  (strength 0–9)
]
