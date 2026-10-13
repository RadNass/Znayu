/** Mathematical frontiers — real open problems, not auto-graded exercises.
 * Sources: Clay Mathematics Institute and Wolfram MathWorld (status reviewed 2026-10-13).
 */
export const GENIUS_PROBLEMS=Object.freeze([
 {id:'collatz',title:'Гипотеза Коллатца',label:'Простая формулировка · трудное доказательство',
  question:'Возьми любое натуральное число. Если оно чётное — раздели на 2. Если нечётное — умножь на 3 и прибавь 1. Обязательно ли последовательность когда-нибудь придёт к 1?',
  intro:'Правило помещается в одну строчку, но общего доказательства для всех положительных целых чисел до сих пор нет.',
  example:'Например: 7 → 22 → 11 → 34 → 17 → … → 1.',
  source:'https://mathworld.wolfram.com/CollatzConjecture.html',sourceLabel:'Wolfram MathWorld',tag:'Теория чисел'},
 {id:'goldbach',title:'Гипотеза Гольдбаха',label:'Сумма двух простых',
  question:'Можно ли любое чётное целое число больше 2 представить как сумму двух простых чисел?',
  intro:'На множестве отдельных примеров всё получается, но проверка сколь угодно большого конечного диапазона не заменяет доказательства для всех чисел.',
  example:'28 = 5 + 23; 100 = 47 + 53.',
  source:'https://mathworld.wolfram.com/GoldbachConjecture.html',sourceLabel:'Wolfram MathWorld',tag:'Теория чисел'},
 {id:'twin-primes',title:'Простые числа-близнецы',label:'Бесконечные пары',
  question:'Существует ли бесконечно много пар простых чисел, расстояние между которыми ровно 2?',
  intro:'Такие пары встречаются среди известных чисел. Но никто пока не доказал, что они не закончатся никогда.',
  example:'Примеры пар: (3, 5), (11, 13), (17, 19).',
  source:'https://mathworld.wolfram.com/TwinPrimeConjecture.html',sourceLabel:'Wolfram MathWorld',tag:'Теория чисел'},
 {id:'riemann',title:'Гипотеза Римана',label:'Задача тысячелетия',
  question:'Лежат ли все нетривиальные нули дзета-функции Римана на прямой с действительной частью 1/2?',
  intro:'Глубокая проблема о том, как распределены простые числа. Для понимания строгой формулировки потребуется комплексный анализ.',
  example:'Не обычное уравнение из школы: здесь исследуется дзета-функция ζ(s) для комплексных аргументов.',
  source:'https://www.claymath.org/millennium/riemann-hypothesis/',sourceLabel:'Clay Mathematics Institute',tag:'Анализ'},
 {id:'p-np',title:'P против NP',label:'Задача тысячелетия',
  question:'Если правильность решения можно быстро проверить, всегда ли само решение можно быстро найти? Иными словами: верно ли P = NP?',
  intro:'Одна из главных загадок теоретической информатики. «Быстро» здесь означает полиномиальное время вычислений.',
  example:'Проверить готовый маршрут через множество городов легче, чем найти подходящий маршрут для огромного набора условий.',
  source:'https://www.claymath.org/millennium/p-vs-np/',sourceLabel:'Clay Mathematics Institute',tag:'Алгоритмы'},
 {id:'bsd',title:'Гипотеза Бёрча — Свиннертон-Дайера',label:'Задача тысячелетия',
  question:'Как связаны количество независимых рациональных точек эллиптической кривой и поведение её L-функции при s = 1?',
  intro:'Проблема связывает алгебраические кривые, рациональные решения и теорию чисел. Здесь не хватит даже университетского базового курса.',
  example:'Речь не о простом поиске одного значения x: нужно установить общее математическое соответствие.',
  source:'https://www.claymath.org/millennium/birch-and-swinnerton-dyer-conjecture/',sourceLabel:'Clay Mathematics Institute',tag:'Теория чисел'}
]);
export function collatzExplore(raw,limit=500){
 const n=Number(raw);
 if(!Number.isSafeInteger(n)||n<1||n>100000)throw Error('Введи целое число от 1 до 100 000.');
 let current=n;
 const sequence=[current];
 for(let step=0;step<limit&&current!==1;step++){
  const next=current%2===0?current/2:3*current+1;
  if(!Number.isSafeInteger(next))return {sequence,finished:false,steps:step,reason:'Превышен безопасный диапазон вычислений.'};
  current=next;sequence.push(current);
 }
 return {sequence,finished:current===1,steps:sequence.length-1};
}
function isPrime(n){
 if(n<2||!Number.isSafeInteger(n))return false;
 for(let d=2;d*d<=n;d++)if(n%d===0)return false;
 return true;
}
export function goldbachExplore(raw){
 const n=Number(raw);
 if(!Number.isSafeInteger(n)||n<4||n>100000||n%2!==0)throw Error('Введи чётное целое число от 4 до 100 000.');
 for(let a=2;a<=n/2;a++)if(isPrime(a)&&isPrime(n-a))return {n,a,b:n-a,found:true};
 return {n,found:false};
}
