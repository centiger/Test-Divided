let HUBS=[];
let current=null;
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);

async function loadData(){
  const res=await fetch('data/hubs.json?v=m07-v36-actual-fixed',{cache:'no-store'});
  const data=await res.json();
  HUBS=data.hubs||[];
  const slug=params.get('hub')||data.defaultHub||(HUBS[0]&&HUBS[0].slug);
  renderHub(slug);
  renderHubList();
}

function setOptional(sectionId, contentId, value, renderer){
  const section=$(sectionId);
  const box=$(contentId);
  if(!section||!box)return;
  if(!value || (Array.isArray(value)&&!value.length)){
    section.style.display='none';
    box.innerHTML='';
    return;
  }
  section.style.display='block';
  box.innerHTML=renderer?renderer(value):formatText(value);
}

const BIBLE_BOOK_PATTERN='(?:창세기|출애굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘상|사무엘하|열왕기상|열왕기하|역대상|역대하|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|예레미야애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훔|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도전서|고린도후서|갈라디아서|에베소서|빌립보서|골로새서|데살로니가전서|데살로니가후서|디모데전서|디모데후서|디도서|빌레몬서|히브리서|야고보서|베드로전서|베드로후서|요한일서|요한이서|요한삼서|유다서|요한계시록)';
const BIBLE_REF_RE=new RegExp(`${BIBLE_BOOK_PATTERN}\\s*\\d+(?:\\s*(?:장|편))?(?:\\s*[:：]\\s*\\d+)?(?:\\s*[~～\\-–—]\\s*\\d+(?::\\d+)?\\s*(?:장|편)?)?`,'g');

function normalizeCenBibleRef(raw){
  const text=String(raw||'').replace(/[～–—]/g,'~').replace(/：/g,':').trim();
  const m=text.match(new RegExp(`^(${BIBLE_BOOK_PATTERN})\\s*(\\d+)(?:\\s*(?:장|편))?(?:\\s*:\s*(\\d+))?`));
  if(!m)return text;
  return `${m[1]} ${m[2]}:${m[3]||'1'}`;
}

function linkifyBibleRefs(value){
  const escaped=escapeHtml(String(value??''));
  return escaped.replace(BIBLE_REF_RE,match=>{
    const ref=normalizeCenBibleRef(match);
    const href=`https://centiger.github.io/CEN-Bible2.0/?ref=${encodeURIComponent(ref)}`;
    return `<a class="bibleRefLink" href="${href}" data-bible-ref="${escapeHtml(ref)}">${match}</a>`;
  });
}

function formatText(v){
  if(Array.isArray(v)) return `<ul class="cleanList">${v.map(x=>`<li>${linkifyBibleRefs(formatInline(x))}</li>`).join('')}</ul>`;
  return linkifyBibleRefs(formatInline(v)).replace(/\n/g,'<br>');
}

function formatInline(v){
  if(v===null||v===undefined) return '';
  if(typeof v==='object'){
    const main=v.title||v.label||v.name||v.text||v.content||'';
    const sub=v.desc||v.description||v.detail||'';
    const icon=v.icon?`${v.icon} `:'';
    if(main||sub) return icon + main + (sub?` - ${sub}`:'');
    return Object.values(v).filter(x=>typeof x!=='object').join(' - ');
  }
  return String(v);
}

function escapeHtml(s){
  return s.replace(/[&<>"]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

function renderHub(slug){
  current=HUBS.find(h=>h.slug===slug)||HUBS[0];
  if(!current)return;
  $('appTitle').textContent=current.title;
  $('appSub').textContent=current.subtitle||'분열왕국 핵심 사건 허브탐험';
  $('hero').innerHTML=`
${current.kicker?`<div class="kicker">${escapeHtml(current.kicker)}</div>`:''}
${current.question?`
<div class="questionCard">
  <div class="qMark">❓ 핵심 질문</div>
  <div class="qText">${escapeHtml(current.question)}</div>
  <div class="oneLine">💡 ${escapeHtml(current.oneLine||'')}</div>
</div>`:''}
<h1>${escapeHtml(current.heroTitle||current.title)}</h1>
<p>${formatText(current.heroText||'')}</p>
<div class="tags">${(current.tags||[]).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>`;

  $('flowTitle').textContent=current.mainFlowTitle||'핵심 흐름';
  $('mainFlow').innerHTML=nodes(current.mainFlow||[]);

  $('mapTitle').textContent=current.mapTitle||'지도';
  $('mapImg').src=current.map||'';
  $('mapCaption').textContent=current.mapCaption||'';

  setOptional('verseSection','verse',current.verse);

  $('keyItems').innerHTML=(current.keyItems||[]).map(i=>`<div class="infoBox"><div class="ico">${i.icon||'•'}</div><b>${escapeHtml(i.title||'')}</b><p>${formatText(i.text||'')}</p></div>`).join('');
  $('overviewFlow').innerHTML=nodes(current.overviewFlow||[]);

  setOptional('eventsSection','events',current.events, renderListOrFlow);
  if(current.meaning && typeof current.meaning==='object' && !Array.isArray(current.meaning) && (current.meaning.summary || current.meaning.flow || current.meaning.thought)){
    setOptional('meaningSection','meaning',null);
  }else{
    setOptional('meaningSection','meaning',current.meaning, renderExplore);
  }
  setOptional('integrationSection','integration',current.integration ? buildIntegrationExplore(current) : null, renderExplore);
  setOptional('bibleSection','bible',current.bible);
  setOptional('messageSection','message',current.message, v=>`<div class="messageStrong">${formatText(v)}</div>`);

  if($('timeline')) $('timeline').innerHTML=(current.timeline||[]).map(t=>`<div class="t ${t.active?'active':''}">${escapeHtml(t.year||'')}<div class="dot"></div>${escapeHtml(t.label||'')}</div>`).join('');
  if(current.meaning && typeof current.meaning==='object' && !Array.isArray(current.meaning) && (current.meaning.summary || current.meaning.flow || current.meaning.thought)){
    $('links').innerHTML=renderExplore(buildConnectionExplore(current));
  }else{
    $('links').innerHTML=(current.links||[]).map((l,i)=>`<button class="${i===1?'primary':''}" data-url="${l.url||''}" data-hub="${l.hub||''}">${escapeHtml(l.label||'')}</button>`).join('');
  }
  $('prevBtn').textContent=current.prevLabel||'이전 허브';
  $('nextBtn').textContent=current.nextLabel||'다음 허브';
}

function renderExplore(value){
  function escapeLocal(s){
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[m]));
  }
  function hasEmoji(s){
    return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(String(s||''));
  }
  function iconForStep(step){
    const t=String(step||'');
    if(/왕국분열|분열|르호보암|여로보암/.test(t)) return '⚡';
    if(/갈멜|엘리야|불/.test(t)) return '🔥';
    if(/바알|우상/.test(t)) return '🛕';
    if(/북이스라엘|사마리아|멸망/.test(t)) return '🏚️';
    if(/앗수르|산헤립|침공/.test(t)) return '⚔️';
    if(/히스기야|기도/.test(t)) return '🙏';
    if(/이사야|선지자|아모스|호세아|예레미야/.test(t)) return '📣';
    if(/요시야|개혁/.test(t)) return '👑';
    if(/율법|말씀/.test(t)) return '📖';
    if(/예루살렘|성전/.test(t)) return '🏛️';
    if(/바벨론|포로/.test(t)) return '⛓️';
    if(/귀환|회복/.test(t)) return '🚶';
    if(/다윗|다윗 계보|다윗언약/.test(t)) return '👑';
    if(/예수|그리스도|십자가|메시아/.test(t)) return '✝️';
    if(/열방|이방/.test(t)) return '🌍';
    if(/교회/.test(t)) return '⛪';
    if(/새창조|새 예루살렘/.test(t)) return '👑';
    return '🔹';
  }

  const labels=[
    '❓ 핵심질문',
    '💡 한 줄 핵심',
    '📖 사건의 의미',
    '📖 구속사 의미',
    '🔗 연결 흐름',
    '🌍 성경 전체 흐름',
    '🤔 생각해보기'
  ];

  function splitItem(x){
    let raw='';
    if(typeof x==='string'){
      raw=String(x||'').trim();
    }else{
      const title=String(x?.title||x?.label||'').trim();
      const text=String(x?.text||x?.content||x?.body||'').trim();
      raw=(title+(text?' '+text:'')).trim();
    }

    raw=raw.replace(/\s*\|\s*/g,' ');

    for(const label of labels){
      if(raw.startsWith(label)){
        return {title:label, text:raw.slice(label.length).trim()};
      }
    }
    return {title:'', text:raw};
  }

  function flowToText(flow){
    if(!Array.isArray(flow)) return String(flow||'');
    return flow.map(f=>{
      if(typeof f==='string') return f;
      const icon=f.icon?f.icon+' ':'';
      return icon + (f.title || f.text || f.label || '');
    }).join(' → ');
  }

  function verticalFlowHtml(text){
    const raw=String(text||'').trim();
    const parts=raw.split(/\s*(?:→|↓)\s*/).map(v=>v.trim()).filter(Boolean);
    if(parts.length<2) return escapeLocal(raw).replace(/\n/g,'<br>');
    return parts.map(step=>{
      const labeled=hasEmoji(step)?step:`${iconForStep(step)} ${step}`;
      return escapeLocal(labeled);
    }).join('<br>↓<br>');
  }

  function renderItem(x){
    const item=splitItem(x);
    const isFlow=/연결\s*흐름|성경\s*전체\s*흐름/.test(item.title)||item.text.includes('→')||item.text.includes('↓');
    const body=isFlow?verticalFlowHtml(item.text):escapeLocal(item.text).replace(/\n/g,'<br>');
    return `<div class="exploreCard">${item.title?`<b>${escapeLocal(item.title)}</b>`:''}<p>${body}</p></div>`;
  }

  if(Array.isArray(value)){
    return `<div class="exploreGrid">${value.map(renderItem).join('')}</div>`;
  }

  if(value && typeof value==='object' && (value.summary || value.flow || value.thought)){
    const titleForFlow=value.flowTitle||'연결 흐름';
    const items=[];
    if(value.summary) items.push({title:'📖 사건의 의미', text:value.summary});
    if(value.flow) items.push({title:`🔗 ${titleForFlow}`, text:flowToText(value.flow)});
    if(value.thought) items.push({title:'🤔 생각해보기', text:value.thought});
    return `<div class="exploreGrid">${items.map(renderItem).join('')}</div>`;
  }

  return `<div class="exploreGrid">${renderItem(value||'')}</div>`;
}

function buildConnectionExplore(h){
  const m=h.meaning||{};
  const flowText=Array.isArray(m.flow)?m.flow.map(f=>{
    if(typeof f==='string') return f;
    return (f.icon?f.icon+' ':'')+(f.title||f.text||f.label||'');
  }).join(' → '):(m.flow||'');
  return [
    {title:'❓ 핵심질문', text:h.question||''},
    {title:'💡 한 줄 핵심', text:h.oneLine||''},
    {title:'📖 사건의 의미', text:m.summary||''},
    {title:'🔗 연결 흐름', text:flowText},
    {title:'🤔 생각해보기', text:m.thought||''}
  ].filter(x=>x.text);
}

function buildIntegrationExplore(h){
  const g=h.integration||{};
  const flowText=Array.isArray(g.flow)?g.flow.map(f=>{
    if(typeof f==='string') return f;
    return (f.icon?f.icon+' ':'')+(f.title||f.text||f.label||'');
  }).join(' → '):(g.flow||'');
  const shortSummary=String(g.summary||'').split(/[.!?。]/)[0];
  return [
    {title:'❓ 핵심질문', text:`${(h.title||'이 사건').replace(/ 허브$/,'')}은 성경 전체 흐름에서 무엇을 보여주는가?`},
    {title:'💡 한 줄 핵심', text:shortSummary||h.oneLine||''},
    {title:'📖 구속사 의미', text:g.summary||''},
    {title:'🌍 성경 전체 흐름', text:flowText},
    {title:'🤔 생각해보기', text:g.thought||''}
  ].filter(x=>x.text);
}

function renderListOrFlow(value){
  if(Array.isArray(value)) return formatText(value);
  const parts=formatInline(value).split('→').map(s=>s.trim()).filter(Boolean);
  if(parts.length>1){
    return `<div class="arrowFlow">${parts.map(p=>`<span>${escapeHtml(p)}</span>`).join('<b>→</b>')}</div>`;
  }
  return formatText(value);
}

function nodes(items){
  return items.map(i=>`<div class="node"><div class="ico">${i.icon||'•'}</div><b>${escapeHtml(i.title||'')}</b><small>${escapeHtml(i.text||'')}</small></div>`).join('');
}

function goHub(slug){
  if(!slug){alert('다음 단계에서 연결됩니다.');return}
  history.pushState(null,'',`?hub=${slug}`);
  renderHub(slug);
  window.scrollTo(0,0);
}
function openUrl(url){
  if(!url)return;
  if(url.startsWith('#'))alert('다음 단계에서 연결됩니다.');
  else window.open(url,'_self');
}
function renderHubList(){
  $('hubList').innerHTML=HUBS.map(h=>`<button class="hubItem" data-hub="${h.slug}"><b>${escapeHtml(h.title||'')}</b><span>${escapeHtml(h.year||'')} · ${escapeHtml(h.short||'')}</span></button>`).join('');
}

document.addEventListener('click',e=>{
  const bible=e.target.closest('[data-bible-ref]');
  if(bible){
    e.preventDefault();
    const ref=bible.dataset.bibleRef;
    openUrl(`https://centiger.github.io/CEN-Bible2.0/?ref=${encodeURIComponent(ref)}`);
    return;
  }
  const url=e.target.closest('[data-url]');
  if(url&&url.dataset.url){e.preventDefault();$('drawer').classList.remove('show');openUrl(url.dataset.url);return}
  const hub=e.target.closest('[data-hub]');
  if(hub&&hub.dataset.hub){e.preventDefault();$('drawer').classList.remove('show');goHub(hub.dataset.hub);return}
});
$('prevBtn').onclick=()=>current&&current.prev?goHub(current.prev):null;
$('nextBtn').onclick=()=>{if(!current)return;if(current.nextUrl)return openUrl(current.nextUrl);if(current.next)return goHub(current.next)};
$('matrixBtn').onclick=()=>openUrl('../index.html');
$('backBtn').onclick=()=>openUrl('../index.html');
$('hubListBtn').onclick=()=>$('drawer').classList.add('show');
$('drawerClose').onclick=()=>$('drawer').classList.remove('show');
$('drawer').onclick=e=>{if(e.target.id==='drawer')$('drawer').classList.remove('show')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?bible-link-20260722').catch(()=>{});
loadData();
