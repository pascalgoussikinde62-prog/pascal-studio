(() => {
  "use strict";
  const cfg = window.PASCAL_STUDIO_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabaseAnonKey &&
    !cfg.supabaseUrl.includes("VOTRE-PROJET") && !cfg.supabaseAnonKey.includes("VOTRE_CLE");
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  let supabase = null, user = null, authMode = "login", currentView = "dashboard";
  let records = { clients: [], projects: [], campaigns: [], invoices: [] };
  let editing = null, searchTerm = "";
  const serviceOptions = ["Montage vidéo", "Création graphique", "Media buying — Meta Ads", "Media buying — LinkedIn Ads", "Community management", "Création de contenu", "Email marketing", "Webinaire", "Conseil marketing", "Autre"];
  const statusOptions = {
    projects: ["À planifier", "En cours", "En attente", "À valider", "Terminé", "Annulé"],
    campaigns: ["À préparer", "Active", "En pause", "Terminée"],
    invoices: ["Brouillon", "Envoyée", "En attente", "Payée", "En retard", "Annulée"]
  };
  const titles = {dashboard:"Tableau de bord",clients:"Clients",projects:"Projets & prestations",campaigns:"Campagnes Ads",invoices:"Devis & factures"};
  const fmt = (n) => new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(n)||0) + " FCFA";
  const dateFmt = (v) => v ? new Date(v+"T00:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const slug = (s) => String(s||"").replace(/\s+/g,".").replace(/[^\w.-]/g,"");
  function toast(msg, error=false){const el=$("#toast");el.textContent=msg;el.className="toast show"+(error?" error":"");setTimeout(()=>el.className="toast",3600);}
  function initials(name){return (name||"PS").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();}
  function showAuth(mode){authMode=mode;$("#auth-title").textContent=mode==="login"?"Connectez-vous":"Créer votre compte";$("#auth-subtitle").textContent=mode==="login"?"Accédez à votre espace de gestion.":"Créez votre espace professionnel Pascal Studio.";$("#auth-submit").textContent=mode==="login"?"Se connecter":"Créer mon compte";$("#auth-switch-text").textContent=mode==="login"?"Vous n’avez pas encore de compte ?":"Vous avez déjà un compte ?";$("#auth-switch").textContent=mode==="login"?"Créer un compte":"Se connecter";$("#auth-name").classList.toggle("hidden",mode==="login");$("#auth-name-label").classList.toggle("hidden",mode==="login");$("#auth-name").required=mode!=="login";$("#auth-password").autocomplete=mode==="login"?"current-password":"new-password";}
  async function start(){
    $("#today-label").textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
    showAuth("login");
    if(!configured){$("#auth-screen").classList.remove("hidden");$("#app-shell").classList.add("hidden");const warn=document.createElement("div");warn.className="no-config";warn.innerHTML="<strong>Configuration requise.</strong><br>Ouvrez <code>config.js</code> et renseignez l’URL ainsi que la clé anon/public de votre propre projet Supabase. Les identifiants du projet original ne sont pas utilisés.";$("#auth-panel-placeholder");$(".auth-panel").prepend(warn);return;}
    if(!window.supabase){toast("La bibliothèque Supabase n’a pas pu être chargée.",true);return;}
    supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
    const {data:{session}}=await supabase.auth.getSession();
    if(session){user=session.user;await enterApp();}
    supabase.auth.onAuthStateChange(async(_event,session)=>{if(session && !user){user=session.user;await enterApp();}else if(!session && user){user=null;$("#app-shell").classList.add("hidden");$("#auth-screen").classList.remove("hidden");}});
  }
  $("#auth-switch").addEventListener("click",()=>showAuth(authMode==="login"?"signup":"login"));
  $("#auth-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!configured){toast("Configurez d’abord config.js et Supabase.",true);return;}
    const email=$("#auth-email").value.trim(),password=$("#auth-password").value,name=$("#auth-name").value.trim();
    const submit=$("#auth-submit");submit.disabled=true;submit.textContent="Patientez…";
    try{
      if(authMode==="login"){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
      else{const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;if(!data.session){toast("Compte créé. Vérifiez votre e-mail pour confirmer l’inscription.");showAuth("login");}}
    }catch(err){toast(err.message||"Connexion impossible.",true);}
    finally{submit.disabled=false;submit.textContent=authMode==="login"?"Se connecter":"Créer mon compte";}
  });
  async function enterApp(){
    $("#auth-screen").classList.add("hidden");$("#app-shell").classList.remove("hidden");
    const name=user.user_metadata?.full_name||user.email?.split("@")[0]||"Mon espace";
    $("#user-name").textContent=name;$("#user-email").textContent=user.email||"";$("#user-avatar").textContent=initials(name);
    await loadAll();render();
  }
  async function signOut(){if(supabase)await supabase.auth.signOut();user=null;$("#app-shell").classList.add("hidden");$("#auth-screen").classList.remove("hidden");}
  $("#signout-btn").addEventListener("click",signOut);
  async function queryTable(table){const {data,error}=await supabase.from(table).select("*").order("created_at",{ascending:false});if(error){console.error(error);if(error.code==="42P01"||error.code==="PGRST205")toast("Tables manquantes : exécutez supabase/schema.sql.",true);else toast("Chargement impossible pour "+table+". Vérifiez les politiques RLS.",true);return [];}return data||[];}
  async function loadAll(){if(!supabase||!user)return;const [clients,projects,campaigns,invoices]=await Promise.all([queryTable("clients"),queryTable("projects"),queryTable("campaigns"),queryTable("invoices")]);records={clients,projects,campaigns,invoices};}
  function setView(view){currentView=view;searchTerm="";$$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("#page-title").textContent=titles[view]||titles.dashboard;$("#sidebar").classList.remove("open");$("#mobile-overlay").classList.remove("show");render();}
  $$("[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
  $("#mobile-menu").addEventListener("click",()=>{ $("#sidebar").classList.toggle("open");$("#mobile-overlay").classList.toggle("show");});
  const overlay=document.createElement("div");overlay.id="mobile-overlay";overlay.className="mobile-overlay";document.body.append(overlay);overlay.addEventListener("click",()=>{$("#sidebar").classList.remove("open");overlay.classList.remove("show");});
  $("#quick-add").addEventListener("click",()=>openCreate());
  function render(){if(!user)return;const container=$("#view-container");if(currentView==="dashboard")container.innerHTML=dashboard();else if(currentView==="clients")container.innerHTML=tableView("clients");else if(currentView==="projects")container.innerHTML=tableView("projects");else if(currentView==="campaigns")container.innerHTML=campaignView();else if(currentView==="invoices")container.innerHTML=tableView("invoices");bindRendered();}
  function dashboard(){
    const active=records.projects.filter(p=>["En cours","À valider","À planifier"].includes(p.status)).length;
    const pending=records.invoices.filter(i=>!["Payée","Annulée"].includes(i.status)).reduce((s,i)=>s+Math.max(0,Number(i.amount||0)-Number(i.amount_paid||0)),0);
    const paid=records.invoices.filter(i=>i.status==="Payée").reduce((s,i)=>s+Number(i.amount||0),0);
    const stats=[["Clients",records.clients.length,"♙","Contacts enregistrés"],["Projets actifs",active,"▣","Prestations à suivre"],["À encaisser",fmt(pending),"↗","Solde restant sur les factures"],["Déjà encaissé",fmt(paid),"✓","Factures marquées payées"]];
    const recent=[...records.projects.map(x=>({...x,_type:"Projet",_date:x.created_at})),...records.invoices.map(x=>({...x,_type:"Facture",_date:x.created_at})),...records.clients.map(x=>({...x,_type:"Client",_date:x.created_at}))].sort((a,b)=>new Date(b._date)-new Date(a._date)).slice(0,5);
    return `<section class="welcome-card"><div><p class="eyebrow" style="color:#c6ddff">VOTRE ESPACE DE TRAVAIL</p><h2>Bonjour ${esc((user.user_metadata?.full_name||user.email?.split("@")[0]||"") .split(" ")[0])} 👋</h2><p>Suivez vos clients, vos livrables et la santé de votre activité au même endroit.</p></div><button class="btn" data-action="create-project">＋ Ajouter un projet</button></section>
    <section class="stat-grid">${stats.map(s=>`<article class="stat-card"><div class="stat-top"><span>${s[0]}</span><span class="stat-icon">${s[2]}</span></div><div class="stat-value">${s[1]}</div><div class="stat-note">${s[3]}</div></article>`).join("")}</section>
    <section class="dashboard-grid"><article class="panel"><div class="panel-head"><h3>Activité récente</h3><button class="link-button" data-goto="projects">Voir les projets →</button></div><div class="activity-list">${recent.length?recent.map(x=>`<div class="activity-item"><div class="activity-dot">${x._type==="Projet"?"▣":x._type==="Facture"?"▤":"♙"}</div><div><strong>${esc(x.name||x.title||x.number||x._type)}</strong><small>${esc(x._type)} · ${dateFmt((x.created_at||"").slice(0,10))}</small></div></div>`).join(""):`<div class="empty-state"><div class="empty-icon">✦</div><strong>Votre activité apparaîtra ici</strong>Ajoutez un client ou un projet pour commencer.</div>`}</div></article>
    <article class="panel"><div class="panel-head"><h3>Répartition des projets</h3><span class="muted tiny">${records.projects.length} au total</span></div>${projectProgress()}</article></section>`;
  }
  function projectProgress(){const total=records.projects.length||1;const stages=[["À planifier",records.projects.filter(p=>p.status==="À planifier").length],["En cours",records.projects.filter(p=>p.status==="En cours").length],["À valider",records.projects.filter(p=>p.status==="À valider").length],["Terminé",records.projects.filter(p=>p.status==="Terminé").length]];return stages.map(([label,count])=>`<div class="progress-row"><div class="progress-label"><span>${label}</span><strong>${count}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,count/total*100)}%"></div></div></div>`).join("")}
  function tableView(type){
    const data=records[type].filter(x=>JSON.stringify(x).toLowerCase().includes(searchTerm.toLowerCase()));
    let columns,rows;
    if(type==="clients"){columns=["CLIENT","CONTACT","TYPE DE PRESTATION","AJOUTÉ LE",""];rows=data.map(x=>[`<strong>${esc(x.name)}</strong><small>${esc(x.company||"Client indépendant")}</small>`,`${esc(x.email||"—")}<small>${esc(x.phone||"")}</small>`,esc(x.service_type||"—"),dateFmt((x.created_at||"").slice(0,10)),actions(x.id,type)]);}
    if(type==="projects"){columns=["PROJET","CLIENT","PRESTATION","ÉCHÉANCE","STATUT",""];rows=data.map(x=>[ `<strong>${esc(x.title)}</strong><small>${esc(x.description||"")}</small>`,esc(clientName(x.client_id)),esc(x.service_type||"—"),dateFmt(x.due_date),`<span class="status ${slug(x.status)}">${esc(x.status)}</span>`,actions(x.id,type)]);}
    if(type==="invoices"){columns=["RÉFÉRENCE","CLIENT","ÉCHÉANCE","MONTANT","STATUT",""];rows=data.map(x=>[`<strong>${esc(x.number||"Facture")}</strong><small>${esc(x.title||"Prestation")}</small>`,esc(clientName(x.client_id)),dateFmt(x.due_date),`<span class="money">${fmt(x.amount)}</span><small>Payé : ${fmt(x.amount_paid)}</small>`,`<span class="status ${slug(x.status)}">${esc(x.status)}</span>`,actions(x.id,type)]);}
    return `<div class="section-toolbar"><h2>${titles[type]} <span class="muted">(${records[type].length})</span></h2><div class="toolbar-actions"><input class="search-input" id="table-search" placeholder="Rechercher…" value="${esc(searchTerm)}"><button class="btn btn-primary" data-action="create-${type}">＋ Ajouter</button></div></div><div class="table-panel"><div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${columns.length}"><div class="empty-state"><div class="empty-icon">⌕</div><strong>Aucun résultat</strong>Ajoutez un élément ou modifiez votre recherche.</div></td></tr>`}</tbody></table></div></div>`;
  }
  function campaignView(){
    const data=records.campaigns.filter(x=>JSON.stringify(x).toLowerCase().includes(searchTerm.toLowerCase()));
    return `<div class="section-toolbar"><h2>Campagnes publicitaires <span class="muted">(${records.campaigns.length})</span></h2><div class="toolbar-actions"><input class="search-input" id="table-search" placeholder="Rechercher…" value="${esc(searchTerm)}"><button class="btn btn-primary" data-action="create-campaigns">＋ Nouvelle campagne</button></div></div>${data.length?`<div class="campaign-grid">${data.map(x=>`<article class="campaign-card"><div class="campaign-card-top"><div><h3>${esc(x.name)}</h3><p>${esc(x.platform||"Plateforme non précisée")} · ${esc(x.objective||"Objectif non précisé")}</p></div><span class="status ${slug(x.status)}">${esc(x.status)}</span></div><p>${esc(x.notes||"Aucune note ajoutée.")}</p><div class="campaign-metrics"><div><small>BUDGET</small><strong>${fmt(x.budget)}</strong></div><div><small>CLICS</small><strong>${Number(x.clicks||0).toLocaleString("fr-FR")}</strong></div><div><small>LEADS</small><strong>${Number(x.leads||0).toLocaleString("fr-FR")}</strong></div></div><div class="row-actions" style="margin-top:15px"><button class="mini-button" data-edit="${x.id}" data-type="campaigns">Modifier</button><button class="mini-button" data-delete="${x.id}" data-type="campaigns">Supprimer</button></div></article>`).join("")}</div>`:`<div class="panel"><div class="empty-state"><div class="empty-icon">↗</div><strong>Aucune campagne enregistrée</strong>Centralisez vos campagnes Meta Ads et LinkedIn Ads, puis suivez budget, clics et leads.</div></div>`}`;
  }
  function clientName(id){return records.clients.find(c=>c.id===id)?.name||"Client non renseigné";}
  function actions(id,type){return `<div class="row-actions"><button class="mini-button" data-edit="${id}" data-type="${type}">Modifier</button><button class="mini-button" data-delete="${id}" data-type="${type}">Supprimer</button></div>`;}
  function bindRendered(){
    $$("[data-action]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.action;if(action==="create-project")openForm("projects");else openForm(action.replace("create-",""));}));
    $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.goto)));
    $$("[data-edit]").forEach(b=>b.addEventListener("click",()=>openForm(b.dataset.type,b.dataset.edit)));
    $$("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteRecord(b.dataset.type,b.dataset.delete)));
    const search=$("#table-search");if(search)search.addEventListener("input",e=>{const pos=e.target.selectionStart;searchTerm=e.target.value;render();const next=$("#table-search");if(next){next.focus();next.setSelectionRange(pos,pos);}});
  }
  function openCreate(){const map={dashboard:"projects",clients:"clients",projects:"projects",campaigns:"campaigns",invoices:"invoices"};openForm(map[currentView]||"projects");}
  function field(name,label,type="text",opts={}){return {name,label,type,...opts};}
  function fieldsFor(type,record={}){
    const clientSelect=[{value:"",label:"Sélectionner un client"},...records.clients.map(c=>({value:c.id,label:c.name}))];
    if(type==="clients")return [field("name","Nom du client","text",{required:true}),field("company","Entreprise"),field("email","Adresse e-mail","email"),field("phone","Téléphone"),field("service_type","Prestation principale","select",{options:serviceOptions.map(x=>({value:x,label:x}))}),field("notes","Notes","textarea",{full:true})];
    if(type==="projects")return [field("title","Nom du projet","text",{required:true}),field("client_id","Client","select",{options:clientSelect}),field("service_type","Type de prestation","select",{options:serviceOptions.map(x=>({value:x,label:x}))}),field("status","Statut","select",{options:statusOptions.projects.map(x=>({value:x,label:x})),default:"À planifier"}),field("start_date","Date de début","date"),field("due_date","Date d’échéance","date"),field("budget","Budget (FCFA)","number",{min:0,step:"1"}),field("description","Description / livrables","textarea",{full:true})];
    if(type==="campaigns")return [field("name","Nom de la campagne","text",{required:true}),field("platform","Plateforme","select",{options:["Meta Ads","LinkedIn Ads","TikTok Ads","Google Ads","Autre"].map(x=>({value:x,label:x}))}),field("objective","Objectif","select",{options:["Génération de leads","Trafic","Conversions","Notoriété","Engagement","Ventes","Autre"].map(x=>({value:x,label:x}))}),field("status","Statut","select",{options:statusOptions.campaigns.map(x=>({value:x,label:x})),default:"À préparer"}),field("budget","Budget dépensé (FCFA)","number",{min:0,step:"1"}),field("clicks","Clics","number",{min:0,step:"1"}),field("leads","Leads","number",{min:0,step:"1"}),field("start_date","Date de début","date"),field("end_date","Date de fin","date"),field("notes","Notes / résultats","textarea",{full:true})];
    if(type==="invoices")return [field("number","Référence (ex. PS-2026-001)"),field("title","Objet de la facture","text",{required:true}),field("client_id","Client","select",{options:clientSelect}),field("status","Statut","select",{options:statusOptions.invoices.map(x=>({value:x,label:x})),default:"Brouillon"}),field("issue_date","Date d’émission","date"),field("due_date","Date d’échéance","date"),field("amount","Montant total (FCFA)","number",{min:0,step:"1",required:true}),field("amount_paid","Montant payé (FCFA)","number",{min:0,step:"1"}),field("notes","Détails / conditions","textarea",{full:true})];
    return [];
  }
  function openForm(type,id=null){
    if(!["clients","projects","campaigns","invoices"].includes(type)){toast("Cette section n’est pas disponible.",true);return;}
    editing=id?{type,id}:null;const record=id?records[type].find(x=>x.id===id)||{}:{};
    $("#dialog-title").textContent=(id?"Modifier ":"Ajouter ")+({clients:"un client",projects:"un projet",campaigns:"une campagne",invoices:"un devis / une facture"}[type]);
    const holder=$("#dialog-fields");holder.innerHTML="";
    fieldsFor(type,record).forEach(f=>{
      const wrap=document.createElement("div");wrap.className="form-field"+(f.full?" full":"");
      const label=document.createElement("label");label.htmlFor="field-"+f.name;label.textContent=f.label;wrap.append(label);
      let el;
      if(f.type==="select"){el=document.createElement("select");(f.options||[]).forEach(o=>{const opt=document.createElement("option");opt.value=typeof o==="string"?o:o.value;opt.textContent=typeof o==="string"?o:o.label;el.append(opt);});}
      else if(f.type==="textarea"){el=document.createElement("textarea");}
      else{el=document.createElement("input");el.type=f.type||"text";if(f.min!==undefined)el.min=f.min;if(f.step)el.step=f.step;}
      el.id="field-"+f.name;el.name=f.name;el.required=!!f.required;
      const value=record[f.name]??f.default??"";
      if(value!==null)el.value=String(value);
      if(f.type==="number" && value==="")el.value="";
      wrap.append(el);holder.append(wrap);
    });
    $("#record-dialog").showModal();
  }
  $("#dialog-close").addEventListener("click",()=>$("#record-dialog").close());
  $("#cancel-dialog").addEventListener("click",()=>$("#record-dialog").close());
  $("#record-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!supabase||!user)return;
    const form=new FormData(e.target),type=editing?.type||({dashboard:"projects",clients:"clients",projects:"projects",campaigns:"campaigns",invoices:"invoices"}[currentView]||"projects");
    const payload={};for(const [k,v] of form.entries()){if(k!==""){payload[k]=v===""?null:v;}}
    // Normalize numeric fields and attach ownership on inserts.
    ["budget","clicks","leads","amount","amount_paid"].forEach(k=>{if(k in payload)payload[k]=payload[k]===null?0:Number(payload[k]);});
    let table=type;let request;
    if(editing){request=supabase.from(table).update(payload).eq("id",editing.id).select().single();}
    else{payload.user_id=user.id;request=supabase.from(table).insert(payload).select().single();}
    const save=$("#save-record");save.disabled=true;save.textContent="Enregistrement…";
    try{const {error}=await request;if(error)throw error;$("#record-dialog").close();toast("Enregistrement effectué.");await loadAll();render();}
    catch(err){console.error(err);toast(err.message||"Enregistrement impossible. Vérifiez le schéma SQL et les droits d’accès.",true);}
    finally{save.disabled=false;save.textContent="Enregistrer";editing=null;}
  });
  async function deleteRecord(type,id){if(!confirm("Supprimer définitivement cet élément ? Cette action est irréversible."))return;const {error}=await supabase.from(type).delete().eq("id",id);if(error){toast(error.message||"Suppression impossible.",true);return;}toast("Élément supprimé.");await loadAll();render();}
  start().catch(err=>{console.error(err);toast("Impossible de démarrer l’application.",true);});
})();
