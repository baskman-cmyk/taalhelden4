import { escapeHtml, shuffle, tokenize } from "./utils.js";
import { grammarTitle, grammarExplanation } from "./grammar.js";
import { speakDutchWord, speakEnglish, englishText } from "./speech.js";
export function renderQuestion({question,mode,settings,onOption,onWord,onSubmit}){
 const root=document.getElementById("dynamic-content");
 if(question.type==="flashcard"){
  root.innerHTML=`<div class="flashcard-stage"><button id="flashcard" class="study-card" type="button" aria-label="Draai de kaart om"><span class="study-card-inner"><span class="study-card-face study-card-front"><small>Woord</small><strong>${escapeHtml(question.word)}</strong><span>Tik om de betekenis te bekijken</span></span><span class="study-card-face study-card-back"><small>Betekenis</small><strong>${escapeHtml(question.meaning)}</strong>${question.example?`<span>${escapeHtml(question.example)}</span>`:""}</span></span></button><button id="word-audio" class="button warning" type="button">🔊 Luister naar het woord</button></div>`;
  root.querySelector("#word-audio").onclick=()=>speakDutchWord(question.word,settings.rate,{intro:false});
  root.querySelector("#flashcard").onclick=e=>e.currentTarget.classList.toggle("flipped"); return;
 }
 if(question.type==="dictee"){
  root.innerHTML=`<div class="exercise-box"><button id="audio-dutch" class="button warning" type="button">🔊 Luister</button><p>Typ het woord dat je hoort.</p><input id="dictee-input" class="text-input" autocomplete="off" autocapitalize="off" spellcheck="false"></div>`;
  const play=()=>speakDutchWord(question.word,settings.rate,{intro:true});root.querySelector("#audio-dutch").onclick=play;root.querySelector("#dictee-input").onkeydown=e=>{if(e.key==="Enter")onSubmit();};play();return;
 }
 if(question.type==="grammar"){
  const tokens=tokenize(question.sentence);root.innerHTML=`<div class="exercise-box"><div class="section-header"><strong>${escapeHtml(question.question)}</strong><button id="grammar-help" class="button warning" type="button">💡 Uitleg</button></div><div id="grammar-help-box" class="help-box"><strong>${escapeHtml(grammarTitle(question.concept))}</strong><br>${escapeHtml(grammarExplanation(question.concept))}</div><div class="grammar-sentence">${escapeHtml(question.sentence)}</div><div class="word-grid">${tokens.map((t,i)=>`<button class="word-button" data-index="${i}" type="button">${escapeHtml(t.display)}</button>`).join("")}</div></div>`;
  const box=root.querySelector("#grammar-help-box");root.querySelector("#grammar-help").onclick=()=>box.style.display=box.style.display==="block"?"none":"block";root.querySelectorAll(".word-button").forEach(btn=>btn.onclick=()=>{btn.classList.toggle("selected");onWord(Number(btn.dataset.index),btn.classList.contains("selected"));});return;
 }
 const audio=mode==="engels"?'<button id="audio-english" class="button warning audio-english-button" type="button">🔊 Luister</button>':"";
 root.innerHTML=`${question.text?`<div class="exercise-box reading-text">${escapeHtml(question.text)}</div>`:""}<div class="exercise-box"><strong>${escapeHtml(question.question)}</strong>${audio}<div class="options-grid">${question.options.map((o,i)=>`<button class="option-button" data-value="${escapeHtml(o)}" type="button"><span class="option-letter">${String.fromCharCode(65+i)}</span>${escapeHtml(o)}</button>`).join("")}</div></div>`;
 if(mode==="engels")root.querySelector("#audio-english").onclick=()=>speakEnglish(englishText(question),settings.rate);
 root.querySelectorAll(".option-button").forEach(btn=>btn.onclick=()=>{root.querySelectorAll(".option-button").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");onOption(btn.dataset.value);});
}
