import { findAnswerIndices, tokenize, normalize, normalizeToken } from "./utils.js";
function firstVerb(gezegde){return String(gezegde||"").split(/[, ]+/).filter(Boolean)[0]||"";}
function tokenIndices(sentence,words){const wanted=new Set(words.map(normalizeToken));return tokenize(sentence).map((x,i)=>wanted.has(x.clean)?i:-1).filter(i=>i>=0);}
function plural(subject,pv){const s=normalize(subject),v=normalize(pv);return /^(wij|we|jullie|zij|ze)\b/.test(s)||/\b(kinderen|mensen|dieren|leerlingen|jongens|meisjes|ouders|vogels|boten|apen|pannen|brieven|bladeren)\b/.test(s)||(v.endsWith("en")&&!/(ben|kan|zien|doen)$/.test(v));}
const TRANSITIVE=new Set(["hebben","heeft","schrijven","schrijft","bakken","bakt","schoppen","schopt","lezen","leest","brengen","brengt","maken","maakt","vertellen","vertelt","dragen","draagt","kopen","koopt","zien","ziet","vinden","vindt","nemen","neemt","eten","eet","drinken","drinkt","openen","opent","sluiten","sluit","bezoeken","bezoekt","gebruiken","gebruikt","helpen","helpt","waaien","waait"]);
export function buildGrammarQuestions(item){
  const g=item.grammatica||{},sentence=String(item.tekst||""),result=[];
  const click=(concept,answer,question)=>{if(!answer)return;const correctIndices=findAnswerIndices(sentence,answer);if(correctIndices.length)result.push({type:"grammar",concept,sentence,question,correctIndices,correctText:answer});};
  click("onderwerp",g.onderwerp,"Klik alle woorden van het onderwerp aan.");
  const pv=firstVerb(g.gezegde);click("persoonsvorm",pv,"Klik de persoonsvorm aan.");
  click("gezegde",g.gezegde,"Klik alle werkwoorden van het gezegde aan.");
  if(g.lijdend_voorwerp&&TRANSITIVE.has(normalizeToken(pv)))click("lijdend_voorwerp",g.lijdend_voorwerp,"Klik alle woorden van het lijdend voorwerp aan.");
  const lid=tokenIndices(sentence,["de","het","een"]);if(lid.length)result.push({type:"grammar",concept:"lidwoord",sentence,question:"Klik alle lidwoorden aan.",correctIndices:lid,correctText:lid.map(i=>tokenize(sentence)[i].display).join(", ")});
  const vz=tokenIndices(sentence,["aan","achter","bij","door","in","langs","met","naar","naast","om","onder","op","over","tegen","tot","uit","van","voor","zonder"]);if(vz.length)result.push({type:"grammar",concept:"voorzetsel",sentence,question:"Klik alle voorzetsels aan.",correctIndices:vz,correctText:vz.map(i=>tokenize(sentence)[i].display).join(", ")});
  if(g.onderwerp)result.push({type:"choice",concept:"getal",text:sentence,question:"Staat het onderwerp in het enkelvoud of in het meervoud?",options:["Enkelvoud","Meervoud"],correct:plural(g.onderwerp,pv)?"Meervoud":"Enkelvoud"});
  result.push({type:"choice",concept:"zinstype",text:sentence,question:"Wat voor soort zin is dit?",options:["Mededelende zin","Vragende zin","Uitroepende zin"],correct:sentence.trim().endsWith("?")?"Vragende zin":sentence.trim().endsWith("!")?"Uitroepende zin":"Mededelende zin"});
  return result;
}
export const grammarTitle=c=>({onderwerp:"Onderwerp",persoonsvorm:"Persoonsvorm",gezegde:"Gezegde",lijdend_voorwerp:"Lijdend voorwerp",lidwoord:"Lidwoord",voorzetsel:"Voorzetsel",getal:"Enkelvoud en meervoud",zinstype:"Soort zin"}[c]||"Grammatica");
export const grammarExplanation=c=>({
  onderwerp:"Stap 1: zoek de persoonsvorm. Stap 2: vraag: wie of wat doet dit? Het antwoord is het onderwerp.",
  persoonsvorm:"Maak van de zin een vraag of zet de zin in een andere tijd. Het werkwoord dat verandert of vooraan komt, is de persoonsvorm.",
  gezegde:"Zoek eerst de persoonsvorm. Kijk daarna of er nog andere werkwoorden in de zin staan. Alle werkwoorden samen vormen het werkwoordelijk gezegde.",
  lijdend_voorwerp:"Zoek onderwerp en gezegde. Vraag daarna: wie of wat + gezegde + onderwerp? Het antwoord is het lijdend voorwerp.",
  lidwoord:"De lidwoorden zijn de, het en een. Klik alleen deze losse woorden aan.",
  voorzetsel:"Een voorzetsel staat vaak voor een plaats, richting of tijd: in de kast, naar school, na het eten of met de fiets.",
  getal:"Enkelvoud betekent één persoon, dier of ding. Meervoud betekent meer dan één.",
  zinstype:"Een mededelende zin vertelt iets. Een vragende zin eindigt met een vraagteken. Een uitroepende zin klinkt nadrukkelijk en eindigt meestal met een uitroepteken."
}[c]||"Lees de hele zin en werk stap voor stap.");
