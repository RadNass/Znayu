/** Local adaptive tutoring rules: deterministic, available even without external AI. */
import {parseNumber} from './math.js';

const has = (value, rx) => rx.test(String(value || '').toLocaleLowerCase('ru'));
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

export function classifyMistake(skill, question, raw) {
  const input = clean(raw).replace(',', '.');
  const text = question.text.replace(/−/g, '-');
  const p = text.match(/(\d+)\s*\/\s*(\d+)\s*([+\-])\s*(\d+)\s*\/\s*(\d+)/);
  if (p) {
    const [,,aD,operation, , bD] = p;
    const a = Number(p[1]), b = Number(aD), c = Number(p[4]), d = Number(bD);
    const bad = parseNumber(`${operation==='+' ? a+c : a-c}/${b+d}`);
    const got = parseNumber(input);
    if (got !== null && bad !== null && Math.abs(got-bad)<1e-9 && operation==='+') {
      return {code:'add-denominators',title:'Сложение знаменателей',explanation:'При сложении дробей нельзя складывать знаменатели. Сначала нужно выразить обе части одинаковыми долями.',bridge:'common-denominator'};
    }
    if (got !== null && Math.abs(got - (operation==='+'?a+c:a-c)/(b*d))<1e-9 && b!==d) {
      return {code:'wrong-common-denominator',title:'Приведение дробей',explanation:'Знаменатель можно сделать общим, но при этом необходимо изменить и числители.',bridge:'fraction-equivalent'};
    }
  }
  if (/fraction-|denominator|mixed-fractions/.test(skill.id)) {
    return {code:'fraction-rule',title:'Действия с дробями',explanation:'Похоже, стоит проверить, как устроена дробь и какое правило подходит именно к этому действию.',bridge:skill.prereq?.[0]||'fraction-parts'};
  }
  if (/percent|discount/.test(skill.id)) {
    return {code:'percent-base',title:'Основание процента',explanation:'Проверь, от какого целого считается процент: от первоначального числа или от получившегося.',bridge:'percent-basics'};
  }
  if (/negative|sign/.test(skill.id)) {
    return {code:'negative-sign',title:'Знаки чисел',explanation:'Проверь знаки слагаемых и то, какое действие выполняется с отрицательным числом.',bridge:skill.prereq?.[0]||null};
  }
  return {code:'method-check',title:'Проверка способа',explanation:clean(skill.misconception)||'Возможно, ошибка в выборе действия или в одном из промежуточных вычислений.',bridge:skill.prereq?.[0]||null};
}

function safeExample(skill,question){
 const expr=question.text.match(/\d+\s*\/\s*\d+\s*[+−\-×÷]\s*\d+\s*\/\s*\d+/);
 return expr && skill.example.replace(/\s+/g,'').includes(expr[0].replace(/\s+/g,'')) ? 'Представь две части одного целого и подумай, как выразить их одинаковыми долями.' : skill.example;
}

export function hintFor({skill, question, level=1, mistake=null, mode='adult'}) {
  const child = mode==='student';
  const intro=child?'Разберём маленький шаг. ':'Попробуем разобраться последовательно. ';
  if (level===1) return `${intro}${mistake?.explanation||question.hint} Какой первый шаг ты выберешь?`;
  if (level===2) return `${skill.intro} Например: ${safeExample(skill,question)} Как применить это правило к текущей задаче?`;
  return `${question.hint} Попробуй выполнить только этот шаг и запиши результат в поле ответа.`;
}

export function lessonMessage({skill,question,wrongTries=0,mistake=null,mode='adult',hintLevel=0,text='',solved=false}) {
  const t=clean(text).slice(0,600);
  if (!t) return 'Напиши, на каком шаге возникла сложность. Я помогу разобрать его.';
  if (has(t,/\b(ответ|решени[ея])\b.*\b(скажи|покажи|дай)|^(скажи|дай|покажи)\s+(ответ|решение)/)) {
    if (solved||wrongTries>=3) return `${question.explain} Хочешь потренироваться на другом примере?`;
    return `Сначала попробуем один шаг, чтобы правило стало понятным. ${question.hint} Что получится?`;
  }
  if (has(t,/^(\s*[-+]?\d+([\.,]\d+)?|\s*[-+]?\d+\s*\/\s*\d+)\s*$/)) {
    return 'Похоже, ты написал числовой ответ. Введи его в поле «Твой ответ» выше — там я смогу математически проверить его.';
  }
  if (has(t,/ошиб|почему невер|неправильн|не сошлось/)) {
    if (!mistake) return `Давай сверим способ решения. ${question.hint} Как ты получил свой результат?`;
    return `${mistake.explanation} ${question.hint} Что у тебя получилось на этом шаге?`;
  }
  if (has(t,/иначе|проще|на пример|пример из жизни|представить|нагляд/)) {
    return `${safeExample(skill,question)} Это тот же принцип, только на более простых числах. Как бы ты начал текущую задачу?`;
  }
  if (has(t,/почему|зачем|правило|не понимаю|объясн|не знаю/)) {
    return `${skill.intro} ${question.hint} Какой шаг из этого правила пока непонятен?`;
  }
  if (has(t,/следующ|дальше|продолж/)) return `${question.hint} Какое число или действие должно получиться следующим?`;
  if (has(t,/помог|подсказ|застрял|сложно|не выходит/)) {
    return hintFor({skill,question,level:Math.min(3,Math.max(1,hintLevel+1)),mistake,mode});
  }
  return `Понял вопрос. ${question.hint} С какого из этих шагов начнём?`;
}

export function recordTutorMessage(session, role, text, source='local') {
  session.tutorMessages ||= [];
  session.tutorMessages.push({role,text:clean(text).slice(0,1200),source,index:session.index});
  session.tutorMessages=session.tutorMessages.slice(-16);
}

export function suggestedBridge(skill,mistake,skillIndex) {
  const id=mistake?.bridge;
  return id && id!==skill.id ? skillIndex[id]||null : null;
}
