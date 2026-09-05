export function rationalDischarge(
  areaKm2: number,
  intensityMmHour: number,
  coefficient: number,
) {
  if (
    ![areaKm2, intensityMmHour, coefficient].every(Number.isFinite) ||
    areaKm2 <= 0 ||
    intensityMmHour <= 0 ||
    coefficient <= 0 ||
    coefficient > 1
  )
    throw new Error(
      "Enter positive area and intensity, with a runoff coefficient above zero and at most one.",
    );
  // 1 mm over 1 km² = 1000 m³; 1 hour = 3600 seconds.
  return (areaKm2 * intensityMmHour * coefficient) / 3.6;
}
