import {ratioSteps} from './ratio-lesson.js';
import {negativeSteps} from './negative-lessons.js';
/** Pure lesson presentation helpers. No scoring, cloud fields or answer-key changes. */
export const LESSON_STAGES=Object.freeze([
 {id:'concept',label:'Понять',description:'Правило и пример'},
 {id:'practice',label:'Попробовать',description:'Решаем вместе'},
 {id:'consolidate',label:'Закрепить',description:'Пробуем самостоятельно'}
]);
export function firstLessonPhase(kind='lesson',level=1){
 return (kind==='path'||(kind==='lesson'&&Number(level)<=2))?'concept':'practice';
}
export function lessonStage(session,total){
 if(session?.phase==='concept')return 'concept';
 const length=Math.max(1,Number(total)||1),index=Math.max(0,Number(session?.index)||0);
 return index>=length-1?'consolidate':'practice';
}
const CUSTOM=Object.freeze({
 'fraction-parts':[
  {title:'Целое делим на равные части',text:'Возьмём целую плитку и разделим её на 8 одинаковых долей.',visual:{parts:8,filled:0}},
  {title:'Выбираем нужные доли',text:'Закрасим три части из восьми. Видно, какую долю целого мы взяли.',visual:{parts:8,filled:3}},
  {title:'Записываем дробь',text:'3/8: число 3 сверху — сколько взяли; 8 снизу — на сколько разделили целое.',math:'3/8',visual:{parts:8,filled:3}}
 ],
 'mixed-fractions':[
  {title:'Что такое неправильная дробь?',text:'В правильной дроби числитель меньше знаменателя: 2/3 — меньше одного целого. В неправильной числитель равен знаменателю или больше него: 4/3 — это одно целое и ещё треть. Дробь 3/3 тоже неправильная и равна одному целому.',math:'2/3 < 1; 4/3 > 1',visual:{parts:3,filled:4}},
  {title:'Два целых — это шесть третей',text:'Каждое целое делим на три равные части: 1 = 3/3. В двух целых будет 3 + 3 = 6 таких долей. Мы по-прежнему считаем трети, поэтому знаменатель остаётся 3.',math:'2 = 3/3 + 3/3 = 6/3',visual:{parts:3,filled:6}},
  {title:'Добавляем ещё одну треть',text:'К шести третям прибавляем одну: 6/3 + 1/3 = 7/3. После вычисления в скобках знаменатель остаётся 3, потому что размер кусочка не изменился: это всё та же треть. Изменилось лишь количество кусочков — числитель 7.',math:'2 1/3 = (2 × 3 + 1)/3 = 7/3',why:'Почему внизу 3? Каждое целое делили на три части, и при сложении этих третей размер доли не менялся.',visual:{parts:3,filled:7}}
 ],
 'fraction-add':[
  {title:'Нельзя складывать разные доли сразу',text:'Разберём другой пример: 1/3 + 1/4. Треть и четверть — доли разного размера.',math:'1/3 + 1/4'},
  {title:'Приводим к общему знаменателю',text:'12 делится и на 3, и на 4. Превращаем треть в четыре двенадцатых, а четверть — в три.',math:'4/12 + 3/12'},
  {title:'Складываем числители',text:'Теперь размер частей одинаковый. Складываем 4 и 3, а знаменатель 12 сохраняем.',math:'4/12 + 3/12 = 7/12'}
 ],
 'common-denominator':[
  {title:'Выбираем одинаковые доли',text:'Попробуем привести 1/2 и 1/3 к одному знаменателю.',math:'1/2 и 1/3'},
  {title:'Ищем общее кратное',text:'6 делится и на 2, и на 3, поэтому шестые части подходят обеим дробям.',math:'1/2 = 3/6'},
  {title:'Меняем числитель вместе со знаменателем',text:'Умножаем и верх, и низ на одно и то же число. Значение дроби не изменилось.',math:'1/3 = 2/6'}
 ],
 'percent-of':[
  {title:'Процент — это доля от ста',text:'Возьмём 15% от 200. Сначала запишем процент как долю.',math:'15/100'},
  {title:'Умножаем на целое',text:'Чтобы получить нужную часть, умножаем 200 на 15/100.',math:'200 × 15/100'},
  {title:'Находим результат',text:'15% от 200 — это 30. Теперь можно решить новый пример самостоятельно.',math:'200 × 15/100 = 30'}
 ],
 'binary':[
  {title:'Каждый разряд — степень двойки',text:'Справа налево значения разрядов: 1, 2, 4, 8 и так далее.',math:'8  4  2  1'},
  {title:'Смотрим только на единицы',text:'Возьмём 110₂: единицы стоят в разрядах 4 и 2.',math:'110₂'},
  {title:'Складываем их значения',text:'4 + 2 = 6, значит 110₂ соответствует десятичному числу 6.',math:'4 + 2 = 6'}
 ],
 'analyst-funnel':[
  {title:'Определи исходную группу',text:'На страницу пришли 150 человек. Из них 30 совершили покупку.'},
  {title:'Найди долю целевого действия',text:'Конверсия — покупки, поделённые на посетителей.',math:'30/150'},
  {title:'Вырази результат в процентах',text:'30/150 = 0,2 = 20%. Теперь у тебя есть формула для других воронок.',math:'30/150 × 100 = 20%'}
 ],
 'finance-interest':[
  {title:'Капитал растёт каждый год',text:'Рассмотрим 1000 тенге под 5% годовых с ежегодной капитализацией.',math:'1000 × 1,05 = 1050'},
  {title:'Второй год — от новой суммы',text:'Во втором году процент начисляется на 1050, а не на первоначальные 1000.',math:'1050 × 1,05 = 1102,5'},
  {title:'Запомни общий принцип',text:'Начальная сумма умножается на (1 + ставка) столько раз, сколько периодов.',math:'1000 × 1,05 × 1,05 = 1102,5'}
 ]
});
export function conceptSteps(skill){
 if(!skill)return [];
 if(skill.id==='ratios')return ratioSteps();
 const negative=negativeSteps(skill.id);if(negative.length)return negative;
 const curated=CUSTOM[skill.id];
 if(curated)return curated.map(step=>({...step,visual:step.visual?{...step.visual}:undefined}));
 return [
  {title:'Знакомимся с правилом',text:skill.intro},
  {title:'Смотрим пример',text:skill.example,math:null},
  {title:'На что обратить внимание',text:'Проверь, почему выполняется именно это действие. Затем попробуй решить похожую задачу без подсказки.'}
 ];
}
export function questionPresentation(question){
 const text=String(question?.text||'').trim();
 const formula=text.match(/^(Вычисли|Найди значение|Сколько будет)\s+([^?!]+?)[.!?]*$/i);
 if(formula){
  const candidate=formula[2].trim();
  if(candidate.length<=55&&/^[\d\s+−\-*/×÷().,%_²³]+$/.test(candidate))
   return {kind:'formula',instruction:formula[1]+' выражение',expression:candidate};
 }
 if(text.length<=55&&/^[\d\s+−\-*/×÷().,%_²³=<>?]+$/.test(text))
  return {kind:'formula',instruction:'Найди результат',expression:text};
 return {kind:'word',instruction:'Прочитай условие и найди ответ',expression:text};
}
export function answerGuidance(question){
 const kind=String(question?.kind||'number');
 const text=String(question?.text||'');
 if(kind==='compare'||/Введи знак|введи знак/i.test(text))return {placeholder:'>, < или =',help:'Введи один знак: >, < или =.'};
 if(/(?:^|[\s(])(?:И|ИЛИ|НЕ|XOR)(?=[\s)?]|$)/i.test(text)&&/\b(1|0)\b/.test(text))return {placeholder:'1 или 0',help:'Используй 1 для истины и 0 для лжи.'};
 if(String(question?.answer||'').includes('/'))return {placeholder:'Например: 5/12',help:'Можно ввести дробь 5/12 или эквивалентное десятичное число.'};
 return {placeholder:'Введи ответ',help:'Введи число; десятичную дробь можно писать через запятую.'};
}
