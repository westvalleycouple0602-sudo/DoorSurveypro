
export type Load = { name: string; inrush_A: number; hold_A: number; concurrent?: boolean };

export function sizePSU(loads: Load[]) {
  const totalInrush = loads.filter(l => l.concurrent !== false).reduce((a,b)=>a+(b.inrush_A||0), 0);
  const totalHold = loads.reduce((a,b)=>a+(b.hold_A||0), 0);
  const ratingByInrush = totalInrush * 1.25;
  const ratingByHold = totalHold * 1.5;
  const recommended = Math.max(ratingByInrush, ratingByHold);
  return { totalInrush, totalHold, recommended };
}

// Example:
// const psu = sizePSU([
//   { name: "99EL", inrush_A: 1.6, hold_A: 0.2, concurrent: true },
//   { name: "M62", inrush_A: 0.5, hold_A: 0.5, concurrent: true },
//   { name: "HES 5200", inrush_A: 0.24, hold_A: 0.12, concurrent: true },
// ]);
// console.log(psu);
