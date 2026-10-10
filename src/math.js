/** Exact rational arithmetic for elementary school exercises. No eval or model grading. */
export function gcd(a,b){
  a=Math.abs(a); b=Math.abs(b);
  while (b) [a,b]=[b,a%b];
  return a||1;
}
export function simplify(n,d){
  if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d===0) return null;
  if(d<0){n=-n;d=-d;}
  const g=gcd(n,d);
  return {n:n/g,d:d/g};
}
export function parseNumber(raw){
  if(typeof raw==='number') return Number.isFinite(raw)?raw:null;
  if(typeof raw!=='string') return null;
  let s=raw.trim().replace(/\u00a0/g,' ').replace(/,/g,'.').replace(/−/g,'-');
  if(!s || s.length>80) return null;
  s=s.replace(/\s*(час(?:а|ов)?|ч\.?|минут(?:ы)?|мин\.?|тенге|тг|%|км)\s*$/i,'').trim();
  if(/^[-+]?\d+\.\d+$/.test(s)||/^[-+]?\d+$/.test(s)) return Number(s);
  const mixed=s.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if(mixed){
    const whole=Number(mixed[1]),n=Number(mixed[2]),d=Number(mixed[3]);
    return d>0&&n>=0&&Number.isSafeInteger(whole)&&Number.isSafeInteger(n)&&Number.isSafeInteger(d)?whole+(whole<0?-1:1)*n/d:null;
  }
  const fraction=s.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if(fraction){
    const n=Number(fraction[1]),d=Number(fraction[2]);
    return d!==0&&Number.isSafeInteger(n)&&Number.isSafeInteger(d)?n/d:null;
  }
  return null;
}
export function checkAnswer(input,answer,kind='number'){
  if(kind==='compare'){
    const normalized=String(input).trim().replace('≤','<=').replace('≥','>=').replace('==','=');
    return normalized===String(answer);
  }
  const x=parseNumber(input),y=parseNumber(answer);
  if(x===null||y===null) return false;
  return Math.abs(x-y)<1e-8*Math.max(1,Math.abs(y));
}
export function formatNumber(num){
  if(Number.isInteger(num))return String(num);
  return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(num);
}
export function lessonScore(attempts){
  return {correct:attempts.filter(a=>a.correct).length,total:attempts.length,withoutHints:attempts.filter(a=>a.correct&&!a.usedHint&&a.wrongTries===0).length};
}
