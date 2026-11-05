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
  cp: LS.get("cp",{})    // cas : id -> meilleur score
};
const save = () => { LS.set("obj",S.obj); LS.set("themes",S.themes); LS.set("qp",S.qp); LS.set("fp",S.fp); LS.set("cp",S.cp); if (window.onLocalSave) window.onLocalSave(); };

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
const ROUTES = {accueil:"Tableau de bord", qcm:"QCM", cartes:"Cartes", fiches:"Fiches", cas:"Cas pratiques"};
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
function vAccueil(){
  const qs = visQ(), fs = visF();
  const seen = qs.filter(q=>S.qp[q.id]).length;
  const ok = qs.filter(q=>S.qp[q.id]&&S.qp[q.id].ok).length;
  const known = fs.filter(f=>S.fp[f.id]).length;
  const cases = CAS.filter(lvOk); const doneC = cases.filter(c=>S.cp[c.id]!=null).length;
  const errs = qs.filter(q=>S.qp[q.id]&&!S.qp[q.id].ok).length;
  const rows = themesForLevel().map(t => {
    const tq = qs.filter(q=>q.t===t); const tok = tq.filter(q=>S.qp[q.id]&&S.qp[q.id].ok).length;
    const pct = Math.round(100*tok/tq.length);
    return `<div class="trow"><div class="name">${badge(t)}<div>${TH[t].n}<small>${tok} / ${tq.length} questions maîtrisées</small></div></div><div class="bar" title="${pct} %"><i style="width:${pct}%"></i></div><button type="button" class="btn" data-quiz="${t}">Quiz</button></div>`;
  }).join("");
  return `
  <section style="display:grid;gap:8px">
    <span class="label">Objectif : ${LV[S.obj]}</span>
    <h2>Où en es-tu ?</h2>
    <p class="lead">${seen ? `Tu as déjà travaillé ${seen} questions sur ${qs.length}.` : `Rien de commencé pour l'instant. Lance un quiz de 10 questions pour faire un premier point.`}</p>
  </section>
  <div class="stats">
    <div class="stat"><b class="num">${ok}<span style="font-size:1rem"> / ${qs.length}</span></b><span>questions réussies</span></div>
    <div class="stat"><b class="num">${known}<span style="font-size:1rem"> / ${fs.length}</span></b><span>cartes maîtrisées</span></div>
    <div class="stat"><b class="num">${doneC}<span style="font-size:1rem"> / ${cases.length}</span></b><span>cas pratiques faits</span></div>
  </div>
  <div class="row">
    <button type="button" class="btn primary" data-quiz="mix">Quiz rapide · 10 questions</button>
    <button type="button" class="btn" data-quiz="err" ${errs?"":"disabled"}>Revoir mes erreurs (${errs})</button>
  </div>
  <section style="display:grid;gap:10px"><h3>Par thème</h3><div class="themes">${rows}</div></section>
  <section class="panel">
    <h3>Remettre à zéro</h3>
    <p class="muted">Efface tes résultats de QCM, cartes et cas pratiques sur cet appareil.</p>
    <div class="confirm" id="reset"><button type="button" class="btn" id="reset-ask">Réinitialiser ma progression</button></div>
  </section>`;
}
function bindAccueil(){
  document.querySelectorAll("[data-quiz]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.quiz;
    if(k==="mix") startQuiz(activeThemes(),10,"all");
    else if(k==="err") startQuiz(themesForLevel(),999,"err");
    else startQuiz([k],10,"all");
    location.hash="qcm";
  }));
  $("#reset-ask").addEventListener("click", () => {
    $("#reset").innerHTML = `<span>Tout effacer ?</span><button type="button" class="btn primary" id="reset-yes">Oui, effacer</button><button type="button" class="btn" id="reset-no">Annuler</button>`;
    $("#reset-yes").onclick = () => { S.qp={}; S.fp={}; S.cp={}; save(); render(); };
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
  pool = shuffle(pool).slice(0,n);
  quiz = pool.length ? {items:pool.map(q=>({q, order:shuffle(q.o.map((_,i)=>i))})), i:0, picked:null, score:0, wrong:[]} : {empty:true};
}
function vQcm(){
  if(!quiz) return `
    <section style="display:grid;gap:8px"><span class="label">QCM · ${LV[S.obj]}</span><h2>Lancer un quiz</h2><p class="lead">Choisis les thèmes, le nombre de questions et les questions à travailler. Correction et explication après chaque réponse.</p></section>
    <div class="panel">
      <span class="label">Thèmes</span>${themeChips()}
      <span class="label">Nombre de questions</span>
      <div class="chips" id="qn">${[10,20,999].map(n=>`<button type="button" class="chip" data-n="${n}" aria-pressed="${qcmSetup.n===n}">${n===999?"Toutes":n}</button>`).join("")}</div>
      <span class="label">Questions</span>
      <div class="chips" id="qm">${[["all","Toutes"],["new","Jamais vues"],["err","Mes erreurs"]].map(([k,v])=>`<button type="button" class="chip" data-m="${k}" aria-pressed="${qcmSetup.mode===k}">${v}</button>`).join("")}</div>
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
    ${quiz.wrong.length?`<section style="display:grid;gap:10px"><h3>À retenir</h3><ul class="errlist">${quiz.wrong.map(q=>`<li><p>${badge(q.t)} ${q.q}</p><p>${q.o[0]}</p></li>`).join("")}</ul></section>`:""}`;
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
    ${done?`<div class="explain ${good?"":"no"}"><b>${good?"Bonne réponse":"Réponse attendue : "+q.o[0]}</b>${q.e||""}</div>
    <div class="row"><button type="button" class="btn primary" id="qnext">${quiz.i+1<n?"Question suivante":"Voir le résultat"}</button><span class="muted" style="font-size:.85rem">Touche Entrée</span></div>`:`<p class="muted" style="font-size:.85rem">Touches 1 à 4 pour répondre.</p>`}
    <div><button type="button" class="btn" id="qstop">Arrêter le quiz</button></div>
  </section>`;
}
function pick(oi){
  if(!quiz||quiz.picked!==null||quiz.i>=quiz.items.length) return;
  const q = quiz.items[quiz.i].q; quiz.picked = oi;
  const ok = oi===0, p = S.qp[q.id]||{n:0,c:0};
  S.qp[q.id] = {ok, n:p.n+1, c:p.c+(ok?1:0)}; save();
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
  if(cardMode==="todo") pool = pool.filter(f=>!S.fp[f.id]);
  deck = {items:shuffle(pool), i:0, flip:false, known:0};
}
function vCartes(){
  if(!deck) return `
    <section style="display:grid;gap:8px"><span class="label">Cartes mémoire · ${LV[S.obj]}</span><h2>Cartes mémoire</h2><p class="lead">Lis la question, essaie de répondre de tête, retourne la carte puis indique si tu savais. Les cartes « je sais » sortent du paquet « à revoir ».</p></section>
    <div class="panel">
      <span class="label">Thèmes</span>${themeChips()}
      <span class="label">Paquet</span>
      <div class="chips" id="cm">${[["todo","À revoir"],["all","Toutes les cartes"]].map(([k,v])=>`<button type="button" class="chip" data-m="${k}" aria-pressed="${cardMode===k}">${v}</button>`).join("")}</div>
      <div><button type="button" class="btn primary" id="cgo">Commencer</button></div>
    </div>`;
  if(!deck.items.length) return `<div class="empty">Aucune carte à revoir dans ces thèmes : tout est maîtrisé.<br><br><button type="button" class="btn" id="cback">Changer de paquet</button></div>`;
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
    ${done?`<div class="explain ${casRun.picked===0?"":"no"}"><b>${casRun.picked===0?"Bonne décision":"Conduite attendue : "+st.o[0]}</b>${st.e}</div><div><button type="button" class="btn primary" id="cas-next">${casRun.i+1<c.steps.length?"Étape suivante":"Voir le bilan"}</button></div>`:""}
    <div><button type="button" class="btn" id="cas-back">Quitter le cas</button></div>
  </section>`;
}
function casStart(c){ casRun={c,i:0,picked:null,score:0,order:shuffle(c.steps[0].o.map((_,i)=>i))}; }
function casPick(oi){
  if(!casRun||casRun.picked!==null||casRun.i>=casRun.c.steps.length) return;
  casRun.picked=oi; if(oi===0) casRun.score++;
  if(casRun.i===casRun.c.steps.length-1){ const id=casRun.c.id; S.cp[id]=Math.max(S.cp[id]??0,casRun.score); save(); }
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

/* ---------- Rendu ---------- */
const VIEWS = {accueil:[vAccueil,bindAccueil], qcm:[vQcm,bindQcm], cartes:[vCartes,bindCartes], fiches:[vFiches,bindFiches], cas:[vCas,bindCas]};
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
  if(r==="cartes" && deck && deck.i<deck.items.length){
    if(e.key===" "){ e.preventDefault(); flip(); }
    else if(deck.flip && e.key==="1") cardAnswer(false);
    else if(deck.flip && e.key==="2") cardAnswer(true);
  }
});
window.addEventListener("hashchange", () => { render(); window.scrollTo(0,0); });
renderObj(); render();
