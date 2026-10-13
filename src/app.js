import {MODULES,SKILLS,SKILL_BY_ID,FEATURED,skillsOf,moduleForSkill,ancestors} from './content.js';
import {checkAnswer} from './math.js';
import {formatMathText} from './math-display.js';
import {classifyMistake,hintFor,lessonMessage,recordTutorMessage,suggestedBridge} from './tutor.js';
import {TUTOR_API_URL, TURNSTILE_SITE_KEY} from './tutor-config.js';
import {loadState,saveState,progressOf,statusOf,summarizeProgress,reviewDue,nextReview} from './storage.js';
import {createPersonalDiagnostic,diagnosticQuestion,recordDiagnostic,diagnosticGaps,createLearningPath,nextPathStep,completePathStep,pathProgress} from './personal-path.js';
import {DIFFICULTY_LABELS,availableLevels,clampLevel,questionsForLevel,difficultyState,recordLevelResult,createChallenge,recordChallengeAnswer,challengeResult} from './difficulty.js';
import {GENIUS_PROBLEMS,collatzExplore,goldbachExplore} from './genius-problems.js';
import {authUser,login,register,signInWithGoogle,logout,resetPassword,fetchAdultData,writeAdultData} from './auth.js';

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=loadState();
let route={name:'home'};
let chosenMode='adult';
let searchTerm='';
let geniusVisible=false;
const geniusDemo={collatz:null,goldbach:null};
let authVisible=false, authTab='signin', authBusy=false, authMessage='';
let signedInUser=null, cloudReady=false, cloudTimer=null, cloudWriting=false, cloudQueued=false;
function adultHasProgress(p){return Boolean(Object.keys(p.progress||{}).length||(p.sessions||[]).length||p.activeLesson||(p.challengeHistory||[]).length);}
function adultEmpty(){return {progress:{},sessions:[],reviews:[],activeLesson:null,learningPath:null,challengeHistory:[]};}
function cloudSnapshot(){return structuredClone(state.profiles.adult);}
function scheduleCloudSave(){
 if(!signedInUser||!cloudReady)return;
 clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>void flushCloudSave(),1200);
}
async function flushCloudSave(){
 if(!signedInUser||!cloudReady)return;
 if(cloudWriting){cloudQueued=true;return;}
 const id=signedInUser.id, data=cloudSnapshot();
 cloudWriting=true;
 try{await writeAdultData(id,data);}
 catch(error){console.warn('Cloud sync failed:',error.message);toast('Не удалось синхронизировать прогресс. Локальная копия сохранена.');}
 finally{cloudWriting=false;if(cloudQueued){cloudQueued=false;scheduleCloudSave();}}
}
async function onAuthenticated(user){
 if(!user)return;
 cloudReady=false;signedInUser=user;
 try{
  const row=await fetchAdultData(user.id);
  if(signedInUser?.id!==user.id)return;
  if(row){
   state.profiles.adult={...adultEmpty(),progress:row.adult_progress||{},sessions:row.adult_sessions||[],activeLesson:row.adult_active_lesson||null,learningPath:row.adult_learning_path||null,challengeHistory:row.adult_challenge_history||[]};
   saveState(state);
  }else{
   const existing=cloudSnapshot();
   if(adultHasProgress(existing)){
    const importLocal=window.confirm('Импортировать сохранённый на этом устройстве взрослый прогресс в новый аккаунт Znayu? Данные школьного режима не переносятся.');
    if(!importLocal)state.profiles.adult=adultEmpty();
   }else state.profiles.adult=adultEmpty();
   saveState(state);
   await writeAdultData(user.id,cloudSnapshot());
  }
  cloudReady=true;
 }catch(error){
  console.warn('Could not load cloud progress:',error);
  cloudReady=false;toast('Облако пока недоступно. Локальный прогресс остаётся сохранён.');
 }
 render();
}
async function initializeAuth(){
 try{const user=await authUser();if(user)await onAuthenticated(user);}
 catch(error){console.warn('Auth unavailable:',error.message);}
}
async function submitAuth(form){
 if(authBusy)return;
 const fd=new FormData(form),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
 authBusy=true;authMessage='';render();
 try{
  if(authTab==='reset'){
   await resetPassword(email);authMessage='Если адрес зарегистрирован, мы отправили письмо для восстановления доступа.';
  }else if(authTab==='signup'){
   if(password.length<8)throw Error('Пароль должен содержать не менее 8 символов.');
   const result=await register(email,password);
   if(result.session&&result.user){await onAuthenticated(result.user);authVisible=false;}
   else authMessage='Регистрация отправлена. Проверь почту и подтверди адрес, затем войди.';
  }else{
   const result=await login(email,password);
   if(!result.user)throw Error('Не удалось войти');
   await onAuthenticated(result.user);authVisible=false;
  }
 }catch(error){authMessage=String(error.message||'Ошибка входа').slice(0,200);}
 finally{authBusy=false;render();}
}
async function startGoogleSignIn(){
 if(authBusy)return;
 authBusy=true;authMessage='';render();
 try{await signInWithGoogle();}
 catch(error){authMessage='Не удалось перейти к входу через Google: '+String(error.message||'ошибка соединения').slice(0,150);}
 finally{authBusy=false;render();}
}
async function signOutUser(){
 if(cloudReady&&signedInUser){clearTimeout(cloudTimer);await flushCloudSave();}
 try{await logout();}catch(error){toast('Не удалось выйти: '+error.message);return;}
 cloudReady=false;signedInUser=null;
 state.profiles.adult=adultEmpty();saveState(state);authMessage='';authVisible=false;render();
}
function authPanel(){
 const heading=authTab==='signup'?'Создать аккаунт':authTab==='reset'?'Восстановление пароля':'Войти в Znayu';
 return `<div class="auth-overlay"><div class="auth-dialog" role="dialog" aria-modal="true" aria-label="${heading}"><button type="button" class="auth-close" data-auth="close" aria-label="Закрыть">×</button><div class="brand-mark auth-mark">∑</div><h2>${heading}</h2><p>Сохраняй прогресс взрослого профиля и продолжай обучение с другого устройства.</p><form id="auth-form"><label for="auth-email">Электронная почта</label><input id="auth-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com"/>${authTab==='reset'?'':`<label for="auth-password">Пароль</label><input id="auth-password" name="password" type="password" minlength="8" required autocomplete="${authTab==='signup'?'new-password':'current-password'}" placeholder="Не менее 8 символов"/>`}<button class="btn wide" type="submit" ${authBusy?'disabled':''}>${authBusy?'Подождите…':authTab==='signup'?'Зарегистрироваться':authTab==='reset'?'Отправить письмо':'Войти'}</button></form>${authTab==='reset'?'':`<div class="auth-divider"><span>или</span></div><button type="button" class="auth-google" data-auth="google" ${authBusy?'disabled':''}><span class="google-mark" aria-hidden="true">G</span>${authBusy?'Подождите…':'Продолжить с Google'}</button>`}${authMessage?`<p class="auth-message" role="status">${escapeHTML(authMessage)}</p>`:''}<div class="auth-links"><button type="button" data-auth="signin">Вход</button><button type="button" data-auth="signup">Регистрация</button><button type="button" data-auth="reset">Забыли пароль?</button></div><small>Облачный прогресс доступен взрослым. Детские данные не отправляются в Supabase.</small></div></div>`;
}

let toastTimeout;
let tutorBusy=false;
let tutorWidgetId=null;
let tutorVerificationTimer=null;
function clearTutorVerificationTimer(){
 if(tutorVerificationTimer!==null){clearTimeout(tutorVerificationTimer);tutorVerificationTimer=null;}
}
function tutorVerificationNotice(message='',allowRetry=false){
 const notice=document.getElementById('tutor-verification-notice');
 const label=document.getElementById('tutor-verification-message');
 const button=document.getElementById('tutor-verification-retry');
 if(!notice||!label||!button)return;
 label.textContent=message;
 notice.hidden=!message;
 button.hidden=!allowRetry;
}
function watchTutorVerification(){
 clearTutorVerificationTimer();
 tutorVerificationNotice();
 tutorVerificationTimer=setTimeout(()=>{
  if(tutorWidgetId!==null&&!window.turnstile?.getResponse?.(tutorWidgetId)){
   tutorVerificationNotice('Cloudflare проверяет браузер слишком долго. Можно повторить проверку или попробовать другое соединение.',true);
  }
 },18000);
}

const hasRemoteTutor=Boolean(TUTOR_API_URL.trim()&&TURNSTILE_SITE_KEY.trim());
const remoteTutorEnabled=()=>hasRemoteTutor&&state.mode==='adult';
const iconPaths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/>',map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/>',chart:'<path d="M3 3v18h18"/><path d="m7 16 4-5 3 2 5-7"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',arrow:'<path d="m5 12h14m-6-6 6 6-6 6"/>',back:'<path d="m19 12H5m6 6-6-6 6-6"/>',check:'<path d="m20 6-11 11-5-5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',spark:'<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z"/>',percent:'<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',divide:'<path d="M4 12h16"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',shapes:'<rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17" cy="7" r="4"/><path d="m7 14 5 8H2z"/>',calculator:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2"/>',route:'<circle cx="6" cy="19" r="2"/><path d="M9 19h7a4 4 0 0 0 0-8h-8a4 4 0 0 1 0-8h7"/><path d="m13 1 2 2-2 2"/>',star:'<path d="m12 2 3 6.3 7 .9-5.1 5 1.3 7-6.2-3.3-6.2 3.3 1.3-7-5.1-5 7-.9z"/>',lightbulb:'<path d="M9 18h6M10 22h4M9 15a7 7 0 1 1 6 0l-1 3h-4z"/>',cap:'<path d="m2 10 10-6 10 6-10 6z"/><path d="M6 12v5q6 4 12 0v-5M22 10v7"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>',repeat:'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',alert:'<circle cx="12" cy="12" r="10"/><path d="M12 7v6m0 4h.01"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',play:'<path d="m8 5 11 7-11 7z"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'};
function icon(name,size=20){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]||iconPaths.star}</svg>`;}
function profile(){return state.profiles[state.mode||'adult'];}
function persist(){saveState(state);scheduleCloudSave();}
function labelStatus(x){return {new:'Не изучено',learning:'Изучается',learned:'Пройдено',mastered:'Закреплено'}[x]||'Не изучено';}
function gradeText(){return state.mode==='student'?`${state.grade} класс`:'Для взрослых';}
function go(name,id){route={name,id};history.replaceState(null,'',`#${name}${id?'/'+encodeURIComponent(id):''}`);render();window.scrollTo({top:0,behavior:'instant'});}
function toast(message){let e=$('.toast');if(e)e.remove();const item=document.createElement('div');item.className='toast';item.textContent=message;document.body.appendChild(item);clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>item.remove(),3700);}
function section(title,subtitle,right=''){return `<div class="section-head"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${right}</div>`;}
function statusPill(id){let s=statusOf(progressOf(state),id);return `<span class="pill-status ${s}">${labelStatus(s)}</span>`;}
function brand(){return `<div class="brand"><div class="brand-mark">∑</div><div class="brand-word">знаю<span class="brand-dot">.</span></div></div>`;}
function navigation(){return [{id:'home',label:'Главная',icon:'home'},{id:'catalog',label:'Все темы',icon:'book'},{id:'path',label:'Мой маршрут',icon:'route'},{id:'knowledge',label:'Карта знаний',icon:'map'},{id:'progress',label:'Мой прогресс',icon:'chart'}];}
function navigationHTML(){return navigation().map(n=>`<a href="#${n.id}" data-nav="${n.id}" class="nav-link ${route.name===n.id?'active':''}">${icon(n.icon)}${n.label}</a>`).join('');}
function shell(content){return `<div class="shell"><aside class="sidebar">${brand()}<div class="sidebar-kicker">ОБУЧЕНИЕ</div><nav class="nav">${navigationHTML()}</nav><div class="sidebar-spacer"></div><div class="sidebar-info"><div class="spark">✦</div><strong>Небольшие шаги — большой результат</strong><p>Не нужно знать всё. Достаточно понять то, что раньше не получалось.</p><button data-action="diagnose">Проверить знания →</button></div><div class="sidebar-footer"><div class="avatar">${state.mode==='student'?'Ш':'В'}</div><div><strong>${state.mode==='student'?'Школьный режим':'Режим взрослого'}</strong><small>${signedInUser&&cloudReady&&state.mode==='adult'?'Синхронизация с облаком':'Прогресс на этом устройстве'}</small></div></div></aside><div class="workspace"><div class="mobile-head">${brand()}<button class="btn outline small" data-action="diagnose">${icon('target',15)} Диагностика</button></div><header class="topbar"><span class="top-label"><b>Учимся понимать</b> · каждый шаг имеет значение</span><div class="top-actions"><div class="mode-toggle"><button data-mode="adult" class="${state.mode==='adult'?'selected':''}">Взрослый</button><button data-mode="student" class="${state.mode==='student'?'selected':''}">Школьник</button></div>${signedInUser?`<button class="auth-user" data-auth="logout" title="Выйти из аккаунта">${escapeHTML(signedInUser.email||'Аккаунт')} · Выйти</button>`:`<button class="auth-user" data-auth="open">Войти</button>`}${state.mode==='student'?`<select class="grade-chip" id="grade-switch" aria-label="Класс">${[4,5,6,7,8,9,10,11].map(n=>`<option value="${n}" ${String(n)===String(state.grade)?'selected':''}>${n} класс</option>`).join('')}</select>`:''}</div></header><main class="main">${content}<div class="footer-note">Znayu · пробная версия · прогресс взрослых синхронизируется после входа, без входа хранится в этом браузере. Данные ребёнка не отправляются в облако.</div></main></div><nav class="mobile-nav">${navigation().map(n=>`<a href="#${n.id}" data-nav="${n.id}" class="${route.name===n.id?'active':''}">${icon(n.icon,21)}<span>${n.label}</span></a>`).join('')}</nav></div>${!state.mode?welcome():''}${authVisible?authPanel():''}${geniusVisible?geniusPopup():''}`;}
function welcome(){return `<div class="intro-overlay"><div class="intro-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><div class="intro-logo">∑</div><span class="eyebrow">МАТЕМАТИКА БЕЗ ПРОБЕЛОВ</span><h1 id="welcome-title">Поймёшь то, что когда-то пропустил</h1><p>Не нужно проходить школьную программу заново. Найдём сложный момент, объясним и вместе решим задачу.</p><div class="mode-cards"><button class="mode-card ${chosenMode==='adult'?'selected':''}" data-choose="adult">${icon('user',27)}<strong>Я взрослый</strong><span>Спокойные объяснения и задачи из жизни</span></button><button class="mode-card ${chosenMode==='student'?'selected':''}" data-choose="student">${icon('cap',27)}<strong>Я школьник</strong><span>Короткие уроки и понятные подсказки</span></button></div><label for="welcome-grade" class="answer-label" ${chosenMode==='adult'?'style="display:none"':''}>Какой класс?</label><select class="grade-select" id="welcome-grade" ${chosenMode==='adult'?'style="display:none"':''}>${[4,5,6,7,8,9,10,11].map(x=>`<option value="${x}" ${String(x)===String(state.grade)?'selected':''}>${x} класс</option>`).join('')}</select><button class="btn wide" data-action="onboard">Начать обучение ${icon('arrow',18)}</button><p class="intro-fine">Взрослым доступно сохранение прогресса в облаке. Данные школьного режима хранятся на устройстве.</p></div></div>`;}
function hero(){let adult=state.mode!=='student';return `<section class="hero research-hero" aria-labelledby="research-hero-title">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="hero-content">
    <div class="hero-topline"><span class="hero-topline-dot"></span> УЧИМСЯ ПОНИМАТЬ, А НЕ ЗУБРИТЬ</div>
    <h1 id="research-hero-title">Пробелы в математике <span>есть у многих.</span><br>Их можно восполнить.</h1>
    <p>${adult?'Не помнишь дроби или запутался в уравнениях? Найдём, где потерялась логика, объясним простыми словами и разберём вместе.':'Пропустил урок или тема кажется сложной? Разберём непонятный момент шаг за шагом, без оценок и спешки.'}</p>
    <form class="hero-search" id="hero-search">${icon('search',21)}<input name="query" placeholder="Например, как делить дроби?" aria-label="Поиск математической темы" required /><button type="submit">Разобраться ${icon('arrow',16)}</button></form>
    <div class="hero-beneath"><button class="hero-diagnostic" data-action="diagnose">${icon('target',16)} Найти мои пробелы ${icon('arrow',15)}</button><span class="hero-beneath-note">5–7 коротких вопросов · бесплатно</span></div>
  </div>
  <div class="research-metrics">
    <div class="metric-primary"><div class="metric-overline"><span class="metric-overline-dot"></span> КАЗАХСТАН · PISA 2022</div><div class="metric-figure">50<span>%</span></div><p>15-летних учащихся <strong>не достигли базового уровня</strong> математической грамотности</p><div class="metric-track"><span></span></div><div class="metric-source">OECD · PISA 2022 · уровень ниже 2</div></div>
    <div class="metric-split"><div class="metric-mini"><strong>31<span>%</span></strong><p>учащихся в среднем по OECD ниже базового уровня</p><small>PISA 2022</small></div><div class="metric-mini"><strong>25<span>%</span></strong><p>взрослых в странах OECD имеют низкую математическую грамотность</p><small>PIAAC 2023 · уровни ≤ 1</small></div></div>
  </div>
  <div class="research-sources">Данные исследований, не диагностика пользователей Znayu. <a href="https://www.oecd.org/en/publications/pisa-2022-results-volume-i-and-ii-country-notes_ed6fbcc5-en/kazakhstan_8c403c04-en.html" target="_blank" rel="noopener noreferrer">PISA 2022 ↗</a> <a href="https://www.oecd.org/en/topics/adult-numeracy-skills.html" target="_blank" rel="noopener noreferrer">PIAAC 2023 ↗</a></div>
  </section>`;}
function stats(){const p=summarizeProgress(progressOf(state),SKILLS);const due=reviewDue(progressOf(state)).length;return `<div class="stats"><div class="stat-card"><div class="stat-icon">${icon('book')}</div><div><strong>${p.learned}</strong><span>Тем пройдено</span></div></div><div class="stat-card"><div class="stat-icon mint">${icon('check')}</div><div><strong>${p.mastered}</strong><span>Закреплено повторением</span></div></div><div class="stat-card"><div class="stat-icon peach">${icon('clock')}</div><div><strong>${due}</strong><span>Тем пора повторить</span></div></div></div>`;}
function geniusCard(){
 return `<button type="button" class="module-card genius-card" data-action="open-genius">
  <div class="module-icon genius-symbol" aria-hidden="true">∞</div>
  <span class="genius-card-eyebrow">ОСОБЫЙ РАЗДЕЛ</span>
  <h3>Математика для гениев</h3>
  <p>Считаешь себя гением? Тогда нам есть о чём поговорить.</p>
  <div class="module-foot"><span>6 загадок мировой математики</span>${icon('arrow',17)}</div>
 </button>`;
}
function geniusPopup(){
 return `<div class="genius-overlay" id="genius-overlay"><div class="genius-dialog" role="dialog" aria-modal="true" aria-labelledby="genius-dialog-title">
 <button id="genius-modal-close" type="button" class="genius-dismiss" data-action="genius-close" aria-label="Закрыть окно">×</button>
 <div class="genius-wow" aria-hidden="true">∞</div><span class="genius-eyebrow">УРОВЕНЬ СКРОМНОСТИ: ЭКСПЕРТ</span>
 <h2 id="genius-dialog-title">Ну ты и скромный!</h2>
 <p>Но если ты действительно считаешь себя гением, держи задачи, которые пока не смогли решить даже лучшие умы мира. Некоторые ждут разгадки больше века!</p>
 <p class="genius-dialog-highlight">И да, мы тоже ждём твоего решения. Без дедлайна.</p>
 <small>Это настоящие открытые математические проблемы. Здесь нет заранее известного правильного ответа и кнопки проверки доказательства.</small>
 <div class="genius-dialog-actions"><button type="button" class="btn" data-action="genius-enter">Показать задачи ${icon('arrow',17)}</button>
 <button type="button" class="btn outline" data-action="genius-close">Я пока разомнусь</button></div>
 </div></div>`;
}
function moduleCard(m){let l=skillsOf(m.id),done=l.filter(s=>['learned','mastered'].includes(statusOf(progressOf(state),s.id))).length;return `<button class="module-card" data-module="${m.id}"><div class="module-icon" style="background:${m.color}">${icon(m.icon,24)}</div><h3>${m.title}</h3><p>${m.description}</p><div class="module-foot"><span>${done} из ${l.length} освоено</span>${icon('arrow',17)}</div></button>`;}
function skillRow(skill,i){return `<button class="skill-row" data-skill="${skill.id}"><span class="skill-number">${String(i+1).padStart(2,'0')}</span><span class="skill-data"><strong>${escapeHTML(skill.title)}</strong><p>${escapeHTML(skill.description)}</p></span><span class="skill-tail">${statusPill(skill.id)}${icon('arrow',18)}</span></button>`;}
function home(){const p=profile(),unfinished=p.activeLesson&&SKILL_BY_ID[p.activeLesson.skillId];const recent=FEATURED.map(id=>SKILL_BY_ID[id]);return `${hero()}${stats()}${pathHomeCard()}${challengeBanner()}${section('Выбери, что хочешь понять',`${SKILLS.length} навыков: начни с того правила, которое когда-то осталось непонятным.`,`<button class="text-link" data-nav="catalog">Все темы ${icon('arrow',15)}</button>`)}<div class="module-grid">${MODULES.filter(m=>['arithmetic','basics','algebra','percent','statistics','itmath','analytics','finance'].includes(m.id)).map(moduleCard).join('')}${geniusCard()}</div>${section('С чего начать?','Можно проверить знания или сразу перейти к интересующей теме.')}<div class="two-col"><div class="panel"><div class="panel-head"><div><strong>Популярные навыки</strong><div class="panel-sub">Подборка самых полезных тем для старта</div></div></div>${recent.slice(0,4).map((s,i)=>`<div class="recommend-item"><div class="mini-icon">${icon(i===0?'divide':i===1?'calculator':i===2?'percent':'route')}</div><div class="recommend-info"><strong>${s.title}</strong><small>${s.description}</small></div><button class="btn secondary small" data-skill="${s.id}">Открыть</button></div>`).join('')}</div><div class="panel"><div class="panel-head"><div><strong>${unfinished?'Продолжить обучение':'Найди свой пробел'}</strong><div class="panel-sub">Иди в удобном темпе</div></div></div><div class="continue-card"><div><span class="eyebrow">${unfinished?'ТЫ ОСТАНОВИЛСЯ ЗДЕСЬ':'ЛИЧНЫЙ МАРШРУТ'}</span><h3>${unfinished?unfinished.title:'Быстрая диагностика'}</h3><p>${unfinished?'Продолжи ровно с того шага, на котором остановился.':'Небольшие задания помогут понять, какую тему стоит повторить.'}</p></div></div><div style="margin-top:17px"><button class="btn wide" data-action="${unfinished?'resume':'diagnose'}">${unfinished?'Продолжить урок':'Проверить знания'} ${icon('arrow',17)}</button></div><div class="light-card" style="margin-top:18px"><div class="learning-path"><div class="path-index">1</div><div><strong>Всё можно понять</strong><p>Ошибки здесь — часть процесса. Мы разбираем их по шагам, а не ставим оценки.</p></div></div></div></div></div>`;}
function challengeBanner(){
 return `<section class="challenge-promo"><div><span class="eyebrow">МАТЕМАТИКА ДЛЯ ИТ</span>
 <h2>Готов к задачам посложнее?</h2><p>Пять прикладных задач на логику, алгоритмы, двоичные числа и данные. Без подсказок, с разбором после завершения.</p></div>
 <button type="button" class="btn" data-nav="challenge">Брось мне вызов ${icon('arrow',16)}</button></section>`;
}
function challengeIntro(){
 const history=profile().challengeHistory||[],saved=profile().activeChallenge;
 const current=saved&&saved.index<saved.questions.length?saved:null;
 return `<div class="challenge-page">
 <div class="breadcrumbs"><button data-nav="home">Главная</button> › <span>Брось мне вызов</span></div>
 <span class="eyebrow">ПРОВЕРЬ СЕБЯ</span><h1 class="page-title">Брось мне вызов</h1>
 <p class="page-desc">Пять задач по математике для ИТ, без подсказок. Используй логику, комбинаторику, двоичные числа и статистику. После последнего ответа Znayu покажет подробный разбор.</p>
 ${current?`<div class="challenge-resume"><strong>Незавершённый вызов: ${current.index} из 5 задач</strong>
 <button class="btn" data-nav="challenge-run">Продолжить ${icon('arrow',16)}</button></div>`:''}
 <div class="challenge-level-grid">${[2,3,4].map(n=>`<button class="challenge-level" type="button" data-action="start-challenge" data-level="${n}">
 <span class="challenge-level-num">УРОВЕНЬ ${n}</span>
 <h3>${DIFFICULTY_LABELS[n-1]}</h3><p>${n===2?'Несколько логических шагов и простые расчёты.':n===3?'Побитовые операции, комбинаторика и алгоритмы.':'Практические задачи по надёжности, метрикам и архитектуре.'}</p>
 <span>Начать: 5 задач ${icon('arrow',16)}</span></button>`).join('')}</div>
 ${history.length?`<div class="challenge-history"><h2>Последние результаты</h2>${history.slice(0,5).map(h=>`<div><span>${DIFFICULTY_LABELS[h.level-1]}</span><strong>${h.correct} из ${h.total}</strong></div>`).join('')}</div>`:''}
 <p class="path-small">Ответы проверяются математическими правилами. Результат одного вызова не повышает и не понижает твой подтверждённый уровень.</p>
 </div>`;
}
function challengeRunPage(){
 const attempt=profile().activeChallenge;
 if(!attempt||attempt.index>=attempt.questions.length)return challengeIntro();
 const task=attempt.questions[attempt.index],skill=SKILL_BY_ID[task.skillId],q=task.question;
 return `<div class="breadcrumbs"><button data-nav="challenge">Брось мне вызов</button> › <span>Задача ${attempt.index+1}</span></div>
 <div class="challenge-task"><div class="lesson-step-top"><span class="step-tag">УРОВЕНЬ ${attempt.level} · ${DIFFICULTY_LABELS[attempt.level-1]}</span>
 <span class="step-count">${attempt.index+1} из ${attempt.questions.length}</span></div>
 <div class="progress-track"><div class="progress-fill" style="width:${attempt.index/attempt.questions.length*100}%"></div></div>
 <span class="eyebrow">${escapeHTML(skill?.title||'Математика для ИТ')}</span>
 <div class="equation-box"><div class="question">${formatMathText(q.text)}</div></div>
 <form id="challenge-form"><label class="answer-label" for="challenge-answer">Твой ответ</label>
 <input class="answer-input" id="challenge-answer" name="answer" autocomplete="off" required maxlength="80" inputmode="text"
 placeholder="Введи число или дробь"/>
 <p class="challenge-guidance">Без подсказок. После пятой задачи ты увидишь ответы и разбор решений.</p>
 <div class="lesson-actions"><button class="btn" type="submit">Сохранить ответ ${icon('arrow',16)}</button></div></form>
 <button class="text-link" type="button" data-nav="challenge">Вернуться к выбору сложности</button>
 </div>`;
}
function challengeResultPage(){
 const attempt=profile().activeChallenge;
 if(!attempt||attempt.index<attempt.questions.length)return challengeIntro();
 const score=challengeResult(attempt);
 return `<div class="challenge-page"><span class="eyebrow">ИСПЫТАНИЕ ЗАВЕРШЕНО</span>
 <div class="challenge-score"><span>Результат</span><strong>${score.correct} / ${score.total}</strong>
 <p>${score.correct===score.total?'Все пять задач решены верно. Хороший результат!':
 'Ошибки покажут, какие математические приёмы стоит повторить.'}</p></div>
 <h2 class="page-title">Разбор пяти задач</h2>
 <div class="challenge-review">${attempt.questions.map((item,i)=>{
 const entry=attempt.answers[i],q=item.question,s=SKILL_BY_ID[item.skillId];
 return `<article class="challenge-review-item"><div class="challenge-review-heading">
 <span class="${entry?.correct?'challenge-correct':'challenge-incorrect'}">${entry?.correct?'Верно':'Стоит разобрать'} · ${i+1} / 5</span>
 <strong>${escapeHTML(s?.title||item.skillId)}</strong></div>
 <p>${formatMathText(q.text)}</p>
 <div><small>Твой ответ:</small> <b>${escapeHTML(entry?.answer||'—')}</b>
 <small>Правильный:</small> <b>${formatMathText(q.answer)}</b></div>
 <p class="challenge-explanation">${formatMathText(q.explain)}</p>
 <button class="text-link" data-skill="${item.skillId}">Повторить тему →</button></article>`;}).join('')}</div>
 <div class="path-actions"><button class="btn" data-nav="challenge">Новый вызов ${icon('repeat',17)}</button>
 <button class="btn outline" data-nav="path">Мой маршрут</button></div></div>`;
}
function catalog(){return `<span class="eyebrow">ПРОГРАММА ОБУЧЕНИЯ</span><h1 class="page-title">Все темы по порядку</h1><p class="page-desc">${SKILLS.length} взаимосвязанных навыков в ${MODULES.length} разделах. В базовых уроках — три задания. Для математики ИТ, аналитиков и финансистов доступны четыре уровня сложности. Можно начать с любой точки.</p><div class="module-grid">${MODULES.map(moduleCard).join('')}${geniusCard()}</div>`;}
function modulePage(id){const m=MODULES.find(m=>m.id===id);if(!m)return catalog();const l=skillsOf(id);return `<div class="breadcrumbs"><button data-nav="catalog">Все темы</button> › <span>${m.title}</span></div><div class="module-detail"><div><div class="module-icon" style="background:${m.color}">${icon(m.icon,24)}</div><h1>${m.title}</h1><p>${m.description}. ${l.length} навыков для освоения.</p></div><button class="btn" data-skill="${l[0].id}">Начать ${icon('arrow')}</button></div>${id==='itmath'?challengeBanner():''}${section('Уроки раздела','Выбери конкретный навык. Пропущенные правила можно пройти в любой момент.')}<div class="skill-list">${l.map(skillRow).join('')}</div>`;}
function searchPage(){const s=searchTerm.trim().toLocaleLowerCase('ru');const words=s.split(/\s+/).filter(Boolean);const synonyms={трубы:'fill-drain',труб:'fill-drain',рабочие:'joint-work',работа:'joint-work',делить:'fraction-divide',деление:'fraction-divide',вычитать:'fraction-subtract',сложить:'fraction-add',прибавить:'fraction-add',скидка:'discount',процент:'percent-basics',проценты:'percent-basics',дроби:'fraction-parts',дробь:'fraction-parts',знаменатель:'common-denominator',логика:'logic',алгоритмы:'logic',уравнения:'linear-equations',минус:'negative-subtract',отрицательные:'negative-concept',статистика:'mean',среднее:'mean',вероятность:'probability',графики:'graphs',функции:'linear-functions',степени:'powers-intro',геометрия:'area',двоичная:'binary',программирование:'logic',it:'logic',ит:'logic'};let results=SKILLS.map(x=>({x,score:words.reduce((a,w)=>a+(x.title+' '+x.description+' '+x.intro).toLowerCase().includes(w)?a+2:a,0)+Object.entries(synonyms).reduce((a,[key,val])=>a+(s.includes(key)&&x.id===val?7:0),0)})).filter(x=>!s||x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.x);return `<span class="eyebrow">НАЙТИ ПРОБЕЛ</span><h1 class="page-title">Что хочется понять?</h1><p class="page-desc">Можно написать словами: «как делить дроби», «скидки в процентах» или «задачи с трубами».</p><form class="searchbar" id="search-page-form">${icon('search')}<input name="query" value="${escapeHTML(searchTerm)}" aria-label="Тема для поиска" placeholder="Введи тему или правило..."/><button class="btn small" type="submit">Найти</button></form><div class="search-results">${section(results.length?`Найдено тем: ${results.length}`:'Пока ничего не найдено',results.length?'Выбери тему, чтобы начать разбор.':'Попробуй «дроби», «деление» или «проценты».')}${results.length?`<div class="skill-list">${results.map(skillRow).join('')}</div>`:`<div class="empty-state">${icon('search',35)}<h3>Такой темы пока нет в пилотной программе</h3><p>Попробуй каталог: здесь есть арифметика, дроби, алгебра, графики и математика для ИТ.</p><button class="btn" data-nav="catalog">Открыть каталог</button></div>`}</div>`;}
function levelChoicePanel(skillId){
 const levels=availableLevels(skillId);
 if(levels.length===1)return '<p class="muted" style="font-size:12px">Пока доступен базовый уровень этой темы. Расширенные задания добавляются постепенно.</p>';
 const data=difficultyState(progressOf(state),skillId),confirmed=data.confirmed||0;
 return `<section class="difficulty-picker" aria-label="Сложность заданий">
 <div class="difficulty-heading"><strong>Уровень заданий</strong><span>Рекомендован: ${DIFFICULTY_LABELS[data.recommended-1]}</span></div>
 <div class="difficulty-options">${levels.map(n=>`<button type="button" class="difficulty-option ${data.selected===n?'active':''}" data-action="set-difficulty" data-id="${skillId}" data-level="${n}" aria-pressed="${data.selected===n}">
 <small>Уровень ${n}</small><strong>${DIFFICULTY_LABELS[n-1]}</strong>${confirmed>=n?`<span>Подтверждён</span>`:''}</button>`).join('')}</div>
 <p class="difficulty-tip">Свой уровень можно выбрать вручную. Для автоматического повышения Znayu ждёт два уверенных прохождения, а не один правильный ответ.</p>
 </section>`;
}
function lessonQuestions(session,skill){
 return Array.isArray(session?.questionSet)&&session.questionSet.length?session.questionSet:skill.questions;
}
function skillOverview(id){
 const s=SKILL_BY_ID[id];if(!s)return catalog();
 const m=moduleForSkill(id),p=progressOf(state)[id],prereq=ancestors(id).slice(-6),count=questionsForLevel(s,difficultyState(progressOf(state),id).selected).length;
 return `<div class="breadcrumbs"><button data-nav="catalog">Все темы</button> › <button data-module="${m.id}">${m.title}</button> › <span>${escapeHTML(s.title)}</span></div>
 <div class="two-col"><div class="panel" style="padding:30px"><span class="eyebrow">УРОК · ${gradeText()}</span>
 <h1 class="page-title">${escapeHTML(s.title)}</h1><p class="page-desc">${escapeHTML(s.description)}</p>
 <div class="light-card"><strong>Зачем это нужно?</strong><p style="color:#60647c;line-height:1.8;font-size:14px">${escapeHTML(s.intro)}</p>
 <div class="math-example" style="font-size:17px;margin-top:14px;color:#5d55d5;font-weight:800">${formatMathText(s.example)}</div></div>
 ${levelChoicePanel(s.id)}
 <p class="muted" style="font-size:13px;line-height:1.8;margin:17px 0">В уроке ${count} задания. Можно воспользоваться подсказкой и повторить попытку, а уровень сложности изменить в любой момент.</p>
 <div class="path-actions"><button class="btn" data-action="start-lesson" data-id="${s.id}">Начать урок ${icon('arrow')}</button>
 <button class="btn outline" data-action="diagnose-skill" data-id="${s.id}">Проверить базу</button></div>
 ${p?`<p class="muted" style="font-size:12px">Навык: ${labelStatus(p.status)}</p>`:''}
 </div><aside class="panel"><div class="panel-head"><strong>На чём основывается</strong></div>
 <p class="page-desc" style="font-size:13px">При затруднении можно проверить необходимые знания и пройти персональный маршрут.</p>
 <div class="misconception-card"><strong>${icon('lightbulb',16)} Частая ошибка</strong><p>${escapeHTML(s.misconception)}</p></div>
 ${prereq.length?`<div class="chip-line">${prereq.map(x=>`<button class="chip" data-skill="${x.id}">${escapeHTML(x.title)}</button>`).join('')}</div>`:'<p class="muted">Базовый навык — можно начать прямо сейчас.</p>'}
 </aside></div>`;
}
function newLesson(skillId,kind='lesson'){
 const skill=SKILL_BY_ID[skillId];if(!skill){go('catalog');return;}
 const level=kind==='lesson'?difficultyState(progressOf(state),skillId).selected:1;
 const a={skillId,kind,level,questionSet:questionsForLevel(skill,level),index:0,answers:[],wrongTries:0,showHint:false,correct:false,
 feedback:'',hintLevel:0,lastMistake:null,tutorMessages:[],at:new Date().toISOString()};
 profile().activeLesson=a;
 const p=progressOf(state);p[skillId]??={status:'learning'};
 if(!['learned','mastered'].includes(p[skillId].status))p[skillId].status='learning';
 persist();go('lesson',skillId);
}
function comprehensionPanel(session,skill){
 const current=session.comprehension?.step===session.index?session.comprehension:null;
 const pool=lessonQuestions(session,skill);
 const alternate=pool.findIndex((_,i)=>i!==session.index);
 if(alternate<0)return '';
 if(!current?.open)return `<button type="button" class="tutor-check-launch" data-action="comprehension-check">${icon('target',17)} Проверить, понял ли я</button>`;
 const q=pool[current.questionIndex]||pool[alternate];
 const note=current.passed?'Проверка выполнена самостоятельно. Отлично — теперь попробуй основной пример.':current.feedback||'Это другая задача на то же правило. Реши её самостоятельно, без подсказок.';
 return `<section class="tutor-check" aria-label="Самостоятельная мини-проверка"><div class="tutor-check-kicker">${icon('target',17)} ПРОВЕРКА ПОНИМАНИЯ</div><p class="tutor-check-task">${formatMathText(q.text)}</p><p class="tutor-check-guidance" role="status">${formatMathText(note)}</p>${current.passed?`<button type="button" class="tutor-check-close" data-action="comprehension-close">Вернуться к уроку</button>`:`<form id="understanding-check-form" class="tutor-check-form"><input name="answer" required maxlength="80" autocomplete="off" placeholder="Твой ответ на новую задачу" aria-label="Ответ для мини-проверки"/><button type="submit" class="btn secondary small">Проверить</button></form>`}</section>`;
}
function tutorPanel(session,skill,question){
 const stepMessages=(session.tutorMessages||[]).filter(m=>m.index===session.index);
 const dialogue=stepMessages.length?stepMessages.map(m=>`<div class="tutor-bubble ${m.role==='user'?'from-user':'from-tutor'}"><span class="bubble-label">${m.role==='user'?'Ты':m.source==='remote'?'ИИ-преподаватель':'Помощник'}</span><p>${formatMathText(m.text)}</p></div>`).join(''):`<div class="tutor-bubble from-tutor"><span class="bubble-label">Помощник</span><p>${state.mode==='student'?'Если сложно, спроси. Разберём один шаг за раз.':'Можешь спросить, почему применяется правило или как проверить промежуточный шаг.'}</p></div>`;
 const bridged=session.wrongTries>=2?suggestedBridge(skill,session.lastMistake,SKILL_BY_ID):null;
 return `<section class="tutor-panel" aria-label="Пошаговый преподаватель"><div class="tutor-head"><div class="tutor-head-icon">${icon('spark',21)}</div><div><h3>${remoteTutorEnabled()?'ИИ-преподаватель':'Пошаговый помощник'}</h3><small>${remoteTutorEnabled()?'Адаптивные объяснения с ИИ':'Адаптивные подсказки по проверенным правилам'}</small></div><span class="tutor-status ${remoteTutorEnabled()?'online':''}">${remoteTutorEnabled()?'ИИ':'Без ИИ'}</span></div><div class="tutor-dialogue" aria-live="polite">${dialogue}</div>${bridged?`<div class="tutor-bridge">${icon('map',17)} Возможно, стоит повторить основу: <button type="button" data-skill="${bridged.id}">${escapeHTML(bridged.title)} →</button></div>`:''}<div class="tutor-quick"><button type="button" class="tutor-chip" data-action="tutor-quick" data-text="Объясни проще">Объясни проще</button><button type="button" class="tutor-chip" data-action="tutor-quick" data-text="Почему это правило работает?">Почему так?</button><button type="button" class="tutor-chip" data-action="tutor-quick" data-text="Где моя ошибка?">Где ошибка?</button></div><form id="tutor-form" class="tutor-compose"><label for="tutor-input" class="sr-only">Вопрос преподавателю</label><input id="tutor-input" name="question" maxlength="600" autocomplete="off" placeholder="Спроси, что непонятно…" /><button type="submit" class="tutor-send" ${tutorBusy?'disabled':''} aria-label="Отправить вопрос">${icon('arrow',19)}</button></form>${comprehensionPanel(session,skill)}${remoteTutorEnabled()?`<div class="tutor-verification"><span class="tutor-privacy">Защита Cloudflare активна · вопросы отправляются серверу ИИ</span></div>`:`<p class="tutor-small">Работает без сети и сохраняет диалог в этом браузере. Для свободного диалога с ИИ нужно подключить сервер.</p>`}</section>`;
}
async function sendTutorQuestion(text){
 const session=profile().activeLesson;if(!session||tutorBusy)return;
 const skill=SKILL_BY_ID[session.skillId],question=skill?lessonQuestions(session,skill)[session.index]:null;if(!question)return;
 const userText=String(text||'').trim().slice(0,600);if(!userText)return;
 let proof='';
 if(remoteTutorEnabled()){
  proof=window.turnstile?.getResponse?.(tutorWidgetId)||'';
  if(!proof){toast('Проверка Cloudflare ещё не завершена');tutorVerificationNotice('Ожидаем Cloudflare. Если проверка зависла, нажми «Повторить».',true);return;}
 }
 recordTutorMessage(session,'user',userText);session.tutorUsed=true;persist();
 if(!remoteTutorEnabled()){
  recordTutorMessage(session,'assistant',lessonMessage({skill,question,wrongTries:session.wrongTries,mistake:session.lastMistake,mode:state.mode,hintLevel:session.hintLevel||0,text:userText,solved:session.correct}));
  persist();render();$('.tutor-dialogue')?.scrollTo(0,99999);return;
 }
 tutorBusy=true;render();
 try{
  const body={token:proof,mode:state.mode,skill:{title:skill.title,intro:skill.intro,example:skill.example},question:{text:question.text,hint:question.hint,explain:session.correct?question.explain:undefined},lastMistake:session.lastMistake?.explanation||'',wrongTries:session.wrongTries,solved:Boolean(session.correct),message:userText,history:(session.tutorMessages||[]).slice(-6).map(m=>({role:m.role,text:m.text}))};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
  let response;
  try{response=await fetch(TUTOR_API_URL.replace(/\/$/,'')+'/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,credentials:'omit'});}finally{clearTimeout(timer);}
  if(!response.ok)throw new Error('Сервер временно недоступен');
  const data=await response.json();if(typeof data.reply!=='string'||!data.reply.trim())throw new Error('Пустой ответ ИИ');
  recordTutorMessage(session,'assistant',data.reply,'remote');
 }catch{
  recordTutorMessage(session,'assistant',lessonMessage({skill,question,wrongTries:session.wrongTries,mistake:session.lastMistake,mode:state.mode,hintLevel:session.hintLevel||0,text:userText,solved:session.correct}),'local');
  toast('ИИ пока недоступен. Ответил встроенный помощник.');
 }finally{tutorBusy=false;if(tutorWidgetId!==null&&window.turnstile){try{window.turnstile.reset(tutorWidgetId);watchTutorVerification();}catch{tutorVerificationNotice('Не удалось обновить проверку Cloudflare.',true);}}persist();if(route.name==='lesson'&&profile().activeLesson===session)render();}
}
function setupTutorVerification(){
 if(!remoteTutorEnabled()||route.name!=='lesson')return;
 const mount=()=>{
  if(route.name!=='lesson'||!remoteTutorEnabled()||!window.turnstile||tutorWidgetId!==null)return;
  let portal=document.getElementById('tutor-verification-portal');
  if(!portal){
   portal=document.createElement('div');
   portal.id='tutor-verification-portal';
   portal.className='tutor-verification-portal';
   portal.innerHTML='<div class="tutor-turnstile-widget"></div><div id="tutor-verification-notice" class="tutor-verification-notice" role="status" hidden><span id="tutor-verification-message"></span><button type="button" id="tutor-verification-retry" hidden>Повторить проверку</button></div>';
   portal.addEventListener('click',event=>{
    if(!event.target.closest('#tutor-verification-retry'))return;
    if(tutorWidgetId===null||!window.turnstile)return;
    try{window.turnstile.reset(tutorWidgetId);watchTutorVerification();}
    catch{tutorVerificationNotice('Не получилось перезапустить проверку. Обнови страницу.',false);}
   });
   document.body.appendChild(portal);
  }
  try{
   tutorWidgetId=window.turnstile.render(portal.querySelector('.tutor-turnstile-widget'),{
    sitekey:TURNSTILE_SITE_KEY,
    action:'tutor',
    theme:'light',
    appearance:'interaction-only',
    callback:()=>{clearTutorVerificationTimer();tutorVerificationNotice();},
    'error-callback':code=>{clearTutorVerificationTimer();tutorVerificationNotice('Проверка Cloudflare не прошла'+(code?' (код '+String(code).slice(0,12)+')':'')+'. Повтори попытку или проверь VPN и блокировщики.',true);return true;},
    'timeout-callback':()=>{clearTutorVerificationTimer();tutorVerificationNotice('Время проверки Cloudflare вышло. Нажми «Повторить проверку».',true);},
    'expired-callback':()=>{clearTutorVerificationTimer();tutorVerificationNotice('Проверка устарела. Нажми «Повторить проверку».',true);}
   });
   watchTutorVerification();
  }catch{
   clearTutorVerificationTimer();
   tutorVerificationNotice('Не удалось загрузить защиту Cloudflare. Проверь блокировщики и обнови страницу.',false);
  }
 };
 if(window.turnstile){mount();return;}
 if(document.querySelector('[data-tutor-script]'))return;
 const script=document.createElement('script');
 script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
 script.async=true;script.defer=true;script.dataset.tutorScript='1';script.onload=mount;
 script.onerror=()=>toast('Не удалось загрузить Cloudflare. Проверь VPN и расширения браузера.');
 document.head.appendChild(script);
}
function lessonPage(id){
 let session=profile().activeLesson;const s=SKILL_BY_ID[id];if(!s)return catalog();
 if(!session||session.skillId!==id){
  const level=difficultyState(progressOf(state),id).selected;
  session={skillId:id,kind:'lesson',level,questionSet:questionsForLevel(s,level),index:0,answers:[],wrongTries:0,
   showHint:false,correct:false,feedback:'',hintLevel:0,lastMistake:null,tutorMessages:[],at:new Date().toISOString()};
  profile().activeLesson=session;persist();
 }
 const pool=lessonQuestions(session,s);
 if(session.index>=pool.length)return finishLesson();
 const q=pool[session.index],done=session.correct,progress=((session.index+(done?1:0))/pool.length)*100;
 const prereq=s.prereq.map(x=>SKILL_BY_ID[x]).filter(Boolean);
 const isGraded=session.kind==='lesson'&&availableLevels(s.id).length>1;
 return `<div class="breadcrumbs"><button data-module="${moduleForSkill(id).id}">${moduleForSkill(id).title}</button>
 › <button data-skill="${id}">${escapeHTML(s.title)}</button> › <span>${session.kind==='review'?'Повторение':session.kind==='path'?'Мой маршрут':'Урок'}</span></div>
 <div class="lesson-layout"><div class="lesson-card">
 <div class="lesson-step-top"><span class="step-tag">${session.kind==='review'?'ПОВТОРЕНИЕ':session.kind==='path'?'ШАГ МАРШРУТА':'ТРЕНИРУЕМСЯ ВМЕСТЕ'}</span>
 <span class="step-count">Задача ${session.index+1} из ${pool.length}</span></div>
 <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
 ${isGraded?levelChoicePanel(s.id):''}
 <div class="teacher"><div class="teacher-avatar">${icon('spark',23)}</div><div class="teacher-message">
 <strong>${isGraded?`Уровень ${session.level}: ${DIFFICULTY_LABELS[session.level-1]}`:'Разберём по шагам.'}</strong><br>
 ${session.kind==='review'?'Попробуй решить без подсказок.':session.kind==='path'?'Восстанавливаем основу. '+escapeHTML(s.intro):escapeHTML(s.intro)}</div></div>
 <div class="equation-box"><div class="question">${formatMathText(q.text)}</div></div>
 <form id="answer-form"><label class="answer-label" for="answer-input">Твой ответ</label>
 <input class="answer-input ${session.feedback&&!done?'error':''}" id="answer-input" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false"
 placeholder="Например: 3/4 или 0,75" ${done?'disabled':''} aria-describedby="input-help"/>
 <small id="input-help" style="display:block;color:var(--muted);margin-top:8px;font-size:11px">Можно вводить целые числа, дроби 2/3 и десятичные 0,5. Для логических задач используй 1 или 0.</small>
 <div class="lesson-actions"><button type="button" class="btn outline" data-action="hint" ${done||session.kind==='review'?'disabled':''}>${icon('lightbulb',16)} Подсказка</button>
 ${done?`<button type="button" class="btn" data-action="next-step">${session.index===pool.length-1?'Завершить урок':'Следующий шаг'} ${icon('arrow')}</button>`:
 `<button type="submit" class="btn">Проверить ${icon('arrow')}</button>`}</div></form>
 ${session.showHint&&!done?`<div class="hint-panel"><strong>Подсказка ${session.hintLevel||1} из 3</strong>
 ${formatMathText(hintFor({skill:s,question:q,level:session.hintLevel||1,mistake:session.lastMistake,mode:state.mode}))}</div>`:''}
 ${session.feedback?`<div class="feedback ${done?'good':'bad'}" role="status">
 <strong>${done?'Всё верно!':'Давай попробуем ещё раз'}</strong><p>${formatMathText(session.feedback)}</p></div>`:''}
 ${session.wrongTries>=2&&!done?`<div class="path-recovery-hint"><div><strong>Застрял на этом шаге?</strong>
 <p>Проверим базовые знания для этой темы и составим короткий маршрут.</p></div>
 <button type="button" class="btn secondary small" data-action="diagnose-skill" data-id="${escapeHTML(s.id)}">Найти причину ошибки →</button></div>`:''}
 ${tutorPanel(session,s,q)}</div>
 <aside class="side-note panel"><h3>Запоминаем правило</h3><p>${formatMathText(s.intro)}</p>
 <div class="math-example">${formatMathText(s.example)}</div><hr/>
 <h3>Что можно повторить?</h3><p>Если не хватает базы — вернись к подготовительным навыкам.</p>
 <div class="prereq">${prereq.length?prereq.map(x=>`<button data-skill="${x.id}">${escapeHTML(x.title)}</button>`).join(''):'Это базовая тема'}</div></aside></div>`;
}
function finishLesson(){
 const session=profile().activeLesson;
 if(!session){go('home');return '';}
 const s=SKILL_BY_ID[session.skillId],total=lessonQuestions(session,s).length;
 const independent=session.answers.filter(x=>x.correct&&!x.usedHint&&!x.wrongTries).length;
 const learned=independent>=2,p=progressOf(state),old=p[s.id]||{};
 const difficulty=session.kind==='lesson'&&availableLevels(s.id).length>1?
  recordLevelResult(difficultyState(p,s.id),s.id,session.level||1,independent,total):
  old.difficulty;
 p[s.id]={...old,status:session.kind==='review'&&learned?'mastered':learned?'learned':'learning',
  lastAt:new Date().toISOString(),reviewAt:learned?nextReview(session.kind==='review'?7:3):null,
  independent,total,attempts:(old.attempts||0)+session.answers.length,...(difficulty?{difficulty}:{})};
 profile().sessions.unshift({...session,finishedAt:new Date().toISOString(),score:independent});
 profile().sessions=profile().sessions.slice(0,50);
 profile().activeLesson=null;
 if(learned&&profile().learningPath)profile().learningPath=completePathStep(profile().learningPath,s.id,independent);
 persist();
 if(session.kind==='path'&&learned){route={name:'path'};history.replaceState(null,'','#path');return personalPathPage();}
 route={name:'result',id:s.id,independent,total,learned,fromPath:session.kind==='path',
  level:session.level||1,difficulty:session.kind==='lesson'?difficulty:null};
 history.replaceState(null,'','#result/'+s.id);
 return resultPage();
}
function resultPage(){
 const r=route,s=SKILL_BY_ID[r.id];if(!s)return home();
 const levelText=r.difficulty?`<div class="difficulty-result"><strong>Сложность: ${DIFFICULTY_LABELS[(r.level||1)-1]}</strong>
 <p>Подтверждённый уровень в теме: ${r.difficulty.confirmed?r.difficulty.confirmed+' из 4':'пока не подтверждён'}.</p>
 <p>Рекомендуемая сложность следующего урока: <b>${DIFFICULTY_LABELS[(r.difficulty.recommended||1)-1]}</b>.
 Изменить её можно вручную в карточке темы.</p></div>`:'';
 return `<div class="result-center"><div class="result-symbol">${icon(r.learned?'check':'repeat',40)}</div>
 <span class="eyebrow">УРОК ЗАВЕРШЁН</span><h1>${r.learned?'Ты справился!':'Ты сделал шаг вперёд'}</h1>
 <p>Тема «${escapeHTML(s.title)}». Самостоятельно, без ошибок и подсказок, решено <strong>${r.independent} из ${r.total}</strong> задач.
 ${r.learned?'Через несколько дней можно проверить, сохранились ли знания.':'Стоит ещё раз потренироваться, чтобы закрепить правило.'}</p>
 ${levelText}
 <div class="result-list"><div class="result-row"><span>Навык</span><small>${escapeHTML(s.title)}</small></div>
 <div class="result-row"><span>Статус</span><small>${labelStatus(statusOf(progressOf(state),s.id))}</small></div>
 <div class="result-row"><span>Самостоятельно</span><small>${r.independent} / ${r.total}</small></div></div>
 <div class="result-actions"><button class="btn" data-action="start-lesson" data-id="${s.id}">${r.learned?'Повторить урок':'Потренироваться ещё'} ${icon('repeat',17)}</button>
 <button class="btn outline" data-skill="${s.id}">Выбрать сложность</button>
 ${r.fromPath?`<button class="btn outline" data-nav="path">Вернуться к маршруту</button>`:''}</div></div>`;
}
function startDiagnostic(targetId){
 profile().diagnostic=createPersonalDiagnostic(targetId,SKILL_BY_ID);
 persist();go('diagnostic');
}
function diagPage(){
 const d=profile().diagnostic;if(!d||d.version!==2)return diagnosticIntro();
 const item=diagnosticQuestion(d,SKILL_BY_ID);if(!item)return diagnosticResult();
 const {skill,question}=item,confirming=d.stage===1;
 const goal=d.targetId?SKILL_BY_ID[d.targetId]?.title||'Цель':d.focus==='algebra'?'Алгебра':d.focus==='it'?'Математика для ИТ':'Основы математики';
 return `<div class="breadcrumbs"><button data-nav="home">Главная</button> › <button data-nav="path">Мой маршрут</button> › <span>Проверка знаний</span></div>
 <div class="lesson-layout"><div class="lesson-card">
 <div class="lesson-step-top"><span class="step-tag">${confirming?'УТОЧНЯЕМ ПРОБЕЛ':'ИЩЕМ ОСНОВУ'}</span><span class="step-count">Навык ${d.index+1} из ${d.skillIds.length}</span></div>
 <div class="progress-track"><div class="progress-fill" style="width:${Math.round(d.index/d.skillIds.length*100)}%"></div></div>
 <span class="question-caption">Проверяем: ${escapeHTML(skill.title)}</span>
 <div class="teacher"><div class="teacher-avatar">${icon('target')}</div><div class="teacher-message">${confirming?'Первый пример вызвал затруднение. Проверим это правило на другом задании.':'Это не экзамен. Ошибка подскажет, какое правило полезно повторить. Можно нажать «Не знаю».'}</div></div>
 <div class="equation-box"><div class="question">${formatMathText(question.text)}</div></div>
 <form id="diagnostic-form"><label class="answer-label" for="answer-input">Твой ответ</label>
 <input class="answer-input" id="answer-input" name="answer" maxlength="80" autocomplete="off" spellcheck="false" placeholder="Например: 3/4 или 0,75"/>
 <div class="lesson-actions"><button type="button" class="btn outline" data-action="diag-skip">Не знаю</button>
 <button class="btn" type="submit">Проверить ${icon('arrow')}</button></div></form></div>
 <aside class="side-note panel"><h3>Твоя цель</h3><p>${escapeHTML(goal)}</p><hr/>
 <h3>Как это устроено?</h3><p>Сначала проверяем необходимые знания. Если ответ неверный, дадим второй пример, чтобы отличить случайную ошибку от пробела.</p>
 <p>Правильность ответа проверяется математически, а не через ИИ.</p></aside></div>`;
}
function diagnosticIntro(){
 return `<div class="diagnosis-intro"><span class="eyebrow">ПЕРСОНАЛЬНАЯ ДИАГНОСТИКА</span>
 <h2>Найдём, где потерялось правило</h2><p>Выбери направление или зайди в конкретную тему и нажми «Проверить базу». Проверим необходимые знания и построим маршрут от самого простого к цели.</p>
 <div class="diagnosis-bullets"><span>${icon('check')} До 7 базовых навыков</span>
 <span>${icon('check')} Дополнительный вопрос после ошибки</span><span>${icon('check')} Возврат к выбранной теме</span></div>
 <div class="diagnostic-tracks"><button class="diagnostic-track" data-action="start-diagnostic" data-id="base"><strong>Начать с основы</strong><span>Арифметика, дроби, проценты ${icon('arrow',16)}</span></button>
 <button class="diagnostic-track" data-action="start-diagnostic" data-id="algebra"><strong>Проверить алгебру</strong><span>Числа, уравнения и функции ${icon('arrow',16)}</span></button>
 <button class="diagnostic-track" data-action="start-diagnostic" data-id="it"><strong>Математика для ИТ</strong><span>Логика, данные, вероятность ${icon('arrow',16)}</span></button></div>
 <p class="path-small">Результат короткой проверки — предварительная рекомендация, а не окончательный диагноз.</p></div>`;
}
function diagnosticResult(){
 const d=profile().diagnostic;if(!d||d.version!==2)return diagnosticIntro();
 const gaps=diagnosticGaps(d),path=profile().learningPath;
 const first=gaps.length?SKILL_BY_ID[gaps[0].skillId]:null;
 return `<div class="result-center"><div class="result-symbol">${icon('target',38)}</div>
 <span class="eyebrow">ДИАГНОСТИКА ГОТОВА</span>
 <h1>${gaps.length?'Нашли, что можно восстановить':'С этими примерами получилось!'}</h1>
 <p>Правильно решено ${d.records.filter(x=>x.correct).length} из ${d.records.length} заданий.
 ${gaps.length?`Самый ранний пробел в цепочке: «${escapeHTML(first.title)}». Начнём с него, затем вернёмся к выбранной теме.`:
 'Проверенные навыки не вызвали затруднений. Это ещё не означает, что все темы освоены.'}</p>
 <div class="path-diagnosis-results">${gaps.map(g=>`<div class="path-gap"><span class="path-gap-dot"></span><strong>${escapeHTML(SKILL_BY_ID[g.skillId]?.title||g.skillId)}</strong><small>Затруднения: ${g.failed} из ${g.tried}</small></div>`).join('')}</div>
 <div class="result-actions">${path?.steps?.length?`<button class="btn" data-nav="path">Мой учебный маршрут ${icon('arrow',17)}</button>`:
 d.targetId?`<button class="btn" data-action="start-lesson" data-id="${escapeHTML(d.targetId)}">Начать выбранную тему ${icon('arrow',17)}</button>`:
 '<button class="btn" data-nav="catalog">Выбрать тему</button>'}
 <button class="btn outline" data-nav="knowledge">Карта знаний</button></div>
 <p class="path-small">Оценка основана на краткой проверке. Для подтверждения понимания нужно решить ещё несколько заданий самостоятельно.</p></div>`;
}
function personalPathPage(){
 const path=profile().learningPath;
 if(!path)return `<div class="path-screen"><span class="eyebrow">МАТЕМАТИКА БЕЗ ПРОБЕЛОВ</span>
 <h1 class="page-title">Твой персональный маршрут</h1>
 <p class="page-desc">Выбери тему, в которой есть сложности, и пройди короткую проверку. Znayu подскажет, какие правила стоит повторить.</p>
 <div class="path-empty"><div class="path-orbit">${icon('route',34)}</div><h2>Сначала найдём основу</h2>
 <p>Можно выбрать конкретную тему или пройти общую диагностику по одному из направлений.</p>
 <div class="path-actions"><button class="btn" data-nav="catalog">Выбрать тему</button>
 <button class="btn outline" data-nav="diag-intro">Проверить знания</button></div></div></div>`;
 const p=pathProgress(path),next=nextPathStep(path);
 const goal=path.targetId?SKILL_BY_ID[path.targetId]?.title||'Выбранная тема':
 path.focus==='algebra'?'Алгебра':path.focus==='it'?'Математика для ИТ':'Основы математики';
 return `<div class="path-screen"><div class="breadcrumbs"><button data-nav="home">Главная</button> › <span>Мой маршрут</span></div>
 <span class="eyebrow">ТВОЙ УЧЕБНЫЙ ПУТЬ</span><h1 class="page-title">От пробела — к пониманию</h1>
 <p class="page-desc">Цель: <strong>${escapeHTML(goal)}</strong>. Идём от необходимых основ к более сложным правилам.</p>
 <div class="path-overview"><div class="path-overview-top"><small>ПРОЙДЕННЫЕ ШАГИ</small><strong>${p.done} / ${p.total}</strong><span>${p.percent}%</span></div>
 <div class="path-progress"><div style="width:${p.percent}%"></div></div></div>
 ${path.steps.length?`<ol class="path-steps">${path.steps.map((step,i)=>{
 const s=SKILL_BY_ID[step.skillId],passed=step.status==='done',current=next?.skillId===step.skillId;
 return `<li class="path-step ${passed?'path-step-done':current?'path-step-current':''}">
 <div class="path-step-index">${passed?icon('check',18):i+1}</div>
 <div class="path-step-content"><span class="path-step-kicker">${step.kind==='goal'?'ВОЗВРАЩАЕМСЯ К ЦЕЛИ':'ВОССТАНАВЛИВАЕМ ОСНОВУ'}</span>
 <h3>${escapeHTML(s?.title||step.skillId)}</h3><p>${escapeHTML(step.reason||s?.description||'Следующий навык')}</p>
 <span class="path-step-state">${passed?'Разобрано самостоятельно':current?'Следующий шаг':'После предыдущего навыка'}</span>
 </div>${current?`<button class="btn secondary small" data-action="path-start">Начать</button>`:''}</li>`;}).join('')}</ol>`:
 `<div class="path-empty"><h2>Проверенные темы не вызвали затруднений</h2><p>Можно выбрать новую цель или проверить знания на более сложном уровне.</p></div>`}
 <div class="path-actions">${next?`<button class="btn" data-action="path-start">Продолжить: ${escapeHTML(SKILL_BY_ID[next.skillId]?.title||'урок')} ${icon('arrow',17)}</button>`:
 `<button class="btn" data-nav="catalog">Выбрать следующую тему ${icon('arrow',17)}</button>`}
 <button class="btn outline" data-action="path-rediagnose">Повторить диагностику</button></div>
 <p class="path-small">Чтобы завершить шаг, реши минимум две задачи правильно и самостоятельно — без ошибок и подсказок.</p></div>`;
}
function pathHomeCard(){
 const path=profile().learningPath,next=nextPathStep(path),p=pathProgress(path);
 return `<div class="path-home-card"><div><span class="eyebrow">${path?`МОЙ МАРШРУТ · ${p.done} ИЗ ${p.total}`:'ПЕРСОНАЛЬНЫЙ МАРШРУТ'}</span>
 <h2>${next?`Следующий шаг: ${escapeHTML(SKILL_BY_ID[next.skillId]?.title||'повторение')}`:
 path?'Маршрут пройден':'Узнай, где потерялось правило'}</h2>
 <p>${next?'Короткий урок восстановит основу и поможет двигаться к цели.':
 path?'Можно выбрать следующую тему для проверки.':'Проверим базовые знания и подберём небольшие уроки, начиная с нужного правила.'}</p></div>
 <button class="btn" data-nav="${path?'path':'diag-intro'}">${path?'Открыть маршрут':'Подобрать маршрут'} ${icon('arrow',16)}</button></div>`;
}
function knowledge(){const p=progressOf(state);return `<span class="eyebrow">КАРТА ЗНАНИЙ</span><h1 class="page-title">Что уже понятно, а что повторить</h1><p class="page-desc">Темы связаны между собой. Для сложных заданий можно сначала восстановить необходимые базовые навыки.</p>${MODULES.map(m=>{const s=skillsOf(m.id);const done=s.filter(x=>['learned','mastered'].includes(statusOf(p,x.id))).length;return `<div class="knowledge-module"><div class="knowledge-module-head"><div class="module-icon" style="background:${m.color};margin:0">${icon(m.icon)}</div><div><h3>${m.title}</h3><p>${done} из ${s.length} освоено</p></div></div><div class="knowledge-list">${s.map(x=>`<button class="knowledge-pill" data-skill="${x.id}"><span class="knowledge-dot ${statusOf(p,x.id)}"></span><span>${x.title}</span></button>`).join('')}</div></div>`;}).join('')}`;}
function itDifficultySummary(){
 const skills=skillsOf('itmath');
 return `${section('Математика для ИТ: твои уровни','Каждый навык оценивается отдельно. Повышение сложности основано на двух уверенных прохождениях.')}
 <div class="it-level-summary">${skills.map(s=>{
  const d=difficultyState(progressOf(state),s.id);
  return `<button type="button" class="it-level-skill" data-skill="${s.id}"><span>${escapeHTML(s.title)}</span>
  <small>${d.confirmed?`Подтверждён уровень ${d.confirmed} из 4`:'Уровень пока не подтверждён'} · советуем: ${DIFFICULTY_LABELS[d.recommended-1]}</small>
  </button>`;}).join('')}</div>`;
}
function progressPage(){const p=progressOf(state);const stats=summarizeProgress(p,SKILLS);const due=reviewDue(p);return `<span class="eyebrow">ЛИЧНЫЙ ПРОГРЕСС</span><h1 class="page-title">Твой путь к пониманию</h1><p class="page-desc">Это не школьные оценки. Здесь видно, какие темы уже освоены и что полезно повторить.</p><div class="analytics-grid"><div class="panel"><strong>Пройдено тем</strong><div class="progress-big">${stats.learned} <small style="font-size:20px;color:#aaaac5">/ ${stats.total}</small></div><span class="progress-meta">${stats.percent}% пилотной программы</span><div class="progress-bar"><i style="width:${stats.percent}%"></i></div><p class="muted" style="font-size:13px">Освоено повторно: ${stats.mastered}. Изучается сейчас: ${stats.learning}.</p></div><div class="panel"><strong>По разделам</strong>${MODULES.map(m=>{const a=skillsOf(m.id),done=a.filter(s=>['learned','mastered'].includes(statusOf(p,s.id))).length;const v=Math.round(done/a.length*100);return `<div class="progress-mod"><strong>${m.title}</strong><div class="small-bar"><i style="width:${v}%"></i></div><small>${v}%</small></div>`;}).join('')}</div></div>${itDifficultySummary()}${section('Пора повторить','Повторения помогают проверить, сохранилось ли понимание.')}${due.length?`<div class="skill-list">${due.map((id,i)=>`<div class="recommend-item"><div class="mini-icon">${icon('repeat')}</div><div class="recommend-info"><strong>${SKILL_BY_ID[id].title}</strong><small>Короткая проверка после урока</small></div><button class="btn secondary small" data-action="start-review" data-id="${id}">Повторить</button></div>`).join('')}</div>`:`<div class="empty-state">${icon('clock',35)}<h3>Пока ничего повторять не нужно</h3><p>После освоения навыка приложение предложит короткую повторную проверку.</p></div>`}${section('История занятий','Последние завершённые уроки')}${profile().sessions.length?`<div class="skill-list">${profile().sessions.slice(0,8).map((x,i)=>skillRow(SKILL_BY_ID[x.skillId],i)).join('')}</div>`:`<div class="empty-state"><h3>Первый урок впереди</h3><p>Выбери навык, чтобы начать собирать историю обучения.</p><button class="btn" data-nav="catalog">Выбрать тему</button></div>`}`;}
function render(){if((route.name!=='lesson'||!remoteTutorEnabled())&&tutorWidgetId!==null){clearTutorVerificationTimer();try{window.turnstile?.remove(tutorWidgetId);}catch{}tutorWidgetId=null;document.getElementById('tutor-verification-portal')?.remove();}let c='';switch(route.name){case 'home':c=home();break;case 'catalog':c=catalog();break;case 'module':c=modulePage(route.id);break;case 'search':c=searchPage();break;case 'skill':c=skillOverview(route.id);break;case 'lesson':c=lessonPage(route.id);break;case 'diagnostic':c=diagPage();break;case 'diag-intro':c=diagnosticIntro();break;case 'diag-result':c=diagnosticResult();break;case 'result':c=resultPage();break;case 'knowledge':c=knowledge();break;case 'path':c=personalPathPage();break;case 'challenge':c=challengeIntro();break;case 'challenge-run':c=challengeRunPage();break;case 'challenge-result':c=challengeResultPage();break;case 'progress':c=progressPage();break;default:c=home();}$('#app').innerHTML=shell(c);setupTutorVerification();}
function handleSubmit(form){
 if(form.id==='challenge-form'){
  const attempt=profile().activeChallenge;if(!attempt||attempt.index>=attempt.questions.length)return;
  const answer=new FormData(form).get('answer')?.toString().trim()||'';
  if(!answer){toast('Введи ответ, чтобы продолжить');return;}
  const updated=recordChallengeAnswer(attempt,answer,checkAnswer);
  profile().activeChallenge=updated;
  if(updated.index===updated.questions.length){
   const score=challengeResult(updated);
   profile().challengeHistory||=[];
   profile().challengeHistory.unshift({level:updated.level,correct:score.correct,total:score.total,at:new Date().toISOString()});
   profile().challengeHistory=profile().challengeHistory.slice(0,20);
   persist();go('challenge-result');
  }else{persist();render();}
  return;
 }
 if(form.id==='auth-form'){void submitAuth(form);return;}if(form.id==='hero-search'||form.id==='search-page-form'){const q=new FormData(form).get('query')?.toString()||'';searchTerm=q;go('search');return;}
 if(form.id==='tutor-form'){const prompt=new FormData(form).get('question')?.toString();if(prompt)void sendTutorQuestion(prompt);return;}
 if(form.id==='understanding-check-form'){
  const ses=profile().activeLesson,check=ses?.comprehension;if(!check||check.step!==ses.index||check.passed)return;
  const skill=SKILL_BY_ID[ses.skillId],q=lessonQuestions(ses,skill)[check.questionIndex];
  const raw=new FormData(form).get('answer')?.toString().trim()||'';if(!raw)return;
  check.attempts++;
  if(checkAnswer(raw,q.answer,q.kind)){check.passed=true;check.feedback='';}
  else {const mis=classifyMistake(skill,q,raw);check.feedback=`Пока не получилось. ${mis.explanation} Попробуй ещё раз самостоятельно.`;}
  persist();render();document.querySelector('.tutor-check')?.scrollIntoView({block:'nearest'});return;
 }
 if(form.id==='answer-form'){
  const ses=profile().activeLesson;if(!ses||ses.correct)return;
  let skill=SKILL_BY_ID[ses.skillId],q=lessonQuestions(ses,skill)[ses.index];
  let answer=new FormData(form).get('answer')?.toString().trim();
  if(!answer){toast('Введи ответ, чтобы проверить');return;}
  const correct=checkAnswer(answer,q.answer,q.kind);
  if(correct){
   ses.correct=true;ses.feedback=q.explain;
   ses.answers.push({index:ses.index,correct:true,usedHint:ses.showHint||ses.tutorUsed,wrongTries:ses.wrongTries,answer});
   recordTutorMessage(ses,'assistant',ses.wrongTries?'Теперь верно! Ты исправил ошибку. '+q.explain:'Правильно! '+q.explain);
  } else {
   ses.wrongTries++;
   ses.lastMistake=classifyMistake(skill,q,answer);
   ses.feedback=ses.wrongTries===1?`${ses.lastMistake.explanation} Попробуй ещё раз или спроси помощника.`:ses.wrongTries===2?`${ses.lastMistake.explanation} Подумай, какой базовый шаг стоит повторить.`:`${q.hint} Если не получается, разберём этот шаг подробнее.`;
   recordTutorMessage(ses,'assistant',ses.feedback);
  }
  persist();render();if(!correct)$('#answer-input')?.focus();return;
 }
 if(form.id==='diagnostic-form'){
 const answer=new FormData(form).get('answer')?.toString().trim();
 if(!answer){toast('Введи ответ или выбери «Не знаю»');return;}
 applyPersonalDiagnostic(answer);return;
}
}
function applyPersonalDiagnostic(answer,skipped=false){
 const d=profile().diagnostic,item=diagnosticQuestion(d,SKILL_BY_ID);
 if(!item)return;
 const correct=!skipped&&checkAnswer(String(answer),item.question.answer,item.question.kind);
 const next=recordDiagnostic(d,answer,correct,{
  skipped,mistake:correct||skipped?null:classifyMistake(item.skill,item.question,answer).title
 },SKILL_BY_ID);
 profile().diagnostic=next;
 if(next.finished){profile().learningPath=createLearningPath(next,SKILL_BY_ID);persist();go('diag-result');}
 else{persist();render();}
}
function onAction(action,button){switch(action){case 'onboard':state.mode=chosenMode;state.grade=$('#welcome-grade')?.value||state.grade;persist();render();break;case 'diagnose':go('diag-intro');break;case 'diagnose-skill':startDiagnostic(button.dataset.id);break;case 'start-diagnostic':startDiagnostic(button.dataset.id||'base');break;case 'start-lesson':newLesson(button.dataset.id);break;
case 'start-challenge':{
 const existing=profile().activeChallenge;
 if(existing&&existing.index>0&&existing.index<existing.questions.length&&
 !window.confirm('Начать новый вызов? Незавершённые ответы будут потеряны.'))break;
 const attempt=profile().challengeHistory?.length||0;
 profile().activeChallenge=createChallenge(Number(button.dataset.level),attempt);
 persist();go('challenge-run');break;
}
case 'set-difficulty':{
 const id=button.dataset.id,skill=SKILL_BY_ID[id];if(!skill)break;
 const level=clampLevel(Number(button.dataset.level),id);
 const active=profile().activeLesson;
 if(active?.skillId===id&&active.kind==='lesson'&&active.level!==level&&
 (active.index>0||active.answers.length>0||active.wrongTries>0)&&
 !window.confirm('Переключить уровень и начать этот урок сначала? Уже решённые задачи текущего урока не войдут в результат.'))break;
 const p=progressOf(state);p[id]??={status:'new'};
 const current=difficultyState(p,id);p[id].difficulty={...current,selected:level};
 persist();
 if(active?.skillId===id&&active.kind==='lesson'&&active.level!==level)newLesson(id,'lesson');
 else render();
 break;
}case 'start-review':newLesson(button.dataset.id,'review');break;case 'resume':if(profile().activeLesson)go('lesson',profile().activeLesson.skillId);break;case 'path-start':{const step=nextPathStep(profile().learningPath);if(step)newLesson(step.skillId,'path');else go('path');break;}case 'path-rediagnose':{const p=profile().learningPath;if(p?.targetId)startDiagnostic(p.targetId);else go('diag-intro');break;}case 'hint':{const l=profile().activeLesson;if(l&&!l.correct){l.showHint=true;l.hintLevel=Math.min(3,(l.hintLevel||0)+1);l.feedback='';const skill=SKILL_BY_ID[l.skillId];recordTutorMessage(l,'assistant',hintFor({skill,question:lessonQuestions(l,skill)[l.index],level:l.hintLevel,mistake:l.lastMistake,mode:state.mode}));persist();render();}break;}case 'comprehension-check':{const ses=profile().activeLesson;if(!ses)return;const skill=SKILL_BY_ID[ses.skillId];const other=lessonQuestions(ses,skill).findIndex((_,i)=>i!==ses.index);if(other<0)return;ses.comprehension={step:ses.index,questionIndex:other,open:true,attempts:0,passed:false,feedback:''};persist();render();document.querySelector('.tutor-check')?.scrollIntoView({block:'nearest'});break;}case 'comprehension-close':{const ses=profile().activeLesson;if(ses?.comprehension){ses.comprehension.open=false;persist();render();}break;}case 'tutor-quick':void sendTutorQuestion(button.dataset.text);break;case 'next-step':{const l=profile().activeLesson;if(!l||!l.correct)return;l.index++;l.showHint=false;l.correct=false;l.feedback='';l.wrongTries=0;l.hintLevel=0;l.lastMistake=null;l.tutorUsed=false;l.comprehension=null;persist();if(l.index>=lessonQuestions(l,SKILL_BY_ID[l.skillId]).length){finishLesson();render();}else render();break;}case 'diag-skip':{applyPersonalDiagnostic(null,true);break;}}}
$('#app').addEventListener('click',e=>{const auth=e.target.closest('[data-auth]');if(auth){const act=auth.dataset.auth;if(act==='logout')void signOutUser();else if(act==='google')void startGoogleSignIn();else if(act==='close'){authVisible=false;render();}else{authVisible=true;authTab=act==='open'?'signin':act;authMessage='';render();}return;}const el=e.target.closest('[data-action],[data-nav],[data-module],[data-skill],[data-mode],[data-choose],[data-search]');if(!el)return;if(el.hasAttribute('data-nav')){e.preventDefault();go(el.dataset.nav);}else if(el.hasAttribute('data-module'))go('module',el.dataset.module);else if(el.hasAttribute('data-skill'))go('skill',el.dataset.skill);else if(el.hasAttribute('data-mode')){state.mode=el.dataset.mode;persist();go('home');}else if(el.hasAttribute('data-choose')){chosenMode=el.dataset.choose;render();}else if(el.hasAttribute('data-search')){searchTerm=el.dataset.search;go('search');}else if(el.hasAttribute('data-action'))onAction(el.dataset.action,el);});
$('#app').addEventListener('submit',e=>{e.preventDefault();handleSubmit(e.target);});
$('#app').addEventListener('change',e=>{if(e.target.id==='grade-switch'){state.grade=e.target.value;persist();render();}});
window.addEventListener('hashchange',()=>{const hash=location.hash.slice(1).split('/');if(!hash[0])return;const allowed=['home','catalog','module','search','skill','lesson','diagnostic','diag-intro','diag-result','knowledge','progress','path','challenge','challenge-run','challenge-result'];if(allowed.includes(hash[0])){route={name:hash[0],id:hash[1]};render();}});
const path=location.hash.slice(1).split('/');if(path[0]&&['home','catalog','module','search','skill','lesson','diagnostic','diag-intro','diag-result','knowledge','progress','path','challenge','challenge-run','challenge-result'].includes(path[0]))route={name:path[0],id:path[1]};render();
void initializeAuth();
