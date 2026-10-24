import {FRACTION_STEPS,fractionPosition,fractionBars} from './fraction-examples.js';
import {formatMathText} from './math-display.js';
import {checkAnswer} from './math.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function interactWithFraction(session,action,value){
 const {examples,index,step}=fractionPosition(session),example=examples[index];
 if(session?.phase!=='concept'||!example)return false;
 const state=session.fractionInteraction??={};
 if(action==='tile'&&example.paint&&step===0){
  const tile=Number(value);
  if(!Number.isInteger(tile)||tile<0||tile>=example.bars[0].parts)return false;
  const selected=new Set(state.selected||[]);
  if(selected.has(tile))selected.delete(tile);else selected.add(tile);
  state.selected=[...selected];
 }else if(action==='grid'&&(example.grid||example.unequal)&&step<3){state.grid=!state.grid;}
 else if(action==='reset'&&example.paint&&step===0){state.selected=[];}
 else if(action==='check'&&step===3){
  state.answer=String(value??'').trim().slice(0,80);
  state.correct=checkAnswer(state.answer,example.check.answer,example.check.kind);
  state.checked=true;state.revealed=false;
 }else if(action==='reveal'&&step===3){state.revealed=true;}
 else return false;
 return true;
}

function visualBar(bar,{paint=false,selected=[],unequal=false}={}){
 const wholes=Math.max(1,Math.ceil(bar.filled/bar.parts));
 const groups=Array.from({length:wholes},(_,whole)=>{
  const count=Math.max(0,Math.min(bar.parts,bar.filled-whole*bar.parts));
  const cells=Array.from({length:bar.parts},(_,i)=>{
   if(unequal&&i===1)return '';
   const filled=paint?selected.includes(i):i<count;
   const style=unequal&&i===0?' style="grid-column:span 2"':'';
   return paint?`<button type="button" class="fraction-cell ${filled?'is-filled':''}" data-action="fraction-tile" data-tile="${i}" aria-pressed="${filled}" aria-label="Часть ${i+1} из ${bar.parts}"${style}>${filled?'✓':''}</button>`:
    `<span class="fraction-cell ${filled?'is-filled':''}"${style}>${filled?'●':''}</span>`;
  }).join('');
  return `<div class="fraction-whole" style="--fraction-parts:${bar.parts}" ${paint?'role="group" aria-label="Выбери равные части"':`role="img" aria-label="Целое ${whole+1}: ${count} из ${bar.parts} равных долей${unequal?', границы кусков неравномерны':''}"`}>${cells}</div>`;
 }).join('');
 return `<figure class="fraction-bar"><figcaption>${esc(bar.label)}${paint?'':` · ${formatMathText(`${bar.filled}/${bar.parts}`)}`}</figcaption>${groups}</figure>`;
}

export function renderFractionExamples(session){
 const {examples,index,step}=fractionPosition(session),example=examples[index];
 if(!example)return '';
 const state=session.fractionInteraction||{},paint=Boolean(example.paint&&step===0),selected=state.selected||[];
 const bars=fractionBars(example,Boolean(state.grid),step>=1);
 const last=index===examples.length-1&&step===3;
 const explanation=step===0?example.see:step===1?example.understand:step===2?'Свяжем рисунок с математической записью. Сверху считаем выбранные доли, снизу указываем, на сколько равных долей разделено каждое целое.':example.check.text;
 return `<section class="lesson-concept fraction-examples" aria-labelledby="lesson-concept-title">
  <div class="lesson-concept-heading"><span class="lesson-kicker">Пример ${index+1} из ${examples.length}</span>
  <h2 id="lesson-concept-title" tabindex="-1">${esc(example.title)}</h2>
  <p>Увидеть → понять → записать → решить. Двигайся в своём темпе; эти примеры помогают подготовиться к заданиям.</p></div>
  <nav class="fraction-example-list" aria-label="Примеры урока">${examples.map((item,i)=>`<button type="button" data-action="fraction-example" data-example="${i}" ${i===index?'aria-current="step"':''}>${i+1}. ${esc(item.title)}</button>`).join('')}</nav>
  <ol class="fraction-step-list" aria-label="Шаги примера">${FRACTION_STEPS.map((label,i)=>`<li ${i===step?'aria-current="step"':''}>${i+1}. ${label}</li>`).join('')}</ol>
  <div class="lesson-concept-focus">
   <div class="lesson-concept-counter">${FRACTION_STEPS[step]} · шаг ${step+1} из 4</div>
   <p>${formatMathText(explanation)}</p>
   ${step<3?`<div class="fraction-illustration">${bars.map(b=>visualBar(b,{paint,selected,unequal:Boolean(example.unequal&&!state.grid&&step===0)})).join('')}</div>
    <p class="fraction-scale-note">Каждая полоска — одно целое одинакового размера.</p>
    ${paint?`<div class="fraction-paint-status" role="status">Выбрано ${selected.length} из ${bars[0].parts}: ${formatMathText(`${selected.length}/${bars[0].parts}`)}. ${selected.length===bars[0].filled?'Верно, нужная доля собрана!':`Собери ${bars[0].filled}/${bars[0].parts}.`}</div><button type="button" class="btn outline small" data-action="fraction-reset">Очистить рисунок</button>`:''}
    ${example.grid||(example.unequal&&step===0)?`<button type="button" class="btn outline small" data-action="fraction-grid" aria-pressed="${Boolean(state.grid)}">${state.grid?'Исходная сетка':example.unequal?'Разделить на равные доли':'Общая сетка'}</button>`:''}
    ${state.grid?'<p class="fraction-grid-note" role="status">Закрашенная длина та же. Изменились только границы долей.</p>':''}
    ${step===2?`<div class="lesson-concept-equation">${formatMathText(example.math)}</div>`:''}`:
    `<form id="fraction-example-form" class="fraction-check-form">
     <label for="fraction-example-answer">Твой ответ</label>
     <input id="fraction-example-answer" class="answer-input" name="answer" maxlength="80" autocomplete="off" value="${esc(state.answer||'')}" aria-describedby="fraction-check-help" required>
     <small id="fraction-check-help">${example.check.kind==='compare'?'Введи >, < или =.':'Можно ввести число, дробь через / или смешанное число: 1 1/2.'}</small>
     <button type="submit" class="btn">Проверить пример</button>
    </form>
    <div class="fraction-check-feedback" role="status" tabindex="-1">${state.checked?state.correct?`Верно! ${formatMathText(example.check.explain)}`:`Попробуй ещё раз. ${formatMathText(example.check.hint)}`:''}</div>
    <button type="button" class="lesson-skip" data-action="fraction-reveal" aria-expanded="${Boolean(state.revealed)}">Показать разбор</button>
    ${state.revealed?`<p class="fraction-solution" role="status">${formatMathText(example.check.explain)}</p>`:''}`}
  </div>
  <div class="lesson-concept-actions fraction-navigation">
   ${index>0||step>0?'<button type="button" class="btn outline" data-action="concept-prev">Назад</button>':''}
   <button type="button" class="btn" data-action="concept-next">${last?'Перейти к заданиям':step===3?'Следующий пример':`Дальше: ${FRACTION_STEPS[step+1].toLowerCase()}`}</button>
  </div>
  <button type="button" class="lesson-skip" data-action="concept-skip">Я уже знаю правило — сразу к задачам</button>
 </section>`;
}
