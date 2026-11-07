/* ---------- Compte et synchronisation (Supabase) ---------- */
const SB = (window.supabase && window.RSP_CONFIG)
  ? window.supabase.createClient(RSP_CONFIG.supabaseUrl, RSP_CONFIG.supabaseKey, {auth:{flowType:"implicit", persistSession:true, detectSessionInUrl:true}})
  : null;
const acct = {user:null, pseudo:"", status:"", info:"", sent:"", busy:false, lastSync:null, recovery:false};
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* Fusion : pour chaque question on garde l'entrée la plus travaillée ; cartes maîtrisées réunies ; meilleur score des cas. */
function mergeData(remote){
  if(!remote) return;
  const qp = {...(remote.qp||{})};
  for(const [id,v] of Object.entries(S.qp)) if(!qp[id] || (v.n||0) >= (qp[id].n||0)) qp[id] = v;
  const fp = {...(remote.fp||{}), ...S.fp};
  const cp = {...(remote.cp||{})};
  for(const [id,v] of Object.entries(S.cp)) cp[id] = Math.max(cp[id] ?? 0, v);
  S.qp = qp; S.fp = fp; S.cp = cp;
  // Cartes en répétition espacée : on garde la carte la plus travaillée.
  const fsr = {...(remote.fs||{})};
  for(const [id,v] of Object.entries(S.fs)) if(!fsr[id] || (v.n||0) >= (fsr[id].n||0)) fsr[id] = v;
  // Activité : pour chaque jour, le plus grand nombre de réponses vu sur un appareil.
  const days = {...(remote.days||{})};
  for(const [d,v] of Object.entries(S.days)) days[d] = Math.max(days[d]||0, v);
  // Examens blancs : réunion par date de passage.
  const ex = [...(remote.ex||[])]; const seen = new Set(ex.map(e=>e.d));
  S.ex.forEach(e => { if(!seen.has(e.d)) ex.push(e); });
  ex.sort((a,b)=>a.d-b.d);
  S.fs = fsr; S.days = days; S.ex = ex.slice(-100);
  if(remote.goal) S.goal = remote.goal;
  if(remote.obj) S.obj = remote.obj;
  if(Array.isArray(remote.themes) && remote.themes.length) S.themes = withNewThemes(remote.themes, remote.thk || OLD_TH);
  // Réglages ajoutés en phase 1 : date du concours, réglages QCM, dernier quiz, favoris (réunis par nom).
  if(typeof remote.concours === "string") S.concours = remote.concours;
  if(remote.qcm && typeof remote.qcm === "object"){ S.qcm = {...S.qcm, ...remote.qcm}; Object.assign(qcmSetup, {n:S.qcm.n, mode:S.qcm.mode, off:[...(S.qcm.off||[])], t:S.qcm.t||0}); }
  if(remote.last && (!S.last || (remote.last.at||0) > (S.last.at||0))) S.last = remote.last;
  // Phase 2 : questions favorites (le geste le plus récent gagne, ajout ou retrait) et records de mort subite.
  if(remote.fav && typeof remote.fav === "object") for(const [id,v] of Object.entries(remote.fav)) if(Math.abs(v) > Math.abs(S.fav[id]||0)) S.fav[id] = v;
  if(remote.sd && typeof remote.sd === "object") for(const [k,v] of Object.entries(remote.sd)) S.sd[k] = Math.max(S.sd[k]||0, v);
  if(Array.isArray(remote.presets)){ const names = new Set(S.presets.map(p=>p.name)); S.presets = [...S.presets, ...remote.presets.filter(p=>p && !names.has(p.name))].slice(-8); }
}
const payload = () => ({obj:S.obj, themes:S.themes, qp:S.qp, fp:S.fp, cp:S.cp, fs:S.fs, days:S.days, goal:S.goal, ex:S.ex, thk:Object.keys(TH), concours:S.concours, qcm:S.qcm, last:S.last, presets:S.presets, fav:S.fav, sd:S.sd});

let pushTimer = null, applying = false;
async function push(){
  if(!SB || !acct.user) return;
  const {error} = await SB.from("progress").upsert({user_id:acct.user.id, data:payload(), updated_at:new Date().toISOString()});
  acct.status = error ? "Échec de l'envoi : " + error.message : "";
  if(!error) acct.lastSync = new Date();
  if(route()==="compte") render();
}
// Après une remise à zéro, on écrase tout de suite la copie en ligne (sinon la fusion ramènerait les anciens résultats).
let resetPending = false;
window.onReset = () => { if(acct.user) resetPending = true; };
window.onLocalSave = () => {
  if(resetPending && acct.user){ resetPending = false; clearTimeout(pushTimer); push(); return; }
  if(applying || !acct.user) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(push, 1200);
};
async function pull(){
  if(!SB || !acct.user || resetPending) return;
  const {data, error} = await SB.from("progress").select("data").eq("user_id", acct.user.id).maybeSingle();
  if(error){ acct.status = "Échec de la récupération : " + error.message; render(); return; }
  applying = true; mergeData(data && data.data); save(); applying = false;
  renderObj();
  // On ne redessine pas pendant un quiz ou un paquet en cours, pour ne pas couper l'utilisateur.
  if(!quiz && !deck && !casRun && !(exam && !exam.done)) render();
  await push();
}
async function loadProfile(){
  const {data} = await SB.from("profiles").select("pseudo").eq("id", acct.user.id).maybeSingle();
  acct.pseudo = (data && data.pseudo) || "";
  if(!data) await SB.from("profiles").insert({id:acct.user.id, pseudo:null});
}
function setTabLabel(){ ROUTES.compte = acct.user ? (acct.pseudo || "Mon compte") : "Se connecter"; }

/* ---------- Vue Compte ---------- */
function vCompte(){
  if(!SB) return `<section style="display:grid;gap:8px"><h2>Compte</h2><p class="lead">La connexion n'est pas disponible (pas de réseau ?). Tu peux réviser normalement : ta progression reste sur cet appareil et sera synchronisée à ta prochaine connexion.</p></section>`;
  if(acct.recovery) return `
    <section style="display:grid;gap:8px"><span class="label">Compte</span><h2>Nouveau mot de passe</h2></section>
    <form class="panel" id="newpw">
      <label class="label" for="npw">Nouveau mot de passe (8 caractères minimum)</label>
      <input id="npw" type="password" class="field" minlength="8" required autocomplete="new-password">
      <div><button class="btn primary" type="submit">Enregistrer</button></div>
    </form>
    ${acct.status?`<p class="explain no">${escHtml(acct.status)}</p>`:""}`;
  if(!acct.user) return `
    <section style="display:grid;gap:8px"><span class="label">Compte</span><h2>Se connecter</h2>
    <p class="lead">Connecte-toi pour retrouver ta progression sur ton téléphone et ton ordinateur.</p></section>
    <form class="panel" id="login">
      <label class="label" for="email">Adresse e-mail</label>
      <input id="email" type="email" required autocomplete="email" inputmode="email" class="field" placeholder="prenom.nom@exemple.fr" value="${escHtml(acct.sent)}">
      <label class="label" for="pw">Mot de passe</label>
      <input id="pw" type="password" class="field" minlength="8" autocomplete="current-password">
      <div class="row">
        <button class="btn primary" type="submit" data-act="signin" ${acct.busy?"disabled":""}>Se connecter</button>
        <button class="btn" type="submit" data-act="signup" ${acct.busy?"disabled":""}>Créer mon compte</button>
      </div>
      <div class="row">
        <button class="btn" type="submit" data-act="link" formnovalidate ${acct.busy?"disabled":""}>Recevoir un lien par e-mail</button>
        <button class="btn" type="submit" data-act="reset" formnovalidate ${acct.busy?"disabled":""}>Mot de passe oublié</button>
      </div>
    </form>
    ${acct.info?`<p class="explain">${escHtml(acct.info)}</p>`:""}
    ${acct.status?`<p class="explain no">${escHtml(acct.status)}</p>`:""}`;
  return `
    <section style="display:grid;gap:8px"><span class="label">Compte</span><h2>${escHtml(acct.pseudo || "Mon compte")}</h2>
    <p class="lead">Connecté avec ${escHtml(acct.user.email)}. Ta progression est synchronisée automatiquement entre tes appareils.</p></section>
    <form class="panel" id="prof">
      <label class="label" for="pseudo">Pseudo (affiché plus tard dans le classement du CIS)</label>
      <input id="pseudo" class="field" maxlength="30" value="${escHtml(acct.pseudo)}" placeholder="Ex. Cpl Martin">
      <div><button class="btn" type="submit">Enregistrer le pseudo</button></div>
    </form>
    <form class="panel" id="setpw">
      <label class="label" for="spw">Mot de passe (pour te connecter sans e-mail, par exemple dans l'appli installée)</label>
      <input id="spw" type="password" class="field" minlength="8" required autocomplete="new-password" placeholder="8 caractères minimum">
      <div><button class="btn" type="submit">Définir le mot de passe</button></div>
      ${acct.info?`<p class="muted">${escHtml(acct.info)}</p>`:""}
    </form>
    <div class="panel">
      <span class="label">Synchronisation</span>
      <p>${acct.status ? `<span style="color:var(--bad)">${escHtml(acct.status)}</span>` : acct.lastSync ? `Dernière synchronisation à ${acct.lastSync.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}.` : "En cours…"}</p>
      <div class="row"><button class="btn" type="button" id="syncnow">Synchroniser maintenant</button><button class="btn" type="button" id="logout">Se déconnecter</button></div>
    </div>`;
}
function bindCompte(){
  const lg = $("#login");
  if(lg) lg.onsubmit = async e => {
    e.preventDefault();
    const act = (e.submitter && e.submitter.dataset.act) || "signin";
    const email = $("#email").value.trim(), password = $("#pw").value;
    acct.sent = email; acct.status = ""; acct.info = "";
    if(!email){ acct.status = "Indique ton adresse e-mail."; render(); return; }
    if((act==="signin"||act==="signup") && password.length < 8){ acct.status = "Le mot de passe doit faire au moins 8 caractères."; render(); return; }
    acct.busy = true; render();
    const back = location.origin + location.pathname;
    let error = null;
    if(act==="signin") ({error} = await SB.auth.signInWithPassword({email, password}));
    if(act==="signup"){
      const r = await SB.auth.signUp({email, password, options:{emailRedirectTo: back}});
      error = r.error;
      if(!error && !r.data.session) acct.info = "Compte créé. Clique sur le lien de confirmation reçu par e-mail, puis connecte-toi ici avec ton mot de passe.";
    }
    if(act==="link"){ ({error} = await SB.auth.signInWithOtp({email, options:{emailRedirectTo: back}})); if(!error) acct.info = "E-mail envoyé : clique sur le lien qu'il contient."; }
    if(act==="reset"){ ({error} = await SB.auth.resetPasswordForEmail(email, {redirectTo: back})); if(!error) acct.info = "E-mail envoyé : son lien te permettra de choisir un nouveau mot de passe."; }
    acct.busy = false;
    if(error) acct.status =
      /rate|limit/i.test(error.message) ? "Trop de demandes d'e-mail : attends quelques minutes puis réessaie." :
      /invalid login/i.test(error.message) ? "E-mail ou mot de passe incorrect. Si ton compte a été créé avec un lien, connecte-toi par lien puis définis un mot de passe dans ton compte." :
      /not confirmed/i.test(error.message) ? "Adresse pas encore confirmée : clique sur le lien reçu par e-mail." :
      /already registered/i.test(error.message) ? "Ce compte existe déjà : clique sur « Se connecter »." :
      "Erreur : " + error.message;
    render();
  };
  const np = $("#newpw");
  if(np) np.onsubmit = async e => {
    e.preventDefault();
    const {error} = await SB.auth.updateUser({password: $("#npw").value});
    if(error){ acct.status = "Mot de passe non enregistré : " + error.message; render(); return; }
    acct.recovery = false; acct.status = ""; acct.info = "Mot de passe enregistré."; render();
  };
  const sp = $("#setpw");
  if(sp) sp.onsubmit = async e => {
    e.preventDefault();
    const {error} = await SB.auth.updateUser({password: $("#spw").value});
    acct.info = error ? "Mot de passe non enregistré : " + error.message : "Mot de passe enregistré. Tu peux maintenant te connecter avec, sur n'importe quel appareil.";
    render();
  };
  const pf = $("#prof");
  if(pf) pf.onsubmit = async e => {
    e.preventDefault(); acct.pseudo = $("#pseudo").value.trim();
    const {error} = await SB.from("profiles").upsert({id:acct.user.id, pseudo:acct.pseudo || null});
    acct.status = error ? "Pseudo non enregistré : " + error.message : "";
    setTabLabel(); render();
  };
  const sn = $("#syncnow"); if(sn) sn.onclick = pull;
  const lo = $("#logout"); if(lo) lo.onclick = () => SB.auth.signOut();
}

ROUTES.compte = "Se connecter";
VIEWS.compte = [vCompte, bindCompte];

if(SB){
  SB.auth.onAuthStateChange((event, session) => {
    if(event === "PASSWORD_RECOVERY"){ acct.recovery = true; setTimeout(() => { location.hash = "compte"; render(); }, 0); }
    const u = session ? session.user : null;
    const changed = (u && u.id) !== (acct.user && acct.user.id);
    acct.user = u;
    if(!u){ acct.pseudo = ""; acct.lastSync = null; setTabLabel(); render(); return; }
    if(changed){
      acct.sent = ""; acct.status = ""; acct.info = "";
      // Les appels Supabase sont lancés hors du rappel, comme le recommande la librairie.
      setTimeout(async () => {
        await loadProfile(); setTabLabel();
        if(!ROUTES[location.hash.slice(1)]) history.replaceState(null, "", location.pathname + "#compte");
        await pull(); render();
      }, 0);
    }
  });
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible" && acct.user) pull(); });
}
render();
