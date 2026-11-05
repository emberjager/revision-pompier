/* ---------- Compte et synchronisation (Supabase) ---------- */
const SB = (window.supabase && window.RSP_CONFIG)
  ? window.supabase.createClient(RSP_CONFIG.supabaseUrl, RSP_CONFIG.supabaseKey, {auth:{flowType:"implicit", persistSession:true, detectSessionInUrl:true}})
  : null;
const acct = {user:null, pseudo:"", status:"", sent:"", busy:false, lastSync:null};
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
  if(remote.obj) S.obj = remote.obj;
  if(Array.isArray(remote.themes) && remote.themes.length) S.themes = remote.themes;
}
const payload = () => ({obj:S.obj, themes:S.themes, qp:S.qp, fp:S.fp, cp:S.cp});

let pushTimer = null, applying = false;
async function push(){
  if(!SB || !acct.user) return;
  const {error} = await SB.from("progress").upsert({user_id:acct.user.id, data:payload(), updated_at:new Date().toISOString()});
  acct.status = error ? "Échec de l'envoi : " + error.message : "";
  if(!error) acct.lastSync = new Date();
  if(route()==="compte") render();
}
window.onLocalSave = () => {
  if(applying || !acct.user) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(push, 1200);
};
async function pull(){
  if(!SB || !acct.user) return;
  const {data, error} = await SB.from("progress").select("data").eq("user_id", acct.user.id).maybeSingle();
  if(error){ acct.status = "Échec de la récupération : " + error.message; render(); return; }
  applying = true; mergeData(data && data.data); save(); applying = false;
  renderObj();
  // On ne redessine pas pendant un quiz ou un paquet en cours, pour ne pas couper l'utilisateur.
  if(!quiz && !deck && !casRun) render();
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
  if(!acct.user) return `
    <section style="display:grid;gap:8px"><span class="label">Compte</span><h2>Se connecter</h2>
    <p class="lead">Connecte-toi pour retrouver ta progression sur ton téléphone et ton ordinateur. Pas de mot de passe : tu reçois un e-mail de connexion.</p></section>
    <form class="panel" id="login">
      <label class="label" for="email">Adresse e-mail</label>
      <input id="email" type="email" required autocomplete="email" inputmode="email" class="field" placeholder="prenom.nom@exemple.fr" value="${escHtml(acct.sent)}">
      <div><button class="btn primary" type="submit" ${acct.busy?"disabled":""}>Recevoir l'e-mail de connexion</button></div>
    </form>
    ${acct.sent?`<form class="panel" id="otp">
      <p>E-mail envoyé à <b>${escHtml(acct.sent)}</b>. Clique sur le lien qu'il contient. Si le site est installé sur ton écran d'accueil, tape plutôt ici le code à 6 chiffres de l'e-mail.</p>
      <label class="label" for="code">Code reçu</label>
      <input id="code" class="field num" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456">
      <div><button class="btn primary" type="submit" ${acct.busy?"disabled":""}>Valider le code</button></div>
    </form>`:""}
    ${acct.status?`<p class="explain no">${escHtml(acct.status)}</p>`:""}`;
  return `
    <section style="display:grid;gap:8px"><span class="label">Compte</span><h2>${escHtml(acct.pseudo || "Mon compte")}</h2>
    <p class="lead">Connecté avec ${escHtml(acct.user.email)}. Ta progression est synchronisée automatiquement entre tes appareils.</p></section>
    <form class="panel" id="prof">
      <label class="label" for="pseudo">Pseudo (affiché plus tard dans le classement du CIS)</label>
      <input id="pseudo" class="field" maxlength="30" value="${escHtml(acct.pseudo)}" placeholder="Ex. Cpl Martin">
      <div><button class="btn" type="submit">Enregistrer le pseudo</button></div>
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
    e.preventDefault(); const email = $("#email").value.trim(); if(!email) return;
    acct.busy = true; acct.status = ""; render();
    const {error} = await SB.auth.signInWithOtp({email, options:{emailRedirectTo: location.origin + location.pathname}});
    acct.busy = false;
    if(error) acct.status = /rate|limit/i.test(error.message) ? "Trop de demandes d'e-mail : attends quelques minutes puis réessaie." : "Envoi impossible : " + error.message;
    else acct.sent = email;
    render();
  };
  const otp = $("#otp");
  if(otp) otp.onsubmit = async e => {
    e.preventDefault(); const token = $("#code").value.replace(/\s/g,""); if(!token) return;
    acct.busy = true; render();
    const {error} = await SB.auth.verifyOtp({email:acct.sent, token, type:"email"});
    acct.busy = false;
    if(error){ acct.status = "Code refusé ou expiré. Redemande un e-mail."; render(); }
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
    const u = session ? session.user : null;
    const changed = (u && u.id) !== (acct.user && acct.user.id);
    acct.user = u;
    if(!u){ acct.pseudo = ""; acct.lastSync = null; setTabLabel(); render(); return; }
    if(changed){
      acct.sent = ""; acct.status = "";
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
