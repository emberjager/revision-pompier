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
  ex: LS.get("ex",[])    // examens blancs : [{d, n, ok, note, min, used}]
};
// Thèmes ajoutés depuis la dernière visite : cochés d'office (OLD_TH = thèmes de la V1).
const OLD_TH = ["suap","inc","div","sr","fdf","cult","com"];
const withNewThemes = (themes, known) => [...themes, ...Object.keys(TH).filter(t => !known.includes(t) && !themes.includes(t))];
S.themes = withNewThemes(S.themes, LS.get("thk", OLD_TH)); LS.set("thk", Object.keys(TH));
const KEYS = ["obj","themes","qp","fp","cp","fs","days","goal","ex"];
const save = () => { KEYS.forEach(k => LS.set(k, S[k])); if (window.onLocalSave) window.onLocalSave(); };

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
function sched(p, ok){ const box = ok ? Math.min(boxOf(p)+1, 5) : 0; return {box, due: addDays(today(), ok ? INTERVALS[box] : 1)}; }
function tick(k=1){ const d = today(); S.days[d] = (S.days[d]||0) + k; }
function recordQ(q, ok){
  const p = S.qp[q.id] || {n:0, c:0};
  S.qp[q.id] = {ok, n:p.n+1, c:p.c+(ok?1:0), ...sched(p, ok)}; tick();
}
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

/* ---------- En-tête : objectif et onglets ---------- */
function renderObj(){
  $("#obj").innerHTML = Object.entries(LV).map(([k,v]) => `<button type="button" id="obj-${k}" data-obj="${k}" aria-pressed="${S.obj===k}">${v}</button>`).join("");
}
$("#obj").addEventListener("click", e => {
  const b = e.target.closest("button[data-obj]"); if(!b) return;
  S.obj = b.dataset.obj; save(); renderObj(); quiz=null; deck=null; casRun=null; render();
});
const ROUTES = {accueil:"Tableau de bord", qcm:"QCM", cartes:"Cartes", fiches:"Fiches", cas:"Cas pratiques", examen:"Examen blanc"};
function route(){ const h=location.hash.slice(1); return ROUTES[h]?h:"accueil"; }
function renderTabs(){
  const r = route();
  $("#tabs").innerHTML = Object.entries(ROUTES).map(([k,v]) => `<a href="#${k}" ${r===k?'aria-current="page"':''}>${v}</a>`).join("");
}

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
function vAccueil(){
  const qs = visQ(), fs = visF();
  const seen = qs.filter(q=>S.qp[q.id]).length;
  const mastered = qs.filter(q=>boxOf(S.qp[q.id])>=MASTER).length;
  const known = fs.filter(f=>S.fp[f.id]).length;
  const cases = CAS.filter(lvOk); const doneC = cases.filter(c=>S.cp[c.id]!=null).length;
  const errs = qs.filter(q=>S.qp[q.id]&&!S.qp[q.id].ok).length;
  const due = dueQ().length, fresh = qs.length - seen;
  const dueCards = fs.filter(f=>isDue(S.fs[f.id])).length;
  const done = S.days[today()]||0, st = streak();
  const lastEx = S.ex[S.ex.length-1];
  const rows = themesForLevel().map(t => {
    const tq = qs.filter(q=>q.t===t);
    const m = tq.filter(q=>boxOf(S.qp[q.id])>=MASTER).length;
    const prog = tq.filter(q=>S.qp[q.id] && boxOf(S.qp[q.id])<MASTER).length;
    let n = 0, c = 0; tq.forEach(q => { const p=S.qp[q.id]; if(p){ n+=p.n; c+=p.c; } });
    const td = tq.filter(q=>isDue(S.qp[q.id])).length;
    return `<div class="trow"><div class="name">${badge(t)}<div>${TH[t].n}<small>${m} / ${tq.length} maîtrisées${n?` · ${pct(c,n)} % de bonnes réponses`:""}${td?` · <b class="due">${td} à revoir</b>`:""}</small></div></div><div class="bar duo" title="${m} maîtrisées, ${prog} en cours"><i style="width:${pct(m,tq.length)}%"></i><i class="mid" style="width:${pct(prog,tq.length)}%"></i></div><button type="button" class="btn" data-quiz="${t}">Quiz</button></div>`;
  }).join("");
  return `
  <section style="display:grid;gap:8px">
    <span class="label">Objectif : ${LV[S.obj]}</span>
    <h2>Où en es-tu ?</h2>
    <p class="lead">${seen ? `Tu as déjà travaillé ${seen} questions sur ${qs.length}. Une question est maîtrisée quand tu l'as réussie ${MASTER} fois de suite, à quelques jours d'écart.` : `Rien de commencé pour l'instant. Lance les révisions du jour pour faire un premier point.`}</p>
  </section>
  <section class="panel today">
    <div class="today-head">
      <div><span class="label">Aujourd'hui</span><div class="num today-count">${done}<span> / ${S.goal} réponses</span></div></div>
      <div class="streak ${st?"on":""}" title="Jours consécutifs avec l'objectif atteint"><b class="num">${st}</b><span>jour${st>1?"s":""} de série</span></div>
    </div>
    <div class="progress big"><i style="width:${Math.min(100,pct(done,S.goal))}%"></i></div>
    <p class="muted">${done>=S.goal ? "Objectif atteint, bravo. Tu peux continuer, tout compte pour ta mémoire." : due ? `${due} question${due>1?"s":""} à revoir aujourd'hui${fresh?`, et ${fresh} jamais vue${fresh>1?"s":""}`:""}.` : fresh ? `Rien à revoir : place aux ${fresh} questions jamais vues.` : "Rien à revoir aujourd'hui : tout est à jour."}${dueCards?` ${dueCards} carte${dueCards>1?"s":""} à revoir.`:""}</p>
    <div class="row">
      <button type="button" class="btn primary" data-quiz="day" ${due||fresh?"":"disabled"}>Révisions du jour</button>
      ${dueCards?`<button type="button" class="btn" id="go-cards">Cartes à revoir (${dueCards})</button>`:""}
    </div>
    <div class="row goal"><span class="label">Objectif quotidien</span><div class="chips" id="goal">${[10,20,40,60].map(n=>`<button type="button" class="chip" data-g="${n}" aria-pressed="${S.goal===n}">${n}</button>`).join("")}</div></div>
  </section>
  <div class="stats">
    <div class="stat"><b class="num">${mastered}<span style="font-size:1rem"> / ${qs.length}</span></b><span>questions maîtrisées</span></div>
    <div class="stat"><b class="num">${known}<span style="font-size:1rem"> / ${fs.length}</span></b><span>cartes connues</span></div>
    <div class="stat"><b class="num">${doneC}<span style="font-size:1rem"> / ${cases.length}</span></b><span>cas pratiques faits</span></div>
    <div class="stat"><b class="num">${lastEx?String(lastEx.note).replace(".",","):"–"}<span style="font-size:1rem"> / 20</span></b><span>dernier examen blanc</span></div>
  </div>
  <div class="row">
    <button type="button" class="btn" data-quiz="mix">Quiz rapide · 10 questions</button>
    <button type="button" class="btn" data-quiz="err" ${errs?"":"disabled"}>Revoir mes erreurs (${errs})</button>
    <a class="btn" href="#examen">Examen blanc</a>
  </div>
  <section style="display:grid;gap:10px"><h3>Par thème</h3>
    <div class="legend muted"><span><i class="sw ok"></i>maîtrisées</span><span><i class="sw mid"></i>en cours</span></div>
    <div class="themes">${rows}</div></section>
  <section style="display:grid;gap:10px"><h3>14 derniers jours</h3>
    <div class="panel">${activity()}<p class="muted" style="font-size:.85rem">Le trait marque ton objectif du jour (${S.goal} réponses). Les jours où il est atteint sont en vert.</p></div></section>
  <section class="panel">
    <h3>Remettre à zéro</h3>
    <p class="muted">Efface tes résultats (QCM, cartes, cas, activité, examens blancs) sur cet appareil et sur ton compte.</p>
    <div class="confirm" id="reset"><button type="button" class="btn" id="reset-ask">Réinitialiser ma progression</button></div>
  </section>`;
}
function bindAccueil(){
  document.querySelectorAll("[data-quiz]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.quiz;
    if(k==="mix") startQuiz(activeThemes(),10,"all");
    else if(k==="day") startQuiz(themesForLevel(),20,"day");
    else if(k==="err") startQuiz(themesForLevel(),999,"err");
    else startQuiz([k],10,"all");
    location.hash="qcm";
  }));
  const gc = $("#go-cards"); if(gc) gc.onclick = () => { cardMode="todo"; startDeck(); location.hash="cartes"; };
  $("#goal").onclick = e => { const b=e.target.closest("[data-g]"); if(b){ S.goal=+b.dataset.g; save(); render(); } };
  $("#reset-ask").addEventListener("click", () => {
    $("#reset").innerHTML = `<span>Tout effacer ?</span><button type="button" class="btn primary" id="reset-yes">Oui, effacer</button><button type="button" class="btn" id="reset-no">Annuler</button>`;
    $("#reset-yes").onclick = () => { S.qp={}; S.fp={}; S.cp={}; S.fs={}; S.days={}; S.ex=[]; if(window.onReset) window.onReset(); save(); render(); };
    $("#reset-no").onclick = render;
  });
}

/* ---------- QCM ---------- */
let quiz = null;
let qcmSetup = {n:10, mode:"all"};
function startQuiz(themes, n, mode){
  let pool = visQ().filter(q=>themes.includes(q.t));
  if(mode==="err") pool = pool.filter(q=>S.qp[q.id]&&!S.qp[q.id].ok);
  if(mode==="new") pool = pool.filter(q=>!S.qp[q.id]);
  if(mode==="due") pool = pool.filter(q=>isDue(S.qp[q.id]));
  if(mode==="day"){
    // Révisions du jour : d'abord les questions arrivées à échéance (les plus en retard en premier), puis des nouvelles.
    const due = shuffle(pool.filter(q=>isDue(S.qp[q.id]))).sort((a,b)=>S.qp[a.id].due<S.qp[b.id].due?-1:S.qp[a.id].due>S.qp[b.id].due?1:0).slice(0,n);
    pool = shuffle([...due, ...shuffle(pool.filter(q=>!S.qp[q.id])).slice(0, n-due.length)]);
  }
  pool = shuffle(pool).slice(0,n);
  quiz = pool.length ? {items:pool.map(q=>({q, order:shuffle(q.o.map((_,i)=>i))})), i:0, picked:null, score:0, wrong:[]} : {empty:true};
}
function vQcm(){
  if(!quiz) return `
    <section style="display:grid;gap:8px"><span class="label">QCM · ${LV[S.obj]}</span><h2>Lancer un quiz</h2><p class="lead">Choisis les thèmes, le nombre de questions et les questions à travailler. Correction et explication après chaque réponse, juste ou fausse, puis correction détaillée à la fin.</p></section>
    <div class="panel">
      <span class="label">Thèmes</span>${themeChips()}
      <span class="label">Nombre de questions</span>
      <div class="chips" id="qn">${[10,20,999].map(n=>`<button type="button" class="chip" data-n="${n}" aria-pressed="${qcmSetup.n===n}">${n===999?"Toutes":n}</button>`).join("")}</div>
      <span class="label">Questions</span>
      <div class="chips" id="qm">${[["all","Toutes"],["due","À revoir aujourd'hui"],["new","Jamais vues"],["err","Mes erreurs"]].map(([k,v])=>`<button type="button" class="chip" data-m="${k}" aria-pressed="${qcmSetup.mode===k}">${v}</button>`).join("")}</div>
      <div><button type="button" class="btn primary" id="qgo">Commencer</button></div>
    </div>`;
  if(quiz.empty) return `<div class="empty">Aucune question ne correspond à ce choix.<br><br><button type="button" class="btn" id="qback">Changer les réglages</button></div>`;
  if(quiz.i >= quiz.items.length){
    const n = quiz.items.length, pct = Math.round(100*quiz.score/n);
    return `<section class="panel">
      <span class="label">Résultat</span>
      <div class="score num">${quiz.score}<span style="font-size:1.6rem"> / ${n}</span></div>
      <p class="lead">${pct>=80?"Solide. Passe à un autre thème ou augmente le nombre de questions.":pct>=50?"Bonne base. Reprends tes erreurs pour consolider.":"Ces notions sont à retravailler : relis la fiche du thème puis refais le quiz."}</p>
      <div class="row"><button type="button" class="btn primary" id="qagain">Nouveau quiz</button>${quiz.wrong.length?`<button type="button" class="btn" id="qerr">Refaire mes erreurs</button>`:""}</div>
    </section>
    ${quiz.log&&quiz.log.length?corrList(quiz.log,"Correction détaillée"):""}`;
  }
  const it = quiz.items[quiz.i], q = it.q, n = quiz.items.length, done = quiz.picked!==null;
  const opts = it.order.map((oi,k) => {
    let cls = "opt";
    if(done){ if(oi===0) cls+=" right"; else if(oi===quiz.picked) cls+=" wrong"; }
    return `<button type="button" class="${cls}" data-oi="${oi}" ${done?"disabled":""}><kbd>${k+1}</kbd><span>${q.o[oi]}</span></button>`;
  }).join("");
  const good = quiz.picked===0;
  return `<section style="display:grid;gap:14px">
    <div class="qhead"><span class="label">${badge(q.t)} ${TH[q.t].n}</span><span class="num muted">${quiz.i+1} / ${n} · ${quiz.score} juste${quiz.score>1?"s":""}</span></div>
    <div class="progress"><i style="width:${100*(quiz.i+(done?1:0))/n}%"></i></div>
    <p class="question">${q.q}</p>
    <div class="opts">${opts}</div>
    ${done?`<div class="explain ${good?"":"no"}" role="status"><b>${good?"✓ Bonne réponse":"✗ Mauvaise réponse"}</b>${good?"":`<p class="ans">Ta réponse : ${q.o[quiz.picked]}</p><p class="ans ok">Bonne réponse : ${q.o[0]}</p>`}${explainBody(q)}</div>
    <div class="row"><button type="button" class="btn primary" id="qnext">${quiz.i+1<n?"Question suivante":"Voir le résultat"}</button><span class="muted" style="font-size:.85rem">Touche Entrée</span></div>`:`<p class="muted" style="font-size:.85rem">Touches 1 à 4 pour répondre.</p>`}
    <div><button type="button" class="btn" id="qstop">Arrêter le quiz</button></div>
  </section>`;
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
  const li = it => `<li><p>${badge(it.q.t)} ${it.q.q}</p>${it.a===0?"":`<p class="yours">${it.a===null||it.a===undefined?"Sans réponse":"Ta réponse : "+it.q.o[it.a]}</p>`}<p>${it.a===0?"✓ ":""}${it.q.o[0]}</p>${explainBody(it.q)}</li>`;
  return `<section style="display:grid;gap:10px"><h3>${title}</h3>
    ${bad.length?`<p class="muted">${bad.length} erreur${bad.length>1?"s":""} à retenir :</p><ul class="errlist">${bad.map(li).join("")}</ul>`:`<p class="muted">Aucune erreur.</p>`}
    ${good.length?`<details class="fiche corr"><summary>Revoir les ${good.length} bonne${good.length>1?"s":""} réponse${good.length>1?"s":""} et leur explication</summary><ul class="errlist">${good.map(li).join("")}</ul></details>`:""}
  </section>`;
}
function pick(oi){
  if(!quiz||quiz.picked!==null||quiz.i>=quiz.items.length) return;
  const q = quiz.items[quiz.i].q; quiz.picked = oi;
  const ok = oi===0; recordQ(q, ok); save(); (quiz.log=quiz.log||[]).push({q, a:oi});
  if(ok) quiz.score++; else quiz.wrong.push(q);
  render();
}
function next(){ if(quiz&&quiz.picked!==null){ quiz.i++; quiz.picked=null; render(); } }
function bindQcm(){
  bindChips(render);
  const qn=$("#qn"); if(qn) qn.onclick=e=>{const b=e.target.closest("[data-n]"); if(b){qcmSetup.n=+b.dataset.n; render();}};
  const qm=$("#qm"); if(qm) qm.onclick=e=>{const b=e.target.closest("[data-m]"); if(b){qcmSetup.mode=b.dataset.m; render();}};
  const go=$("#qgo"); if(go) go.onclick=()=>{ startQuiz(activeThemes(),qcmSetup.n,qcmSetup.mode); render(); };
  document.querySelectorAll(".opt").forEach(b=>b.onclick=()=>pick(+b.dataset.oi));
  const nx=$("#qnext"); if(nx){ nx.onclick=next; nx.focus({preventScroll:true}); }
  const st=$("#qstop"); if(st) st.onclick=()=>{ quiz=null; render(); };
  const bk=$("#qback"); if(bk) bk.onclick=()=>{ quiz=null; render(); };
  const ag=$("#qagain"); if(ag) ag.onclick=()=>{ quiz=null; render(); };
  const er=$("#qerr"); if(er) er.onclick=()=>{ const w=quiz.wrong; quiz={items:w.map(q=>({q,order:shuffle(q.o.map((_,i)=>i))})),i:0,picked:null,score:0,wrong:[]}; render(); };
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
        <div class="face"><span class="label">Question</span><div class="big">${c.f}</div><span class="muted" style="font-size:.85rem">Clique ou appuie sur Espace pour retourner</span></div>
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
  clearInterval(exTimer);
  exTimer = setInterval(() => {
    if(!exam || exam.done){ clearInterval(exTimer); return; }
    const left = exam.end - Date.now();
    if(left <= 0){ finishExam(true); return; }
    const el = $("#extime"); if(el){ el.textContent = fmtTime(left); el.classList.toggle("low", left < 60000); }
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
    <div class="row"><button type="button" class="btn" id="exprev" ${exam.i?"":"disabled"}>Précédente</button><button type="button" class="btn ${it.a!==null?"primary":""}" id="exnext" ${exam.i<n-1?"":"disabled"}>Suivante</button><span class="muted" style="font-size:.85rem">Touches 1 à 4, flèches ← →</span></div>
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
const VIEWS = {accueil:[vAccueil,bindAccueil], qcm:[vQcm,bindQcm], cartes:[vCartes,bindCartes], fiches:[vFiches,bindFiches], cas:[vCas,bindCas], examen:[vExamen,bindExamen]};
function render(){
  renderTabs();
  const [v,b] = VIEWS[route()];
  $("#view").innerHTML = v(); b();
}
document.addEventListener("keydown", e => {
  if(e.target.closest("input,textarea")) return;
  const r = route();
  if(r==="qcm" && quiz && !quiz.empty && quiz.i<quiz.items.length){
    const it=quiz.items[quiz.i];
    if(/^[1-4]$/.test(e.key) && quiz.picked===null){ const k=+e.key-1; if(k<it.order.length){ e.preventDefault(); pick(it.order[k]); } }
    else if(e.key==="Enter" && quiz.picked!==null){ e.preventDefault(); next(); }
  }
  if(r==="cas" && casRun && casRun.i<casRun.c.steps.length){
    if(/^[1-4]$/.test(e.key) && casRun.picked===null){ const k=+e.key-1; if(k<casRun.order.length){ e.preventDefault(); casPick(casRun.order[k]); } }
    else if(e.key==="Enter" && casRun.picked!==null){ e.preventDefault(); casNext(); }
  }
  if(r==="examen" && exam && !exam.done){
    const it=exam.items[exam.i];
    if(/^[1-4]$/.test(e.key)){ const k=+e.key-1; if(k<it.order.length){ e.preventDefault(); exAnswer(it.order[k]); } }
    else if(e.key==="ArrowRight"){ e.preventDefault(); exGo(exam.i+1); }
    else if(e.key==="ArrowLeft"){ e.preventDefault(); exGo(exam.i-1); }
  }
  if(r==="cartes" && deck && deck.i<deck.items.length){
    if(e.key===" "){ e.preventDefault(); flip(); }
    else if(deck.flip && e.key==="1") cardAnswer(false);
    else if(deck.flip && e.key==="2") cardAnswer(true);
  }
});
window.addEventListener("hashchange", () => { render(); window.scrollTo(0,0); });
renderObj(); render();
