import { loadDatabase } from "./dataLoader.js";
import { loadState, saveState, resetState, defaultState } from "./storage.js";
import { MODE_LABELS, LEVEL_LABELS, MODES } from "./config.js";
import { EMBEDDED_DATA } from "./embeddedData.js";
import { Session } from "./session.js";
import { renderQuestion } from "./renderer.js";
import { renderProgress } from "./progress.js";

const REWARD_TARGET=500;
let state=loadState(), database, session, curriculum;
let activeLevel=state.selectedLevel||"gr4";
const $=id=>document.getElementById(id);
const on=(id,event,handler)=>{const el=$(id);if(el)el.addEventListener(event,handler);return el;};
const views=["dashboard-view","workspace-view","leesavontuur-view","progress-view","goals-view","settings-view"];
let leesavontuurInitialized=false;
const show=id=>{views.forEach(v=>$(v).classList.toggle("active",v===id));if(id==="dashboard-view")renderDashboardProgress();window.scrollTo({top:0,behavior:"smooth"});};
function persist(){state.level=Math.floor(state.points/100)+1;saveState(state);syncStats();}
function syncStats(){
 $("stat-points").textContent=state.points;$("stat-rewards").textContent=state.rewards;
 const within=state.rewardProgress||0;$("reward-progress-text").textContent=`${within} / ${REWARD_TARGET} punten`;$("reward-progress-fill").style.width=`${Math.min(100,within/REWARD_TARGET*100)}%`;
 renderDashboardProgress();
}
function renderDashboardProgress(){
 const root=$("dashboard-progress");if(!root)return;
 const shown=MODES.filter(m=>m!=="woordtrainer" && state.progress[m]);
 root.innerHTML=shown.map(mode=>{const d=state.progress[mode];const pct=d.answered?Math.round(d.correct/d.answered*100):0;return `<div class="dashboard-progress-row"><div><span>${MODE_LABELS[mode]}</span><strong>${pct}%</strong></div><div class="mini-meter"><div style="width:${pct}%"></div></div></div>`;}).join("");
}
function applySettings(){document.documentElement.dataset.theme=state.settings.theme;$("theme-select").value=state.settings.theme;$("speech-rate").value=String(state.settings.rate);const length=$("session-length");if(length)length.value=String(state.settings.sessionLength);}
function reward(){ $("reward-dialog").hidden=false; }
function renderGoals(){const info=curriculum?.leerlijn?.[activeLevel]||{};const sections=Object.entries(info).map(([key,items])=>`<article class="settings-card"><h3>${key[0].toUpperCase()+key.slice(1)}</h3><ul>${items.map(x=>`<li>${x}</li>`).join("")}</ul></article>`).join("");$("goals-content").innerHTML=`<div class="exercise-box"><strong>${LEVEL_LABELS[activeLevel]}</strong><p>De oefeningen zijn eigen materiaal en afgestemd op de SLO-kerndoelen, referentieniveaus en gangbare taalmethodes.</p></div>${sections}`;}
function loadCurrent(){
 const q=session.current(),total=session.questions.length,isTrainer=session.mode==="woordtrainer";
 $("workspace-title").textContent=isTrainer?`Woordjes trainen – kaart ${session.index+1} van ${total}`:`${MODE_LABELS[session.mode]} – vraag ${session.index+1} van ${total}`;
 $("workspace-subtitle").textContent=isTrainer?`${LEVEL_LABELS[session.level]} · tik op de kaart om hem om te draaien`:LEVEL_LABELS[session.level];
 $("workspace-progress").style.width=`${(session.index+1)/total*100}%`;$("workspace-feedback").className="feedback";$("workspace-feedback").textContent="";
 $("btn-submit-answer").style.display=isTrainer?"none":"inline-block";$("btn-next-question").style.display=isTrainer?"inline-block":"none";$("btn-next-question").textContent=isTrainer?(session.index===total-1?"Klaar":"Volgende kaart"):"Volgende";
 renderQuestion({question:q,mode:session.mode,settings:state.settings,onOption:v=>session.select(v),onWord:(i,on)=>session.selectIndex(i,on),onSubmit:evaluate});
}
function evaluate(){const input=$("dictee-input")?.value||"",result=session.evaluate(input),feedback=$("workspace-feedback");if(result?.missing){feedback.className="feedback notice";feedback.textContent="Kies eerst een antwoord.";return;}if(!result)return;feedback.className=`feedback ${result.correct?"success":"error"}`;feedback.textContent=result.correct?(result.reward?"Goed gedaan! Je hebt een beloning verdiend.":"Goed gedaan!"):`Het juiste antwoord is: ${result.answer}`;$("btn-submit-answer").style.display="none";$("btn-next-question").style.display="inline-block";}
function finishSession(){session.finish();$("workspace-progress").style.width="100%";const trainer=session.mode==="woordtrainer";$("dynamic-content").innerHTML=`<div class="exercise-box finish-box"><h2>${trainer?"🃏 Kaarten bekeken":"🏆 Oefening afgerond"}</h2><p>${trainer?`Je hebt ${session.questions.length} woordkaarten bekeken. Hiervoor worden geen punten gegeven.`:`Je had <strong>${session.score} van de ${session.questions.length}</strong> vragen goed.`}</p><button id="finish-home" class="button primary">Naar hoofdpagina</button></div>`;$("workspace-feedback").className="feedback";$("btn-submit-answer").style.display="none";$("btn-next-question").style.display="none";on("finish-home","click",()=>show("dashboard-view"));}
function next(){if(session.next())loadCurrent();else finishSession();}
function clearProgress(){const fresh=defaultState();state.progress=fresh.progress;state.history=[];state.streak=0;persist();}
function addLeesavontuurPoint(points=1,story){
 state.points+=points;state.rewardProgress=(state.rewardProgress||0)+points;
 while(state.rewardProgress>=REWARD_TARGET){state.rewardProgress-=REWARD_TARGET;state.rewards++;reward();}
 persist();
}
function openLeesavontuur(){
 show("leesavontuur-view");
 if(!leesavontuurInitialized&&window.Leesavontuur){window.Leesavontuur.init({root:"#leesavontuur-root",onPointsEarned:addLeesavontuurPoint});leesavontuurInitialized=true;}
}
function events(){
 document.querySelectorAll('[data-view="leesavontuur"]').forEach(b=>b.addEventListener("click",openLeesavontuur));
 document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{session.start(b.dataset.mode,activeLevel);show("workspace-view");loadCurrent();}));
 document.querySelectorAll("[data-level]").forEach(b=>b.addEventListener("click",()=>{activeLevel=b.dataset.level;state.selectedLevel=activeLevel;document.querySelectorAll("[data-level]").forEach(x=>x.classList.toggle("active",x===b));const label=$("active-level-name");if(label)label.textContent=LEVEL_LABELS[activeLevel];persist();}));
 document.querySelectorAll(".back-button").forEach(b=>b.addEventListener("click",()=>{window.speechSynthesis?.cancel();show("dashboard-view");}));
 document.querySelectorAll('[data-view="progress"]').forEach(b=>b.addEventListener("click",()=>{renderProgress(state,$("progress-overview"),$("history-rows"));show("progress-view");}));
 document.querySelectorAll('[data-view="goals"]').forEach(b=>b.addEventListener("click",()=>{renderGoals();show("goals-view");}));
 document.querySelectorAll('[data-view="settings"]').forEach(b=>b.addEventListener("click",()=>show("settings-view")));
 on("btn-submit-answer","click",evaluate);on("btn-next-question","click",next);
 on("theme-select","change",e=>{state.settings.theme=e.target.value;applySettings();persist();});
 on("speech-rate","change",e=>{state.settings.rate=Number(e.target.value);persist();});
 on("session-length","change",e=>{state.settings.sessionLength=Number(e.target.value);persist();});
 on("btn-points-reset","click",()=>{if(confirm("Alleen de punten en de voortgang naar de volgende beloning wissen? Behaalde beloningen en leerresultaten blijven bewaard.")){state.points=0;state.rewardProgress=0;persist();alert("De punten zijn gewist.");}});
 on("btn-rewards-reset","click",()=>{if(confirm("Alleen het aantal behaalde beloningen wissen? Punten en leerresultaten blijven bewaard.")){state.rewards=0;persist();alert("De beloningen zijn gewist.");}});
 on("btn-progress-reset","click",()=>{if(confirm("Alle leerresultaten en sessiegeschiedenis wissen? Punten en beloningen blijven bewaard.")){clearProgress();alert("De voortgang is gewist.");}});
 on("btn-hard-reset","click",()=>{if(confirm("Alle punten, beloningen, instellingen en leerresultaten wissen?")){state=resetState();session.state=state;applySettings();syncStats();alert("Alle gegevens zijn gewist.");}});
 on("reward-close","click",()=>{const d=$("reward-dialog");if(d)d.hidden=true;});
 const infoDialog=$("app-info-dialog");
 const closeInfo=()=>{if(!infoDialog)return;infoDialog.hidden=true;document.body.classList.remove("modal-open");};
 on("btn-app-info","click",()=>{if(!infoDialog)return;infoDialog.hidden=false;document.body.classList.add("modal-open");});
 on("app-info-close","click",closeInfo);on("app-info-close-bottom","click",closeInfo);
 if(infoDialog)infoDialog.addEventListener("click",e=>{if(e.target===infoDialog)closeInfo();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&infoDialog&&!infoDialog.hidden)closeInfo();});
 document.querySelectorAll("[data-info-tab]").forEach(button=>button.addEventListener("click",()=>{const selected=button.dataset.infoTab;document.querySelectorAll("[data-info-tab]").forEach(tab=>tab.classList.toggle("active",tab===button));document.querySelectorAll("[data-info-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.infoPanel===selected));}));
}
async function init(){applySettings();syncStats();$("active-level-name").textContent=LEVEL_LABELS[activeLevel];document.querySelectorAll("[data-level]").forEach(x=>x.classList.toggle("active",x.dataset.level===activeLevel));try{database=await loadDatabase();curriculum=EMBEDDED_DATA.curriculum;session=new Session(database,state,persist,reward);events();$("loading-overlay").classList.add("hidden");}catch(error){console.error(error);$("loading-overlay").innerHTML=`<div class="load-error"><strong>De oefeningen konden niet worden geladen.</strong><p>Open de volledige uitgepakte map via een lokale webserver.</p><small>${String(error.message||error)}</small></div>`;}}
init();
