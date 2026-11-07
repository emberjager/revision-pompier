/* ---------- Préparation des données ---------- */
const hash = s => { let h=0; for (const c of s) h=(h*31 + c.charCodeAt(0))|0; return (h>>>0).toString(36); };
const ALLQ = Object.entries(QDATA).flatMap(([t,arr]) => arr.map(x => ({...x, t, id:t+"-"+hash(x.q)})));
const ALLF = Object.entries(FDATA).flatMap(([t,arr]) => arr.map(([f,b,opt]) => ({f,b,t,l:opt&&opt.l,id:t+"-"+hash(f)})));

/* ---------- Stockage local ---------- */
const LS = {
  get(k,d){ try{ const v=localStorage.getItem("rsp:"+k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem("rsp:"+k, JSON.stringify(v)); }catch(e){} }
};
const S = {
  obj: LS.get("obj","fi"),
  themes: LS.get("themes", Object.keys(TH)),
  qp: LS.get("qp",{}),   // progression QCM : id -> {ok, n, c}
  fp: LS.get("fp",{}),   // cartes : id -> true (maîtrisée)
  cp: LS.get("cp",{}),   // cas : id -> meilleur score
  fs: LS.get("fs",{}),   // cartes, répétition espacée : id -> {box, due, n}
  days: LS.get("days",{}), // activité : "AAAA-MM-JJ" -> nombre de réponses
  goal: LS.get("goal",20), // objectif du jour (réponses)
  ex: LS.get("ex",[]),   // examens blancs : [{d, n, ok, note, min, used}]
  qcm: LS.get("qcm",{n:10, mode:"all", off:[]}), // derniers réglages du QCM
  presets: LS.get("presets",[]), // favoris de réglages : [{name, themes, n, mode, off}]
  last: LS.get("last",null),     // dernier quiz lancé depuis les réglages ou un favori
  concours: LS.get("concours",""), // date du concours "AAAA-MM-JJ"
  fav: LS.get("fav",{}),  // questions favorites : id -> date d'ajout (> 0) ou de retrait (< 0), pour fusionner entre appareils
  sd: LS.get("sd",{}),    // mort subite : clé de thèmes -> record
  lb: LS.get("lb",0),     // classement du CIS : date d'inscription (> 0) ou de départ (< 0)
  oral: LS.get("oral",[]), // oraux d'entraînement : [{at, k, q, sc:[5 notes sur 4], note, dur}]
  oralT: LS.get("oralT",null), // durées du chrono de l'oral {prep, talk} en minutes
  mine: LS.get("mine",{}), // mes questions : id -> {t, q, o, e, src, at, del?}
  mineT: LS.get("mineT","suap"), // dernier thème choisi pour une nouvelle question
  rep: LS.get("rep",[])   // signalements (gardés sur l'appareil seulement) : [{id, t, q, kind, note, at}]
};
const isFav = id => (S.fav[id]||0) > 0;
// Thèmes ajoutés depuis la dernière visite : cochés d'office (OLD_TH = thèmes de la V1).
const OLD_TH = ["suap","inc","div","sr","fdf","cult","com"];
const withNewThemes = (themes, known) => [...themes, ...Object.keys(TH).filter(t => !known.includes(t) && !themes.includes(t))];
S.themes = withNewThemes(S.themes, LS.get("thk", OLD_TH)); LS.set("thk", Object.keys(TH));
const KEYS = ["obj","themes","qp","fp","cp","fs","days","goal","ex","qcm","presets","last","concours","fav","sd","rep","lb","mine","mineT","oral","oralT"];
const save = () => { KEYS.forEach(k => LS.set(k, S[k])); if (window.onLocalSave) window.onLocalSave(); motivCheck(); renderStreak(); };

/* ---------- Répétition espacée et activité du jour ----------
   Boîtes de Leitner : réussite = boîte suivante, revue dans 1, 3, 7, 14 puis 30 jours ; erreur = retour en boîte 0, revue le lendemain. */
const pad = n => String(n).padStart(2,"0");
const dayKey = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today = () => dayKey(new Date());
const addDays = (k,n) => { const d = new Date(k+"T12:00:00"); d.setDate(d.getDate()+n); return dayKey(d); };
const INTERVALS = [0,1,3,7,14,30];
const MASTER = 3; // boîte à partir de laquelle une question est « maîtrisée »
const boxOf = p => p ? (p.box ?? (p.ok ? 1 : 0)) : 0;
const isDue = p => !!p && (p.due || today()) <= today();
/* Concours fixé : les délais se resserrent (au plus un tiers du temps restant) pour que tout soit revu avant la date. */
function capDays(d){ const dl = daysLeft(); if(dl===null || dl<=1) return d; return Math.max(1, Math.min(d, Math.ceil(dl/3), dl-1)); }
function sched(p, ok){ const box = ok ? Math.min(boxOf(p)+1, 5) : 0; return {box, due: addDays(today(), ok ? capDays(INTERVALS[box]) : 1)}; }
function tick(k=1){ const d = today(); S.days[d] = (S.days[d]||0) + k; }
function recordQ(q, ok){
  const p = S.qp[q.id] || {n:0, c:0};
  S.qp[q.id] = {ok, n:p.n+1, c:p.c+(ok?1:0), ...sched(p, ok)}; tick();
}
/* Bonne réponse donnée en hésitant : la question reste dans sa boîte et revient plus tôt. */
function schedHesitant(prev){ const box = boxOf(prev); return {box, due: addDays(today(), capDays(Math.max(1, INTERVALS[box])))}; }
const fmtDay = k => new Date(k+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long", day:"numeric", month:"long"});
function inDays(k){ const n = Math.round((new Date(k+"T12:00:00") - new Date(today()+"T12:00:00"))/864e5); return n<=0 ? "aujourd'hui" : n===1 ? "demain" : `dans ${n} jours`; }
function streak(){
  let d = today(), n = 0;
  if((S.days[d]||0) < S.goal) d = addDays(d,-1); // la série tient encore tant que la journée n'est pas finie
  while((S.days[d]||0) >= S.goal){ n++; d = addDays(d,-1); }
  return n;
}

const lvOk = x => S.obj==="tous" || !x.l || x.l.split(" ").includes(S.obj);
const visQ = () => ALLQ.filter(lvOk);
const visF = () => ALLF.filter(lvOk);
const themesForLevel = () => Object.keys(TH).filter(t => visQ().some(q=>q.t===t));
const activeThemes = () => { const avail = themesForLevel(); const sel = S.themes.filter(t=>avail.includes(t)); return sel.length?sel:avail; };
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const $ = s => document.querySelector(s);
const badge = t => `<span class="code">${TH[t].k}</span>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const svg = (p, s=22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  accueil: svg('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  qcm: svg('<path d="M10 6h11M10 12h11M10 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>'),
  cartes: svg('<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>'),
  plus: svg('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  star: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', 20),
  redo: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>', 20),
  auto: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
  light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  dark: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')
};

/* ---------- Thème clair / sombre (réglage propre à l'appareil, non synchronisé) ---------- */
const THEMES = {auto:"Auto", light:"Clair", dark:"Sombre"};
let theme = LS.get("theme","auto");
function applyTheme(){
  const r = document.documentElement;
  if(theme==="auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", theme);
  const b = $("#theme-btn"); if(b){ b.innerHTML = ICON[theme]; b.title = "Thème : "+THEMES[theme]+" (toucher pour changer)"; b.setAttribute("aria-label", b.title); }
}
function setTheme(t){ theme = THEMES[t] ? t : "auto"; LS.set("theme", theme); applyTheme(); }
$("#theme-btn").addEventListener("click", () => { setTheme({auto:"light", light:"dark", dark:"auto"}[theme]); if(route()==="reglages") render(); });

/* ---------- En-tête : objectif et onglets ---------- */
function renderObj(){
  $("#obj").innerHTML = Object.entries(LV).map(([k,v]) => `<button type="button" id="obj-${k}" data-obj="${k}" aria-pressed="${S.obj===k}">${v}</button>`).join("");
}
$("#obj").addEventListener("click", e => {
  const b = e.target.closest("button[data-obj]"); if(!b) return;
  S.obj = b.dataset.obj; save(); renderObj(); quiz=null; deck=null; casRun=null; render();
});
const ROUTES = {accueil:"Accueil", niveau:"Mon niveau", qcm:"QCM", cartes:"Cartes", fiches:"Fiches", cas:"Cas pratiques", examen:"Examen blanc", oral:"Oral", reglages:"Réglages", signalements:"Mes signalements"};
function route(){ const h=location.hash.slice(1); return ROUTES[h]?h:"accueil"; }
const go = r => { if(route()===r) render(); else location.hash = r; };
/* Navigation : onglets en haut sur PC ; sur téléphone, barre flottante en bas + bouton rond « Lancer » */
const BAR = ["accueil","qcm","cartes"];
let moreOpen = false;
const quizRunning = () => !!(quiz && !quiz.empty && quiz.i < quiz.items.length);
function renderTabs(){
  const r = route();
  $("#tabs").innerHTML = Object.entries(ROUTES).filter(([k])=>k!=="reglages"&&k!=="signalements"&&k!=="mesq").map(([k,v]) => `<a href="#${k}" ${r===k?'aria-current="page"':''}>${v}</a>`).join("");
  const more = Object.keys(ROUTES).filter(k=>!BAR.includes(k) && (k!=="signalements" || S.rep.length));
  const cur = k => r===k ? 'aria-current="page"' : "";
  $("#bnav").innerHTML = `<div class="more" id="more" ${moreOpen?"":"hidden"}>${more.map(k=>`<a href="#${k}" ${cur(k)}>${ROUTES[k]}</a>`).join("")}</div>
    <div class="bnav-bar">${BAR.map(k=>`<a href="#${k}" ${cur(k)}>${ICON[k]}<span>${k==="accueil"?"Accueil":ROUTES[k]}</span></a>`).join("")}<button type="button" id="more-btn" aria-expanded="${moreOpen}" aria-controls="more" ${more.includes(r)?'aria-current="page"':""}>${ICON.plus}<span>Plus</span></button></div>
    <button type="button" class="fab" id="fab">${ICON.play}<span>${quizRunning()?"Continuer":"Lancer"}</span></button>`;
}
function launchDay(){
  if(quizRunning()){ go("qcm"); return; }
  const p = dayPlan();
  if(p.n) startQuiz(themesForLevel(), p.n, "day"); else startQuiz(themesForLevel(), 10, "all");
  go("qcm");
}
$("#bnav").addEventListener("click", e => {
  e.stopPropagation();
  if(e.target.closest("#more-btn")){ moreOpen = !moreOpen; renderTabs(); return; }
  if(e.target.closest("#fab")){ moreOpen = false; launchDay(); return; }
  // Ne pas redessiner ici : un lien retiré de la page pendant le clic ne navigue plus.
  if(e.target.closest("a")){ moreOpen = false; $("#more").hidden = true; $("#more-btn").setAttribute("aria-expanded","false"); }
});
document.addEventListener("click", () => { if(moreOpen){ moreOpen = false; renderTabs(); } });
document.addEventListener("keydown", e => { if(e.key==="Escape" && moreOpen){ moreOpen = false; renderTabs(); } });

function themeChips(){
  const act = activeThemes();
  return `<div class="chips" id="tchips">${themesForLevel().map(t => `<button type="button" class="chip" data-t="${t}" aria-pressed="${act.includes(t)}">${badge(t)} ${TH[t].n}</button>`).join("")}</div>`;
}
function bindChips(after){
  const box = $("#tchips"); if(!box) return;
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-t]"); if(!b) return;
    let act = activeThemes(); const t=b.dataset.t;
    act = act.includes(t) ? act.filter(x=>x!==t) : [...act,t];
    if(!act.length) return;
    S.themes = act; save(); after();
  });
}

/* ---------- Tableau de bord ---------- */
const dueQ = () => visQ().filter(q => isDue(S.qp[q.id]));
const pct = (a,b) => b ? Math.round(100*a/b) : 0;
function activity(){
  const days = Array.from({length:14}, (_,i) => addDays(today(), i-13));
  const max = Math.max(S.goal, ...days.map(d => S.days[d]||0));
  const jours = ["D","L","M","M","J","V","S"];
  return `<div class="act" role="img" aria-label="Réponses données sur les 14 derniers jours">${days.map(d => {
    const v = S.days[d]||0, wd = new Date(d+"T12:00:00").getDay();
    return `<div class="act-col" title="${new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} : ${v} réponse${v>1?"s":""}"><div class="act-bar"><i class="${v>=S.goal?"hit":""}" style="height:${v?Math.max(4,pct(v,max)):0}%"></i><b style="bottom:${pct(S.goal,max)}%"></b></div><span${d===today()?' class="now"':""}>${jours[wd]}</span></div>`;
  }).join("")}</div>`;
}
/* Session du jour : questions à revoir d'abord, complétées par des nouvelles ; 10 à 20 questions selon ce qui reste de l'objectif. */
/* Avec une date de concours : assez de nouvelles questions chaque jour pour avoir tout vu une semaine avant (40 questions au plus). */
function dayPlan(){
  const qs = visQ(), done = S.days[today()]||0, dl = daysLeft();
  const due = qs.filter(q=>isDue(S.qp[q.id])).length, fresh = qs.filter(q=>!S.qp[q.id]).length;
  const base = Math.max(10, Math.min(20, S.goal - done));
  const need = dl>0 && fresh ? Math.min(fresh, Math.ceil(fresh / Math.max(1, dl-7))) : 0;
  const n = Math.min(Math.max(base, Math.min(40, Math.min(due, base) + need)), due + fresh);
  const nf = Math.min(fresh, n - Math.min(due, need ? base : n, n));
  return {n, due:n-nf, fresh:nf, need, min:Math.max(1, Math.round(n*0.5))};
}
const daysLeft = () => S.concours ? Math.round((new Date(S.concours+"T12:00:00") - new Date(today()+"T12:00:00"))/864e5) : null;
const MODES = {all:"toutes", due:"à revoir", new:"jamais vues", err:"mes erreurs", fav:"mes favoris", mine:"mes questions", sd:"mort subite", weak:"points faibles"};
function cfgName(c){
  const all = themesForLevel(), th = (c.themes||[]).filter(t=>TH[t]);
  const t = !th.length || all.every(x=>th.includes(x)) ? "Tous thèmes" : th.map(x=>TH[x].k).join(" + ");
  const off = (c.off||[]).length;
  return t + (c.mode==="sd" ? "" : " · " + (c.n===999 ? "toutes les questions" : c.n+" q")) + (c.mode && c.mode!=="all" ? " · "+MODES[c.mode] : "") + (c.t ? ` · ${c.t} s/q` : "") + (off ? ` · ${off} réf. exclu${off>1?"s":""}` : "");
}
/* Lance un quiz avec des réglages enregistrés (dernier quiz ou favori) */
function launch(c){
  if(!c) return;
  const avail = themesForLevel(); let th = (c.themes||[]).filter(t=>avail.includes(t)); if(!th.length) th = avail;
  S.last = {themes:th, n:c.n, mode:c.mode, off:[...(c.off||[])], t:c.t||0, fmt:c.fmt||"mix", at:Date.now()}; save();
  startQuiz(th, c.n, c.mode, c.off, c.t, c.fmt); go("qcm");
}
/* Sessions interrompues (quiz, examen, cartes, cas) à continuer */
function runsHtml(){
  const l = [];
  if(quizRunning()) l.push(["qcm","Quiz en cours",`question ${quiz.i+1} / ${quiz.items.length} · ${quiz.score} juste${quiz.score>1?"s":""}`]);
  if(exam && !exam.done) l.push(["examen","Examen blanc en cours",`${exam.items.filter(x=>x.a!==null).length} / ${exam.items.length} répondues · ${fmtTime(exam.end-Date.now())} restantes`]);
  if(deck && deck.i < deck.items.length) l.push(["cartes","Cartes en cours",`carte ${deck.i+1} / ${deck.items.length}`]);
  if(casRun && casRun.i < casRun.c.steps.length) l.push(["cas","Cas pratique en cours",`${casRun.c.n} · étape ${casRun.i+1} / ${casRun.c.steps.length}`]);
  return l.map(([r,t,s])=>`<a class="resume" href="#${r}"><span><b>${t}</b><small>${s}</small></span><span class="btn">Continuer</span></a>`).join("");
}
function vAccueil(){
  const qs = visQ(), fs = visF();
  const mastered = qs.filter(q=>boxOf(S.qp[q.id])>=MASTER).length;
  const known = fs.filter(f=>S.fp[f.id]).length;
  const cases = CAS.filter(lvOk); const doneC = cases.filter(c=>S.cp[c.id]!=null).length;
  const errs = qs.filter(q=>S.qp[q.id]&&!S.qp[q.id].ok).length, nFav = qs.filter(q=>isFav(q.id)).length;
  const dueCards = fs.filter(f=>isDue(S.fs[f.id])).length;
  const done = S.days[today()]||0, st = streak();
  const lastEx = S.ex[S.ex.length-1];
  const p = dayPlan(), dl = daysLeft();
  const jx = dl===null ? `<a class="jx add" href="#reglages">+ date du concours</a>` : dl>0 ? `<span class="jx" title="Jours avant le concours">J-${dl}</span>` : dl===0 ? `<span class="jx">Jour J</span>` : "";
  const rows = themesForLevel().map(t => {
    const tq = qs.filter(q=>q.t===t);
    const m = tq.filter(q=>boxOf(S.qp[q.id])>=MASTER).length;
    const prog = tq.filter(q=>S.qp[q.id] && boxOf(S.qp[q.id])<MASTER).length;
    let n = 0, c = 0; tq.forEach(q => { const p=S.qp[q.id]; if(p){ n+=p.n; c+=p.c; } });
    const td = tq.filter(q=>isDue(S.qp[q.id])).length;
    return `<div class="trow"><div class="name">${badge(t)}<div>${TH[t].n}<small>${m} / ${tq.length} maîtrisées${n?` · ${pct(c,n)} % de bonnes réponses`:""}${td?` · <b class="due">${td} à revoir</b>`:""}</small></div></div><div class="bar duo" title="${m} maîtrisées, ${prog} en cours"><i style="width:${pct(m,tq.length)}%"></i><i class="mid" style="width:${pct(prog,tq.length)}%"></i></div><button type="button" class="btn" data-quiz="${t}">Quiz</button></div>`;
  }).join("");
  const quick = (S.last ? `<button type="button" class="qbtn" data-last><span class="qi">${ICON.redo}</span><span><b>Relancer le dernier quiz</b><small>${esc(cfgName(S.last))}</small></span></button>` : "")
    + S.presets.map((f,i)=>`<button type="button" class="qbtn" data-p="${i}"><span class="qi">${ICON.star}</span><span><b>${esc(f.name)}</b>${f.name!==cfgName(f)?`<small>${esc(cfgName(f))}</small>`:""}</span></button>`).join("");
  return `
  <section class="panel daycard">
    <div class="day-top"><span class="label">Session du jour · ${LV[S.obj]}</span>${jx}</div>
    ${p.n ? `<div><div class="day-n num">${p.n}<span> questions</span></div>
      <p class="day-mix">${p.due?`<b class="due">${p.due} à revoir</b>`:"0 à revoir"} · ${p.fresh} nouvelle${p.fresh>1?"s":""} · ≈ ${p.min} min</p>${p.need?`<p class="muted" style="font-size:.85rem">Pour tout voir une semaine avant le concours : ${p.need} nouvelle${p.need>1?"s":""} par jour.</p>`:""}</div>
      <button type="button" class="btn primary big" data-quiz="day">Commencer</button>`
    : `<p class="lead">Tout est à jour : rien à revoir aujourd'hui et toutes les questions ont été vues. Fais un quiz rapide ou un examen blanc.</p>
      <button type="button" class="btn primary big" data-quiz="mix">Quiz rapide · 10 questions</button>`}
    <div class="day-foot">
      <div class="day-goal"><span class="muted"><b class="num">${done}</b> / ${S.goal} réponses aujourd'hui${done>=S.goal?" · objectif atteint":""}</span><div class="progress big"><i style="width:${Math.min(100,pct(done,S.goal))}%"></i></div></div>
      <div class="streak ${st?"on":""}" title="Jours consécutifs avec l'objectif atteint"><b class="num">${st}</b><span>jour${st>1?"s":""} de série${bestStreak()>st?` · record ${bestStreak()}`:""}</span></div>
    </div>
    ${dueCards?`<div><button type="button" class="btn" id="go-cards">Cartes à revoir (${dueCards})</button></div>`:""}
  </section>
  ${runsHtml()}
  <div class="motiv">${gradeCard()}${prepMini()}</div>
  ${quick?`<section class="quick"><span class="label">Lancer vite</span><div class="qlist">${quick}</div></section>`:""}
  <div class="stats">
    <div class="stat"><b class="num">${mastered}<span style="font-size:1rem"> / ${qs.length}</span></b><span>questions maîtrisées</span></div>
    <div class="stat"><b class="num">${known}<span style="font-size:1rem"> / ${fs.length}</span></b><span>cartes connues</span></div>
    <div class="stat"><b class="num">${doneC}<span style="font-size:1rem"> / ${cases.length}</span></b><span>cas pratiques faits</span></div>
    <div class="stat"><b class="num">${lastEx?String(lastEx.note).replace(".",","):"–"}<span style="font-size:1rem"> / 20</span></b><span>dernier examen blanc</span></div>
  </div>
  <div class="row">
    <button type="button" class="btn" data-quiz="mix">Quiz rapide · 10 questions</button>
    <button type="button" class="btn" data-quiz="err" ${errs?"":"disabled"}>Revoir mes erreurs (${errs})</button>
    <button type="button" class="btn" data-quiz="fav" ${nFav?"":"disabled"}>★ Mes favoris (${nFav})</button>
    <a class="btn" href="#examen">Examen blanc</a>
  </div>
  <section style="display:grid;gap:10px"><h3>Par thème</h3>
    <p class="muted" style="font-size:.9rem">Une question est maîtrisée quand tu l'as réussie ${MASTER} fois de suite, à quelques jours d'écart.</p>
    <details class="fiche corr"><summary>Comment marche la révision espacée ?</summary>
      <p>Chaque question est rangée dans une boîte, de 0 à 5. Une bonne réponse la fait monter d'une boîte, une erreur la renvoie en boîte 0.</p>
      <p>Plus la boîte est haute, plus la question revient tard : demain (boîte 0 ou 1), puis dans 3, 7, 14 et 30 jours. Une bonne réponse donnée en hésitant laisse la question dans sa boîte et la fait revenir plus tôt.</p>
      <p>La session du jour reprend d'abord les questions arrivées à leur date (les plus en retard en premier), puis ajoute des nouvelles. Avec une date de concours, les délais sont raccourcis (jamais plus d'un tiers du temps restant) pour que tout soit revu avant le jour J. Aujourd'hui : <b>${dueQ().length} à revoir</b>.</p></details>
    <div class="legend muted"><span><i class="sw ok"></i>maîtrisées</span><span><i class="sw mid"></i>en cours</span></div>
    <div class="themes">${rows}</div></section>
  <section style="display:grid;gap:10px"><h3>14 derniers jours</h3>
    <div class="panel">${activity()}<p class="muted" style="font-size:.85rem">Le trait marque ton objectif du jour (${S.goal} réponses). Les jours où il est atteint sont en vert.</p></div></section>`;
}
function bindAccueil(){
  document.querySelectorAll("[data-quiz]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.quiz;
    if(k==="mix") startQuiz(activeThemes(),10,"all");
    else if(k==="day") startQuiz(themesForLevel(), dayPlan().n, "day");
    else if(k==="err") startQuiz(themesForLevel(),999,"err");
    else if(k==="fav") startQuiz(themesForLevel(),999,"fav");
    else startQuiz([k],10,"all");
    go("qcm");
  }));
  const gc = $("#go-cards"); if(gc) gc.onclick = () => { cardMode="todo"; startDeck(); go("cartes"); };
  const lb = document.querySelector("[data-last]"); if(lb) lb.onclick = () => launch(S.last);
  document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => launch(S.presets[+b.dataset.p]));
}

/* ---------- Mon niveau : score de préparation, points faibles, plan semaine par semaine, examens blancs ---------- */
const mastery = p => Math.min(boxOf(p), MASTER) / MASTER;
function scoreOf(qs){
  let m = 0, seen = 0;
  qs.forEach(q => { const p = S.qp[q.id]; if(p){ seen++; m += mastery(p); } });
  const n = qs.length; m = n ? m/n : 0; const c = n ? seen/n : 0;
  return {n, seen, m, c, s: Math.round(100*(0.75*m + 0.25*c))};
}
/* Score global : maîtrise 60 %, couverture 20 %, moyenne des 3 derniers examens blancs 20 % (sans examen : 75 % / 25 %). */
function readiness(){
  const qs = visQ(), all = scoreOf(qs), ex = S.ex.slice(-3);
  const e = ex.length ? ex.reduce((a,x)=>a+x.note, 0) / ex.length / 20 : null;
  const s = Math.round(100*(e===null ? 0.75*all.m + 0.25*all.c : 0.6*all.m + 0.2*all.c + 0.2*e));
  return {...all, s, e, nex:ex.length, themes: themesForLevel().map(t => ({t, ...scoreOf(qs.filter(q=>q.t===t))}))};
}
const gauge = (p, cls="") => `<div class="gauge ${cls}" style="--p:${p}" role="img" aria-label="${p} % prêt"><b class="num">${p}<small> %</small></b></div>`;
/* Points faibles : thèmes et référentiels sous 80 % de bonnes réponses (au moins 5 réponses données) */
function weakPoints(){
  const groups = {}, tq = {}, srcN = {};
  visQ().forEach(q => {
    const sk = srcKey(q);
    tq[q.t] = (tq[q.t]||0) + 1; srcN[sk] = (srcN[sk]||0) + 1;
    const p = S.qp[q.id]; if(!p) return;
    for(const k of [q.t, sk]){ const g = groups[k] || (groups[k] = {k, n:0, c:0, q:0}); g.n += p.n; g.c += p.c; g.q++; }
  });
  return Object.values(groups)
    .filter(g => g.n >= 5 && !g.k.endsWith("|"+NOSRC))
    .filter(g => !g.k.includes("|") || (srcN[g.k] < tq[g.k.split("|")[0]] && groups[g.k.split("|")[0]].n > g.n)) // même chiffres que le thème = doublon
    .map(g => ({...g, r: g.c/g.n})).filter(g => g.r < 0.8)
    .sort((a,b) => a.r - b.r).slice(0, 6);
}
function workOn(k){
  if(!k.includes("|")){ startQuiz([k], 10, "weak"); go("qcm"); return; }
  const t = k.split("|")[0];
  const off = [...new Set(visQ().filter(q=>q.t===t).map(srcKey))].filter(x => x !== k);
  startQuiz([t], 10, "weak", off); go("qcm");
}
/* Plan semaine par semaine jusqu'au concours, recalculé à chaque visite */
const dayDiff = (a,b) => Math.round((new Date(b+"T12:00:00") - new Date(a+"T12:00:00"))/864e5);
const mondayOf = k => addDays(k, -((new Date(k+"T12:00:00").getDay()+6)%7));
const shortDay = k => new Date(k+"T12:00:00").toLocaleDateString("fr-FR", {day:"numeric", month:"short"});
function weekPlan(){
  const dl = daysLeft(); if(dl===null || dl<1) return null;
  const r = readiness(), order = r.themes.filter(t=>t.n).sort((a,b)=>a.s-b.s).map(t=>t.t);
  const unseen = r.n - r.seen, last = addDays(S.concours, -1), mon = mondayOf(today());
  const perDay = unseen ? Math.ceil(unseen / Math.max(1, dl - 7)) : 0; // tout découvrir une semaine avant
  const weeks = []; let left = unseen;
  for(let i = 0; i < 80; i++){
    const ws = addDays(mon, 7*i); if(ws > last) break;
    const from = i ? ws : today(), to = addDays(ws, 6) < last ? addDays(ws, 6) : last;
    const days = dayDiff(from, to) + 1, final = dayDiff(from, S.concours) <= 7;
    const newQ = final ? 0 : Math.min(left, perDay * days); left -= newQ;
    const exams = final ? 1 : dayDiff(from, S.concours) > 56 ? 1 : 2;
    const focus = [...new Set(order.length ? [order[(2*i) % order.length], order[(2*i+1) % order.length]] : [])];
    weeks.push({i, from, to, days, final, newQ, exams, focus});
  }
  const ansWeek = Object.entries(S.days).filter(([d]) => d >= mon).reduce((a,[,v])=>a+v, 0);
  const exWeek = S.ex.filter(e => dayKey(new Date(e.d)) >= mon).length;
  return {weeks, ansWeek, exWeek, target: S.goal*7};
}
/* Courbe des notes aux examens blancs : une seule série, donc pas de légende ; survol par point ; le tableau est l'historique de #examen */
function examChart(){
  const ex = S.ex.slice(-20);
  if(ex.length < 2) return `<p class="muted">La courbe apparaît après 2 examens blancs${ex.length?" (1 passé pour l'instant)":""}.</p><div><a class="btn" href="#examen">Passer un examen blanc</a></div>`;
  const W = 340, H = 160, L = 28, R = 12, T = 10, B = 24;
  const x = i => L + (W-L-R) * i/(ex.length-1), y = v => T + (H-T-B) * (1 - v/20);
  const dlab = e => new Date(e.d).toLocaleDateString("fr-FR", {day:"numeric", month:"short"});
  const grid = [0,5,10,15,20].map(v => `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="${v===10?"ref":"grid"}"/><text x="${L-7}" y="${y(v)+3.5}" text-anchor="end">${v}</text>`).join("");
  const pts = ex.map((e,i) => [x(i).toFixed(1), y(e.note).toFixed(1)]);
  return `<div class="exchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Notes sur 20 des ${ex.length} derniers examens blancs, de ${noteFr(ex[0].note)} à ${noteFr(ex[ex.length-1].note)}">
    ${grid}
    <polyline points="${pts.map(p=>p.join(",")).join(" ")}" class="line"/>
    ${ex.map((e,i) => `<g class="pt" tabindex="0"><title>${dlab(e)} : ${noteFr(e.note)} / 20 (${e.ok} / ${e.n} bonnes réponses)</title><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="13" class="hit"/><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="4.5" class="dot"/></g>`).join("")}
    <text x="${L}" y="${H-6}">${dlab(ex[0])}</text><text x="${W-R}" y="${H-6}" text-anchor="end">${dlab(ex[ex.length-1])}</text>
  </svg></div><p class="muted" style="font-size:.85rem">Notes sur 20. Le pointillé marque 10 / 20. Survole ou touche un point pour voir la note. La liste complète est dans <a href="#examen">Examen blanc</a>.</p>`;
}
function vNiveau(){
  const r = readiness(), dl = daysLeft(), wp = weekPlan(), weak = weakPoints();
  const pc = v => Math.round(100*v), pl = (n, w) => `${n} ${w}${n>1?"s":""}`, exS = n => `${n} examen${n>1?"s":""} blanc${n>1?"s":""}`;
  const rows = r.themes.filter(t=>t.n).sort((a,b)=>b.s-a.s).map(t => `<div class="tline"><span class="tn">${badge(t.t)} ${TH[t.t].n}</span><div class="bar ${t.s>=70?"ok":""}" title="Maîtrise ${pc(t.m)} %, couverture ${pc(t.c)} %"><i style="width:${t.s}%"></i></div><b class="num">${t.s} %</b></div>`).join("");
  const wkName = k => k.includes("|") ? `${badge(k.split("|")[0])} ${esc(k.slice(k.indexOf("|")+1))}` : `${badge(k)} ${TH[k].n}`;
  const shown = wp ? (wp.weeks.length > 7 ? [...wp.weeks.slice(0,6), wp.weeks[wp.weeks.length-1]] : wp.weeks) : [];
  const week = (w, j) => `
      ${j===6 && wp.weeks.length>7 ? `<p class="muted plan-gap">… ${pl(wp.weeks.length-7, "autre semaine")} sur le même principe …</p>` : ""}
      <div class="panel week ${w.i===0?"now":""}">
        <div class="week-top"><b>${w.i===0?"Cette semaine":w.final?"Dernière semaine":`Semaine ${w.i+1}`}</b><span class="muted num">${shortDay(w.from)} → ${shortDay(w.to)}</span></div>
        ${w.final ? `<p><b>Dernière ligne droite.</b> Pas de nouvelles questions : révisions du jour, tes erreurs et tes favoris. Un dernier examen blanc 2 ou 3 jours avant le concours.</p>`
        : `<ul class="calc">
          ${w.focus.length?`<li>En priorité : ${w.focus.map(t=>`${badge(t)} ${TH[t].n}`).join(" et ")}</li>`:""}
          <li>${w.newQ ? `${w.newQ} nouvelles questions à découvrir (≈ ${Math.ceil(w.newQ/w.days)} par jour)` : "Toutes les questions sont vues : place aux révisions"}</li>
          <li>${exS(w.exams)}</li></ul>`}
        ${w.i===0 ? `<p class="muted" style="font-size:.9rem">Fait : <b class="num">${wp.ansWeek}</b> / ${wp.target} réponses · <b class="num">${wp.exWeek}</b> / ${exS(w.exams)}</p>` : ""}
      </div>`;
  return `<section style="display:grid;gap:8px"><span class="label">Suivi · ${LV[S.obj]}</span><h2>Mon niveau</h2></section>
  <section class="panel prepcard">
    <span class="label">Prêt pour le concours</span>
    ${gauge(r.s)}
    <p class="muted">${dl===null ? `<a href="#reglages">Indique la date du concours</a> pour avoir le plan de révision.` : dl>0 ? `Concours dans ${pl(dl, "jour")}, le ${fmtDay(S.concours)}.` : dl===0 ? "C'est le jour J. Bon courage !" : "La date du concours est passée."}</p>
    <details class="fiche corr"><summary>Comment ce score est calculé</summary>
      <ul class="calc">
        <li><b>Maîtrise ${pc(r.m)} %</b>, compte pour ${r.e===null?"75":"60"} %. Chaque question vaut de 0 (jamais réussie) à 1 (boîte ${MASTER} ou plus).</li>
        <li><b>Couverture ${pc(r.c)} %</b>, compte pour ${r.e===null?"25":"20"} %. ${r.seen} questions vues sur ${r.n}.</li>
        <li><b>Examens blancs ${r.e===null?"–":pc(r.e)+" %"}</b>${r.e===null?" : pas encore d'examen. Ils compteront pour 20 %.":`, compte pour 20 %. Moyenne des ${r.nex>1?r.nex+" derniers":"dernier"}, ramenée sur 100.`}</li>
      </ul>
      <p class="muted">Le score de chaque thème suit la même règle, sans les examens : maîtrise 75 %, couverture 25 %.</p></details>
  </section>
  ${gradeSection()}
  <section style="display:grid;gap:10px"><h3>Par thème</h3><div class="panel tlines">${rows}</div></section>
  <section style="display:grid;gap:10px"><h3>Points faibles</h3>
    ${weak.length ? `<div class="themes weak">${weak.map(g => `<div class="trow"><div class="name"><div>${wkName(g.k)}<small>${pc(g.r)} % de bonnes réponses · ${pl(g.q, "question")} vue${g.q>1?"s":""}</small></div></div><div class="bar"><i style="width:${pc(g.r)}%"></i></div><button type="button" class="btn" data-work="${esc(g.k)}">Travailler ça</button></div>`).join("")}</div>
      <p class="muted" style="font-size:.85rem">Thèmes et référentiels sous 80 % de bonnes réponses, avec au moins 5 réponses données. « Travailler ça » lance 10 questions en commençant par celles que tu rates le plus.</p>`
    : `<p class="muted">Aucun point faible repéré pour l'instant${r.seen<20?" : fais quelques quiz pour que l'appli les trouve":""}.</p>`}
  </section>
  <section style="display:grid;gap:10px"><h3>Plan jusqu'au concours</h3>
    ${!wp ? `<div class="panel"><p class="muted">${dl===null?"Indique la date du concours dans les Réglages : le plan semaine par semaine s'affichera ici.":"Plus de plan : le concours est passé ou c'est aujourd'hui."}</p>${dl===null?`<div><a class="btn" href="#reglages">Indiquer la date</a></div>`:""}</div>`
    : `<div class="plan">${shown.map(week).join("")}</div>
      <p class="muted" style="font-size:.85rem">Le plan se recalcule à chaque visite selon ton score par thème et les questions encore jamais vues. Objectif : tout avoir vu une semaine avant le concours.</p>`}
  </section>
  <section style="display:grid;gap:10px"><h3>Examens blancs</h3><div class="panel">${examChart()}</div></section>`;
}
function bindNiveau(){
  document.querySelectorAll("[data-work]").forEach(b => b.onclick = () => workOn(b.dataset.work));
}
/* Carte compacte de l'accueil */
function prepMini(){
  const r = readiness(), low = r.themes.filter(t=>t.n && t.seen).sort((a,b)=>a.s-b.s)[0];
  return `<a class="panel prepmini" href="#niveau">${gauge(r.s, "sm")}<span><b>Prêt pour le concours</b><small>${low ? `Thème le plus faible : ${TH[low.t].n} (${low.s} %)` : "Fais quelques quiz pour voir ton niveau par thème"}</small></span><span class="go" aria-hidden="true">›</span></a>`;
}

/* ---------- Motivation : grades, série, messages, rappel quotidien ---------- */
/* Grades débloqués avec les points. Écussons stylisés (pas les insignes officiels). */
const GRADES = [
  {n:"Sapeur 2e classe", p:0, k:"sp", c:0}, {n:"Sapeur 1re classe", p:40, k:"chev", c:1},
  {n:"Caporal", p:120, k:"chev", c:2}, {n:"Caporal-chef", p:300, k:"chev", c:3},
  {n:"Sergent", p:600, k:"bar", c:2}, {n:"Sergent-chef", p:1000, k:"bar", c:3},
  {n:"Adjudant", p:1500, k:"adj", c:1}, {n:"Adjudant-chef", p:2100, k:"adj", c:2},
  {n:"Lieutenant", p:2800, k:"off", c:2}, {n:"Capitaine", p:3600, k:"off", c:3},
  {n:"Commandant", p:4600, k:"off", c:4}, {n:"Lieutenant-colonel", p:5800, k:"off", c:5},
  {n:"Colonel", p:7500, k:"off", c:5, star:true}
];
function points(){
  let c = 0, m = 0;
  for(const id in S.qp){ const p = S.qp[id]; c += p.c||0; if(boxOf(p) >= MASTER) m++; }
  const ex = S.ex.reduce((a,e) => a + 10 + (e.note>=10 ? 10 : 0), 0);
  const g = Object.values(S.days).filter(v => v >= S.goal).length;
  return {c, m, ex, g, total: c + 5*m + ex + 5*g};
}
function gradeOf(pts){
  let i = 0; while(i+1 < GRADES.length && pts >= GRADES[i+1].p) i++;
  const g = GRADES[i], next = GRADES[i+1];
  return {i, g, next, left: next ? next.p - pts : 0, pct: next ? Math.round(100*(pts-g.p)/(next.p-g.p)) : 100};
}
function insignia(g, size=60){
  const W = 60, mid = 30; let inner = "";
  const stack = (n, h, gap) => { const tot = n*h + (n-1)*gap, y0 = 34 - tot/2; return Array.from({length:n}, (_,i) => y0 + i*(h+gap)); };
  if(g.k==="sp") inner = `<text x="${mid}" y="40" text-anchor="middle" class="ins-t">SP</text>`;
  if(g.k==="chev") inner = stack(g.c, 7, 4).map(y => `<polyline points="16,${y} ${mid},${y+8} 44,${y}" class="ins-c"/>`).join("");
  if(g.k==="bar") inner = stack(g.c, 5, 4).map(y => `<rect x="15" y="${y}" width="30" height="5" rx="1" class="ins-y"/>`).join("");
  if(g.k==="adj") inner = stack(g.c, 8, 5).map(y => `<rect x="15" y="${y}" width="30" height="8" rx="1" class="ins-w"/><rect x="15" y="${y+3}" width="30" height="2" class="ins-r"/>`).join("");
  if(g.k==="off") inner = stack(g.c, 4, 3).map(y => `<rect x="15" y="${y+(g.star?4:0)}" width="30" height="4" rx="1" class="ins-w"/>`).join("") + (g.star ? `<polygon points="30,9 32,14 37,14 33,17 34.5,22 30,19 25.5,22 27,17 23,14 28,14" class="ins-y"/>` : "");
  return `<svg class="insignia" viewBox="0 0 ${W} 68" width="${size}" height="${Math.round(size*68/60)}" aria-hidden="true"><path d="M30 2 L58 10 V38 C58 52 45 62 30 66 C15 62 2 52 2 38 V10 Z" class="ins-s"/>${inner}</svg>`;
}
function bestStreak(){
  const ok = Object.keys(S.days).filter(d => S.days[d] >= S.goal).sort();
  let best = 0, run = 0, prev = null;
  ok.forEach(d => { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return best;
}
const weekAns = () => { const mon = mondayOf(today()); return Object.entries(S.days).filter(([d]) => d >= mon).reduce((a,[,v]) => a+v, 0); };
function gradeCard(){
  const pt = points(), gr = gradeOf(pt.total);
  return `<a class="panel gradecard" href="#niveau">${insignia(gr.g, 52)}<span class="gc-txt"><b>${gr.g.n}</b>
    ${gr.next ? `<span class="bar"><i style="width:${gr.pct}%"></i></span><small>${gr.pct} % vers ${gr.next.n} · encore ${gr.left} points</small>` : `<small>Plus haut grade atteint · ${pt.total} points</small>`}</span><span class="go" aria-hidden="true">›</span></a>`;
}
function gradeSection(){
  const pt = points(), gr = gradeOf(pt.total);
  return `<section style="display:grid;gap:10px" id="grades"><h3>Grade</h3>
    <div class="panel gradebox">
      <div class="gb-top">${insignia(gr.g, 72)}<div><b class="gb-n">${gr.g.n}</b><span class="muted num">${pt.total} points</span></div></div>
      ${gr.next ? `<div class="bar"><i style="width:${gr.pct}%"></i></div><p class="muted">Encore <b class="num">${gr.left}</b> points pour passer ${gr.next.n}.</p>` : `<p class="muted">Tu as atteint le plus haut grade. Bravo !</p>`}
      <details class="fiche corr"><summary>Comment gagner des points</summary>
        <ul class="calc">
          <li><b>1 point</b> par bonne réponse (QCM, examens) · ${pt.c} pts</li>
          <li><b>5 points</b> par question maîtrisée (boîte ${MASTER} ou plus) · ${pt.m} × 5 = ${5*pt.m} pts</li>
          <li><b>10 points</b> par examen blanc, <b>+10</b> s'il est réussi (10 / 20 ou plus) · ${pt.ex} pts</li>
          <li><b>5 points</b> par jour où l'objectif est atteint · ${pt.g} × 5 = ${5*pt.g} pts</li>
        </ul>
        <div class="ladder">${GRADES.map((g,i) => `<div class="step ${i<gr.i?"done":i===gr.i?"on":"lock"}">${insignia(g, 22)}<span>${g.n}</span><span class="muted num">${g.p} pts</span></div>`).join("")}</div>
        <p class="muted" style="padding:0 14px 14px;margin:0">Écussons stylisés, ce ne sont pas les insignes officiels.</p></details>
    </div></section>`;
}
/* Pastille de l'en-tête : série + avancement de l'objectif du jour, visible sur toutes les pages */
function renderStreak(){
  const el = $("#spill"); if(!el) return;
  const st = streak(), done = S.days[today()]||0, p = Math.min(100, pct(done, S.goal));
  el.className = "hbtn spill" + (done >= S.goal ? " ok" : "");
  el.title = `Série : ${st} jour${st>1?"s":""} · ${done} / ${S.goal} réponses aujourd'hui`;
  el.setAttribute("aria-label", el.title);
  el.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" fill="currentColor"/></svg><b class="num">${st}</b><i style="width:${p}%"></i>`;
}
/* Messages : objectif du jour atteint, nouveau grade */
let toastTimer = null;
function toast(html){
  let t = $("#toast"); if(!t){ t = document.createElement("div"); t.id = "toast"; t.setAttribute("role","status"); document.body.appendChild(t); }
  t.innerHTML = html.startsWith("<svg") ? html : `<span>${html}</span>`; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 5000);
}
function motivCheck(){
  const d = today(), done = S.days[d]||0;
  if(done >= S.goal && LS.get("goalday","") !== d){
    if(done - S.goal < 5){ const st = streak(); toast(`<b>Objectif du jour atteint !</b> Série : ${st} jour${st>1?"s":""}.`); }
    LS.set("goalday", d);
  }
  const gi = gradeOf(points().total).i, was = LS.get("grade", null);
  if(was !== null && gi > was) toast(`${insignia(GRADES[gi], 34)}<span><b>Nouveau grade : ${GRADES[gi].n} !</b><br>Continue comme ça.</span>`);
  if(was !== gi) LS.set("grade", gi);
  remindSave();
}
/* Rappel quotidien : l'appli range dans un cache ce que le service worker doit savoir, et lui demande
   une synchro périodique (Chrome Android, appli installée). Le navigateur choisit l'heure exacte. */
const canNotify = () => "Notification" in window && "serviceWorker" in navigator;
const canPeriodic = () => "serviceWorker" in navigator && "periodicSync" in (window.ServiceWorkerRegistration ? ServiceWorkerRegistration.prototype : {});
let remindLast = "";
function remindSave(){
  if(!LS.get("remind", false) || !("caches" in window)) return;
  const due = {}; visQ().forEach(q => { const p = S.qp[q.id]; if(p && p.due) due[p.due] = (due[p.due]||0) + 1; });
  const st = {hour: LS.get("remindh", 18), goal: S.goal, days: {[today()]: S.days[today()]||0}, due};
  const js = JSON.stringify(st); if(js === remindLast) return; remindLast = js;
  caches.open("rsp-state").then(c => c.match("state").then(r => r ? r.json() : {}).then(old => c.put("state", new Response(JSON.stringify({...st, notified: old.notified||""}))))).catch(()=>{});
}
async function remindOn(){
  if(!canNotify()) return "Ce navigateur ne gère pas les notifications.";
  const perm = await Notification.requestPermission();
  if(perm !== "granted") return "Notifications refusées. Tu peux les autoriser dans les réglages du navigateur pour ce site.";
  LS.set("remind", true); remindLast = ""; remindSave();
  if(!canPeriodic()) return "";
  try {
    const reg = await navigator.serviceWorker.ready;
    const st = await navigator.permissions.query({name:"periodic-background-sync"}).catch(() => ({state:"granted"}));
    if(st.state !== "granted") return "Le navigateur refuse les rappels en arrière-plan : installe l'appli sur l'écran d'accueil puis réessaie.";
    await reg.periodicSync.register("rsp-rappel", {minInterval: 12*3600*1000});
  } catch(e){ return "Rappel non programmé : " + e.message; }
  return "";
}
async function remindOff(){
  LS.set("remind", false);
  try { const reg = await navigator.serviceWorker.ready; if(reg.periodicSync) await reg.periodicSync.unregister("rsp-rappel"); } catch(e){}
}
async function remindTest(){
  try {
    const reg = await navigator.serviceWorker.ready;
    const due = dueQ().length;
    await reg.showNotification("Révisions SP", {body: due ? `${due} question${due>1?"s":""} à revoir aujourd'hui.` : `Objectif du jour : ${S.goal} réponses.`, icon:"icons/icon.svg", tag:"rsp-test"});
    return "";
  } catch(e){ return "Notification impossible : " + e.message; }
}
let remindMsg = "";
function remindPanel(){
  const on = LS.get("remind", false), h = LS.get("remindh", 18);
  const support = !canNotify() ? "no" : canPeriodic() ? "full" : "open";
  return `<section class="panel"><h3>Rappel quotidien</h3>
    <p class="muted">Une notification « N questions à revoir » si tu n'as pas encore fait ton objectif du jour.</p>
    ${support==="no" ? `<p class="muted">Ce navigateur ne gère pas les notifications.</p>` : `
    <div class="row"><button type="button" class="btn ${on?"":"primary"}" id="rem-tg" aria-pressed="${on}">${on?"Désactiver le rappel":"Activer le rappel"}</button>${on?`<button type="button" class="btn" id="rem-test">Tester</button>`:""}</div>
    ${on ? `<span class="label">À partir de</span><div class="chips" id="rem-h">${[8,12,18,20].map(x=>`<button type="button" class="chip" data-h="${x}" aria-pressed="${h===x}">${x} h</button>`).join("")}</div>` : ""}`}
    <p class="muted" style="font-size:.85rem">${support==="full" ? "Fonctionne quand l'appli est installée sur l'écran d'accueil (Chrome sur Android). Le téléphone choisit le moment exact, après l'heure indiquée, une fois par jour au plus."
      : "Sur ce navigateur, le rappel n'arrive pas quand l'appli est fermée : c'est possible seulement avec Chrome sur Android, appli installée. Sur iPhone, il faudrait un serveur d'envoi (pas encore en place)."}</p>
    ${remindMsg ? `<p class="explain no">${esc(remindMsg)}</p>` : ""}</section>`;
}
function bindRemind(){
  const tg = $("#rem-tg"); if(tg) tg.onclick = async () => { remindMsg = LS.get("remind", false) ? (await remindOff(), "") : await remindOn(); render(); };
  const te = $("#rem-test"); if(te) te.onclick = async () => { remindMsg = await remindTest(); if(remindMsg) render(); };
  const hh = $("#rem-h"); if(hh) hh.onclick = e => { const b = e.target.closest("[data-h]"); if(b){ LS.set("remindh", +b.dataset.h); remindLast = ""; remindSave(); render(); } };
}

/* ---------- Oral : question de jury, chrono, méthode, auto-évaluation ---------- */
// Pas de durée officielle codée en dur : le candidat règle le chrono d'après le règlement de son concours.
const ORAL = {
  pres:{n:"Ma présentation", q:["Présentez-vous au jury.","Résumez votre parcours en quelques minutes.","Qu'est-ce qui, dans votre parcours, vous prépare au métier de sapeur-pompier professionnel ?","Quelles sont vos qualités et vos points à améliorer ?"],
    m:"Plan annoncé dès la première phrase : qui tu es, ton parcours (études, emplois, engagement SPV, formations), tes points forts avec un exemple chacun, ton projet. Regarde le jury, ne récite pas un texte appris par cœur, finis à l'heure."},
  motiv:{n:"Motivation et parcours", q:["Pourquoi voulez-vous devenir sapeur-pompier professionnel ?","Qu'est-ce que votre engagement de volontaire vous a apporté ?","Pourquoi passer professionnel plutôt que rester volontaire ?","Racontez une intervention qui vous a marqué et ce que vous en avez retiré.","Où vous voyez-vous dans dix ans ?","Seriez-vous prêt à être affecté loin de chez vous ?","Que faites-vous si vous n'êtes pas reçu cette année ?"],
    m:"Fil conducteur : le déclic, ton engagement, ce que tu as appris, pourquoi maintenant, ce que tu apportes. Appuie-toi sur des faits vécus (sans nom ni détail médical de victime). Termine sur ton projet."},
  metier:{n:"Le métier et les missions", q:["Quelles sont les missions des services d'incendie et de secours ?","Quel est le rôle d'un caporal ?","Quelle différence faites-vous entre un équipier et un chef d'équipe ?","Comment voyez-vous l'évolution du secours d'urgence aux personnes ?","Quelles sont les spécificités des feux de forêt dans le Var ?","Que pensez-vous de la place des volontaires dans le modèle français ?","Comment se déroule une garde dans votre centre ?"],
    m:"Annonce deux ou trois parties. Cite la base (missions des SDIS : article L1424-2 du code général des collectivités territoriales), puis illustre avec ton vécu au CIS. Montre que tu connais ton rôle et ses limites. Vérifie tes chiffres (interventions, effectifs) dans tes documents avant l'oral."},
  orga:{n:"Organisation et institutions", q:["Comment est organisé votre SDIS ?","Qui dirige les opérations de secours ?","Qui finance le SDIS ?","Quel est le rôle du préfet en matière de sécurité civile ?","Que savez-vous de la direction générale de la sécurité civile et de la gestion des crises ?","Qu'est-ce que le SDACR ?","Comment s'articulent le SAMU et les sapeurs-pompiers ?"],
    m:"Va du national au local (État, département, SDIS, groupement, CIS). Définis chaque sigle la première fois. Si tu ne sais pas, dis-le simplement et dis où tu irais chercher l'information : le jury préfère l'honnêteté à l'invention. Révise ces points dans tes cours de culture administrative."},
  situ:{n:"Mises en situation", q:["Un collègue arrive en garde en sentant l'alcool. Que faites-vous ?","Sur intervention, un témoin filme la victime avec son téléphone. Que faites-vous ?","Votre chef d'agrès donne un ordre qui vous paraît dangereux. Comment réagissez-vous ?","Une victime vous agresse verbalement. Comment gérez-vous ?","Vous constatez qu'un équipement de protection est abîmé avant de partir en intervention. Que faites-vous ?","Un jeune sapeur-pompier de votre équipe est mis à l'écart par les autres. Que faites-vous ?","Un journaliste vous interroge sur une intervention en cours. Que répondez-vous ?"],
    m:"Méthode : la sécurité d'abord (toi, l'équipe, la victime), tu analyses, tu rends compte à ton supérieur, tu agis dans ton rôle, tu rends compte à nouveau. Pour un problème humain : écouter, rester calme, recadrer avec respect, en parler à la hiérarchie. Ne te présente pas en héros solitaire."},
  valeurs:{n:"Valeurs et déontologie", q:["Quelles valeurs associez-vous au métier de sapeur-pompier ?","Que signifie pour vous l'obligation de réserve ?","Qu'est-ce que le secret professionnel pour un sapeur-pompier ?","Que représente pour vous la discipline ?","Que pensez-vous de l'usage des réseaux sociaux par les sapeurs-pompiers ?","Comment réagir face à des propos discriminants dans une équipe ?"],
    m:"Pour chaque valeur : une définition simple, un exemple vécu, comment tu l'appliqueras comme caporal. Reste mesuré sur les sujets de société : réponds en agent du service public, sans avis politique."},
  sante:{n:"Santé et sécurité", q:["Comment entretenez-vous votre condition physique ?","Que faites-vous pour prévenir les accidents en intervention ?","Comment gérez-vous le stress après une intervention difficile ?","Que savez-vous des risques liés aux fumées pour la santé des sapeurs-pompiers ?","Comment encourageriez-vous votre équipe à respecter le port des EPI ?"],
    m:"Parle prévention et habitudes concrètes : entraînement, hydratation, EPI, décontamination, suivi médical, entraide et soutien psychologique. Donne ce que tu fais toi-même, pas seulement la théorie."}
};
const ORAL_CRIT = [["Structure","plan annoncé, idées dans l'ordre, conclusion"],["Clarté","voix, débit, vocabulaire, pas de tics"],["Connaissances","réponses justes, exemples précis"],["Posture","regard, attitude, gestion du stress"],["Temps","durée respectée, ni trop court ni trop long"]];
const ORAL_LV = ["","Insuffisant","À travailler","Bien","Très bien"];
const oral = {cat:"all", q:null, k:null, phase:null, end:0, left:0, timer:null, sc:[0,0,0,0,0], note:"", saved:false};
const oralDur = () => ({prep:0, talk:5, ...(S.oralT||{})});
const mmss = ms => { const s = Math.max(0, Math.ceil(ms/1000)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); };
function oralDraw(){
  const cats = oral.cat==="all" ? Object.keys(ORAL) : [oral.cat];
  const pool = cats.flatMap(k => ORAL[k].q.map(q => [k,q])).filter(([,q]) => q !== oral.q);
  const [k,q] = pool[Math.floor(Math.random()*pool.length)];
  oralStop(); Object.assign(oral, {k, q, phase:null, left:0, sc:[0,0,0,0,0], note:"", saved:false});
}
function oralStop(){ if(oral.timer){ clearInterval(oral.timer); oral.timer = null; } }
function oralStart(){
  const d = oralDur();
  if(!oral.phase || oral.phase==="done"){ oral.phase = d.prep ? "prep" : "talk"; oral.left = (oral.phase==="prep" ? d.prep : d.talk)*60000; }
  oral.end = Date.now() + oral.left; oralStop(); oral.timer = setInterval(oralTick, 250); render();
}
function oralPause(){ oral.left = Math.max(0, oral.end - Date.now()); oralStop(); render(); }
function oralTick(){
  const el = $("#ochr"); if(!el){ oralPause(); return; } // on a quitté la page : le chrono se met en pause
  const left = oral.end - Date.now(), d = oralDur(), tot = (oral.phase==="prep" ? d.prep : d.talk)*60000;
  if(left <= 0){
    oralStop();
    if(oral.phase==="prep"){ oral.phase = "talk"; oral.left = d.talk*60000; try{ navigator.vibrate && navigator.vibrate(200); }catch(e){} oralStart(); return; }
    oral.phase = "done"; oral.left = 0; try{ navigator.vibrate && navigator.vibrate([300,150,300]); }catch(e){} render(); return;
  }
  el.textContent = mmss(left); const b = $("#ochrbar"); if(b) b.style.width = (100*left/tot)+"%";
  el.classList.toggle("warn", oral.phase==="talk" && left < 30000);
}
function oralStats(){
  const h = S.oral||[]; if(!h.length) return "";
  const last = h.slice(-10).reverse(), avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
  const crit = ORAL_CRIT.map((c,i) => [c[0], avg(h.slice(-5).map(o=>o.sc[i]))]);
  const weak = [...crit].sort((a,b)=>a[1]-b[1])[0];
  return `<section style="display:grid;gap:10px"><h3>Mes oraux d'entraînement (${h.length})</h3>
    <div class="panel tlines">${crit.map(([n,v])=>`<div class="tline"><span class="tn">${n}</span><div class="bar"><i style="width:${100*v/4}%"></i></div><b class="num">${v.toFixed(1)}</b></div>`).join("")}
    <p class="muted" style="font-size:.9rem">Moyenne sur 4 de tes 5 derniers oraux. ${weak[1] < 3 ? `Point à travailler en priorité : <b>${weak[0].toLowerCase()}</b>.` : "Continue comme ça."}</p></div>
    <ul class="errlist">${last.map(o=>`<li><p><b class="num">${o.sc.reduce((a,b)=>a+b,0)}/20</b> · ${esc(o.q)}</p><p class="muted" style="font-size:.85rem">${new Date(o.at).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})} · ${ORAL[o.k] ? ORAL[o.k].n : ""}${o.dur ? ` · ${o.dur} min` : ""}${o.note ? ` · « ${esc(o.note)} »` : ""}</p></li>`).join("")}</ul></section>`;
}
function vOral(){
  const d = oralDur(), run = !!oral.timer, c = oral.k ? ORAL[oral.k] : null;
  const tot = (oral.phase==="prep" ? d.prep : d.talk)*60000, left = run ? oral.end - Date.now() : oral.phase ? oral.left : (d.prep||d.talk)*60000;
  const full = oral.sc.every(x=>x>0);
  return `<section style="display:grid;gap:8px"><span class="label">Concours SPP</span><h2>Oral</h2>
    <p class="lead">Tire une question de jury, prépare-toi, réponds à voix haute avec le chrono, puis note-toi honnêtement. Idéal à deux : un collègue joue le jury.</p></section>
  <div class="panel">
    <span class="label">Type de question</span>
    <div class="chips" id="ocat"><button type="button" class="chip" data-c="all" aria-pressed="${oral.cat==="all"}">Toutes</button>${Object.entries(ORAL).map(([k,v])=>`<button type="button" class="chip" data-c="${k}" aria-pressed="${oral.cat===k}">${v.n}</button>`).join("")}</div>
    <span class="label">Chrono (règle-le d'après le règlement de ton concours)</span>
    <div class="ochips"><span>Préparation</span><div class="chips" id="oprep">${[0,2,5,10,15,20].map(m=>`<button type="button" class="chip" data-m="${m}" aria-pressed="${d.prep===m}">${m?m+" min":"aucune"}</button>`).join("")}</div></div>
    <div class="ochips"><span>Réponse</span><div class="chips" id="otalk">${[1,2,3,5,10,15,20].map(m=>`<button type="button" class="chip" data-m="${m}" aria-pressed="${d.talk===m}">${m} min</button>`).join("")}</div></div>
    <div><button type="button" class="btn primary" id="odraw">${oral.q ? "Autre question" : "Tirer une question"}</button></div>
  </div>
  ${oral.q ? `<section class="panel oq">
    <span class="label">${c.n}</span>
    <p class="oq-q">${esc(oral.q)}</p>
    <div class="ochr"><span class="label">${oral.phase==="prep" ? "Préparation" : oral.phase==="done" ? "Temps écoulé" : "Réponse"}</span>
      <b class="num ${oral.phase==="done"?"warn":""}" id="ochr">${mmss(left)}</b>
      <div class="bar"><i id="ochrbar" style="width:${oral.phase ? 100*Math.max(0,left)/tot : 100}%"></i></div></div>
    <div class="row">${run ? `<button type="button" class="btn primary" id="opause">Pause</button>` : `<button type="button" class="btn primary" id="ostart">${oral.phase && oral.phase!=="done" ? "Reprendre" : oral.phase==="done" ? "Recommencer" : "Démarrer"}</button>`}
      ${oral.phase==="prep" ? `<button type="button" class="btn" id="oskip">Passer à la réponse</button>` : ""}${oral.phase && oral.phase!=="done" ? `<button type="button" class="btn" id="oend">J'ai fini</button>` : ""}</div>
    <details class="omethod"><summary>Comment structurer ta réponse</summary><p>${c.m}</p></details>
  </section>
  <form class="panel" id="oeval"><h3>Ton auto-évaluation</h3>
    ${ORAL_CRIT.map(([n,h],i)=>`<div class="ocrit"><div><b>${n}</b><small>${h}</small></div><div class="chips" data-i="${i}">${[1,2,3,4].map(v=>`<button type="button" class="chip" data-v="${v}" aria-pressed="${oral.sc[i]===v}" title="${ORAL_LV[v]}">${v}</button>`).join("")}</div></div>`).join("")}
    <p class="muted" style="font-size:.85rem">1 = insuffisant · 2 = à travailler · 3 = bien · 4 = très bien${full ? ` · total <b class="num">${oral.sc.reduce((a,b)=>a+b,0)}/20</b>` : ""}</p>
    <label class="label" for="onote">Note pour la prochaine fois (facultatif)</label>
    <input class="field" id="onote" maxlength="140" value="${esc(oral.note)}" placeholder="Ex. annoncer mon plan, moins de « euh »">
    <div class="row"><button class="btn primary" ${full && !oral.saved ? "" : "disabled"}>${oral.saved ? "Enregistré ✓" : "Enregistrer"}</button>${full ? "" : `<span class="muted" style="font-size:.85rem">Note les 5 critères pour enregistrer.</span>`}</div>
  </form>` : ""}
  ${oralStats()}`;
}
function bindOral(){
  const pick = (id, fn) => { const el = $(id); if(el) el.onclick = e => { const b = e.target.closest("button"); if(b) fn(b); }; };
  pick("#ocat", b => { oral.cat = b.dataset.c; render(); });
  pick("#oprep", b => { S.oralT = {...oralDur(), prep:+b.dataset.m}; save(); if(!oral.timer && oral.phase!=="talk"){ oral.phase = null; } render(); });
  pick("#otalk", b => { S.oralT = {...oralDur(), talk:+b.dataset.m}; save(); if(!oral.timer){ oral.phase = null; } render(); });
  $("#odraw").onclick = () => { oralDraw(); render(); };
  const st = $("#ostart"); if(st) st.onclick = oralStart;
  const pa = $("#opause"); if(pa) pa.onclick = oralPause;
  const sk = $("#oskip"); if(sk) sk.onclick = () => { oralStop(); oral.phase = "talk"; oral.left = oralDur().talk*60000; oralStart(); };
  const en = $("#oend"); if(en) en.onclick = () => { oralStop(); oral.phase = "done"; oral.left = 0; render(); };
  const f = $("#oeval");
  if(f){
    f.querySelectorAll(".chips[data-i]").forEach(g => g.onclick = e => { const b = e.target.closest("[data-v]"); if(!b) return; oral.note = $("#onote").value; oral.sc[+g.dataset.i] = +b.dataset.v; oral.saved = false; render(); });
    f.onsubmit = e => {
      e.preventDefault(); if(!oral.sc.every(x=>x>0) || oral.saved) return;
      oral.note = $("#onote").value.trim();
      (S.oral = S.oral||[]).push({at:Date.now(), k:oral.k, q:oral.q, sc:[...oral.sc], note:oral.note, dur:oralDur().talk});
      S.oral = S.oral.slice(-100); oral.saved = true; tick(); save(); render(); toast("Oral enregistré : "+oral.sc.reduce((a,b)=>a+b,0)+"/20");
    };
  }
  if(oral.timer) oralTick();
}

/* ---------- Mes questions (ajoutées dans le site, synchronisées avec le compte) ---------- */
// S.mine : id -> {t, q, o:[bonne, mauvaises…], e, src, at, del?}. Une suppression garde une trace (del) pour se propager aux autres appareils.
const MINE_SRC = "Mes questions";
let mqEdit = null, mqDel = null, mqMsg = "";
const mineList = () => Object.entries(S.mine||{}).filter(([,m])=>m && !m.del && TH[m.t] && typeof m.q==="string" && Array.isArray(m.o) && m.o.length>=2).sort((a,b)=>b[1].at-a[1].at);
function injectMine(){
  for(let i = ALLQ.length-1; i >= 0; i--) if(ALLQ[i].mine){ QBY.delete(ALLQ[i].id); ALLQ.splice(i,1); }
  for(const [id,m] of mineList()){
    const src = m.src ? esc(m.src) : "";
    const q = {t:m.t, id:"mine-"+id, mine:true, q:esc(m.q), o:m.o.map(esc), e:(m.e ? esc(m.e) : "Question ajoutée par toi.") + (src ? ` (${src})` : "")};
    ALLQ.push(q); QBY.set(q.id, q);
  }
}
function vMesq(){
  const L = mineList(), ed = mqEdit && S.mine[mqEdit] ? S.mine[mqEdit] : null;
  const v = (x, i) => ed ? esc(i==null ? (ed[x]||"") : (ed.o[i]||"")) : "";
  return `<section style="display:grid;gap:8px"><span class="label">QCM</span><h2>Mes questions</h2>
    <p class="lead">Ajoute tes propres questions (tirées de tes cours, d'une manœuvre, d'une consigne du CIS…). Elles entrent dans les quiz du thème choisi, en QCM, vrai / faux ou à compléter, avec la répétition espacée.</p></section>
  <form class="panel mqform" id="mqf">
    <h3>${ed ? "Modifier la question" : "Nouvelle question"}</h3>
    <label class="label" for="mqt">Thème</label>
    <select class="field" id="mqt">${Object.entries(TH).map(([k,t])=>`<option value="${k}" ${(ed ? ed.t : (S.mineT||"suap"))===k?"selected":""}>${t.n}</option>`).join("")}</select>
    <label class="label" for="mqq">Question</label>
    <textarea class="field" id="mqq" rows="3" maxlength="300" required placeholder="Ex. Quelle est la pression de fonctionnement d'une lance à débit variable ?">${v("q")}</textarea>
    <label class="label" for="mqa">Bonne réponse</label>
    <input class="field ok" id="mqa" maxlength="160" required value="${v("o",0)}" placeholder="Ex. 6 bar">
    <span class="label">Mauvaises réponses (au moins une, trois de préférence)</span>
    ${[1,2,3].map(i=>`<input class="field" id="mqw${i}" maxlength="160" ${i===1?"required":""} value="${v("o",i)}" aria-label="Mauvaise réponse ${i}" placeholder="${["Ex. 4 bar","Ex. 8 bar","Ex. 10 bar"][i-1]}">`).join("")}
    <label class="label" for="mqe">Explication (facultatif)</label>
    <textarea class="field" id="mqe" rows="2" maxlength="500" placeholder="Pourquoi c'est la bonne réponse">${v("e")}</textarea>
    <label class="label" for="mqs">Source (facultatif)</label>
    <input class="field" id="mqs" maxlength="120" value="${v("src")}" placeholder="Ex. GDO Établissements, p. 12">
    <p class="muted" style="font-size:.9rem">Vérifie ta question dans le référentiel avant de l'enregistrer : elle n'est relue par personne.${typeof acct!=="undefined" && acct.user ? "" : " Elle reste sur cet appareil tant que tu n'es pas connecté."}</p>
    <div class="row"><button class="btn primary">${ed ? "Enregistrer les modifications" : "Ajouter la question"}</button>${ed ? `<button type="button" class="btn" id="mqcancel">Annuler</button>` : ""}<span class="muted" role="status">${mqMsg}</span></div>
  </form>
  <section style="display:grid;gap:10px">
    <div class="row" style="justify-content:space-between"><h3>Mes ${L.length} question${L.length>1?"s":""}</h3>${L.length ? `<button type="button" class="btn primary" id="mqgo">Réviser mes questions</button>` : ""}</div>
    ${L.length ? `<ul class="errlist">${L.map(([id,m])=>{ const p = S.qp["mine-"+id];
      return `<li><p>${badge(m.t)} <b>${esc(m.q)}</b></p><p style="color:var(--ok);font-weight:600">✓ ${esc(m.o[0])}</p><p class="muted">✗ ${m.o.slice(1).map(esc).join(" · ")}</p>
        <p class="muted" style="font-size:.85rem">${m.src ? esc(m.src)+" · " : ""}${p ? `${p.c}/${p.n} juste${p.c>1?"s":""}` : "jamais vue"} ·
        ${mqDel===id ? `Supprimer ? <button type="button" class="linkbtn" data-mqyes="${id}">Oui</button> <button type="button" class="linkbtn" data-mqno>Non</button>`
          : `<button type="button" class="linkbtn" data-mqed="${id}">Modifier</button> · <button type="button" class="linkbtn" data-mqdel="${id}">Supprimer</button>`}</p></li>`; }).join("")}</ul>`
      : `<div class="empty">Aucune question pour l'instant.<br>Elles apparaîtront aussi dans le choix des référentiels du QCM, sous « ${MINE_SRC} ».</div>`}
  </section>
  <div><a class="btn" href="#qcm">← QCM</a></div>`;
}
function bindMesq(){
  const f = $("#mqf");
  f.onsubmit = e => {
    e.preventDefault();
    const val = id => $("#"+id).value.trim().replace(/\s+/g," ");
    const t = $("#mqt").value, q = val("mqq"), a = val("mqa"), w = [1,2,3].map(i=>val("mqw"+i)).filter(Boolean);
    if(!q || !a || !w.length) return;
    const all = [a, ...w].map(x=>x.toLowerCase());
    if(new Set(all).size < all.length){ mqMsg = "Deux réponses sont identiques."; render(); return; }
    const id = mqEdit || Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    S.mine[id] = {t, q, o:[a, ...w], e:val("mqe"), src:val("mqs"), at:Date.now()};
    S.mineT = t; mqMsg = mqEdit ? "Question modifiée." : "Question ajoutée."; mqEdit = null;
    injectMine(); save(); render();
    if(!mqEdit) setTimeout(()=>{ const x = $("#mqq"); if(x) x.focus(); }, 0);
  };
  const c = $("#mqcancel"); if(c) c.onclick = () => { mqEdit = null; mqMsg = ""; render(); };
  document.querySelectorAll("[data-mqed]").forEach(b => b.onclick = () => { mqEdit = b.dataset.mqed; mqDel = null; mqMsg = ""; render(); window.scrollTo(0,0); });
  document.querySelectorAll("[data-mqdel]").forEach(b => b.onclick = () => { mqDel = b.dataset.mqdel; render(); });
  document.querySelectorAll("[data-mqno]").forEach(b => b.onclick = () => { mqDel = null; render(); });
  document.querySelectorAll("[data-mqyes]").forEach(b => b.onclick = () => { const id = b.dataset.mqyes; S.mine[id] = {del:true, at:Date.now()}; if(mqEdit===id) mqEdit = null; mqDel = null; mqMsg = "Question supprimée."; injectMine(); save(); render(); });
  const g = $("#mqgo"); if(g) g.onclick = () => { const th = [...new Set(mineList().map(([,m])=>m.t))]; launch({themes:th, n:999, mode:"mine", off:[], t:qcmSetup.t, fmt:qcmSetup.fmt}); };
  mqMsg = "";
}

/* ---------- Réglages ---------- */
function vReglages(){
  const dl = daysLeft();
  return `<section style="display:grid;gap:8px"><span class="label">Réglages</span><h2>Réglages</h2></section>
  <section class="panel"><h3>Affichage</h3>
    <div class="chips" id="thm">${Object.entries(THEMES).map(([k,v])=>`<button type="button" class="chip" data-th="${k}" aria-pressed="${theme===k}">${ICON[k]} ${v}</button>`).join("")}</div>
    <p class="muted" style="font-size:.9rem">« Auto » suit le mode clair ou sombre du téléphone ou de l'ordinateur. Ce réglage reste propre à chaque appareil.</p></section>
  <section class="panel"><h3>Date du concours</h3>
    <p class="muted">Elle affiche le compte à rebours sur l'accueil.</p>
    <div class="row"><input type="date" class="field" id="cdate" value="${esc(S.concours)}" style="max-width:220px" aria-label="Date du concours">${S.concours?`<button type="button" class="btn" id="cdel">Effacer</button>`:""}</div>
    ${dl!==null?`<p><b class="num">${dl>0?`J-${dl}`:dl===0?"C'est aujourd'hui":"Date passée"}</b></p>`:""}</section>
  <section class="panel"><h3>Objectif quotidien</h3>
    <p class="muted">Nombre de réponses à donner chaque jour pour faire grandir ta série. La session du jour s'y adapte.</p>
    <div class="chips" id="goal">${[10,20,40,60].map(n=>`<button type="button" class="chip" data-g="${n}" aria-pressed="${S.goal===n}">${n}</button>`).join("")}</div></section>
  ${remindPanel()}
  <section class="panel"><h3>Remettre à zéro</h3>
    <p class="muted">Efface tes résultats (QCM, cartes, cas, activité, examens blancs) sur cet appareil et sur ton compte.</p>
    <div class="confirm" id="reset"><button type="button" class="btn" id="reset-ask">Réinitialiser ma progression</button></div></section>
  <section class="panel"><h3>Questions signalées</h3>
    <p class="muted">Les questions marquées « erreur » ou « doute » pendant un quiz, à copier pour les faire corriger.</p>
    <div><a class="btn" href="#signalements">Mes signalements (${S.rep.length})</a></div></section>
  <section class="panel"><h3>Mes questions</h3>
    <p class="muted">Tes propres questions, ajoutées dans le site et mélangées aux quiz.</p>
    <div><a class="btn" href="#mesq">Mes questions (${mineList().length})</a></div></section>`;
}
function bindReglages(){
  $("#thm").onclick = e => { const b=e.target.closest("[data-th]"); if(b){ setTheme(b.dataset.th); render(); } };
  $("#cdate").onchange = e => { S.concours = e.target.value || ""; save(); render(); };
  const cd = $("#cdel"); if(cd) cd.onclick = () => { S.concours = ""; save(); render(); };
  bindRemind();
  $("#goal").onclick = e => { const b=e.target.closest("[data-g]"); if(b){ S.goal=+b.dataset.g; save(); render(); } };
  $("#reset-ask").addEventListener("click", () => {
    $("#reset").innerHTML = `<span>Tout effacer ?</span><button type="button" class="btn primary" id="reset-yes">Oui, effacer</button><button type="button" class="btn" id="reset-no">Annuler</button>`;
    $("#reset-yes").onclick = () => { S.qp={}; S.fp={}; S.cp={}; S.fs={}; S.days={}; S.ex=[]; S.sd={}; if(window.onReset) window.onReset(); save(); render(); };
    $("#reset-no").onclick = render;
  });
}

/* ---------- Signalements (gardés sur l'appareil, à copier pour correction) ---------- */
const KIND = {err:"Erreur", doute:"Doute"};
function repText(){
  return `Signalements — Révisions SP (${S.rep.length})\n\n` + S.rep.map((r,i)=>{
    const q = QBY.get(r.id);
    return `${i+1}. [${KIND[r.kind]||r.kind}] ${TH[r.t]?TH[r.t].k:r.t} · ${r.q}\n`
      + (q ? `   Bonne réponse affichée : ${q.o[0]}\n` + (splitE(q.e).src ? `   Source : ${splitE(q.e).src}\n` : "") : "   (question retirée depuis)\n")
      + (r.note ? `   Commentaire : ${r.note}\n` : "")
      + `   Réf. ${r.id} · ${new Date(r.at).toLocaleDateString("fr-FR")}`;
  }).join("\n\n");
}
function vSignalements(){
  return `<section style="display:grid;gap:8px"><span class="label">Réglages</span><h2>Mes signalements</h2>
    <p class="lead">Les questions que tu as signalées pendant un quiz. Copie la liste et envoie-la pour correction. Elle reste sur cet appareil.</p></section>
  ${S.rep.length ? `<div class="row"><button type="button" class="btn primary" id="rcopy">Copier la liste</button><span class="muted" id="rmsg" role="status"></span></div>
    <textarea class="field" id="rtxt" readonly rows="6" hidden>${esc(repText())}</textarea>
    <ul class="errlist">${S.rep.map((r,i)=>{ const q = QBY.get(r.id); return `<li><p><span class="tag ${r.kind==="err"?"bad":""}">${KIND[r.kind]||r.kind}</span> ${TH[r.t]?badge(r.t):""} ${esc(r.q)}</p>
      ${q?`<p class="muted">Bonne réponse affichée : ${q.o[0]}</p>`:""}${r.note?`<p>« ${esc(r.note)} »</p>`:""}
      <p class="muted" style="font-size:.85rem">${new Date(r.at).toLocaleDateString("fr-FR")} · <button type="button" class="linkbtn" data-rdel="${i}">Supprimer</button></p></li>`; }).join("")}</ul>
    <div class="confirm" id="rclear"><button type="button" class="btn" id="rclear-ask">Tout supprimer</button></div>`
  : `<div class="empty">Aucun signalement.<br>Pendant un quiz, touche « Signaler » (ou la touche S sur PC) si une question te paraît fausse ou douteuse.</div>`}
  <div><a class="btn" href="#reglages">← Réglages</a></div>`;
}
function bindSignalements(){
  const c = $("#rcopy"); if(c) c.onclick = () => {
    const t = $("#rtxt"), ok = () => { $("#rmsg").textContent = "Copié."; };
    const fallback = () => { t.hidden = false; t.focus(); t.select(); $("#rmsg").textContent = "Sélectionne le texte et copie-le."; };
    try{ navigator.clipboard.writeText(t.value).then(ok, fallback); }catch(e){ fallback(); }
  };
  document.querySelectorAll("[data-rdel]").forEach(b => b.onclick = () => { S.rep.splice(+b.dataset.rdel,1); save(); render(); });
  const ra = $("#rclear-ask"); if(ra) ra.onclick = () => {
    $("#rclear").innerHTML = `<span>Supprimer les ${S.rep.length} signalements ?</span><button type="button" class="btn primary" id="rclear-yes">Oui</button><button type="button" class="btn" id="rclear-no">Annuler</button>`;
    $("#rclear-yes").onclick = () => { S.rep = []; save(); render(); };
    $("#rclear-no").onclick = render;
  };
}

/* ---------- QCM ---------- */
let quiz = null;
let qcmSetup = {n:10, mode:"all", off:[], t:0, fmt:"mix", ...S.qcm, srcOpen:false, pform:false};
const saveSetup = () => { S.qcm = {n:qcmSetup.n, mode:qcmSetup.mode, off:[...qcmSetup.off], t:qcmSetup.t, fmt:qcmSetup.fmt}; save(); };
const curCfg = () => ({themes:activeThemes(), n:qcmSetup.n, mode:qcmSetup.mode, off:[...qcmSetup.off], t:qcmSetup.t, fmt:qcmSetup.fmt});
/* Référentiel d'une question : source citée en fin d'explication (variantes de nom regroupées) */
const SRC_ALIAS = {"GTO Lutte contre les FDF et espaces naturels 2021":"GTO Lutte contre les feux de forêts et d'espaces naturels 2021", "GDO SSUAP 2022":"GDO Secours et soins d'urgence aux personnes 2022"};
const NOSRC = "Notions générales (sans référentiel)";
function srcOf(q){ if(q.mine) return MINE_SRC; const s = splitE(q.e).src; return s ? (SRC_ALIAS[s]||s) : NOSRC; }
/* Clé « thème|référentiel » : on mémorise les référentiels décochés (tout est coché par défaut) */
const srcKey = q => q.t+"|"+srcOf(q);
function srcOptions(){
  const act = activeThemes(), c = {};
  visQ().forEach(q=>{ if(act.includes(q.t)){ const k=srcKey(q); c[k]=(c[k]||0)+1; } });
  const keys = Object.keys(c), off = qcmSetup.off;
  const tot = keys.reduce((a,k)=>a+c[k],0), offK = keys.filter(k=>off.includes(k)), nb = tot - offK.reduce((a,k)=>a+c[k],0);
  const name = k => k.slice(k.indexOf("|")+1);
  const rank = s => s===NOSRC?3:/^GTO /.test(s)?0:/^GDO /.test(s)?1:2;
  const box = k => `<label class="srcopt"><input type="checkbox" value="${k.replace(/"/g,"&quot;")}" ${off.includes(k)?"":"checked"}><span>${name(k)}</span><small class="num">${c[k]}</small></label>`;
  const blocks = act.map(t=>{
    const l = keys.filter(k=>k.startsWith(t+"|")).sort((a,b)=>rank(name(a))-rank(name(b))||name(a).localeCompare(name(b),"fr"));
    if(!l.length) return "";
    return `<div class="srcgrp"><p class="label">${badge(t)} ${TH[t].n}<span class="srcall"><button type="button" data-sall="${t}">tout</button> · <button type="button" data-snone="${t}">aucun</button></span></p>${l.map(box).join("")}</div>`;
  }).join("");
  return `<details class="fiche corr srcpick" id="qsrc" ${qcmSetup.srcOpen?"open":""}><summary>${offK.length?`${nb} / ${tot} questions · ${offK.length} référentiel${offK.length>1?"s":""} décoché${offK.length>1?"s":""}`:`Tous les référentiels des thèmes choisis · ${tot} questions`}</summary>
    <div class="srclist">${blocks}
    ${offK.length?`<div><button type="button" class="btn" id="qsrc-clear">Tout recocher</button></div>`:""}</div></details>`;
}
/* Formats : QCM, vrai/faux (une proposition à juger), texte à trous (les chiffres de la bonne réponse à compléter) */
const NUMRE = /\d+(?:[.,]\d+)?/g;
const NEGQ = /n.est pas|ne [^?]{0,30} pas|faux|sauf|incorrect|inexact/i;
const nNums = o => (o.match(NUMRE)||[]).length;
const canTxt = q => !/</.test(q.o[0]) && q.o[0].length <= 40 && nNums(q.o[0]) >= 1 && nNums(q.o[0]) <= 3 && !NEGQ.test(q.q);
const canVf = q => !q.o.some(o => /toutes|aucune|les deux|tous les|ensemble des/i.test(o));
const FMT = {mix:"Mélangé", qcm:"QCM seul", vf:"Vrai / faux", txt:"À compléter"};
function fmtFor(q, f){
  if(f==="qcm") return "qcm";
  const v = canVf(q), x = canTxt(q);
  if(f==="vf") return v ? "vf" : "qcm";
  if(f==="txt") return x ? "txt" : "qcm";
  const r = Math.random(); return x && r < .3 ? "txt" : v && r >= .7 ? "vf" : "qcm"; // mélangé : 30 % à compléter (si possible), 30 % vrai/faux, le reste en QCM
}
function mkItem(q, f){
  const it = {q, order:shuffle(q.o.map((_,i)=>i)), fmt:fmtFor(q, f)};
  if(it.fmt==="vf") it.s = Math.random() < .5 ? 0 : 1 + Math.floor(Math.random()*(q.o.length-1)); // proposition montrée : la bonne une fois sur deux
  return it;
}
function trous(ans){
  const parts = [], nums = []; let last = 0;
  ans.replace(NUMRE, (m, i) => { parts.push(ans.slice(last, i)); nums.push(m); last = i + m.length; return m; });
  parts.push(ans.slice(last)); return {parts, nums};
}
const numEq = (a, b) => { const x = String(a).trim().replace(/\s/g,"").replace(",","."), y = b.replace(",","."); return x !== "" && (x === y || (/^\d+(\.\d+)?$/.test(x) && parseFloat(x) === parseFloat(y))); };
function startQuiz(themes, n, mode, off, t, fmt){
  fmt = fmt || qcmSetup.fmt || "mix";
  let pool = visQ().filter(q=> themes.includes(q.t) && !(off||[]).includes(srcKey(q)));
  if(mode!=="day"){ if(fmt==="vf") pool = pool.filter(canVf); if(fmt==="txt") pool = pool.filter(canTxt); }
  if(mode==="err") pool = pool.filter(q=>S.qp[q.id]&&!S.qp[q.id].ok);
  if(mode==="new") pool = pool.filter(q=>!S.qp[q.id]);
  if(mode==="due") pool = pool.filter(q=>isDue(S.qp[q.id]));
  if(mode==="fav") pool = pool.filter(q=>isFav(q.id));
  if(mode==="mine") pool = pool.filter(q=>q.mine);
  if(mode==="weak"){ // points faibles : erreurs d'abord, puis les boîtes basses et les taux de réussite faibles
    const sc = q => { const p = S.qp[q.id]; return p ? (p.ok?10:0) + boxOf(p) + p.c/p.n : 5.5; };
    pool = shuffle(pool).sort((a,b)=>sc(a)-sc(b)).slice(0,n);
  }
  if(mode==="sd") n = pool.length; // mort subite : on enchaîne jusqu'à la première erreur
  if(mode==="day"){
    // Révisions du jour : d'abord les questions arrivées à échéance (les plus en retard en premier), puis des nouvelles.
    const dueAll = shuffle(pool.filter(q=>isDue(S.qp[q.id]))).sort((a,b)=>S.qp[a.id].due<S.qp[b.id].due?-1:S.qp[a.id].due>S.qp[b.id].due?1:0);
    const d = dueAll.slice(0, Math.min(n, dayPlan().due)), f = shuffle(pool.filter(q=>!S.qp[q.id])).slice(0, n-d.length);
    pool = shuffle([...d, ...f, ...dueAll.slice(d.length, d.length + n - d.length - f.length)]);
  }
  pool = shuffle(pool).slice(0,n);
  quiz = pool.length ? {items:pool.map(q=>mkItem(q, fmt)), i:0, picked:null, score:0, wrong:[], t:t||0} : {empty:true};
  if(mode==="sd" && !quiz.empty){ quiz.sd = sdKey(themes); quiz.rec0 = S.sd[quiz.sd]||0; }
}
/* Record de mort subite : par thème quand un seul thème est choisi, sinon par groupe de thèmes */
const sdKey = th => [...th].sort().join("+");
const sdName = k => { const th = k.split("+").filter(t=>TH[t]); return th.length===1 ? TH[th[0]].n : th.length===themesForLevel().length ? "Tous thèmes" : th.map(t=>TH[t].k).join(" + "); };
/* Chrono par question : en pause quand on quitte l'écran du quiz ou l'appli */
let qTimer = null;
function qtStop(){
  if(qTimer){ clearInterval(qTimer); qTimer = null; }
  if(quiz && quiz.qEnd){ quiz.qLeft = Math.max(0, quiz.qEnd - Date.now()); quiz.qEnd = null; }
}
function qtStart(){
  if(!quiz || !quiz.t || quiz.empty || quiz.picked!==null || quiz.i>=quiz.items.length || route()!=="qcm") return;
  if(qTimer) return;
  if(quiz.qLeft==null) quiz.qLeft = quiz.t*1000;
  quiz.qEnd = Date.now() + quiz.qLeft; quiz.qLeft = null;
  const tickT = () => {
    const left = quiz && quiz.qEnd ? quiz.qEnd - Date.now() : 0, bar = $("#qtbar"), sec = $("#qtsec");
    if(bar) bar.style.width = Math.max(0, 100*left/(quiz.t*1000)) + "%";
    if(sec) sec.textContent = Math.max(0, Math.ceil(left/1000)) + " s";
    if(bar) bar.parentNode.classList.toggle("low", left < 5000);
    if(left <= 0){ clearInterval(qTimer); qTimer = null; pick(-1); }
  };
  qTimer = setInterval(tickT, 200); tickT();
}
function vQcm(){
  const actQ = visQ().filter(q=>activeThemes().includes(q.t)), nDue = actQ.filter(q=>isDue(S.qp[q.id])).length, nFav = actQ.filter(q=>isFav(q.id)).length;
  if(!quiz) return `
    <section style="display:grid;gap:8px"><span class="label">QCM · ${LV[S.obj]}</span><h2>Lancer un quiz</h2><p class="lead">Choisis les thèmes ou un GTO/GDO précis, le nombre de questions et les questions à travailler. Correction et explication après chaque réponse, juste ou fausse, puis correction détaillée à la fin.</p></section>
    <div class="panel">
      <span class="label">Thèmes</span>${themeChips()}
      <span class="label">Référentiels (GTO / GDO) — décoche ceux à exclure</span>
      ${srcOptions()}
      <span class="label">Questions</span>
      <div class="chips" id="qm">${[["all","Toutes"],["due",`À revoir aujourd'hui (${nDue})`],["new","Jamais vues"],["err","Mes erreurs"],["fav",`★ Mes favoris (${nFav})`],...(mineList().length?[["mine",`✎ Mes questions (${mineList().length})`]]:[]),["sd","Mort subite"]].map(([k,v])=>`<button type="button" class="chip" data-m="${k}" aria-pressed="${qcmSetup.mode===k}">${v}</button>`).join("")}</div>
      ${qcmSetup.mode==="sd" ? `<p class="muted" style="font-size:.9rem">Les questions s'enchaînent jusqu'à la première erreur. Record actuel pour ces thèmes : <b class="num">${S.sd[sdKey(activeThemes())]||0}</b>.</p>`
      : `<span class="label">Nombre de questions</span>
      <div class="chips" id="qn">${[10,20,999].map(n=>`<button type="button" class="chip" data-n="${n}" aria-pressed="${qcmSetup.n===n}">${n===999?"Toutes":n}</button>`).join("")}</div>`}
      <p class="muted" style="font-size:.9rem"><a href="#mesq">✎ Ajouter mes propres questions</a> : elles entrent dans les quiz de leur thème.</p>
      <span class="label">Format des questions</span>
      <div class="chips" id="qf">${Object.entries(FMT).map(([k,v])=>`<button type="button" class="chip" data-f="${k}" aria-pressed="${(qcmSetup.fmt||"mix")===k}">${v}</button>`).join("")}</div>
      <p class="muted" style="font-size:.9rem">${{mix:"QCM, vrai / faux et textes à trous mélangés : on retient mieux en changeant de forme.", qcm:"Quatre propositions, une seule bonne.", vf:"Une seule proposition : tu dis si c'est la bonne réponse ou non.", txt:"La bonne réponse s'affiche avec des trous à la place des chiffres (durées, distances, pressions…) : à toi de les retrouver."}[qcmSetup.fmt||"mix"]}</p>
      <span class="label">Chrono par question</span>
      <div class="chips" id="qt">${[[0,"Sans"],[15,"15 s"],[30,"30 s"],[60,"60 s"]].map(([k,v])=>`<button type="button" class="chip" data-tm="${k}" aria-pressed="${(qcmSetup.t||0)===k}">${v}</button>`).join("")}</div>
      ${qcmSetup.t?`<p class="muted" style="font-size:.9rem">Mode vitesse : une réponse non donnée à temps compte comme une erreur. Le chrono se met en pause si tu quittes l'appli.</p>`:""}
      <div class="row"><button type="button" class="btn primary" id="qgo">Commencer</button>${qcmSetup.pform?"":`<button type="button" class="btn" id="psave">☆ Garder ces réglages en favori</button>`}</div>
      ${qcmSetup.pform?`<form class="row" id="pform"><input class="field" id="pname" maxlength="40" value="${esc(cfgName(curCfg()))}" aria-label="Nom du favori" style="max-width:320px"><button class="btn primary">Enregistrer</button><button type="button" class="btn" id="pcancel">Annuler</button></form>`:""}
      ${S.presets.length?`<span class="label">Mes favoris — un toucher pour lancer</span><div class="presets">${S.presets.map((f,i)=>`<span class="preset"><button type="button" class="chip" data-p="${i}" title="${esc(cfgName(f))}">★ ${esc(f.name)}</button><button type="button" class="pdel" data-pdel="${i}" aria-label="Supprimer le favori ${esc(f.name)}">×</button></span>`).join("")}</div>`:""}
      <p class="muted" style="font-size:.85rem">Tes réglages sont gardés en mémoire pour la prochaine fois.</p>
    </div>`;
  if(quiz.empty) return `<div class="empty">Aucune question ne correspond à ce choix.${qcmSetup.mode==="fav"?"<br>Ajoute des questions en favori avec l'étoile ☆ pendant un quiz.":""}<br><br><button type="button" class="btn" id="qback">Changer les réglages</button></div>`;
  if(quiz.i >= quiz.items.length){
    const n = quiz.items.length, pct = Math.round(100*quiz.score/n);
    if(quiz.sd){
      const rec = S.sd[quiz.sd]||0, isNew = quiz.score > quiz.rec0;
      return `<section class="panel">
      <span class="label">Mort subite · ${esc(sdName(quiz.sd))}</span>
      <div class="score num">${quiz.score}<span style="font-size:1.6rem"> d'affilée</span></div>
      <p class="lead">${isNew?`Nouveau record ! L'ancien était de ${quiz.rec0}.`:quiz.wrong.length?`Record à battre : ${rec}.`:`Sans faute sur toutes les questions. Record : ${rec}.`}</p>
      <div class="row"><button type="button" class="btn primary" id="qsdagain">Rejouer</button><button type="button" class="btn" id="qagain">Autre quiz</button></div>
    </section>
    ${quiz.log&&quiz.log.length?corrList(quiz.log,"Correction détaillée"):""}`;
    }
    return `<section class="panel">
      <span class="label">Résultat</span>
      <div class="score num">${quiz.score}<span style="font-size:1.6rem"> / ${n}</span></div>
      <p class="lead">${pct>=80?"Solide. Passe à un autre thème ou augmente le nombre de questions.":pct>=50?"Bonne base. Reprends tes erreurs pour consolider.":"Ces notions sont à retravailler : relis la fiche du thème puis refais le quiz."}</p>
      <div class="row"><button type="button" class="btn primary" id="qagain">Nouveau quiz</button>${quiz.wrong.length?`<button type="button" class="btn" id="qerr">Refaire mes erreurs</button>`:""}</div>
    </section>
    ${quiz.log&&quiz.log.length?corrList(quiz.log,"Correction détaillée"):""}`;
  }
  const it = quiz.items[quiz.i], q = it.q, n = quiz.items.length, done = quiz.picked!==null;
  const fmt = it.fmt || "qcm";
  let body;
  if(fmt==="vf"){
    const truth = it.s===0 ? 1 : 0;
    const vb = (v, lab, k) => { let cls = "opt"; if(done){ if(v===truth) cls+=" right"; else if(v===it.v) cls+=" wrong"; } return `<button type="button" class="${cls}" data-vf="${v}" ${done?"disabled":""}><kbd>${k}</kbd><span>${lab}</span></button>`; };
    body = `<div class="vfprop"><span class="label">Vrai ou faux · cette proposition est-elle la bonne réponse ?</span><p>${q.o[it.s]}</p></div><div class="opts vf">${vb(1,"Vrai, c'est la bonne réponse",1)}${vb(0,"Faux",2)}</div>`;
  } else if(fmt==="txt"){
    const T = trous(q.o[0]), vals = it.vals || [];
    const hole = i => `<input class="field hole ${done ? (numEq(vals[i]||"", T.nums[i]) ? "ok" : "bad") : ""}" data-h="${i}" inputmode="decimal" autocomplete="off" enterkeyhint="done" style="width:${Math.max(3, T.nums[i].length + 2)}ch" aria-label="Valeur ${i+1} sur ${T.nums.length}" value="${done ? esc(vals[i]||"") : ""}" ${done?"disabled":""}>`;
    body = `<form class="trous" id="qtxt"><span class="label">À compléter · retrouve ${T.nums.length>1?"les valeurs":"la valeur"}</span><p class="tline-q">${T.parts.map((p,i) => p + (i < T.nums.length ? hole(i) : "")).join("")}</p>${done ? "" : `<div class="row"><button class="btn primary">Valider</button><span class="muted kbd-hint" style="font-size:.85rem">Entrée pour valider</span></div>`}</form>`;
  } else body = `<div class="opts">${it.order.map((oi,k) => {
    let cls = "opt";
    if(done){ if(oi===0) cls+=" right"; else if(oi===quiz.picked) cls+=" wrong"; }
    return `<button type="button" class="${cls}" data-oi="${oi}" ${done?"disabled":""}><kbd>${k+1}</kbd><span>${q.o[oi]}</span></button>`;
  }).join("")}</div>`;
  const good = quiz.picked===0, timeout = quiz.picked===-1, fav = isFav(q.id);
  const reported = S.rep.some(r=>r.id===q.id);
  const count = quiz.sd ? `série ${quiz.score} · record ${Math.max(quiz.rec0, quiz.score)}` : `${quiz.i+1} / ${n} · ${quiz.score} juste${quiz.score>1?"s":""}`;
  return `<section style="display:grid;gap:14px">
    <div class="qhead"><span class="label">${badge(q.t)} ${TH[q.t].n}${quiz.sd?" · mort subite":""}</span><span class="num muted">${count}</span></div>
    ${quiz.sd?"":`<div class="progress"><i style="width:${100*(quiz.i+(done?1:0))/n}%"></i></div>`}
    ${quiz.t && !done ? `<div class="qtime"><div class="qtimer"><i id="qtbar" style="width:${100*(quiz.qLeft==null?1:quiz.qLeft/(quiz.t*1000))}%"></i></div><span class="num" id="qtsec">${Math.ceil((quiz.qLeft==null?quiz.t*1000:quiz.qLeft)/1000)} s</span></div>` : ""}
    ${done ? "" : srsTag(q)}
    <p class="question">${q.q}</p>
    ${body}
    ${done?`<div class="explain ${good?"":"no"}" role="status"><b>${good?"✓ Bonne réponse":timeout?"⏱ Temps écoulé":"✗ Mauvaise réponse"}</b>${good?"":`${timeout?"":`<p class="ans">Ta réponse : ${it.as || q.o[quiz.picked]}</p>`}<p class="ans ok">Bonne réponse : ${q.o[0]}</p>`}${explainBody(q)}${!good && !timeout && fmt==="txt" && !quiz.sd ? `<p><button type="button" class="btn" id="qforce">J'avais juste (mal tapé)</button></p>` : ""}</div>
    ${good?`<div class="conf"><span>Tu étais :</span><div class="chips" id="qconf"><button type="button" class="chip" data-c="sur" aria-pressed="${it.conf!=="hes"}">Sûr</button><button type="button" class="chip" data-c="hes" aria-pressed="${it.conf==="hes"}">Hésitant <kbd class="kbd-hint">H</kbd></button></div></div>`:""}
    <p class="srs muted">${srsNext(q, it)}</p>
    <div class="row"><button type="button" class="btn primary" id="qnext">${quiz.i+1<n?"Question suivante":"Voir le résultat"}</button><span class="muted kbd-hint" style="font-size:.85rem">Entrée ou Espace</span></div>`
    :`<p class="muted kbd-hint" style="font-size:.85rem">${fmt==="vf" ? "Touche 1 = vrai, 2 = faux" : fmt==="txt" ? "Tape les chiffres puis Entrée" : "Touches 1 à 4 ou A à D pour répondre"} · F favori · S signaler</p>`}
    <div class="qtools">
      <button type="button" class="btn" id="qfav" aria-pressed="${fav}" title="Mettre en favori (touche F)">${fav?"★ En favori":"☆ Favori"}</button>
      <button type="button" class="btn" id="qrep" ${quiz.repOpen?'aria-expanded="true"':""} title="Signaler une erreur ou un doute (touche S)">${reported?"⚑ Signalée":"⚑ Signaler"}</button>
      <button type="button" class="btn" id="qstop">Arrêter le quiz</button>
    </div>
    ${quiz.repOpen?`<form class="panel repform" id="qrepf">
      <span class="label">Signaler cette question</span>
      <div class="chips" id="qrepk"><button type="button" class="chip" data-k="err" aria-pressed="${quiz.repKind!=="doute"}">Erreur</button><button type="button" class="chip" data-k="doute" aria-pressed="${quiz.repKind==="doute"}">Doute</button></div>
      <textarea class="field" id="qrepn" rows="2" maxlength="400" placeholder="Commentaire (facultatif) : ce qui te paraît faux, la bonne référence…"></textarea>
      <div class="row"><button class="btn primary">Enregistrer</button><button type="button" class="btn" id="qrepc">Annuler</button><a class="muted" href="#signalements" style="font-size:.9rem">Mes signalements (${S.rep.length})</a></div>
    </form>`:""}
  </section>`;
}
/* Révision espacée expliquée : pourquoi la question revient, et quand elle reviendra */
function srsTag(q){
  const p = S.qp[q.id];
  if(!p) return `<p class="srs muted"><span class="tag">Nouvelle</span> Première fois que tu la vois.</p>`;
  const late = p.due && p.due < today();
  return `<p class="srs muted"><span class="tag">Boîte ${boxOf(p)} / 5</span> ${isDue(p) ? (late?`Prévue ${fmtDay(p.due)} : en retard, elle revient en priorité.`:"Prévue aujourd'hui.") : `Révision en avance (prévue ${fmtDay(p.due)}).`} Dernière réponse ${p.ok?"juste":"fausse"}.</p>`;
}
function srsNext(q, it){
  const p = S.qp[q.id]; if(!p) return "";
  const why = !p.ok ? "Erreur : retour en boîte 0, elle revient demain." : it.conf==="hes" ? "Bonne réponse hésitante : elle reste dans sa boîte et revient plus tôt." : p.box>=5 ? "Boîte 5 : la dernière, révision tous les 30 jours." : `Bonne réponse : elle passe en boîte ${p.box}.`;
  return `${why} Prochaine révision ${inDays(p.due)} (${fmtDay(p.due)}).`;
}
/* Explication : texte + source (dernière parenthèse si c'est une référence) */
function splitE(e){
  e = e||""; const m = e.match(/^([\s\S]*?)\s*\(([^()]+)\)\s*$/);
  if(m && /\b(GTO|GDO|GODR|GNR|SDIS|PSE|RNMSC|SSUAP|guide|référentiel|arrêté|code|loi|décret)\b|\d{4}/i.test(m[2])) return {txt:m[1], src:m[2]};
  return {txt:e, src:""};
}
function explainBody(q){
  const {txt,src} = splitE(q.e);
  return (txt?`<p class="why"><span class="label">Pourquoi</span>${txt}</p>`:"") + (src?`<p class="src">Source : ${src}</p>`:"");
}
/* Correction détaillée : erreurs d'abord, bonnes réponses repliées */
function corrList(items, title){
  const bad = items.filter(it=>it.a!==0), good = items.filter(it=>it.a===0);
  const li = it => `<li><p>${badge(it.q.t)} ${it.q.q}</p>${it.a===0?"":`<p class="yours">${it.a===null||it.a===undefined?"Sans réponse":"Ta réponse : "+(it.as||it.q.o[it.a])}</p>`}<p>${it.a===0?"✓ ":""}${it.q.o[0]}</p>${explainBody(it.q)}</li>`;
  return `<section style="display:grid;gap:10px"><h3>${title}</h3>
    ${bad.length?`<p class="muted">${bad.length} erreur${bad.length>1?"s":""} à retenir :</p><ul class="errlist">${bad.map(li).join("")}</ul>`:`<p class="muted">Aucune erreur.</p>`}
    ${good.length?`<details class="fiche corr"><summary>Revoir les ${good.length} bonne${good.length>1?"s":""} réponse${good.length>1?"s":""} et leur explication</summary><ul class="errlist">${good.map(li).join("")}</ul></details>`:""}
  </section>`;
}
/* Réponse donnée (tous formats). picked : indice choisi en QCM, 0 = juste, -1 = temps écoulé, -2 = faux en vrai/faux ou à compléter */
function pick(oi){ settle(oi, oi===0, null); }
function pickVf(v){
  if(!quiz||quiz.picked!==null||quiz.i>=quiz.items.length) return;
  const it = quiz.items[quiz.i], ok = (v===1) === (it.s===0); it.v = v;
  settle(ok ? 0 : -2, ok, v ? `Vrai (« ${it.q.o[it.s]} » serait la bonne réponse)` : `Faux (« ${it.q.o[it.s]} » ne serait pas la bonne réponse)`);
}
function pickTxt(vals){
  if(!quiz||quiz.picked!==null||quiz.i>=quiz.items.length) return;
  const it = quiz.items[quiz.i], T = trous(it.q.o[0]); it.vals = vals;
  const ok = T.nums.every((n,i) => numEq(vals[i]||"", n));
  settle(ok ? 0 : -2, ok, T.parts.map((p,i) => p + (i < T.nums.length ? `<b>${esc(vals[i]||"…")}</b>` : "")).join(""));
}
/* Texte à trous compté faux à cause d'une faute de frappe : on rectifie */
function countOk(){
  if(!quiz || quiz.picked!==-2 || quiz.sd) return;
  const it = quiz.items[quiz.i], q = it.q, p = S.qp[q.id]; if(it.fmt!=="txt" || !p) return;
  S.qp[q.id] = {...p, ok:true, c:(p.c||0)+1, ...sched(it.prev, true)};
  quiz.picked = 0; quiz.score++; quiz.wrong = quiz.wrong.filter(x => x!==q);
  const l = quiz.log[quiz.log.length-1]; if(l){ l.a = 0; l.as = null; }
  save(); render();
}
function settle(picked, ok, as){
  if(!quiz||quiz.picked!==null||quiz.i>=quiz.items.length) return;
  if(qTimer){ clearInterval(qTimer); qTimer = null; }
  quiz.qEnd = null; quiz.qLeft = null;
  const it = quiz.items[quiz.i], q = it.q; quiz.picked = picked; it.as = ok ? null : as;
  it.prev = S.qp[q.id] ? {...S.qp[q.id]} : null; it.conf = "sur";
  recordQ(q, ok); (quiz.log=quiz.log||[]).push({q, a: picked===-1 ? null : ok ? 0 : picked, as: it.as});
  if(ok) quiz.score++; else quiz.wrong.push(q);
  if(quiz.sd){
    if(quiz.score > (S.sd[quiz.sd]||0)) S.sd[quiz.sd] = quiz.score;
    if(!ok) quiz.items = quiz.items.slice(0, quiz.i+1); // fin de la série
  }
  save(); render();
}
/* Sûr / Hésitant : ne s'affiche qu'après une bonne réponse */
function setConf(c){
  if(!quiz || quiz.picked!==0) return;
  const it = quiz.items[quiz.i], p = S.qp[it.q.id]; if(!p || it.conf===c) return;
  it.conf = c;
  Object.assign(p, c==="hes" ? schedHesitant(it.prev) : sched(it.prev, true));
  save(); render();
}
function toggleFav(){
  if(!quiz || quiz.empty || quiz.i>=quiz.items.length) return;
  const id = quiz.items[quiz.i].q.id;
  S.fav[id] = isFav(id) ? -Date.now() : Date.now(); save(); render();
}
function openRep(){ if(!quiz || quiz.empty || quiz.i>=quiz.items.length) return; quiz.repOpen = !quiz.repOpen; render(); const t = $("#qrepn"); if(t) t.focus(); }
function next(){ if(quiz&&quiz.picked!==null){ quiz.i++; quiz.picked=null; quiz.repOpen=false; quiz.qLeft=null; render(); } }

function bindQcm(){
  bindChips(render);
  const qn=$("#qn"); if(qn) qn.onclick=e=>{const b=e.target.closest("[data-n]"); if(b){qcmSetup.n=+b.dataset.n; saveSetup(); render();}};
  const qm=$("#qm"); if(qm) qm.onclick=e=>{const b=e.target.closest("[data-m]"); if(b){qcmSetup.mode=b.dataset.m; saveSetup(); render();}};
  const qf=$("#qf"); if(qf) qf.onclick=e=>{const b=e.target.closest("[data-f]"); if(b){qcmSetup.fmt=b.dataset.f; saveSetup(); render();}};
  const qt=$("#qt"); if(qt) qt.onclick=e=>{const b=e.target.closest("[data-tm]"); if(b){qcmSetup.t=+b.dataset.tm; saveSetup(); render();}};
  const fv=$("#qfav"); if(fv) fv.onclick=toggleFav;
  const rp=$("#qrep"); if(rp) rp.onclick=openRep;
  const rk=$("#qrepk"); if(rk) rk.onclick=e=>{ const b=e.target.closest("[data-k]"); if(!b) return; quiz.repKind=b.dataset.k; rk.querySelectorAll("[data-k]").forEach(x=>x.setAttribute("aria-pressed", x===b)); };
  const rf=$("#qrepf"); if(rf) rf.onsubmit=e=>{
    e.preventDefault(); const q=quiz.items[quiz.i].q;
    S.rep = [...S.rep.filter(r=>r.id!==q.id), {id:q.id, t:q.t, q:q.q.replace(/<[^>]+>/g,""), kind:quiz.repKind==="doute"?"doute":"err", note:$("#qrepn").value.trim(), at:Date.now()}];
    quiz.repOpen=false; save(); render();
  };
  const rc=$("#qrepc"); if(rc) rc.onclick=()=>{ quiz.repOpen=false; render(); };
  const cf=$("#qconf"); if(cf) cf.onclick=e=>{ const b=e.target.closest("[data-c]"); if(b) setConf(b.dataset.c); };
  const sa=$("#qsdagain"); if(sa) sa.onclick=()=>{ const th=quiz.sd.split("+"); startQuiz(th, 0, "sd", qcmSetup.off, quiz.t); render(); };
  const qs=$("#qsrc"); if(qs){
    qs.ontoggle=()=>{ qcmSetup.srcOpen=qs.open; };
    qs.onchange=e=>{ const v=e.target.value; if(!v) return; const o=qcmSetup.off.filter(k=>k!==v); qcmSetup.off = e.target.checked ? o : [...o, v]; qcmSetup.srcOpen=true; saveSetup(); render(); };
    qs.onclick=e=>{
      const b=e.target.closest("[data-sall],[data-snone]"); if(!b) return;
      const t=b.dataset.sall||b.dataset.snone, keys=[...qs.querySelectorAll("input")].map(i=>i.value).filter(k=>k.startsWith(t+"|"));
      qcmSetup.off = qcmSetup.off.filter(k=>!keys.includes(k)); if(b.dataset.snone) qcmSetup.off.push(...keys);
      qcmSetup.srcOpen=true; saveSetup(); render();
    };
    const cl=$("#qsrc-clear"); if(cl) cl.onclick=()=>{ qcmSetup.off=[]; saveSetup(); render(); };
  }
  const go=$("#qgo"); if(go) go.onclick=()=>launch(curCfg());
  const ps=$("#psave"); if(ps) ps.onclick=()=>{ qcmSetup.pform=true; render(); const i=$("#pname"); if(i){ i.focus(); i.select(); } };
  const pf=$("#pform"); if(pf) pf.onsubmit=e=>{
    e.preventDefault();
    const name = $("#pname").value.trim() || cfgName(curCfg());
    S.presets = [...S.presets.filter(f=>f.name!==name), {name, ...curCfg()}].slice(-8);
    qcmSetup.pform=false; save(); render();
  };
  const pc=$("#pcancel"); if(pc) pc.onclick=()=>{ qcmSetup.pform=false; render(); };
  document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>launch(S.presets[+b.dataset.p]));
  document.querySelectorAll("[data-pdel]").forEach(b=>b.onclick=()=>{ S.presets.splice(+b.dataset.pdel,1); save(); render(); });
  document.querySelectorAll(".opt[data-oi]").forEach(b=>b.onclick=()=>pick(+b.dataset.oi));
  document.querySelectorAll(".opt[data-vf]").forEach(b=>b.onclick=()=>pickVf(+b.dataset.vf));
  const tx=$("#qtxt"); if(tx && quiz && quiz.picked===null){
    tx.onsubmit=e=>{ e.preventDefault(); const hs=[...tx.querySelectorAll(".hole")], vals=hs.map(i=>i.value);
      const empty=hs.find(i=>!i.value.trim()); if(empty){ empty.focus(); return; } pickTxt(vals); };
    const h=tx.querySelector(".hole"); if(h) h.focus({preventScroll:true});
  }
  const fc=$("#qforce"); if(fc) fc.onclick=countOk;
  const nx=$("#qnext"); if(nx){ nx.onclick=next; nx.focus({preventScroll:true}); }
  const st=$("#qstop"); if(st) st.onclick=()=>{ quiz=null; render(); };
  const bk=$("#qback"); if(bk) bk.onclick=()=>{ quiz=null; render(); };
  const ag=$("#qagain"); if(ag) ag.onclick=()=>{ quiz=null; render(); };
  const er=$("#qerr"); if(er) er.onclick=()=>{ const w=quiz.wrong; quiz={items:w.map(q=>({q,order:shuffle(q.o.map((_,i)=>i))})),i:0,picked:null,score:0,wrong:[],t:quiz.t}; render(); };
  qtStart();
}

/* ---------- Cartes ---------- */
let deck = null;
let cardMode = "todo";
function startDeck(){
  let pool = visF().filter(f=>activeThemes().includes(f.t));
  if(cardMode==="todo") pool = pool.filter(f=>S.fs[f.id] ? isDue(S.fs[f.id]) : !S.fp[f.id]);
  deck = {items:shuffle(pool), i:0, flip:false, known:0};
}
function vCartes(){
  if(!deck) return `
    <section style="display:grid;gap:8px"><span class="label">Cartes mémoire · ${LV[S.obj]}</span><h2>Cartes mémoire</h2><p class="lead">Lis la question, essaie de répondre de tête, retourne la carte puis indique si tu savais. Une carte que tu savais revient dans 1, 3, 7, 14 puis 30 jours ; une carte ratée revient le lendemain.</p></section>
    <div class="panel">
      <span class="label">Thèmes</span>${themeChips()}
      <span class="label">Paquet</span>
      <div class="chips" id="cm">${[["todo","À revoir aujourd'hui"],["all","Toutes les cartes"]].map(([k,v])=>`<button type="button" class="chip" data-m="${k}" aria-pressed="${cardMode===k}">${v}</button>`).join("")}</div>
      <div><button type="button" class="btn primary" id="cgo">Commencer</button></div>
    </div>`;
  if(!deck.items.length) return `<div class="empty">Aucune carte à revoir aujourd'hui dans ces thèmes. Reviens demain, ou prends « Toutes les cartes ».<br><br><button type="button" class="btn" id="cback">Changer de paquet</button></div>`;
  if(deck.i>=deck.items.length) return `<section class="panel"><span class="label">Paquet terminé</span><div class="score num">${deck.known}<span style="font-size:1.6rem"> / ${deck.items.length}</span></div><p class="lead">cartes connues sur ce passage.</p><div class="row"><button type="button" class="btn primary" id="cback">Nouveau paquet</button></div></section>`;
  const c = deck.items[deck.i];
  return `<section style="display:grid;gap:14px">
    <div class="qhead"><span class="label">${badge(c.t)} ${TH[c.t].n}</span><span class="num muted">${deck.i+1} / ${deck.items.length}</span></div>
    <div class="flash ${deck.flip?"on":""}" id="flash" role="button" tabindex="0" aria-label="Retourner la carte">
      <div class="flash-in">
        <div class="face"><span class="label">Question</span><div class="big">${c.f}</div><span class="muted" style="font-size:.85rem">Touche la carte pour la retourner<span class="kbd-hint"> (ou Espace)</span></span></div>
        <div class="face back"><span class="label">Réponse</span><div class="ans">${c.b}</div></div>
      </div>
    </div>
    <div class="row">${deck.flip?`<button type="button" class="btn" id="cno">À revoir <kbd class="muted">1</kbd></button><button type="button" class="btn primary" id="cyes">Je savais <kbd>2</kbd></button>`:`<button type="button" class="btn primary" id="cflip">Retourner</button>`}<button type="button" class="btn" id="cstop">Arrêter</button></div>
  </section>`;
}
function cardAnswer(known){
  if(!deck||!deck.flip) return;
  const c=deck.items[deck.i];
  if(known){ S.fp[c.id]=true; deck.known++; } else delete S.fp[c.id];
  const p = S.fs[c.id]; S.fs[c.id] = {n:(p?p.n:0)+1, ...sched(p, known)}; tick();
  save(); deck.i++; deck.flip=false; render();
}
function flip(){ if(deck&&deck.i<deck.items.length){ deck.flip=!deck.flip; render(); } }
function bindCartes(){
  bindChips(render);
  const cm=$("#cm"); if(cm) cm.onclick=e=>{const b=e.target.closest("[data-m]"); if(b){cardMode=b.dataset.m; render();}};
  const go=$("#cgo"); if(go) go.onclick=()=>{ startDeck(); render(); };
  const fl=$("#flash"); if(fl) fl.onclick=flip;
  const cf=$("#cflip"); if(cf) cf.onclick=flip;
  const y=$("#cyes"); if(y) y.onclick=()=>cardAnswer(true);
  const n=$("#cno"); if(n) n.onclick=()=>cardAnswer(false);
  ["#cstop","#cback"].forEach(s=>{ const b=$(s); if(b) b.onclick=()=>{ deck=null; render(); }; });
}

/* ---------- Fiches ---------- */
function vFiches(){
  const act = activeThemes();
  const list = FICHES.filter(lvOk).filter(f=>act.includes(f.t));
  return `<section style="display:grid;gap:8px"><span class="label">Fiches · ${LV[S.obj]}</span><h2>Fiches de cours</h2><p class="lead">L'essentiel à connaître par thème. Ouvre une fiche, relis-la, puis vérifie-toi avec le quiz du thème.</p></section>
  ${themeChips()}
  <div style="display:grid;gap:10px">${list.map((f,i)=>`<details class="fiche" id="fiche-${i}"><summary>${badge(f.t)}<h3>${f.n}</h3></summary><div class="body">${f.h}<div><button type="button" class="btn" data-quiz="${f.t}">Quiz ${TH[f.t].n}</button></div></div></details>`).join("") || `<div class="empty">Aucune fiche pour ce choix.</div>`}</div>`;
}
function bindFiches(){
  bindChips(render);
  document.querySelectorAll("[data-quiz]").forEach(b=>b.onclick=()=>{ startQuiz([b.dataset.quiz],10,"all"); location.hash="qcm"; });
}

/* ---------- Cas pratiques ---------- */
let casRun = null;
function vCas(){
  const list = CAS.filter(lvOk).filter(c=>activeThemes().includes(c.t));
  if(!casRun) return `<section style="display:grid;gap:8px"><span class="label">Cas pratiques · ${LV[S.obj]}</span><h2>Mises en situation</h2><p class="lead">Une intervention se déroule étape par étape. À chaque étape, choisis la bonne conduite.</p></section>
    ${themeChips()}
    <div class="cases">${list.map(c=>`<button type="button" class="case" data-c="${c.id}">${badge(c.t)}<h3>${c.n}</h3><span class="muted">${c.steps.length} étapes</span>${S.cp[c.id]!=null?`<span class="done">Meilleur score : ${S.cp[c.id]} / ${c.steps.length}</span>`:""}</button>`).join("") || `<div class="empty">Aucun cas pour ce choix.</div>`}</div>`;
  const c = casRun.c;
  if(casRun.i>=c.steps.length) return `<section class="panel"><span class="label">${badge(c.t)} ${c.n}</span><div class="score num">${casRun.score}<span style="font-size:1.6rem"> / ${c.steps.length}</span></div><p class="lead">bonnes décisions.</p><div class="row"><button type="button" class="btn primary" id="cas-back">Autres cas</button><button type="button" class="btn" id="cas-again">Recommencer</button></div></section>`;
  const st = c.steps[casRun.i], done = casRun.picked!==null;
  return `<section style="display:grid;gap:14px">
    <div class="qhead"><span class="label">${badge(c.t)} ${c.n}</span><span class="num muted">Étape ${casRun.i+1} / ${c.steps.length}</span></div>
    ${casRun.i===0?`<p class="lead">${c.intro}</p>`:""}
    <div class="scene">${st.s}</div>
    <p class="question">${st.q}</p>
    <div class="opts">${casRun.order.map((oi,k)=>{ let cls="opt"; if(done){ if(oi===0) cls+=" right"; else if(oi===casRun.picked) cls+=" wrong"; } return `<button type="button" class="${cls}" data-oi="${oi}" ${done?"disabled":""}><kbd>${k+1}</kbd><span>${st.o[oi]}</span></button>`; }).join("")}</div>
    ${done?`<div class="explain ${casRun.picked===0?"":"no"}"><b>${casRun.picked===0?"Bonne décision":"Conduite attendue : "+st.o[0]}</b>${explainBody(st)}</div><div><button type="button" class="btn primary" id="cas-next">${casRun.i+1<c.steps.length?"Étape suivante":"Voir le bilan"}</button></div>`:""}
    <div><button type="button" class="btn" id="cas-back">Quitter le cas</button></div>
  </section>`;
}
function casStart(c){ casRun={c,i:0,picked:null,score:0,order:shuffle(c.steps[0].o.map((_,i)=>i))}; }
function casPick(oi){
  if(!casRun||casRun.picked!==null||casRun.i>=casRun.c.steps.length) return;
  casRun.picked=oi; if(oi===0) casRun.score++; tick();
  if(casRun.i===casRun.c.steps.length-1){ const id=casRun.c.id; S.cp[id]=Math.max(S.cp[id]??0,casRun.score); }
  save();
  render();
}
function casNext(){ if(!casRun||casRun.picked===null) return; casRun.i++; casRun.picked=null; if(casRun.i<casRun.c.steps.length) casRun.order=shuffle(casRun.c.steps[casRun.i].o.map((_,i)=>i)); render(); }
function bindCas(){
  bindChips(render);
  document.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{ casStart(CAS.find(c=>c.id===b.dataset.c)); render(); });
  document.querySelectorAll(".opt").forEach(b=>b.onclick=()=>casPick(+b.dataset.oi));
  const nx=$("#cas-next"); if(nx){ nx.onclick=casNext; nx.focus({preventScroll:true}); }
  const bk=$("#cas-back"); if(bk) bk.onclick=()=>{ casRun=null; render(); };
  const ag=$("#cas-again"); if(ag) ag.onclick=()=>{ casStart(casRun.c); render(); };
}

/* ---------- Examen blanc ----------
   Questions tirées dans tous les thèmes de l'objectif, chrono, pas de correction avant la fin, note sur 20. */
let exam = null, exTimer = null;
let exSetup = {n:20, min:30};
const fmtTime = ms => { const s = Math.max(0, Math.ceil(ms/1000)); return pad(Math.floor(s/60))+":"+pad(s%60); };
const noteFr = n => String(n).replace(".", ",");
function startExam(){
  const pool = shuffle(visQ()).slice(0, exSetup.n);
  exam = {items:pool.map(q=>({q, order:shuffle(q.o.map((_,i)=>i)), a:null})), i:0, start:Date.now(), end:Date.now()+exSetup.min*60000, min:exSetup.min, done:false, confirm:false};
  runExamTimer();
}
function runExamTimer(){
  clearInterval(exTimer); let k = 0;
  exTimer = setInterval(() => {
    if(!exam || exam.done){ clearInterval(exTimer); return; }
    const left = exam.end - Date.now();
    if(left <= 0){ finishExam(true); return; }
    const el = $("#extime"); if(el){ el.textContent = fmtTime(left); el.classList.toggle("low", left < 60000); }
    if(++k % 10 === 0) saveRun(); // temps restant gardé toutes les 5 s
  }, 500);
}
function finishExam(timeout){
  if(!exam || exam.done) return;
  clearInterval(exTimer);
  const n = exam.items.length, ok = exam.items.filter(it=>it.a===0).length;
  exam.done = true; exam.timeout = !!timeout;
  exam.used = Math.min(Date.now(), exam.end) - exam.start;
  exam.note = Math.round(ok*20/n*10)/10; exam.ok = ok;
  exam.items.forEach(it => { if(it.a!==null) recordQ(it.q, it.a===0); });
  S.ex.push({d:Date.now(), n, ok, note:exam.note, min:exam.min, used:Math.round(exam.used/1000)});
  if(S.ex.length > 100) S.ex = S.ex.slice(-100);
  save();
  if(route()==="examen") render();
}
function exAnswer(oi){ if(!exam||exam.done) return; exam.items[exam.i].a = oi; exam.confirm = false; render(); }
function exGo(i){ if(!exam||exam.done) return; exam.i = Math.max(0, Math.min(exam.items.length-1, i)); exam.confirm = false; render(); }
function exHistory(){
  if(!S.ex.length) return "";
  const last = S.ex.slice(-8).reverse();
  const best = Math.max(...S.ex.map(e=>e.note));
  return `<section style="display:grid;gap:10px"><h3>Mes examens blancs</h3>
    <p class="muted">Meilleure note : <b class="num">${noteFr(best)} / 20</b> · ${S.ex.length} examen${S.ex.length>1?"s":""} passé${S.ex.length>1?"s":""}</p>
    <div class="themes">${last.map(e => `<div class="trow ex-row"><div class="name"><div>${new Date(e.d).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}<small>${e.ok} / ${e.n} bonnes réponses · ${Math.round(e.used/60)} min sur ${e.min}</small></div></div><div class="bar" title="${noteFr(e.note)} / 20"><i style="width:${e.note*5}%"></i></div><b class="num">${noteFr(e.note)}</b></div>`).join("")}</div></section>`;
}
function vExamen(){
  const avail = visQ().length;
  if(!exam) return `
    <section style="display:grid;gap:8px"><span class="label">Examen blanc · ${LV[S.obj]}</span><h2>Examen blanc</h2>
    <p class="lead">Conditions d'épreuve : questions tirées au hasard dans tous les thèmes, chrono, aucune correction avant de rendre la copie. Note sur 20, sans points négatifs. Tu peux revenir sur une question tant que tu n'as pas rendu.</p></section>
    <div class="panel">
      <span class="label">Nombre de questions</span>
      <div class="chips" id="exn">${[20,40,60].map(n=>`<button type="button" class="chip" data-n="${n}" aria-pressed="${exSetup.n===n}" ${n>avail?"disabled":""}>${n}</button>`).join("")}</div>
      <span class="label">Durée</span>
      <div class="chips" id="exm">${[15,30,45,60].map(m=>`<button type="button" class="chip" data-m="${m}" aria-pressed="${exSetup.min===m}">${m} min</button>`).join("")}</div>
      <p class="muted" style="font-size:.9rem">${avail} questions disponibles pour l'objectif « ${LV[S.obj]} ». Le format officiel (nombre de questions, durée, barème) est fixé par l'arrêté d'ouverture du concours : règle l'examen dessus.</p>
      <div><button type="button" class="btn primary" id="exgo" ${avail?"":"disabled"}>Commencer l'examen</button></div>
    </div>
    ${exHistory()}`;
  const n = exam.items.length;
  if(exam.done){
    const miss = exam.items.filter(it=>it.a!==0);
    const pctOk = Math.round(100*exam.ok/n);
    return `<section class="panel">
      <span class="label">Examen blanc · ${exam.timeout?"temps écoulé":"copie rendue"}</span>
      <div class="score num">${noteFr(exam.note)}<span style="font-size:1.6rem"> / 20</span></div>
      <p class="lead">${exam.ok} bonnes réponses sur ${n} (${pctOk} %) en ${Math.round(exam.used/60000)} min. ${exam.note>=14?"Très bon niveau : continue à t'entraîner en conditions réelles.":exam.note>=10?"La moyenne est là. Reprends les questions ratées ci-dessous.":"En dessous de la moyenne : travaille les thèmes faibles avec les révisions du jour, puis refais un examen."}</p>
      <p class="muted" style="font-size:.9rem">Les questions ratées reviendront dans tes révisions du jour.</p>
      <div class="row"><button type="button" class="btn primary" id="exnew">Nouvel examen</button><a class="btn" href="#accueil">Tableau de bord</a></div>
    </section>
    ${corrList(exam.items,"Correction")}`;
  }
  const it = exam.items[exam.i], q = it.q;
  const answered = exam.items.filter(x=>x.a!==null).length;
  return `<section style="display:grid;gap:14px">
    <div class="qhead"><span class="label">Examen blanc · question ${exam.i+1} / ${n}</span><span class="timer num" id="extime" aria-label="Temps restant">${fmtTime(exam.end-Date.now())}</span></div>
    <div class="progress"><i style="width:${100*answered/n}%"></i></div>
    <p class="question">${q.q}</p>
    <div class="opts">${it.order.map((oi,k)=>`<button type="button" class="opt ${it.a===oi?"sel":""}" data-oi="${oi}" aria-pressed="${it.a===oi}"><kbd>${k+1}</kbd><span>${q.o[oi]}</span></button>`).join("")}</div>
    <div class="row"><button type="button" class="btn" id="exprev" ${exam.i?"":"disabled"}>Précédente</button><button type="button" class="btn ${it.a!==null?"primary":""}" id="exnext" ${exam.i<n-1?"":"disabled"}>Suivante</button><span class="muted kbd-hint" style="font-size:.85rem">Touches 1 à 4, flèches ← →</span></div>
    <div class="qgrid" id="exgrid" aria-label="Aller à la question">${exam.items.map((x,k)=>`<button type="button" data-k="${k}" class="${x.a!==null?"done":""} ${k===exam.i?"cur":""}" aria-label="Question ${k+1}${x.a!==null?", répondue":""}">${k+1}</button>`).join("")}</div>
    <div class="confirm">${exam.confirm
      ? `<span>${n-answered} question${n-answered>1?"s":""} sans réponse. Rendre quand même ?</span><button type="button" class="btn primary" id="exyes">Rendre la copie</button><button type="button" class="btn" id="exno">Continuer</button>`
      : `<button type="button" class="btn ${answered===n?"primary":""}" id="exend">Rendre la copie (${answered} / ${n})</button>`}</div>
  </section>`;
}
function bindExamen(){
  const xn=$("#exn"); if(xn) xn.onclick=e=>{const b=e.target.closest("[data-n]"); if(b&&!b.disabled){exSetup.n=+b.dataset.n; render();}};
  const xm=$("#exm"); if(xm) xm.onclick=e=>{const b=e.target.closest("[data-m]"); if(b){exSetup.min=+b.dataset.m; render();}};
  const go=$("#exgo"); if(go) go.onclick=()=>{ startExam(); render(); };
  const nw=$("#exnew"); if(nw) nw.onclick=()=>{ exam=null; render(); };
  if(!exam || exam.done) return;
  document.querySelectorAll(".opt").forEach(b=>b.onclick=()=>exAnswer(+b.dataset.oi));
  $("#exprev").onclick=()=>exGo(exam.i-1);
  $("#exnext").onclick=()=>exGo(exam.i+1);
  $("#exgrid").onclick=e=>{ const b=e.target.closest("[data-k]"); if(b) exGo(+b.dataset.k); };
  const end=$("#exend"); if(end) end.onclick=()=>{ if(exam.items.every(x=>x.a!==null)) finishExam(false); else { exam.confirm=true; render(); } };
  const y=$("#exyes"); if(y) y.onclick=()=>finishExam(false);
  const no=$("#exno"); if(no) no.onclick=()=>{ exam.confirm=false; render(); };
}

/* ---------- Rendu ---------- */
const VIEWS = {niveau:[vNiveau,bindNiveau], signalements:[vSignalements,bindSignalements], accueil:[vAccueil,bindAccueil], qcm:[vQcm,bindQcm], cartes:[vCartes,bindCartes], fiches:[vFiches,bindFiches], cas:[vCas,bindCas], examen:[vExamen,bindExamen], reglages:[vReglages,bindReglages]};
function render(){
  qtStop();
  renderTabs(); renderStreak();
  const [v,b] = VIEWS[route()];
  $("#view").innerHTML = v(); b();
  saveRun();
}
/* Sessions en cours gardées sur l'appareil (départ en intervention, appli fermée…) puis retrouvées à la réouverture.
   L'examen blanc garde son temps restant : le chrono est en pause tant que l'appli est fermée. */
const QBY = new Map(ALLQ.map(q=>[q.id,q])), FBY = new Map(ALLF.map(f=>[f.id,f]));
ROUTES.mesq = "Mes questions"; VIEWS.mesq = [vMesq, bindMesq]; VIEWS.oral = [vOral, bindOral];
injectMine();
function saveRun(){
  const r = {};
  if(quizRunning()) r.quiz = {items:quiz.items.map(it=>[it.q.id,it.order,it.fmt||"qcm",it.s??null,it.v??null,it.vals||null,it.as||null]), i:quiz.i, picked:quiz.picked, score:quiz.score, wrong:quiz.wrong.map(q=>q.id), log:(quiz.log||[]).map(x=>[x.q.id,x.a,x.as||null]), t:quiz.t||0, sd:quiz.sd||"", rec0:quiz.rec0||0};
  if(deck && deck.i < deck.items.length) r.deck = {ids:deck.items.map(c=>c.id), i:deck.i, flip:deck.flip, known:deck.known};
  if(casRun && casRun.i < casRun.c.steps.length) r.cas = {id:casRun.c.id, i:casRun.i, picked:casRun.picked, score:casRun.score, order:casRun.order};
  if(exam && !exam.done) r.exam = {items:exam.items.map(it=>[it.q.id,it.order,it.a]), i:exam.i, left:exam.end-Date.now(), min:exam.min};
  LS.set("run", r);
}
function restoreRun(){
  const r = LS.get("run", {}) || {};
  try{
    if(r.quiz){
      const items = r.quiz.items.map(([id,order,fmt,s,v,vals,as])=>({q:QBY.get(id), order, fmt:fmt||"qcm", s:s??undefined, v:v??undefined, vals:vals||undefined, as:as||null}));
      if(items.every(it=>it.q) && r.quiz.i < items.length) quiz = {items, i:r.quiz.i, picked:r.quiz.picked, score:r.quiz.score,
        wrong:r.quiz.wrong.map(id=>QBY.get(id)).filter(Boolean), log:r.quiz.log.map(([id,a,as])=>({q:QBY.get(id), a, as})).filter(x=>x.q), t:r.quiz.t||0, sd:r.quiz.sd||undefined, rec0:r.quiz.rec0||0};
    }
    if(r.deck){ const items = r.deck.ids.map(id=>FBY.get(id)); if(items.every(Boolean)) deck = {items, i:r.deck.i, flip:r.deck.flip, known:r.deck.known}; }
    if(r.cas){ const c = CAS.find(x=>x.id===r.cas.id); if(c) casRun = {c, i:r.cas.i, picked:r.cas.picked, score:r.cas.score, order:r.cas.order}; }
    if(r.exam){
      const items = r.exam.items.map(([id,order,a])=>({q:QBY.get(id), order, a}));
      if(items.every(it=>it.q)){
        const left = Math.max(1000, r.exam.left), now = Date.now();
        exam = {items, i:r.exam.i, min:r.exam.min, end:now+left, start:now+left-r.exam.min*60000, done:false, confirm:false};
        runExamTimer();
      }
    }
  }catch(e){ quiz = deck = casRun = exam = null; }
}
window.addEventListener("pagehide", saveRun);
/* Touches de réponse : 1 à 4 ou A à D */
const keyIdx = k => /^[1-4]$/.test(k) ? +k-1 : /^[a-d]$/i.test(k) ? k.toLowerCase().charCodeAt(0)-97 : -1;
document.addEventListener("visibilitychange", () => { if(document.visibilityState==="hidden"){ qtStop(); saveRun(); } else qtStart(); });
document.addEventListener("keydown", e => {
  if((e.target.closest && e.target.closest("input,textarea,select")) || e.ctrlKey || e.metaKey || e.altKey) return;
  const r = route(), kx = keyIdx(e.key);
  if(r==="qcm" && quiz && !quiz.empty && quiz.i<quiz.items.length){
    const it=quiz.items[quiz.i], key=e.key.toLowerCase();
    if(e.key==="Escape" && quiz.repOpen){ quiz.repOpen=false; render(); }
    else if(kx>=0 && quiz.picked===null){ const f=it.fmt||"qcm"; if(f==="vf"){ if(kx<2){ e.preventDefault(); pickVf(kx===0?1:0); } } else if(f==="qcm" && kx<it.order.length){ e.preventDefault(); pick(it.order[kx]); } }
    else if((e.key==="Enter" || e.key===" ") && quiz.picked!==null){ e.preventDefault(); next(); }
    else if(key==="f"){ e.preventDefault(); toggleFav(); }
    else if(key==="s"){ e.preventDefault(); openRep(); }
    else if(key==="h" && quiz.picked===0){ e.preventDefault(); setConf(quiz.items[quiz.i].conf==="hes"?"sur":"hes"); }
  }
  if(r==="cas" && casRun && casRun.i<casRun.c.steps.length){
    if(kx>=0 && casRun.picked===null){ if(kx<casRun.order.length){ e.preventDefault(); casPick(casRun.order[kx]); } }
    else if((e.key==="Enter" || e.key===" ") && casRun.picked!==null){ e.preventDefault(); casNext(); }
  }
  if(r==="examen" && exam && !exam.done){
    const it=exam.items[exam.i];
    if(kx>=0){ if(kx<it.order.length){ e.preventDefault(); exAnswer(it.order[kx]); } }
    else if(e.key==="ArrowRight"){ e.preventDefault(); exGo(exam.i+1); }
    else if(e.key==="ArrowLeft"){ e.preventDefault(); exGo(exam.i-1); }
  }
  if(r==="cartes" && deck && deck.i<deck.items.length){
    if(e.key===" "){ e.preventDefault(); flip(); }
    else if(deck.flip && e.key==="1") cardAnswer(false);
    else if(deck.flip && e.key==="2") cardAnswer(true);
  }
});
window.addEventListener("hashchange", () => { moreOpen = false; render(); window.scrollTo(0,0); });
restoreRun(); applyTheme(); renderObj(); render();
