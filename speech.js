function speak(text,lang,rate){
  if(!("speechSynthesis" in window))return false;
  speechSynthesis.cancel();
  const msg=new SpeechSynthesisUtterance(text); msg.lang=lang; msg.rate=rate;
  speechSynthesis.speak(msg); return true;
}
export function speakDutchWord(text,rate=.85,{intro=false}={}){
  if(!intro)return speak(text,"nl-NL",Math.max(.65,rate-.08));
  if(!("speechSynthesis" in window))return false;
  speechSynthesis.cancel();
  const prompt=new SpeechSynthesisUtterance("Schrijf het woord op."); prompt.lang="nl-NL"; prompt.rate=rate;
  prompt.onend=()=>setTimeout(()=>speak(text,"nl-NL",Math.max(.65,rate-.08)),350);
  speechSynthesis.speak(prompt); return true;
}
export function englishText(question){
  const m=String(question.question||"").match(/['‘’"]([^'‘’"]+)['‘’"]/);
  return /^Wat betekent/i.test(question.question||"")&&m?m[1]:String(question.correct||m?.[1]||"");
}
export function speakEnglish(text,rate=.85){return speak(text,"en-GB",Math.max(.65,rate-.05));}
