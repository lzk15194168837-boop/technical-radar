'use strict';
const catalog = require('./catalog');
const {present}=require('./evaluation');
const {cardView}=require('./card-view');
const config = require('../../config');
const demo=require('../../demo-data');
Page({
  data:{deckIndex:0,currentCardId:'',canPrevious:false,canNext:false,detailEntries:[],catalogOpen:false,showFilters:false,openSection:'',selectedFit:'all',fitOptions:[{value:'all',label:'全部适用性'},{value:'pending',label:'还没评适用性'},{value:'5',label:'五星'},{value:'4',label:'四星'},{value:'3',label:'三星'},{value:'2',label:'二星'},{value:'1',label:'一星'}],tab:'knowledge',query:'',selectedRating:'all',expandedId:'',entries:[],filtered:[],
    ratingOptions:[{value:'all',label:'全部'},{value:'pending',label:'待了解'},
      {value:'5',label:'五星'},{value:'4',label:'四星'},{value:'3',label:'三星'},{value:'2',label:'二星'},{value:'1',label:'一星'}],
    ratingGuide:catalog.ratingGuide,evaluationFilter:'all',evaluatedCount:0,snapshotDate:'',catalogRevision:'',catalogError:'',catalogLoading:false,catalogOrigin:'尚未读取',selectedKind:'全部',kinds:['全部','工具','技能','工作流','方法'],proposedCount:0,inbox:[],inboxLoading:false,
    inboxError:'',inboxCheckedAt:'',ratedCount:0},
  onLoad(){try{const id=wx.getStorageSync('radarDeckPositionV1');if(typeof id==='string'&&/^[a-z0-9_-]{2,100}$/.test(id))this._lastViewedId=id;}catch(_){}try{const saved=wx.getStorageSync('radarCatalogV1');if(saved)this.applyCatalog(saved,'上次缓存');}catch(_){wx.removeStorageSync('radarCatalogV1');}},
  onShow(){this.refreshCatalog();this.refreshInbox();},
  async onPullDownRefresh(){try{await Promise.allSettled([this.refreshCatalog(),this.refreshInbox()]);}finally{wx.stopPullDownRefresh();}},
  applyCatalog(snapshot,origin){
    if(!snapshot||snapshot.schema!=='radar.catalog.1'||!Array.isArray(snapshot.entries)||snapshot.entries.length>200||(snapshot.revision!==null&&!/^[a-f0-9]{64}$/.test(snapshot.revision)))throw Error('Invalid catalog');
    const ids=new Set();
    const entries=snapshot.entries.map(e=>{if(!e||typeof e.id!=='string'||!e.title||!['工具','工作流','能力','规则'].includes(e.kind)||ids.has(e.id))throw Error('Invalid entry');ids.add(e.id);for(const k of ['rating','proposed_rating'])if(e[k]!=null&&(!Number.isInteger(e[k])||e[k]<1||e[k]>5))throw Error('Invalid rating');return cardView(present(e));}).sort((a,b)=>Number(b.hasEvaluation)-Number(a.hasEvaluation)||(b.fitScore??0)-(a.fitScore??0)||a.title.localeCompare(b.title));
    this.setData({entries,evaluatedCount:entries.filter(e=>e.hasEvaluation).length,catalogRevision:snapshot.revision||'',snapshotDate:snapshot.updatedAt?new Date(snapshot.updatedAt).toLocaleString():'离线示例',catalogOrigin:origin,ratedCount:entries.filter(e=>e.rating!=null).length,proposedCount:entries.filter(e=>e.rating==null&&e.proposed_rating!=null).length});this.filter();
  },
  async refreshCatalog(){
    if(this.data.catalogLoading)return;this.setData({catalogLoading:true,catalogError:''});
    try{const {result}=await demo.callFunction({name:config.controlFunction,data:{action:'radar_catalog_read'}});
      if(result&&result.code==='OWNER_REQUIRED'){wx.removeStorageSync('radarCatalogV1');this.setData({entries:[],filtered:[],ratedCount:0,proposedCount:0,evaluatedCount:0,catalogOrigin:'尚未授权',snapshotDate:'',catalogRevision:'',deckIndex:0,currentCardId:'',canPrevious:false,canNext:false,detailEntries:[],expandedId:'',openSection:'',catalogOpen:false,showFilters:false});this._lastViewedId='';try{wx.removeStorageSync('radarDeckPositionV1');}catch(_){}throw Error('Owner required');}
      if(!result||!result.ok)throw Error('Unavailable');this.applyCatalog(result.catalog,'本地演示');
      try{wx.setStorageSync('radarCatalogV1',result.catalog);}catch(_){this.setData({catalogError:'本次已刷新，但手机缓存未能保存。'});}
    }catch(_){this.setData({catalogError:'知识清单暂未刷新。若有旧列表，其内容以标注的更新时间为准。'});}
    finally{this.setData({catalogLoading:false});}
  },
  toggleFilters(){this.setData({showFilters:!this.data.showFilters});},
  selectFit(e){const value=String(e.currentTarget.dataset.value);if(this.data.fitOptions.some(x=>x.value===value)){this.setData({selectedFit:value});this.filter();}},
  toggleSection(e){const id=e.currentTarget.dataset.id,section=e.currentTarget.dataset.section;if(this.data.entries.some(x=>x.id===id)&&['risks','evidence','history'].includes(section)){const key=id+'|'+section;this.setData({openSection:this.data.openSection===key?'':key});}},
  selectEvaluation(e){const v=e.currentTarget.dataset.value;if(['all','assessed','pending'].includes(v)){this.setData({evaluationFilter:v});this.filter();}},
  copyEvidence(e){const row=this.data.entries.find(x=>x.id===e.currentTarget.dataset.id);const ev=row&&row.evidenceRows.find(x=>x.id===e.currentTarget.dataset.evidence);if(ev&&ev.url)wx.setClipboardData({data:ev.url});},
  selectKind(e){const kind=e.currentTarget.dataset.kind;if(this.data.kinds.includes(kind)){this.setData({selectedKind:kind});this.filter();}},
  selectTab(e){const tab=e.currentTarget.dataset.tab;if(['knowledge','inbox','ratings'].includes(tab))this.setData({tab,detailEntries:[],expandedId:'',openSection:'',showFilters:false,catalogOpen:false});},
  search(e){this.setData({query:e.detail.value});this.filter();},
  selectRating(e){const value=String(e.currentTarget.dataset.value);if(!this.data.ratingOptions.some(o=>o.value===value))return;this.setData({selectedRating:value});this.filter();},
  filter(){const q=this.data.query.trim().toLowerCase(),r=this.data.selectedRating;const filtered=this.data.entries.filter(e=>(r==='all'||(r==='pending'?e.rating==null&&e.proposed_rating==null:String(e.rating??e.proposed_rating)===r))&&(this.data.selectedKind==='全部'||e.displayKind===this.data.selectedKind)&&(this.data.selectedFit==='all'||(this.data.selectedFit==='pending'?e.fitScore===null:String(e.fitScore)===this.data.selectedFit))&&(this.data.evaluationFilter==='all'||(this.data.evaluationFilter==='assessed'?e.hasEvaluation:!e.hasEvaluation))&&[e.title,e.kind,e.displayKind,e.cardTitle,e.cardIntro,e.cardUse,e.summary,e.relevance,e.conclusion,JSON.stringify(e.evaluations||[]),...e.areas.map(a=>a.summary),...(e.tags||[])].join(' ').toLowerCase().includes(q));const wanted=this.data.currentCardId||this._lastViewedId;let index=filtered.findIndex(e=>e.id===wanted);if(index<0)index=0;this.setData({filtered,deckIndex:index,currentCardId:filtered[index]?filtered[index].id:'',canPrevious:index>0,canNext:index<filtered.length-1,detailEntries:[],expandedId:'',openSection:''});if(filtered[index])this.rememberCard(filtered[index].id);},
  rememberCard(id){this._lastViewedId=id;try{wx.setStorageSync('radarDeckPositionV1',id);}catch(_){}},
  goToCard(index){if(!Number.isInteger(index)||index<0||index>=this.data.filtered.length)return;const row=this.data.filtered[index];this.setData({deckIndex:index,currentCardId:row.id,canPrevious:index>0,canNext:index<this.data.filtered.length-1,detailEntries:[],expandedId:'',openSection:''});this.rememberCard(row.id);},
  onDeckChange(e){const index=e.detail.current;if(e.detail.source==='touch'&&Number.isInteger(index)&&index!==this.data.deckIndex)this.goToCard(index);},
  previousCard(){this.goToCard(this.data.deckIndex-1);},
  nextCard(){this.goToCard(this.data.deckIndex+1);},
  toggleCatalog(){this.setData({catalogOpen:!this.data.catalogOpen,showFilters:false});},
  closeCatalog(){this.setData({catalogOpen:false});},
  openCatalogCard(e){const id=e.currentTarget.dataset.id,index=this.data.filtered.findIndex(x=>x.id===id);if(index<0)return;this.goToCard(index);this.setData({catalogOpen:false});},
  closeFilters(){this.setData({showFilters:false});},
  noop(){},
  expand(e){const id=e.currentTarget.dataset.id,row=this.data.entries.find(x=>x.id===id);if(!row)return;const open=this.data.expandedId!==id;this.setData({expandedId:open?id:'',detailEntries:open?[row]:[],openSection:''});},
  closeDetails(){this.setData({expandedId:'',detailEntries:[],openSection:''});},
  copySource(e){const row=this.data.entries.find(v=>v.id===e.currentTarget.dataset.id);if(row&&row.source)wx.setClipboardData({data:row.source});},
  submit(){wx.redirectTo({url:'/pages/index/index?consumer=radar'});},
  async refreshInbox(){
    if(this.data.inboxLoading)return;
    this.setData({inboxLoading:true,inboxError:''});
    try{
      const {result}=await demo.callFunction({name:config.controlFunction,data:{action:'phone_inbox_list',deviceId:'laptop'}});
      if(!result||!result.ok||!Array.isArray(result.messages))throw Error('Unavailable');
      const inbox=result.messages.filter(e=>e.consumer==='radar').map(e=>({id:e.id,text:e.text||'图片收件',
        time:e.createdAt?new Date(e.createdAt).toLocaleString():'时间未知',
        status:e.radarStatus==='ingested'?'已入库 · 待研究':e.radarStatus==='failed'?'入库失败':e.status==='failed'?'电脑保存失败':e.status==='received'?'电脑已收到 · 等待入库':'云端已保存 · 等待电脑'}));
      this.setData({inbox,inboxCheckedAt:new Date().toLocaleTimeString()});
    }catch(_){this.setData({inboxError:'暂时无法刷新收件状态。已有列表保留，不能据此判断是否送达。'});}
    finally{this.setData({inboxLoading:false});}
  }
});
