import {formatMathText} from './math-display.js';
import {checkAnswer} from './math.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>String(n).replace('-','−');
const check=(text,answer,hint,explain)=>({text,answer:String(answer),hint,explain});
const move=(start,delta,thermometer=false)=>({type:'move',start,delta,thermometer});
const compare=(a,b)=>({type:'compare',a,b});
const GUIDES={
 'negative-concept':[
  {title:'Температура ниже нуля',
   text:'На термометре −3 °C: это три градуса ниже нуля. Нажимай «На 1 больше» и «На 1 меньше», чтобы менять температуру.',
   understand:'Минус перед числом показывает, что значение меньше нуля. −3 читается «минус три». Здесь минус — часть записи числа: вычитать ничего не нужно.',
   math:'−3 < 0 < 3',note:'−3 °C и +3 °C — разные температуры. Ноль — граница между отрицательными и положительными значениями.',
   visual:{type:'point',start:-3,thermometer:true},
   check:check('Температура на 2 градуса ниже нуля. Запиши число без °C.',-2,'Ниже нуля — значит нужен минус перед числом 2.','Два градуса ниже нуля записываем как −2 °C.')},
  {title:'Числа слева и справа от нуля',
   text:'Представь дорогу с отметкой 0. Каждый промежуток между соседними отметками — одна единица. Начнём в нуле и сделаем четыре шага влево.',
   understand:'Справа от нуля находятся положительные числа, слева — отрицательные. При движении влево числа уменьшаются: 0, −1, −2, −3, −4.',
   math:'0 → −1 → −2 → −3 → −4',note:'Считай промежутки, а не отметки. От 0 до −1 — один шаг. Числовая прямая продолжается в обе стороны.',visual:move(0,-4),
   check:check('Какое число находится на 5 единиц левее нуля?',-5,'Сделай пять шагов от нуля влево.','Слева от нуля на расстоянии 5 единиц находится −5.')},
  {title:'А сам ноль — положительный?',
   text:'Поставим точку в 0. Сдвинь её на один шаг вправо, затем верни в ноль и сделай шаг влево.',
   understand:'Ноль не является ни положительным, ни отрицательным числом. Он помогает сравнивать значения: положительные больше нуля, отрицательные меньше.',
   math:'−1 < 0 < 1',note:'В записи +0 и −0 получается то же число 0. Знак «минус» не делает ноль отрицательным.',visual:{type:'point',start:0},
   check:check('Было −1 °C, стало на 1 градус теплее. Какое число покажет термометр?',0,'От −1 сделай один шаг вправо.','−1 + 1 = 0. Это ноль, не положительное и не отрицательное число.')},
  {title:'Противоположные числа — по разные стороны',
   text:'Числа 4 и −4 находятся на одинаковом расстоянии от нуля. Переключай выделенную точку: расстояние останется тем же.',
   understand:'Противоположные числа отличаются знаком и расположены по разные стороны от нуля. Расстояние от числа до нуля называют модулем. Расстояние не бывает отрицательным.',
   math:'|−4| = 4; |4| = 4; −4 + 4 = 0',note:'Число −4 отрицательное, но его модуль равен 4. Число, противоположное нулю, — сам ноль.',visual:{type:'opposite',a:4,b:-4},
   check:check('Какое число противоположно −6?',6,'Нужно то же расстояние от нуля, но справа.','Противоположное числу −6 — число 6. Оба удалены от нуля на 6 единиц.')},
  {title:'Похолодало: переходим через ноль',
   text:'Утром было +2 °C. К вечеру стало на 6 градусов холоднее. Начни с 2 и пройди шесть единичных шагов влево.',
   understand:'Сначала два шага доведут до нуля. Остаются ещё четыре шага влево: получаем −4. Ноль не останавливает счёт.',
   math:'2 − 6 = −4',note:'В выражении 2 − 6 минус означает вычитание. В ответе −4 минус показывает знак полученного числа.',visual:move(2,-6,true),
   check:check('Было +1 °C, стало на 4 градуса холоднее. Какая температура теперь? Введи число.',-3,'Один шаг до нуля и ещё три шага влево.','1 − 4 = −3 °C. Понижение на 4 градуса — четыре шага влево.')}
 ],
 'negative-compare':[
  {title:'Правее — значит больше',text:'Сравним −2 и −6. На одной прямой отметим оба числа. Нажми на подписи, чтобы выделить каждую точку.',
   understand:'−2 находится правее −6, поэтому −2 больше. На термометре −2 °C тоже теплее, чем −6 °C.',math:'−2 > −6',
   note:'Для двух отрицательных чисел ближе к нулю — значит больше. Но правило «правее — больше» работает для любых чисел.',visual:compare(-2,-6),
   check:check('Сравни −4 и −8. Введи >, < или =.','>','Найди, какое число правее.','−4 > −8: точка −4 расположена правее точки −8.')},
  {title:'Отрицательное, ноль, положительное',text:'Отметим −4 и 2. Между ними находится ноль.',
   understand:'Любое отрицательное число меньше нуля. Любое положительное больше нуля. Поэтому отрицательное число всегда меньше положительного.',math:'−4 < 0 < 2',
   note:'Не сравнивай только цифры: знак числа тоже важен. Хотя 4 больше 2, число −4 меньше 2.',visual:compare(-4,2),
   check:check('Сравни −1 и 0. Введи >, < или =.','<','Ноль расположен правее −1.','−1 < 0. Ноль больше любого отрицательного числа.')},
  {title:'Одна точка — равные числа',text:'Первое число −3 и второе число −3 попадают в одну и ту же точку.',
   understand:'Если числа совпадают, ни одно из них не больше другого. Ставим знак равенства.',math:'−3 = −3',
   note:'Знак «>» раскрыт к большему числу. Знак «<» тоже раскрыт к большему; острый угол всегда смотрит на меньшее.',visual:compare(-3,-3),
   check:check('Сравни −6 и −6. Введи >, < или =.','=','Обе записи называют одно и то же число.','−6 = −6: обе точки совпадают.')}
 ],
 'negative-add':[
  {title:'Прибавляем отрицательное: идём влево',text:'Начнём с −2. Прибавить −3 — значит сделать три шага в сторону уменьшения.',
   understand:'Знак второго слагаемого задаёт направление. Плюс перед скобками означает сложение, а минус внутри показывает, что прибавляем отрицательное число.',math:'−2 + (−3) = −5',
   note:'Два отрицательных слагаемых уводят ещё дальше влево от нуля. Складываем расстояния и сохраняем отрицательный знак.',visual:move(-2,-3),
   check:check('Вычисли −1 + (−4).',-5,'От −1 сделай четыре шага влево.','−1 + (−4) = −5.')},
  {title:'Прибавляем положительное: идём вправо',text:'Было −4 °C, потеплело на 6 градусов. От точки −4 сделаем шесть шагов вправо.',
   understand:'Четыре шага доведут до нуля. Ещё два шага приведут к 2. При разных знаках результат может оказаться по любую сторону нуля.',math:'−4 + 6 = 2',
   note:'Направление задаёт прибавляемое число +6. Начальная точка −4 не заставляет двигаться влево.',visual:move(-4,6,true),
   check:check('Вычисли −2 + 5.',3,'От −2 двигайся на пять единиц вправо.','−2 + 5 = 3: два шага до нуля и ещё три вправо.')},
  {title:'Противоположные слагаемые дают ноль',text:'Начни с −3 и прибавь 3. Сделай три шага вправо.',
   understand:'Расстояние до нуля и число шагов совпадают, поэтому движение заканчивается точно в нуле.',math:'−3 + 3 = 0',
   note:'Для разных знаков недостаточно сказать «будет плюс» или «будет минус»: сравни расстояния. Если они равны, получится ноль.',visual:move(-3,3),
   check:check('Вычисли −5 + 5.',0,'Числа противоположные: каждое удалено от нуля на пять единиц.','−5 + 5 = 0.')}
 ],
 'negative-subtract':[
  {title:'Вычитаем положительное число',text:'Начнём с −1 и вычтем 3. Это три шага влево, в сторону уменьшения.',
   understand:'Вычитание положительного числа уменьшает значение, даже если начальное число уже отрицательное.',math:'−1 − 3 = −4',
   note:'Начальная точка и направление — разные вещи: сначала найди −1, затем отсчитай три шага влево.',visual:move(-1,-3),
   check:check('Вычисли −3 − 2.',-5,'От −3 сделай два шага влево.','−3 − 2 = −5.')},
  {title:'Вычитаем отрицательное: меняем направление',text:'Уменьшить долг — значит улучшить баланс. Так же вычесть −3 из 2 — это прибавить 3. От 2 двигаемся вправо.',
   understand:'Вычитание заменяем сложением противоположного числа. Противоположное числу −3 — число +3.',math:'2 − (−3) = 2 + 3 = 5',
   note:'Правило относится именно к вычитанию отрицательного: a − (−b) = a + b. В выражении −2 + (−3) такого вычитания нет.',visual:move(2,3),
   check:check('Вычисли 1 − (−4).',5,'Замени вычитание −4 прибавлением +4.','1 − (−4) = 1 + 4 = 5.')},
  {title:'Начинаем слева от нуля',text:'Вычтем −5 из −3. Сначала перепишем: −3 + 5. Теперь ясно, откуда и куда двигаться.',
   understand:'От −3 идём пять шагов вправо: три до нуля и ещё два. Ответ положительный, хотя первое число было отрицательным.',math:'−3 − (−5) = −3 + 5 = 2',
   note:'Минус у первого числа остаётся его знаком. Меняется действие вычитания и знак второго числа.',visual:move(-3,5),
   check:check('Вычисли −2 − (−6).',4,'Начни с −2 и прибавь 6.','−2 − (−6) = −2 + 6 = 4.')}
 ]
};

export const negativeSteps=id=>structuredClone(GUIDES[id]||[]);
export function negativePosition(session){
 const steps=negativeSteps(session?.skillId);
 const index=Number.isInteger(session?.conceptIndex)?Math.max(0,Math.min(steps.length-1,session.conceptIndex)):0;
 return {index,step:steps[index]};
}
const validInt=(value,min,max,fallback)=>Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
export function negativeModel(session){
 const {index,step}=negativePosition(session);if(!step)return null;
 const state=session.negativeExamples?.[index]||{},v=step.visual;
 if(v.type==='point')return {...v,current:validInt(state.current,-6,6,v.start)};
 if(v.type==='move'){
  const steps=validInt(state.steps,0,Math.abs(v.delta),0);
  return {...v,steps,current:v.start+Math.sign(v.delta)*steps};
 }
 return {...v,current:state.second?v.b:v.a};
}
export function interactWithNegative(session,action,value){
 const {index,step}=negativePosition(session);
 if(!step||session.phase!=='concept')return false;
 const m=negativeModel(session);
 // Reject unrelated/invalid controls before changing persisted state.
 if(!['draft','check','reveal','reset','shift','step','select'].includes(action))return false;
 if(action==='shift'&&(m.type!=='point'||![-1,1].includes(Number(value))||Math.abs(m.current+Number(value))>6))return false;
 if(action==='step'&&(m.type!=='move'||m.steps>=Math.abs(m.delta)))return false;
 if(action==='select'&&(!['compare','opposite'].includes(m.type)||!['first','second'].includes(value)))return false;
 session.negativeExamples??={};const state=session.negativeExamples[index]??={};
 if(action==='shift')state.current=m.current+Number(value);
 if(action==='step')state.steps=m.steps+1;
 if(action==='select')state.second=value==='second';
 if(action==='reset'){delete state.current;delete state.steps;delete state.second;}
 if(action==='draft'){state.answer=String(value??'').slice(0,80);state.checked=false;}
 if(action==='check'){state.answer=String(value??'').trim().slice(0,80);state.checked=true;state.correct=checkAnswer(state.answer,step.check.answer,session.skillId==='negative-compare'?'compare':'number');state.revealed=false;}
 if(action==='reveal')state.revealed=!state.revealed;
 return true;
}

// One equal interval is always one unit. Labels are sparse on long axes to stay readable on phones.
export function numberLine({points=[],start=null,end=null,min=-6,max=6,selected=null}={}){
 min=Math.min(min,0,...points,start??0,end??0);max=Math.max(max,0,...points,start??0,end??0);
 const x=n=>28+(n-min)*464/(max-min),stride=max-min>12?2:1;
 const names=[...new Set(points)].map(signed).join(', ');
 const description=`Числовая прямая от ${signed(min)} до ${signed(max)}. Один промежуток — одна единица.${names?` Отмечены числа: ${names}.`:''}${start!==null&&end!==null?` Движение от ${signed(start)} к ${signed(end)}.`:''}`;
 const ticks=Array.from({length:max-min+1},(_,i)=>min+i).map(n=>`<line x1="${x(n)}" y1="73" x2="${x(n)}" y2="${n===0?94:86}" class="${n===0?'negative-zero':''}"/>${n%stride===0?`<text x="${x(n)}" y="113">${signed(n)}</text>`:''}`).join('');
 const motion=start!==null&&end!==null&&start!==end?`<path class="negative-motion" d="M ${x(start)} 59 V 38 H ${x(end)} V 59"/><path class="negative-motion" d="M ${x(end)-5} 51 L ${x(end)} 59 L ${x(end)+5} 51"/>`:'';
 return `<svg class="negative-line" viewBox="0 0 520 132" role="img" aria-label="${esc(description)}"><path d="M 12 80 H 508 M 20 74 L 12 80 L 20 86 M 500 74 L 508 80 L 500 86"/>${ticks}${motion}${[...new Set(points)].map(n=>`<circle class="${n===selected?'negative-selected':''}" cx="${x(n)}" cy="80" r="${n===selected?9:7}"/><text class="negative-point-label" x="${x(n)}" y="${motion?24:51}">${signed(n)}</text>`).join('')}</svg>`;
}
function thermometer(value){
 const y=n=>158-n*18;
 return `<svg class="negative-thermometer" viewBox="0 0 180 310" role="img" aria-label="Температура ${signed(value)} градусов Цельсия"><rect x="42" y="35" width="24" height="240" rx="12" class="negative-thermometer-track"/><rect x="48" y="${y(value)}" width="12" height="${280-y(value)}" rx="6" class="negative-thermometer-fill"/><circle cx="54" cy="280" r="17" class="negative-thermometer-fill"/>${Array.from({length:13},(_,i)=>i-6).map(n=>`<path d="M 72 ${y(n)} H ${n===0?95:86}"/><text x="106" y="${y(n)+5}" class="${n===0?'negative-zero':''}">${signed(n)}°</text>`).join('')}<path class="negative-motion" d="M 19 ${y(value)} H 38"/></svg>`;
}
function modelVisual(m){
 const point=m.type==='point',moving=m.type==='move';
 const points=point||moving?[m.current]:[m.a,m.b];
 let status=point?`Сейчас ${signed(m.current)}${m.thermometer?' °C':''}. ${m.current<0?'Меньше нуля.':m.current>0?'Больше нуля.':'Ни положительное, ни отрицательное.'}`:
 moving?`Шаг ${m.steps} из ${Math.abs(m.delta)}. Начало: ${signed(m.start)}. Сейчас: ${signed(m.current)}.`:
 `Выделено число ${signed(m.current)}. Расстояние до нуля: ${Math.abs(m.current)}.`;
 const line=numberLine({points,selected:m.current,start:moving?m.start:null,end:moving?m.current:null,min:Math.min(-6,m.start??0,(m.start??0)+(m.delta??0)),max:Math.max(6,m.start??0,(m.start??0)+(m.delta??0))});
 const trace=moving?`<ol class="negative-trace" aria-label="Пройденные числа">${Array.from({length:m.steps+1},(_,i)=>`<li>${signed(m.start+Math.sign(m.delta)*i)}</li>`).join('')}</ol>`:'';
 const controls=point?`<button type="button" class="btn outline small" data-action="negative-shift" data-value="-1" ${m.current===-6?'disabled':''}>← На 1 меньше</button><button type="button" class="btn outline small" data-action="negative-shift" data-value="1" ${m.current===6?'disabled':''}>На 1 больше →</button>`:
 moving?`<button type="button" class="btn outline small" data-action="negative-step" ${m.steps===Math.abs(m.delta)?'disabled':''}>${m.delta<0?'← Шаг влево':'Шаг вправо →'}</button>`:
 `<button type="button" class="btn outline small" data-action="negative-select" data-value="first" aria-pressed="${m.current===m.a}">Первое число: ${signed(m.a)}</button><button type="button" class="btn outline small" data-action="negative-select" data-value="second" aria-pressed="${m.current===m.b}">Второе число: ${signed(m.b)}</button>`;
 return `<div class="negative-model ${m.thermometer?'has-thermometer':''}">${m.thermometer?thermometer(m.current):''}<div class="negative-axis-wrap"><p class="negative-axis-legend">← Меньше <span>Больше →</span></p>${line}<p class="negative-axis-help">Соседние отметки отличаются на 1.</p>${trace}</div></div><p class="negative-live" role="status">${status}</p><div class="negative-controls">${controls}<button type="button" class="btn outline small" data-action="negative-reset">Сначала</button></div>`;
}
export function renderNegativeLesson(session){
 const {index,step}=negativePosition(session);if(!step)return '';
 const steps=negativeSteps(session.skillId),state=session.negativeExamples?.[index]||{};
 return `<section class="lesson-concept negative-lesson" aria-labelledby="lesson-concept-title"><div class="lesson-concept-heading"><span class="lesson-kicker">Пример ${index+1} из ${steps.length}</span><h2 id="lesson-concept-title" tabindex="-1">${esc(step.title)}</h2><p>Увидеть → Понять → Записать → Решить</p></div>
 <details class="ratio-outline"><summary>Все примеры урока</summary><nav class="fraction-example-list" aria-label="Примеры урока">${steps.map((s,i)=>`<button type="button" data-action="negative-example" data-example="${i}" ${index===i?'aria-current="step"':''}>${i+1}. ${esc(s.title)}</button>`).join('')}</nav></details>
 <div class="lesson-concept-focus ratio-focus"><h3>1. Увидеть</h3><p>${formatMathText(step.text)}</p><div class="negative-visual">${modelVisual(negativeModel(session))}</div>
 <h3>2. Понять</h3><p>${formatMathText(step.understand)}</p><h3>3. Записать</h3><div class="lesson-concept-equation">${formatMathText(step.math)}</div><p class="ratio-note">${formatMathText(step.note)}</p>
 <h3>4. Решить</h3><p>${formatMathText(step.check.text)}</p><form id="negative-check-form" class="fraction-check-form"><label for="negative-answer">Твой ответ</label><input id="negative-answer" class="answer-input" name="answer" value="${esc(state.answer||'')}" maxlength="80" autocomplete="off" aria-describedby="negative-answer-help" required/><small id="negative-answer-help">${session.skillId==='negative-compare'?'Введи один знак: >, < или =.':'Введи число; для отрицательного поставь перед ним минус, например −8.'} Это тренировка без оценки.</small><button type="submit" class="btn">Проверить пример</button></form>
 <div class="fraction-check-feedback" tabindex="-1" role="status">${state.checked?state.correct?`Верно! ${formatMathText(step.check.explain)}`:`Попробуй ещё раз. ${formatMathText(step.check.hint)}`:''}</div><button type="button" class="lesson-skip" data-action="negative-reveal" aria-expanded="${Boolean(state.revealed)}">${state.revealed?'Скрыть разбор':'Показать разбор'}</button>${state.revealed?`<p>${formatMathText(step.check.explain)}</p>`:''}</div>
 <div class="lesson-concept-actions fraction-navigation">${index?'<button type="button" class="btn outline" data-action="concept-prev">Назад</button>':''}<button type="button" class="btn" data-action="concept-next">${index===steps.length-1?'Перейти к заданиям':'Следующий пример'}</button></div><button type="button" class="lesson-skip" data-action="concept-skip">Я уже знаю правило — сразу к задачам</button></section>`;
}

// Exact question text keeps illustrations paired with saved question snapshots, never with a mutable index.
const TASKS={
 'negative-concept':[
  ['Какое число на 4 единицы левее нуля?',move(0,-4),'Начни в нуле. Мысленно отсчитай четыре промежутка влево.'],
  ['Вчера было 2°C, стало на 5° холоднее. Температура?',move(2,-5,true),'Отмечена начальная температура. Похолодание на 5° — пять шагов влево.'],
  ['Какое число противоположно числу 7?',{type:'opposite',a:7,b:-7},'Отмечено число 7. Найди точку на том же расстоянии по другую сторону нуля.']
 ],
 'negative-compare':[
  ['Сравни: −3 __ −7. Введи знак.',compare(-3,-7),'Обе точки показаны. Какое из двух чисел расположено правее?'],
  ['Сравни: −10 __ 2. Введи знак.',compare(-10,2),'Сравни положение двух точек относительно нуля.'],
  ['Сравни: −5 __ −5. Введи знак.',compare(-5,-5),'Если точки совпадают, числа равны.']
 ],
 'negative-add':[
  ['Вычисли −3 + (−4).',move(-3,-4),'Начни с −3. Прибавляешь отрицательное число — двигайся влево.'],
  ['Вычисли −5 + 8.',move(-5,8),'Начни с −5. Прибавляешь положительное число — двигайся вправо.'],
  ['Вычисли −6 + 2.',move(-6,2),'Начни с −6 и отсчитай два шага вправо.']
 ],
 'negative-subtract':[
  ['Вычисли 5 − (−3).',move(5,3),'Вычесть −3 — значит прибавить +3. Начальная точка — 5.'],
  ['Вычисли −4 − (−7).',move(-4,7),'Замени вычитание отрицательного сложением противоположного.'],
  ['Вычисли −2 − 5.',move(-2,-5),'Вычитаешь положительное число: от −2 двигайся влево.']
 ]
};
export function negativeTaskModel(skillId,question){
 const match=TASKS[skillId]?.find(([text])=>text===question?.text);
 return match?{...structuredClone(match[1]),instruction:match[2]}:null;
}
export function renderNegativeTask(skillId,question,solved=false){
 const m=negativeTaskModel(skillId,question);if(!m)return '';
 const moving=m.type==='move',end=moving?m.start+m.delta:m.b;
 const points=moving?[solved?end:m.start]:m.type==='compare'||solved?[m.a,m.b]:[m.a];
 const min=Math.min(-6,m.start??0,end,m.a??0),max=Math.max(6,m.start??0,end,m.a??0);
 const caption=solved?(moving?`От ${signed(m.start)} на ${Math.abs(m.delta)} ${m.delta<0?'влево':'вправо'}: ${signed(end)}.`:m.type==='opposite'?`${signed(m.a)} и ${signed(m.b)} находятся на одинаковом расстоянии от нуля.`:`${signed(m.a)} ${m.a>m.b?'>':m.a<m.b?'<':'='} ${signed(m.b)}`):m.instruction;
 return `<figure class="negative-task negative-visual"><figcaption><strong>${solved?'Решение на рисунке':'Рисунок к условию'}</strong><p>${esc(caption)}</p></figcaption>${numberLine({points,start:moving&&solved?m.start:null,end:moving&&solved?end:null,min,max})}<p class="negative-axis-help">← Меньше · один промежуток — 1 · больше →</p></figure>`;
}
