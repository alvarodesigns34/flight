/** Generic educational airframe, SI. These are NOT F-14 performance data.
 * The historical visual shell and the illustrative physics are independent.
 * Full provenance/validity is in FLIGHT_MODEL.md. */
export const parameters = Object.freeze({
  dryMass: 18000, initialFuel: 4000, area: 50, span: 16, chord: 3,
  inertia: [65000, 150000, 180000], maxThrust: 110000, spoolSeconds: 2,
  fuelPerNewtonSecond: 0.000015, gravity: 9.80665,
  cl0: 0.25, clAlpha: 4.2, clMaxIncrement: 1.25, cd0: 0.025, inducedDrag: 0.075,
  cm0: 0.04, cmAlpha: -0.65, cmElevator: 0.6, cmQ: -8,
  clAileron: 0.12, clP: -0.6, clBeta: -0.08,
  cyBeta: -0.7, cnBeta: 0.14, cnRudder: 0.12, cnR: -0.5,
  spring: 1000000, damper: 100000, contactFriction: 0.04,
  contacts: [[5,0,2.2],[-1.4,-2.4,2.2],[-1.4,2.4,2.2]],
});
