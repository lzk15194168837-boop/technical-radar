'use strict';
const COPY={};
const KIND={skill:['技能','技能卡','skill'],workflow:['工作流','工作流卡','workflow'],rule:['方法','方法卡','rule'],software:['工具','工具卡','software'],ai_service:['工具','工具卡','software']};
const SHORT={unknown:'未知',unverified:'待验证',not_applicable:'不适用',described:'已有说明'};
function cardView(e){const v=(e.evaluations||[]).slice(-1)[0],copy=COPY[e.id],c=copy&&v&&v.id===copy.evaluation?copy:null;
 const category=v?v.category:e.kind==='规则'?'rule':e.kind==='工作流'?'workflow':e.kind==='能力'||/skills?/i.test(e.title)?'skill':'software',kind=KIND[category]||KIND.software;
 const dims=['capability','reliability','fit','integration'].map((key,i)=>{const j=v&&v.areas[key],score=j&&j.status==='scored'?j.score:null;return{key,title:['能力','可靠','适用','搭配'][i],score,stars:score!==null?'★'.repeat(score)+'☆'.repeat(5-score):'',text:score!==null?'':c&&c.short[i]||SHORT[j&&j.status]||'未知',note:score!==null?'演示分数':'',summary:j?j.summary:'资料还不够，暂不判断。'};});
 return{...e,displayKind:kind[0],cardType:kind[1],cardTone:kind[2],cardTitle:c?c.title:e.title.replace(/（[^）]*）/g,''),cardMark:c?c.mark:'',cardDomain:c?c.domain:v?'四方面初评':'待了解',cardIntro:c?c.intro:e.summary,cardUse:c?c.use:'',cardWarning:c?c.warning:e.limitation||'当前可用性、费用与许可还需核实。',cardNext:c?c.next:v?v.action.next:'先核实用途、版本和费用，再决定是否试用。',cardAction:v?v.action.label:'先核实信息',cardDate:v?'初评 · '+v.date:'尚待评价',dimensions:dims,fitScore:dims[2].score};}
module.exports={cardView};
