import raw from "./plan.json";
export type Resource = { title: string; url: string; note: string; channel?: string; any: boolean };
export type Day = {
  n: number; layer: string; name: string; outline: string; goal: string; learn: string;
  watch: Resource[]; read: Resource[]; trackA: string; trackB: string;
  build: string[]; drills: string[]; done: string[]; cut: string;
};
export const DAYS = (raw as unknown as { days: Day[] }).days;
export const READINESS = (raw as unknown as { readiness: { skill: string; target: string; where: string }[] }).readiness;
export const checkKeys = (d: Day) => [
  ...d.drills.map((_, i) => `d${d.n}-p${i}`),
  ...d.done.map((_, i) => `d${d.n}-d${i}`),
];
export const TOTAL_CHECKS = DAYS.reduce((a, d) => a + checkKeys(d).length, 0);
