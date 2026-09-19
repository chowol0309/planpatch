import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlanStore } from '../src/store.js';
import { compatible, validateAssignments, TASKS } from '../src/planner.js';
const input = { person:'alex',from:'14:00',until:'20:00',budget:0,allowHelper:false };

test('late shift is recovered without cost, overlaps, missed essential work or silent writes', () => {
  const store = new PlanStore(); const before = store.snapshot(); const plan = store.preview(input);
  assert.ok(plan.options.length > 0);
  assert.deepEqual(store.state.schedule, before.schedule);
  assert.equal(store.state.revision, 0);
  const best = plan.options[0];
  assert.equal(best.cost, 0);
  assert.ok(best.changes.length > 0);
  assert.ok(validateAssignments(best.assignments, plan.busy, 0, false));
  for (const task of TASKS.filter(t => t.required)) assert.equal(best.assignments.find(a => a.taskId === task.id).deferred, false);
});
test('late-night unavailability forces an explicit deferral instead of exceeding workload', () => {
  const plan = new PlanStore().preview({...input,until:'23:00'});
  assert.ok(plan.options.length > 0);
  assert.ok(plan.options.every(o => o.deferred > 0));
});
test('helper option obeys explicit permission and budget', () => {
  const store = new PlanStore();
  const p = store.preview({...input,budget:12,allowHelper:true});
  assert.ok(p.options.some(o => o.assignments.some(a => a.person === 'jo')));
  assert.ok(p.options.every(o => o.cost <= 12));
  const zero = store.preview({...input,allowHelper:true});
  assert.ok(zero.options.every(o => o.assignments.every(a => a.person !== 'jo')));
});
test('no feasible essential pickup is reported rather than fabricated', () => {
  const store = new PlanStore();
  store.state.disruptions.push({person:'casey',start:840,end:1200,location:'work'});
  const p = store.preview(input);
  assert.equal(p.options.length,0); assert.match(p.reason,/School pickup/);
  assert.throws(() => store.approve(p.id,'option-1'),/No valid option/);
});
test('travel buffer rejects non-overlapping appointments that cannot be reached', () => {
  assert.equal(compatible({person:'casey',start:900,end:930,location:'school'},{person:'casey',start:940,end:970,location:'shop'}),false);
  assert.equal(compatible({person:'casey',start:900,end:930,location:'school'},{person:'casey',start:945,end:975,location:'shop'}),true);
});
test('approve persists, stale/replayed previews are rejected and undo restores exact prior state', () => {
  const dir = mkdtempSync(join(tmpdir(),'planpatch-test-'));
  try {
    const path=join(dir,'state.json'); const store=new PlanStore(path); const original=store.snapshot();
    const first=store.preview(input); const second=store.preview({...input,budget:12,allowHelper:true});
    store.approve(first.id,first.options[0].id);
    assert.equal(new PlanStore(path).state.revision,1);
    assert.throws(()=>store.approve(first.id,first.options[0].id),/stale/);
    assert.throws(()=>store.approve(second.id,second.options[0].id),/stale/);
    store.undo();
    assert.deepEqual(store.state.schedule,original.schedule);
    assert.deepEqual(store.state.disruptions,original.disruptions);
    assert.equal(store.state.revision,2);
    assert.throws(()=>store.undo(),/No applied/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('invalid and overnight time ranges and expired previews cannot mutate a schedule', () => {
  const store=new PlanStore();
  for (const bad of [{from:'22:00',until:'02:00'},{from:'24:00'},{budget:-1},{budget:1.5}]) assert.throws(()=>store.preview({...input,...bad}));
  const p=store.preview(input); store.state.plans[0].createdAt='2000-01-01T00:00:00Z';
  assert.throws(()=>store.approve(p.id,p.options[0].id),/expired/);
  assert.equal(store.state.revision,0);
});
