// Paste your Formspree form ID here (the part after https://formspree.io/f/)
const FORMSPREE_ID = 'moeeaoyb';

const ENDPOINT = `https://formspree.io/f/${FORMSPREE_ID}`;
const STORAGE_KEY = 'sunday-dinner-pick';
const NAMES = {"pad-see-ew":"Pad See Ew","garlic-chicken-bowl":"Honey Garlic Chicken","takeout":"Takeout","chefs-choice":"Chef's choice"};
const KNOWN_SPOTS = ["Jeepney's", 'Beartooth', 'El Jefe', '49th State Brewing', 'Spenard Roadhouse', 'So Thai', 'Bombay'];

const form = document.getElementById('pickForm');
const spotBox = document.getElementById('spotBox');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const noteEl = document.getElementById('note');
const otherEl = document.getElementById('otherSpot');
const otherWrap = document.getElementById('otherWrap');
const timeEl = document.getElementById('startTime');
let saved = null, dirty = false, saving = false;

const val = n => (form.querySelector(`input[name="${n}"]:checked`) || {}).value || null;
function spotVal(){ const s = val('spot'); return s === 'other' ? (otherEl.value.trim() || null) : s; }
function label(p){ return p.dinner === 'takeout' ? `Takeout from ${p.spot}` : (NAMES[p.dinner] || p.dinner); }
function summary(p){ return label(p) + (p.time ? ` at ${p.time}` : ''); }
// Every 15 minutes from 12:00 AM to 11:45 PM.
for (let m = 0; m < 1440; m += 15) {
  const h = Math.floor(m / 60), t = `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  timeEl.add(new Option(t, t));
}

function setStatus(t, kind){ statusEl.textContent = t; statusEl.classList.toggle('err', kind === true || kind === 'err'); statusEl.classList.toggle('ok', kind === 'ok'); }

function refresh(){
  const d = val('dinner');
  spotBox.hidden = d !== 'takeout';
  otherWrap.hidden = val('spot') !== 'other';
  const t = timeEl.value;
  const ready = d && t && (d !== 'takeout' || spotVal());
  saveBtn.disabled = !ready || saving || (saved && !dirty);
  saveBtn.classList.toggle('is-saved', !!saved && !dirty && !saving);
  saveBtn.textContent = saved ? (dirty ? 'Update my pick' : '✓ Saved') : 'Save my pick';
  if (saving || statusEl.classList.contains('err') || statusEl.classList.contains('ok')) return;
  if (!ready && d === 'takeout' && !spotVal()) setStatus(val('spot') === 'other' ? 'Type where you want takeout from.' : 'Pick a takeout spot.');
  else if (!ready && d && !t) setStatus('Pick a start time.');
  else if (!ready && t && !d) setStatus('Pick a dinner.');
  else if (!ready) setStatus('');
  else if (dirty) setStatus('Not saved yet.');
}

function showSaved(p){
  const box = document.getElementById('savedBox');
  if (!p || !p.dinner) { box.hidden = true; return; }
  box.hidden = false;
  document.getElementById('savedText').textContent = `Locked in: ${summary(p)}.`;
  let when = '';
  try { when = 'Saved ' + new Date(p.savedAt).toLocaleString([], {weekday:'short', hour:'numeric', minute:'2-digit'}) + '.'; } catch (e) {}
  document.getElementById('savedWhen').textContent = when + (p.note ? ` Note: "${p.note}"` : '');
}

function applyToForm(p){
  const d = form.querySelector(`input[name="dinner"][value="${p.dinner}"]`); if (d) d.checked = true;
  timeEl.value = p.time || '';
  if (p.spot) {
    const known = KNOWN_SPOTS.includes(p.spot);
    form.querySelectorAll('input[name="spot"]').forEach(i => i.checked = known ? i.value === p.spot : i.value === 'other');
    otherEl.value = known ? '' : p.spot;
  }
  noteEl.value = p.note || '';
}

form.addEventListener('change', () => { dirty = true; statusEl.classList.remove('err', 'ok'); refresh(); });
noteEl.addEventListener('input', () => { dirty = true; statusEl.classList.remove('ok'); refresh(); });
otherEl.addEventListener('input', () => { dirty = true; statusEl.classList.remove('ok'); refresh(); });
document.getElementById('s-other').addEventListener('change', () => setTimeout(() => otherEl.focus(), 0));

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (saveBtn.disabled) return;
  const d = val('dinner');
  const pick = {
    dinner: d,
    time: timeEl.value,
    spot: d === 'takeout' ? spotVal().slice(0, 60) : null,
    note: noteEl.value.trim().slice(0, 300),
    savedAt: new Date().toISOString()
  };
  saving = true; setStatus('Saving...'); refresh();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `Cat picked: ${summary(pick)}`,
        pick: summary(pick),
        start_time: pick.time,
        dinner: NAMES[pick.dinner],
        takeout_spot: pick.spot || '',
        note: pick.note || '',
        saved_at: pick.savedAt
      })
    });
    if (!res.ok) throw new Error('bad status');
    saved = pick; dirty = false; showSaved(pick);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pick)); } catch (e) {}
    saving = false;
    setStatus('Noted, chef! 🎃', 'ok');
  } catch (err) {
    saving = false;
    setStatus("Couldn't save your pick. Check your connection and try again, or just text me.", true);
  }
  refresh();
});

// Remember her pick on this phone so the page shows it when she comes back.
try {
  const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (p && p.dinner) { saved = p; applyToForm(p); showSaved(p); }
} catch (e) {}
refresh();
