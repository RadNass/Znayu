import {formatMathText} from './math-display.js';
import {checkAnswer} from './math.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const check=(text,answer,hint,explain)=>({text,answer:String(answer),hint,explain});
const STEPS=[
 {title:'Что с чем мы сравниваем?',
  text:'«Величина» здесь — то, что можно посчитать или измерить: количество фишек, длина ленты, объём воды. Начнём с фишек: 6 красных и 3 синих.',
  understand:'Разложим их в три одинаковые группы. В каждой — 2 красные фишки и 1 синяя. Отношение красных к синим показывает: на каждую синюю приходится две красные.',
  math:'6 : 3 = 2 : 1',
  note:'Читаем «шесть к трём» или «два к одному». Слева — красные, справа — синие. Делим оба числа на 3: состав каждой группы тот же.',
  check:check('Есть 4 красные фишки и 2 синие. Сколько красных приходится на одну синюю? Введи число.',2,'Разложи фишки на две одинаковые группы — по одной синей в каждой.','4 ÷ 2 = 2. На одну синюю приходятся две красные.')},
 {title:'Порядок слов меняет ответ',
  text:'Фишки те же: 6 красных и 3 синих. Но «красные к синим» и «синие к красным» — разные сравнения. Переключи порядок и посмотри на запись.',
  understand:'Первым записываем количество того, о чём спросили сначала. Чтобы узнать, сколько первого приходится на одну единицу второго, делим первое число на второе.',
  math:'6 : 3 = 6/3 = 2; 3 : 6 = 3/6 = 1/2',
  note:'В записи 2 : 1 сохраняются два числа. Число 2 — значение этого отношения: 2 ÷ 1. В заданиях смотри, просят ли записать отношение или вычислить его значение.',
  check:check('Есть 3 синие фишки и 6 красных. Вычисли значение отношения синих к красным. Введи число или дробь.','1/2','Сначала синие: раздели 3 на 6.','3 : 6 = 3/6 = 1/2. На две красные приходится одна синяя; синих вдвое меньше.')},
 {title:'«На сколько» и «во сколько раз»',
  text:'Длинная лента — 12 см, короткая — 4 см. На рисунке каждый маленький отрезок — 1 см.',
  understand:'«На сколько длиннее?» — ищем добавочную длину, вычитаем. «Во сколько раз длиннее?» — считаем, сколько коротких лент укладывается в длинной, делим.',
  math:'12 − 4 = 8 см; 12 : 4 = 3',
  note:'Сравнивая длины, сначала переведи их в одинаковые единицы. Например, 1 м и 25 см: 100 см : 25 см = 4. Нельзя просто разделить 1 на 25.',
  check:check('Одна лента длиной 15 см, другая — 5 см. Во сколько раз первая длиннее? Введи число.',3,'Вопрос «во сколько раз» требует деления, а не вычитания.','15 ÷ 5 = 3: первая лента в 3 раза длиннее. Число 10 ответило бы на другой вопрос — на сколько сантиметров.')},
 {title:'Готовим напиток по рецепту',
  text:'На 2 мерки сиропа берём 5 мерок воды. Все мерки одинаковые: например, одна мерка — столовая ложка. Это рецепт одной порции.',
  understand:'Чтобы приготовить больше такого же напитка, увеличиваем оба количества во столько же раз. Для двух порций удваиваем и сироп, и воду; для трёх — утраиваем.',
  math:'2 : 5 = 4 : 10 = 6 : 15',
  note:'Отношение сохраняет состав напитка, а не его общий объём. Если увеличить только сироп, напиток получится слаще — это уже другое отношение.',
  check:check('На 2 мерки сиропа нужно 5 мерок воды. Сколько воды нужно на 4 мерки сиропа? Введи количество мерок.',10,'Сиропа стало в 2 раза больше. Увеличь воду во столько же раз.','4 ÷ 2 = 2 порции. Воды нужно 5 × 2 = 10 мерок.')},
 {title:'Сравнить части или найти долю целого?',
  text:'В одной порции 2 мерки сиропа и 5 мерок воды. Всего 2 + 5 = 7 одинаковых мерок. Важно, с чем сравнивается сироп.',
  understand:'Сироп к воде — сравниваем две части: 2 : 5. Доля сиропа во всём напитке — сравниваем сироп со всеми семью мерками: 2/7. Эти записи отвечают на разные вопросы.',
  math:'Сироп : вода = 2 : 5; всего 2 + 5 = 7 мерок; доля сиропа = 2/7',
  note:'Перед решением назови обе величины словами. Затем запиши их числа в том же порядке. Если спрашивают долю целого, сначала посчитай всё целое.',
  check:check('Смешали 3 мерки сиропа и 6 мерок воды. Какую долю всех мерок составляет сироп? Введи дробь.','1/3','Всего 3 + 6 = 9 мерок. Сравни 3 мерки сиропа с 9 мерками всего напитка.','Доля сиропа — 3/9 = 1/3. Запись 3/6 сравнивала бы сироп только с водой.')}
];

export function ratioSteps(){return structuredClone(STEPS);}
export function ratioPosition(session){
 const index=Number.isInteger(session?.conceptIndex)?Math.max(0,Math.min(STEPS.length-1,session.conceptIndex)):0;
 return {index,step:structuredClone(STEPS[index])};
}
function stateFor(session,index){return session.ratioExamples?.[index]||{};}

export function ratioModel(session){
 const {index}=ratioPosition(session),state=stateFor(session,index);
 const portions=[1,2,3].includes(state.portions)?state.portions:1;
 const reversed=Boolean(state.reversed),difference=state.measure==='difference',whole=Boolean(state.whole);
 if(index===0)return {type:'groups',grouped:Boolean(state.grouped),first:6,second:3};
 if(index===1)return {type:'order',first:reversed?3:6,second:reversed?6:3,reversed};
 if(index===2)return {type:'length',first:12,second:4,difference,result:difference?8:3};
 if(index===3)return {type:'recipe',first:2*portions,second:5*portions,portions};
 return {type:'share',first:2,second:whole?7:5,whole};
}

// Presentation state stays within activeLesson, never in scored answers/progress.
export function interactWithRatio(session,action,value){
 if(session?.skillId!=='ratios'||session.phase!=='concept')return false;
 const {index,step}=ratioPosition(session);
 session.ratioExamples??={};const state=session.ratioExamples[index]??={};
 if(action==='group'&&index===0)state.grouped=!state.grouped;
 else if(action==='order'&&index===1)state.reversed=!state.reversed;
 else if(action==='measure'&&index===2)state.measure=state.measure==='difference'?'ratio':'difference';
 else if(action==='portions'&&index===3&&[1,2,3].includes(Number(value)))state.portions=Number(value);
 else if(action==='whole'&&index===4)state.whole=!state.whole;
 else if(action==='draft'){state.answer=String(value??'').slice(0,80);state.checked=false;}
 else if(action==='check'){
  state.answer=String(value??'').trim().slice(0,80);state.checked=true;
  state.correct=checkAnswer(state.answer,step.check.answer);state.revealed=false;
 }else if(action==='reveal')state.revealed=!state.revealed;
 else return false;
 return true;
}

const counters=(count,blue=false)=>Array.from({length:count},()=>`<span class="ratio-counter ${blue?'is-blue':''}" aria-hidden="true">${blue?'С':'К'}</span>`).join('');
function counterRow(count,blue=false){
 return `<div class="ratio-counter-row"><span>${blue?'Синие':'Красные'}: ${count}</span><div class="ratio-counters" role="img" aria-label="${count} ${blue?'синих':'красных'} фишек">${counters(count,blue)}</div></div>`;
}
function visual(session){
 const m=ratioModel(session);
 if(m.type==='groups')return `${m.grouped?`<div class="ratio-groups">${Array.from({length:3},(_,i)=>`<div class="ratio-group" role="img" aria-label="Группа ${i+1}: 2 красные и 1 синяя"><span>Группа ${i+1}</span><div class="ratio-counters">${counters(2)}${counters(1,true)}</div></div>`).join('')}</div>`:counterRow(6)+counterRow(3,true)}
  <button type="button" class="btn outline small" data-action="ratio-group" aria-pressed="${m.grouped}">${m.grouped?'Показать все фишки':'Разложить на одинаковые группы'}</button>`;
 if(m.type==='order')return `${counterRow(m.first,m.reversed)}${counterRow(m.second,!m.reversed)}
  <p class="ratio-live-equation" role="status">${m.reversed?'Синие : красные = 3 : 6 = 1 : 2':'Красные : синие = 6 : 3 = 2 : 1'}</p>
  <p>${m.reversed?'На две красные приходится одна синяя. Синих вдвое меньше.':'На одну синюю приходятся две красные. Красных вдвое больше.'}</p>
  <button type="button" class="btn outline small" data-action="ratio-order" aria-pressed="${m.reversed}">${m.reversed?'Сравнить красные с синими':'Сравнить синие с красными'}</button>`;
 if(m.type==='length')return `<div class="ratio-rulers ${m.difference?'is-difference':''}">
  <div><span>Длинная · 12 см</span><div class="ratio-ruler" role="img" aria-label="12 сантиметров: три группы по 4">${Array.from({length:12},(_,i)=>`<span class="${i>=4?'is-extra':''} ${i===4||i===8?'group-start':''}"></span>`).join('')}</div></div>
  <div><span>Короткая · 4 см</span><div class="ratio-ruler short" role="img" aria-label="4 сантиметра">${'<span></span>'.repeat(4)}</div></div></div>
  <p class="ratio-live-equation" role="status">${m.difference?'12 − 4 = 8 см: на 8 см длиннее.':'12 ÷ 4 = 3: в 3 раза длиннее.'}</p>
  <button type="button" class="btn outline small" data-action="ratio-measure" aria-pressed="${m.difference}">${m.difference?'Во сколько раз длиннее?':'На сколько сантиметров длиннее?'}</button>`;
 if(m.type==='recipe')return `<div class="ratio-portions" role="group" aria-label="Количество порций">${[1,2,3].map(n=>`<button type="button" class="btn outline small" data-action="ratio-portions" data-portions="${n}" aria-pressed="${m.portions===n}">${n} ${n===1?'порция':'порции'}</button>`).join('')}</div>
  <div class="ratio-recipe-groups">${Array.from({length:m.portions},(_,i)=>`<div class="ratio-recipe-group"><strong>Порция ${i+1}</strong><span>Сироп · 2 мерки</span><div class="ratio-measures" role="img" aria-label="2 одинаковые мерки сиропа">${'<span class="syrup">С</span>'.repeat(2)}</div><span>Вода · 5 мерок</span><div class="ratio-measures" role="img" aria-label="5 таких же мерок воды">${'<span>В</span>'.repeat(5)}</div></div>`).join('')}</div>
  <p class="ratio-live-equation" role="status">Сироп: ${m.first} мерок. Вода: ${m.second} мерок. ${m.first} : ${m.second} = 2 : 5.</p>`;
 return `<div class="ratio-whole" role="img" aria-label="Всего 7 мерок: 2 сиропа и 5 воды">${'<span class="syrup">С</span>'.repeat(2)}${'<span>В</span>'.repeat(5)}</div>
  <p>С — сироп, В — вода. Каждая клетка — одна и та же мерка.</p>
  <p class="ratio-live-equation" role="status">${m.whole?`Сироп : весь напиток = 2 : 7. Доля сиропа — ${formatMathText('2/7')}.`:'Сироп : вода = 2 : 5. На 2 мерки сиропа берём 5 мерок воды.'}</p>
  <button type="button" class="btn outline small" data-action="ratio-whole" aria-pressed="${m.whole}">${m.whole?'Сравнить сироп только с водой':'Найти долю сиропа во всём напитке'}</button>`;
}

export function renderRatioLesson(session){
 const {index,step}=ratioPosition(session),state=stateFor(session,index);
 return `<section class="lesson-concept ratio-lesson" aria-labelledby="lesson-concept-title">
  <div class="lesson-concept-heading"><span class="lesson-kicker">Пример ${index+1} из ${STEPS.length}</span>
  <h2 id="lesson-concept-title" tabindex="-1">${esc(step.title)}</h2>
  <p>Сначала разберём знакомую ситуацию, затем запишем её числами.</p></div>
  <details class="ratio-outline"><summary>Все 5 примеров урока</summary><nav class="fraction-example-list" aria-label="Примеры урока">${STEPS.map((s,i)=>`<button type="button" data-action="ratio-example" data-example="${i}" ${i===index?'aria-current="step"':''}>${i+1}. ${esc(s.title)}</button>`).join('')}</nav></details>
  <div class="lesson-concept-focus ratio-focus">
   <h3>1. Увидеть</h3><p>${formatMathText(step.text)}</p>
   <div class="ratio-visual">${visual(session)}</div>
   <h3>2. Понять</h3><p>${formatMathText(step.understand)}</p>
   <h3>3. Записать</h3><div class="lesson-concept-equation">${formatMathText(step.math)}</div>
   <p class="ratio-note">${formatMathText(step.note)}</p>
   <h3>4. Решить</h3><p>${formatMathText(step.check.text)}</p>
   <form id="ratio-check-form" class="fraction-check-form">
    <label for="ratio-answer">Твой ответ</label><input id="ratio-answer" class="answer-input" name="answer" value="${esc(state.answer||'')}" maxlength="80" autocomplete="off" aria-describedby="ratio-answer-help" required>
    <small id="ratio-answer-help">Введи число или дробь через /, например 1/2. Это тренировка: можно ошибаться и пробовать ещё.</small>
    <button type="submit" class="btn">Проверить пример</button>
   </form>
   <div class="fraction-check-feedback" tabindex="-1" role="status">${state.checked?state.correct?`Верно! ${formatMathText(step.check.explain)}`:`Попробуй ещё раз. ${formatMathText(step.check.hint)}`:''}</div>
   <button type="button" class="lesson-skip" data-action="ratio-reveal" aria-expanded="${Boolean(state.revealed)}">${state.revealed?'Скрыть разбор':'Показать разбор'}</button>
   ${state.revealed?`<p role="status">${formatMathText(step.check.explain)}</p>`:''}
  </div>
  <div class="lesson-concept-actions fraction-navigation">${index?'<button type="button" class="btn outline" data-action="concept-prev">Назад</button>':''}
   <button type="button" class="btn" data-action="concept-next">${index===STEPS.length-1?'Перейти к заданиям':'Следующий пример'}</button></div>
  <button type="button" class="lesson-skip" data-action="concept-skip">Я уже знаю правило — сразу к задачам</button>
 </section>`;
}
