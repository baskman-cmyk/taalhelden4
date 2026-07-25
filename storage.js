import { MODES } from "./config.js";
const KEY="taalhelden_modulair_v1";
const emptyProgress=()=>Object.fromEntries(MODES.map(mode=>[mode,{answered:0,correct:0,sessions:0}]));
export function defaultState(){
  return {points:0,rewards:0,rewardProgress:0,level:1,streak:0,history:[],progress:emptyProgress(),settings:{theme:"light",rate:.85,sessionLength:15}};
}
export function loadState(){
  const base=defaultState();
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||"null");
    if(!parsed)return base;
    return {...base,...parsed,settings:{...base.settings,...(parsed.settings||{})},progress:{...base.progress,...(parsed.progress||{})}};
  }catch{return base;}
}
export function saveState(state){localStorage.setItem(KEY,JSON.stringify(state));}
export function resetState(){const state=defaultState();saveState(state);return state;}
