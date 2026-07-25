export const escapeHtml = value => String(value)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
export const normalize = value => String(value).trim().toLocaleLowerCase("nl-NL").replace(/\s+/g," ");
export const normalizeToken = value => normalize(value).replace(/[.,!?;:"'()[\]{}]/g,"");
export function shuffle(source) {
  const result=[...source];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export const arraysEqual=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export const uniqueStrings=values=>{
  const seen=new Set();
  return values.filter(value=>{const key=normalize(value);if(!key||seen.has(key))return false;seen.add(key);return true;});
};
export const escapeRegExp=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
export const tokenize=sentence=>String(sentence).trim().split(/\s+/).map(display=>({display,clean:normalizeToken(display)}));
export function findAnswerIndices(sentence,answer){
  const tokens=tokenize(sentence), parts=String(answer).replace(/,/g," ").split(/\s+/).map(normalizeToken).filter(Boolean);
  for(let start=0;start<=tokens.length-parts.length;start++){
    if(arraysEqual(tokens.slice(start,start+parts.length).map(x=>x.clean),parts)) return parts.map((_,i)=>start+i);
  }
  const used=new Set(), result=[];
  for(const part of parts){const index=tokens.findIndex((x,i)=>x.clean===part&&!used.has(i));if(index<0)return[];used.add(index);result.push(index);}
  return result;
}
