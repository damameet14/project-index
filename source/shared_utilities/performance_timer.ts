/**
 * Performance timer.
 *
 * Provides high-resolution timing for measuring scan duration
 * and individual operation performance.
 */

export interface PerformanceMeasurement {
  readonly label: string;
  readonly durationMilliseconds: number;
}

/**
 * Create a timer that can be stopped to get elapsed milliseconds.
 */
export function startPerformanceTimer(label: string): {
  stopAndGetMeasurement: () => PerformanceMeasurement;
} {
  const startTimeNanoseconds = process.hrtime.bigint();

  return {
    stopAndGetMeasurement(): PerformanceMeasurement {
      const endTimeNanoseconds = process.hrtime.bigint();
      const elapsedNanoseconds = endTimeNanoseconds - startTimeNanoseconds;
      const durationMilliseconds = Number(elapsedNanoseconds) / 1_000_000;

      return {
        label,
        durationMilliseconds: Math.round(durationMilliseconds * 100) / 100,
      };
    },
  };
}
