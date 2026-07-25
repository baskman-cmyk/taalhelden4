import { shuffle, normalize, arraysEqual } from "./utils.js";
import { MODE_LABELS, LEVEL_LABELS } from "./config.js";
const REWARD_TARGET=500;
export class Session{
 constructor(database,state,onState,onReward){this.database=database;this.state=state;this.onState=onState;this.onReward=onReward;this.reset();}
 reset(){this.mode="";this.level="gr4";this.questions=[];this.index=0;this.score=0;this.selected=null;this.indices=new Set();this.answered=false;}
 start(mode,level){
  this.reset();this.mode=mode;this.level=level;
  const source=this.database[level][mode]||[];
  const amount=mode==="woordtrainer"?25:15;
  const key=`${level}_${mode}`;
  const usedQuestions=new Set((this.state.questionHistory||{})[key]||[]);
  const usedTexts=new Set((this.state.textHistory||{})[key]||[]);

  if(mode==="lezen"){
    // Groepeer vragen op werkelijk verschillende leesteksten. Twee teksten die
    // voor minstens 60% uit dezelfde betekenisvolle woorden bestaan, gelden
    // als dezelfde tekstgroep en kunnen nooit samen in één oefenronde komen.
    const words=value=>new Set(normalize(value||"").split(/\s+/).filter(w=>w.length>2));
    const similarity=(a,b)=>{
      const aw=words(a),bw=words(b);
      if(!aw.size||!bw.size)return 0;
      let overlap=0;for(const w of aw)if(bw.has(w))overlap++;
      return overlap/Math.min(aw.size,bw.size);
    };
    const groups=[];
    for(const q of source){
      const text=String(q.text||"").trim();
      let group=groups.find(g=>similarity(text,g.text)>=0.60);
      if(!group){
        const explicit=q.textId?String(q.textId):normalize((q.title||"")+"|"+text).slice(0,240);
        group={id:explicit,text,items:[]};groups.push(group);
      }
      group.items.push(q);
    }

    let available=groups.filter(g=>!usedTexts.has(g.id));
    if(!available.length){
      usedTexts.clear();
      available=[...groups];
    }

    const choose=pool=>{
      for(const group of shuffle(pool)){
        const fresh=shuffle(group.items).filter(q=>!usedQuestions.has(q.id||normalize((q.title||"")+"|"+q.question)));
        const q=fresh[0]||shuffle(group.items)[0];
        if(!q)continue;
        this.questions.push(q);
        usedTexts.add(group.id);
        usedQuestions.add(q.id||normalize((q.title||"")+"|"+q.question));
        if(this.questions.length>=amount)break;
      }
    };
    choose(available);

    // Bij volledig verbruik van de vraaghistorie mag een nieuwe cyclus starten,
    // maar nog steeds met maximaal één vraag per unieke/sterk gelijkende tekst.
    if(!this.questions.length&&groups.length){
      usedQuestions.clear();usedTexts.clear();choose(groups);
    }
  }


  while(mode!=="lezen"&&this.questions.length<Math.min(amount,source.length)){
    const pool=shuffle(source).filter(q=>!usedQuestions.has(q.id||normalize((q.title||"")+"|"+q.question)));
    if(!pool.length) break;
    const q=pool[0];
    this.questions.push(q);
    usedQuestions.add(q.id||normalize((q.title||"")+"|"+q.question));
  }

  // Verdeel de juiste antwoordposities evenwichtig zonder het correcte antwoord te wijzigen.
  const positions=shuffle(Array.from({length:this.questions.length},(_,i)=>i%4));
  this.questions=this.questions.map((q,i)=>{
    if(!Array.isArray(q.options)||!q.options.includes(q.correct))return q;
    const wrong=shuffle(q.options.filter(o=>o!==q.correct));
    const pos=Math.min(positions[i],q.options.length-1);
    const options=[...wrong]; options.splice(pos,0,q.correct);
    return {...q,options};
  });

  this.state.questionHistory=this.state.questionHistory||{};
  this.state.textHistory=this.state.textHistory||{};
  this.state.questionHistory[key]=[...usedQuestions].slice(-5000);
  this.state.textHistory[key]=[...usedTexts].slice(-1000);
 } 
 current(){return this.questions[this.index];} select(value){this.selected=value;} selectIndex(i,on){on?this.indices.add(i):this.indices.delete(i);}
 evaluate(input=""){
  if(this.answered||this.mode==="woordtrainer")return null;const q=this.current();let correct=false,answer="";
  if(q.type==="dictee"){correct=normalize(input)===normalize(q.word);answer=q.word;}
  else if(q.type==="grammar"){correct=arraysEqual([...this.indices].sort((a,b)=>a-b),[...q.correctIndices].sort((a,b)=>a-b));answer=q.correctText;}
  else{if(this.selected===null)return{missing:true};correct=this.selected===String(q.correct);answer=q.explanation||String(q.correct);}
  this.answered=true;const p=this.state.progress[this.mode];p.answered++;if(correct)p.correct++;let reward=false;
  if(correct){this.score++;this.state.points++;this.state.rewardProgress=(this.state.rewardProgress||0)+1;if(this.state.rewardProgress>=REWARD_TARGET){this.state.rewardProgress-=REWARD_TARGET;this.state.rewards++;reward=true;}}
  this.onState();if(reward)this.onReward();return{correct,answer,reward};
 }
 next(){this.index++;this.selected=null;this.indices.clear();this.answered=false;return this.index<this.questions.length;}
 previous(){if(this.index>0){this.index--;this.selected=null;this.indices.clear();this.answered=false;}return this.index>=0;}
 finish(){if(this.mode!=="woordtrainer"){this.state.streak++;this.state.progress[this.mode].sessions++;this.state.history.push({date:new Date().toLocaleDateString("nl-NL"),mode:MODE_LABELS[this.mode],level:LEVEL_LABELS[this.level],score:`${this.score} / ${this.questions.length}`});this.onState();}}
}
