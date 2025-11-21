/**
 * Shift Production Types
 * Data structures for shift-to-shift production comparison
 */

/**
 * Single hour's production data comparing current vs previous shift
 */
export interface ShiftHourPoint {
  hourLabel: string; // e.g. "07:00", "08:00"
  hourIndex: number; // 0-based index within the shift
  currentGood: number;
  currentReject: number;
  currentDowntime: number;
  previousGood: number;
  previousReject: number;
  previousDowntime: number;
}

/**
 * Time window definition for a shift
 */
export interface ShiftWindow {
  start: string; // ISO date string
  end: string; // ISO date string
  filter?: string; // e.g. "PlannedProductionTime:true;274:2nd Shift"
  dims?: string[]; // Dimension filters
}
