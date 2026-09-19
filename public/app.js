const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = n => n == null ? 'Tomorrow' : `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
let state, token, plan = null, selected = 0;
const assistantButton = document.createElement('button');
assistantButton.id = 'assistant-preview'; assistantButton.className = 'quiet'; assistantButton.hidden = true;
assistantButton.textContent = '↗ Review assistant proposal';
$('message').before(assistantButton);
const pendingAssistantPlan = () => state?.plans.filter(p => p.source === 'MCP' && p.revision === state.revision).at(-1);
assistantButton.addEventListener('click', () => {
  plan = pendingAssistantPlan(); selected = 0; $('confirm').checked = false;
  if (plan) {
    $('person').value=plan.disruption.person; $('from').value=plan.disruption.from; $('until').value=plan.disruption.until;
    $('budget').value=plan.disruption.budget; $('helper').checked=plan.disruption.allowHelper;
    render(); notify(plan.reason ?? 'Assistant proposal loaded. Your saved schedule has not changed.',plan.reason?'warning':'');
  }
});
async function request(url, body) {
  const res = await fetch(url, body === undefined ? {} : { method:'POST', headers:{'Content-Type':'application/json','X-PlanPatch-UI':token}, body:JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}
function notify(text, kind = '') { $('message').textContent = text; $('message').className = text ? `notice ${kind}` : ''; }
function personName(id) { return state.people.find(p => p.id === id)?.name ?? 'Tomorrow'; }
function assignmentText(a) { return a?.deferred ? 'Move to tomorrow' : `${personName(a?.person)} · ${time(a?.start)}–${time(a?.end)}`; }
function renderEvents() {
  $('events').innerHTML = state.events.length ? state.events.slice(-5).reverse().map(e => `<div class="event"><span class="event-source">${esc(e.source)}</span><div><b>${esc(e.tool.replaceAll('_', ' '))}</b><p>${esc(e.detail)}</p></div><time>${new Date(e.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>`).join('') : '<p class="muted">Your planning steps will appear here.</p>';
}
function render() {
  assistantButton.hidden = !!plan || !pendingAssistantPlan();
  const option = plan?.options[selected];
  const assignments = option?.assignments ?? state.schedule;
  $('people').innerHTML = state.people.map(p => `<div class="person"><span class="avatar ${esc(p.id)}">${p.name[0]}</span><div><b>${esc(p.name)}</b><small>${esc(p.role)}</small></div></div>`).join('');
  $('revision').textContent = `${state.history.at(-1)?.action === 'approved' ? 'Patched' : 'Saved'} plan · revision ${state.revision}`;
  $('covered').innerHTML = `${assignments.filter(a => !a.deferred).length} <small>tasks today</small>`;
  $('plan-label').textContent = plan ? option ? 'PREVIEW · NOT APPLIED' : 'NO FEASIBLE PLAN' : 'CURRENT PLAN';
  $('options').innerHTML = (plan?.options ?? []).map((o, i) => `<button class="option ${i === selected ? 'selected' : ''}" data-option="${i}">${i === 0 ? 'Recommended' : `Alternative ${i + 1}`}<small>$${o.cost} extra · ${o.deferred} deferred</small></button>`).join('');
  $('options').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { selected = Number(b.dataset.option); $('confirm').checked = false; render(); }));
  $('schedule').innerHTML = state.tasks.map(t => {
    const a = assignments.find(x => x.taskId === t.id);
    const change = option?.changes.find(c => c.taskId === t.id);
    const affected = !option && plan?.impacted.includes(t.id);
    return `<article class="task ${change ? 'changed' : ''} ${affected ? 'conflict' : ''}"><span class="task-icon">${t.icon}</span><div class="task-main"><div><h3>${esc(t.title)}</h3><span class="task-tag">${t.required ? 'ESSENTIAL' : 'FLEXIBLE'}</span></div><p>${esc(t.note)}</p>${change ? `<del>${esc(assignmentText(change.before))}</del>` : ''}<div class="assignment"><span class="person-dot ${esc(a.person ?? 'deferred')}"></span>${esc(assignmentText(a))}${change ? '<b class="change-tag">CHANGED</b>' : ''}</div>${change ? `<p class="reason">${esc(change.reason)}</p>` : ''}${affected ? '<p class="reason">Conflicts with the new availability.</p>' : ''}</div></article>`;
  }).join('');
  $('summary').innerHTML = option ? `<div class="summary"><div><strong>${option.changes.length}</strong><span>changes to review</span></div><div><strong>$${option.cost}</strong><span>additional demo cost</span></div><div><strong>${option.deferred}</strong><span>tasks for tomorrow</span></div></div><p class="muted">Checked: no overlaps, travel time, fixed commitments, workload limits and budget.</p>` : '';
  $('approval').hidden = !option;
  $('apply').disabled = !$('confirm').checked;
  $('undo').hidden = state.history.at(-1)?.action !== 'approved';
  renderEvents();
}
async function refresh() { state = await request('/api/state'); render(); }
$('recovery-form').addEventListener('submit', async e => {
  e.preventDefault(); $('preview').disabled = true; $('confirm').checked = false;
  try {
    plan = await request('/api/preview', {person:$('person').value,from:$('from').value,until:$('until').value,budget:Number($('budget').value),allowHelper:$('helper').checked});
    selected = 0; await refresh();
    notify(plan.reason ?? `${plan.impacted.length} original tasks affected. Review the proposed changes before applying.`, plan.reason ? 'warning' : '');
  } catch(e) { plan = null; render(); notify(e.message, 'warning'); }
  finally { $('preview').disabled = false; }
});
// Editing the input invalidates the visible preview until recalculated.
for (const id of ['person','from','until','budget','helper']) $(id).addEventListener('input', () => { if (plan) { plan=null; $('confirm').checked=false; render(); notify('Inputs changed. Generate a fresh preview.'); } });
$('confirm').addEventListener('change', () => { $('apply').disabled = !$('confirm').checked; });
$('apply').addEventListener('click', async () => {
  $('apply').disabled = true;
  try { await request('/api/approve', {planId:plan.id,optionId:plan.options[selected].id,confirm:$('confirm').checked}); plan=null; $('confirm').checked=false; await refresh(); notify('Plan applied to the local demo. No messages sent, bookings made or external calendars changed.', 'success'); }
  catch(e) { plan=null; $('confirm').checked=false; await refresh(); notify(e.message, 'warning'); }
});
$('undo').addEventListener('click', async () => { try { await request('/api/undo', {}); plan=null; await refresh(); notify('Previous demo schedule restored.', 'success'); } catch(e) { notify(e.message, 'warning'); } });
$('reset').addEventListener('click', async () => { try { await request('/api/reset', {}); plan=null; $('recovery-form').reset(); $('confirm').checked=false; await refresh(); notify('Fictional household reset. Ready for a new scenario.'); } catch(e) { notify(e.message, 'warning'); } });
try { token = (await request('/api/session')).token; await refresh(); } catch(e) { notify(`Could not connect to the local server: ${e.message}`, 'warning'); }
setInterval(async () => { try { const latest = await request('/api/state'); const changed = state && state.revision !== latest.revision; state = latest; if (changed) { plan=null; $('confirm').checked=false; render(); notify('The saved schedule changed. Review a fresh preview.'); } else {renderEvents(); assistantButton.hidden=!!plan || !pendingAssistantPlan();} } catch {} }, 4000);
