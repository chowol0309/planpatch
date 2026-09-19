import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPlan, initialSchedule, validateAssignments, minutes } from './planner.js';

export class PlanStore {
  constructor(path) {
    this.path = path;
    this.state = path && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { revision: 0, schedule: initialSchedule(), disruptions: [], history: [], plans: [] };
  }
  persist(next) {
    if (this.path) {
      mkdirSync(dirname(this.path), { recursive: true });
      writeFileSync(`${this.path}.tmp`, JSON.stringify(next, null, 2));
      renameSync(`${this.path}.tmp`, this.path);
    }
    this.state = next;
  }
  snapshot() { return structuredClone(this.state); }
  preview(input, source = 'Web') {
    const plan = { ...createPlan(this.state, input), source };
    this.persist({ ...this.state, plans: [...this.state.plans.slice(-19), plan] });
    return plan;
  }
  approve(planId, optionId) {
    const plan = this.state.plans.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found. Create a new preview.');
    if (plan.revision !== this.state.revision) throw new Error('This preview is stale. Create a new preview before applying.');
    if (Date.now() - Date.parse(plan.createdAt) > 30 * 60 * 1000) throw new Error('Preview expired. Create a new preview.');
    const option = plan.options.find(o => o.id === optionId);
    if (!option || !validateAssignments(option.assignments, plan.busy, plan.disruption.budget, plan.disruption.allowHelper)) throw new Error('No valid option to apply.');
    const d = plan.disruption;
    const before = { schedule: structuredClone(this.state.schedule), disruptions: structuredClone(this.state.disruptions) };
    this.persist({ ...this.state, revision: this.state.revision + 1, schedule: structuredClone(option.assignments),
      disruptions: [...this.state.disruptions, { person: d.person, start: minutes(d.from), end: minutes(d.until), location: 'work', title: 'Confirmed unavailability' }],
      history: [...this.state.history, { at: new Date().toISOString(), action: 'approved', planId, optionId, before }] });
    return this.snapshot();
  }
  undo() {
    const last = this.state.history.at(-1);
    if (!last || last.action !== 'approved') throw new Error('No applied plan to undo.');
    this.persist({ ...this.state, ...structuredClone(last.before), revision: this.state.revision + 1,
      history: [...this.state.history, { at: new Date().toISOString(), action: 'undone', planId: last.planId }] });
    return this.snapshot();
  }
  reset() {
    this.persist({ revision: this.state.revision + 1, schedule: initialSchedule(), disruptions: [], history: [], plans: [] });
    return this.snapshot();
  }
}
