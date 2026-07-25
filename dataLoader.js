import { MODES, LEVELS } from "./config.js";
import { EMBEDDED_DATA } from "./embeddedData.js";
import { buildGrammarQuestions } from "./grammar.js";
import { escapeRegExp, uniqueStrings, normalize } from "./utils.js";

const db=Object.fromEntries(LEVELS.map(level=>[level,Object.fromEntries(MODES.map(mode=>[mode,[]]))]));
const BAD_READING=[
  /de tekst gebruikt/i,/de lezer moet/i,/de eerste proef/i,/één duidelijke kern/i,
  /informatie uit verschillende zinnen combineren/i,/deze tekst is bedoeld/i,
  /de schrijver gebruikt/i,/voorbereiding veel invloed/i,/wat verandert er wanneer .*herschreven/i
];

const DISPLAY_NAMES=["Emma","Sophie","Julia","Tess","Noor","Sara","Mila","Eva","Daan","Sem","Finn","Lars","Bram","Luuk","Jesse","Amir","Aisha","Sofia","Liam","Maya"];
const SOURCE_NAMES=["Yara","Mila","Sara","Daan","Lina","Finn","Omar","Iris","Fleur","Noah","Bram","Sem","Amir","Sam","Mees","Timo","Sofie","Nora","Lisa","Lotte","Sanne","Tom","Jip","Max","Levi","Lucas","Anna","Eva","Julia","Tess","Noor","Emma","Sophie","Jesse","Luuk","Lars","Aisha","Sofia","Liam","Maya"];
function readingNameIndex(q){let h=0;for(const ch of `${q.text||""}|${q.question||""}`)h=(h*31+ch.charCodeAt(0))>>>0;return h%DISPLAY_NAMES.length;}
function standardizeReadingNames(q){
  const found=SOURCE_NAMES.filter(name=>new RegExp(`\\b${name}\\b`,"g").test(`${q.text||""} ${q.question||""} ${(q.options||[]).join(" ")}`));
  if(!found.length)return q;const replacements=new Map();let start=readingNameIndex(q);found.forEach((name,i)=>replacements.set(name,DISPLAY_NAMES[(start+i)%DISPLAY_NAMES.length]));
  const change=value=>{let out=String(value||"");for(const [oldName,newName] of replacements)out=out.replace(new RegExp(`\\b${oldName}\\b`,"g"),newName);return out;};
  return {...q,text:change(q.text),question:change(q.question),options:(q.options||[]).map(change),correct:change(q.correct),explanation:change(q.explanation)};
}
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const keyOf=q=>normalize(`${q.text||""}|${q.question||""}|${q.correct||""}`);
function dedupe(items,keyFn=keyOf){const seen=new Set();return (items||[]).filter(x=>{const k=keyFn(x);if(!k||seen.has(k))return false;seen.add(k);return true;});}
function safeReading(q){
  const combined=`${q?.text||""} ${q?.question||""}`;
  return q&&clean(q.text).length>35&&clean(q.question).length>5&&!BAD_READING.some(r=>r.test(combined))&&
    Array.isArray(q.options)&&(q.options.length===3||q.options.length===4)&&new Set(q.options).size===q.options.length&&q.options.includes(q.correct);
}
function repairReading(q){
  let text=clean(q.text);
  // Enkele duidelijk foutieve voornaamwoorden uit de brondata herstellen.
  text=text.replace(/Yara([^.!?]*\.)\s*Hij\b/g,"Yara$1 Zij").replace(/Yara([^.!?]*\.)\s*Zijn\b/g,"Yara$1 Haar");
  return {...q,text};
}

function expandReading(items,level){
  const out=[];
  for(const item of items||[]){
    if(item?.tekst&&Array.isArray(item.vragen)){
      item.vragen.forEach((v,i)=>{
        if(!v?.vraag||!Array.isArray(v.opties)||!v.antwoord)return;
        const idx="ABCD".indexOf(String(v.antwoord).toUpperCase());
        const correct=idx>=0?v.opties[idx]:v.antwoord;
        out.push({type:"choice",id:`${level}_${normalize(item.titel||item.tekst).slice(0,40)}_${i}`,textId:`${level}_${normalize(item.tekst)}`,title:clean(item.titel),text:clean(item.tekst),question:clean(v.vraag),options:v.opties.map(clean),correct:clean(correct),explanation:`Het juiste antwoord is: ${clean(correct)}.`});
      });
    } else out.push(item);
  }
  return out;
}
const simple=items=>dedupe((items||[]).filter(x=>x?.q&&Array.isArray(x.o)&&x.c!==undefined)
  .map(x=>({type:"choice",text:"",question:clean(x.q),options:x.o.map(clean),correct:clean(x.c)})));
const vocabulary7=items=>dedupe((Array.isArray(items)?items:[]).flatMap(item=>(item.vragen||[])
  .filter(q=>q?.vraag&&Array.isArray(q.opties)&&q.antwoord)
  .map(q=>({type:"choice",text:"",question:clean(q.vraag),options:q.opties.map(clean),correct:clean(q.antwoord)}))));
function word6(item){
  const q=clean(item.q),quoted=q.match(/['‘’"]([^'‘’"]+)['‘’"]/);if(quoted)return quoted[1].trim();
  let m=q.match(/^Wat is (?:een|de|het)\s+(.+?)\?$/i);if(m)return m[1].trim();
  m=q.match(/^Wat betekent\s+(.+?)\?$/i);if(m)return m[1].trim();
  return /^Welk woord past/i.test(q)?clean(item.c):"";
}
function meaningMaps(){
  const out={gr4:new Map(),gr5:new Map(),gr6:new Map(),gr7:new Map()};
  for(const level of ["gr4","gr5"]){
    for(const q of EMBEDDED_DATA.basis45[level]?.woordenschat||[]){
      const m=clean(q.question).match(/^Wat betekent ['‘’"](.+?)['‘’"]\?$/i);
      if(m&&q.correct)out[level].set(normalize(m[1]),clean(q.correct));
    }
  }
  for(const q of EMBEDDED_DATA.woordenschat6?.woordenschat||[]){const w=word6(q);if(w)out.gr6.set(normalize(w),clean(q.c));}
  for(const q of EMBEDDED_DATA.woordenschat7||[])if(q.woord&&q.betekenis)out.gr7.set(normalize(q.woord),clean(q.betekenis));
  return out;
}
const meanings=meaningMaps();
function normalizeSpelling(item,level){
  const nested=item?.spelling;
  const correct=clean(nested?.antwoord??item?.correct??item?.c);
  const options=nested?.opties??item?.options??item?.o;
  if(!correct||!Array.isArray(options)||!options.includes(correct))return null;
  let source=clean(item.tekst||item.text);
  const re=new RegExp(`\\b${escapeRegExp(correct)}\\b`,"i");
  let text="";
  if(source&&re.test(source)) text=source.replace(re,"..........");
  else {
    const meaning=meanings[level]?.get(normalize(correct));
    text=meaning?`Betekenis: ${meaning}`:"Kies de juiste spelling van het woord.";
  }
  return {type:"choice",text,question:"Welk woord is goed geschreven?",options:options.map(clean),correct,
    explanation:clean(nested?.uitleg||item.explanation)||`Je schrijft het woord als: ${correct}.`};
}
function trainerCards(level){
  if(level==="gr6")return dedupe((EMBEDDED_DATA.woordenschat6.woordenschat||[]).map(x=>{const w=word6(x);return w?{type:"flashcard",word:w,meaning:clean(x.c),example:""}:null}).filter(Boolean),x=>normalize(x.word));
  if(level==="gr7")return dedupe((EMBEDDED_DATA.woordenschat7||[]).map(x=>({type:"flashcard",word:x.woord,meaning:x.betekenis,example:x.voorbeeldzin||""})).filter(x=>x.word&&x.meaning),x=>normalize(x.word));
  return [...meanings[level].entries()].map(([word,meaning])=>({type:"flashcard",word,meaning,example:""}));
}
function fill(level,records){
  db[level].spelling=dedupe(records.map(x=>normalizeSpelling(x,level)).filter(Boolean),x=>normalize(x.correct));
  db[level].lezen=[];
  db[level].grammatica=records.flatMap(buildGrammarQuestions);
}
export async function loadDatabase(){
  const {basis45,taal,lezenLang,woordenschat6,woordenschat7,engels6,engels7}=EMBEDDED_DATA;
  for(const level of ["gr4","gr5"]){
    db[level].lezen=dedupe(expandReading(basis45[level]?.lezen||[],level).map(repairReading).map(standardizeReadingNames).filter(safeReading));
    db[level].spelling=dedupe((basis45[level]?.spelling||[]).map(x=>normalizeSpelling(x,level)).filter(Boolean),x=>normalize(x.correct));
    db[level].dictee=dedupe(basis45[level]?.dictee||[],x=>normalize(x.word||x.woord||""));
    db[level].grammatica=basis45[level]?.grammatica||[];
    db[level].woordenschat=dedupe(basis45[level]?.woordenschat||[]);
    db[level].engels=dedupe(basis45[level]?.engels||[]);
  }
  const records=Array.isArray(taal.spelling)?taal.spelling:[];
  fill("gr6",records.filter(x=>Number(x.id)<=220));fill("gr7",records.filter(x=>Number(x.id)>220));
  db.gr6.lezen=dedupe(expandReading(lezenLang.gr6||[],"gr6").map(repairReading).map(standardizeReadingNames).filter(safeReading));
  db.gr7.lezen=dedupe(expandReading(lezenLang.gr7||[],"gr7").map(repairReading).map(standardizeReadingNames).filter(safeReading));
  db.gr6.woordenschat=simple(woordenschat6.woordenschat);db.gr7.woordenschat=vocabulary7(woordenschat7);
  db.gr6.engels=simple(engels6.engels);db.gr7.engels=simple(engels7.engelsGroep7);
  db.gr6.dictee=uniqueStrings((woordenschat6.woordenschat||[]).map(word6).filter(Boolean)).map(word=>({type:"dictee",word}));
  db.gr7.dictee=uniqueStrings((woordenschat7||[]).map(x=>x.woord).filter(Boolean)).map(word=>({type:"dictee",word}));
  for(const level of LEVELS)db[level].woordtrainer=trainerCards(level);
  for(const level of LEVELS)for(const mode of MODES)if(!db[level][mode]?.length)throw new Error(`Geen data voor ${level}/${mode}`);
  return db;
}
