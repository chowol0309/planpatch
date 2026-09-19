import { createHash } from 'node:crypto';
import { z } from 'zod';

export const disruptionSchema = z.object({
  person: z.enum(['alex', 'casey', 'jo']).default('alex'),
  from: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('14:00'),
  until: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('20:00'),
  budget: z.number().int().min(0).max(100).default(0),
  allowHelper: z.boolean().default(false)
}).refine(x => minutes(x.from) < minutes(x.until), { message: 'End time must be later than start time (same day).' });

export const minutes = t => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
export const clock = t => `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
export const travel = (a, b) => !a || !b || a === b ? 0 : (a === 'work' || b === 'work' ? 20 : 15);
export const PEOPLE = [
  { id: 'alex', name: 'Alex', role: 'Parent · shift worker', color: '#3d6bde', maxMinutes: 180 },
  { id: 'casey', name: 'Casey', role: 'Parent · remote worker', color: '#bd6539', maxMinutes: 120 },
  { id: 'jo', name: 'Jo', role: 'Optional helper · $12/task', color: '#8358aa', maxMinutes: 120 }
];
export const TASKS = [
  { id: 'pickup', title: 'School pickup', location: 'school', duration: 30, earliest: 900, latest: 900, required: true, icon: '01', note: 'Fixed pickup at 15:00. Travel time included in checks.' },
  { id: 'groceries', title: 'Collect groceries', location: 'shop', duration: 40, earliest: 960, latest: 1080, required: false, icon: '02', note: 'Flexible collection. Can be deferred to tomorrow.' },
  { id: 'dinner', title: 'Prepare dinner', location: 'home', duration: 45, earliest: 1095, latest: 1155, required: true, icon: '03', note: 'Dinner must be ready by 20:00.' },
  { id: 'laundry', title: 'Laundry', location: 'home', duration: 20, earliest: 1170, latest: 1240, required: false, icon: '04', note: 'Not urgent. Deferring needs your approval.' }
];
export const BASE_BUSY = [
  { person: 'alex', start: 480, end: 780, location: 'work', title: 'Original work shift' },
  { person: 'casey', start: 540, end: 855, location: 'home', title: 'Remote work' },
  { person: 'casey', start: 1020, end: 1080, location: 'home', title: 'Fixed evening call' },
  { person: 'jo', start: 0, end: 840, location: null, title: 'Unavailable before 14:00' },
  { person: 'jo', start: 1140, end: 1440, location: null, title: 'Unavailable after 19:00' }
];
export const initialSchedule = () => TASKS.map(t => ({ taskId: t.id, person: t.id === 'laundry' ? 'casey' : 'alex', start: t.earliest, end: t.earliest + t.duration, location: t.location, deferred: false }));
export function compatible(a, b) {
  if (a.person !== b.person || a.deferred || b.deferred) return true;
  if (a.end <= b.start) return a.end + travel(a.location, b.location) <= b.start;
  if (b.end <= a.start) return b.end + travel(b.location, a.location) <= a.start;
  return false;
}

export function createPlan(state, input) {
  const disruption = disruptionSchema.parse(input);
  const busy = [...BASE_BUSY, ...(state.disruptions ?? []), { person: disruption.person, start: minutes(disruption.from), end: minutes(disruption.until), location: 'work', title: 'New unavailability' }];
  const impacted = state.schedule.filter(a => !a.deferred && !busy.every(b => compatible(a, b))).map(a => a.taskId);
  const baseline = new Map(state.schedule.map(a => [a.taskId, a]));
  const candidates = TASKS.map(t => {
    const out = [];
    for (const p of PEOPLE) {
      if (p.id === 'jo' && !disruption.allowHelper) continue;
      for (let start = t.earliest; start <= t.latest; start += 15) {
        const a = { taskId: t.id, person: p.id, start, end: start + t.duration, location: t.location, deferred: false };
        if (busy.every(b => compatible(a, b))) out.push(a);
      }
    }
    if (!t.required) out.push({ taskId: t.id, person: null, start: null, end: null, location: t.location, deferred: true });
    return out;
  });
  const solutions = new Map();
  function visit(index, chosen, cost, loads, score) {
    if (index === TASKS.length) {
      // Collapse mere time variations; show genuinely different responsibility/deferral choices.
      const signature = chosen.map(a => `${a.taskId}:${a.person ?? 'tomorrow'}`).join('|');
      const previous = solutions.get(signature);
      if (!previous || score < previous.score) solutions.set(signature, { assignments: structuredClone(chosen), cost, loads: { ...loads }, score });
      return;
    }
    const t = TASKS[index];
    for (const a of candidates[index]) {
      const extra = a.person === 'jo' ? 12 : 0;
      if (cost + extra > disruption.budget || !chosen.every(b => compatible(a, b))) continue;
      const used = a.deferred ? 0 : (loads[a.person] ?? 0) + t.duration;
      if (!a.deferred && used > PEOPLE.find(p => p.id === a.person).maxMinutes) continue;
      const old = baseline.get(a.taskId);
      const penalty = a.deferred ? 90 : extra * 3 + (old?.person === a.person ? 0 : 12) + Math.abs(a.start - (old?.start ?? t.earliest)) / 30;
      visit(index + 1, [...chosen, a], cost + extra, a.deferred ? loads : { ...loads, [a.person]: used }, score + penalty);
    }
  }
  visit(0, [], 0, {}, 0);
  const options = [...solutions.values()].sort((a, b) => a.score - b.score).slice(0, 3).map((s, i) => {
    const changes = s.assignments.flatMap(a => {
      const old = baseline.get(a.taskId);
      if (old && old.person === a.person && old.start === a.start && old.deferred === a.deferred) return [];
      const task = TASKS.find(t => t.id === a.taskId);
      return [{ taskId: a.taskId, title: task.title, before: old, after: a,
        reason: a.deferred ? 'Optional task deferred to respect availability and workload limits.' : impacted.includes(a.taskId) ? 'Original assignment conflicts with availability or travel time.' : 'Adjusted to keep the whole day feasible.' }];
    });
    return { ...s, id: `option-${i + 1}`, changes, deferred: s.assignments.filter(a => a.deferred).length };
  });
  const blocked = TASKS.filter((t, i) => t.required && candidates[i].length === 0).map(t => t.title);
  const reason = options.length ? null : blocked.length ? `No available person can cover ${blocked.join(' and ')}. Change the availability or allow a helper with enough budget.` : 'The combined availability, travel, budget and workload constraints cannot all be met. No changes will be applied.';
  const createdAt = new Date().toISOString();
  return { id: createHash('sha256').update(JSON.stringify({ revision: state.revision, disruption, createdAt })).digest('hex').slice(0, 20), revision: state.revision, createdAt, disruption, impacted, busy, options, reason };
}

export function validateAssignments(assignments, busy, budget, allowHelper) {
  if (assignments.length !== TASKS.length || new Set(assignments.map(a => a.taskId)).size !== TASKS.length) return false;
  let cost = 0;
  const loads = {};
  for (const a of assignments) {
    const t = TASKS.find(t => t.id === a.taskId);
    if (!t) return false;
    if (a.deferred) { if (t.required) return false; continue; }
    const p = PEOPLE.find(p => p.id === a.person);
    if (!p || a.location !== t.location || !Number.isInteger(a.start) || a.start < t.earliest || a.start > t.latest || a.end !== a.start + t.duration) return false;
    if (a.person === 'jo') { if (!allowHelper) return false; cost += 12; }
    loads[a.person] = (loads[a.person] ?? 0) + t.duration;
    if (loads[a.person] > p.maxMinutes || !busy.every(b => compatible(a, b))) return false;
  }
  return cost <= budget && assignments.every((a, i) => assignments.slice(i + 1).every(b => compatible(a, b)));
}
