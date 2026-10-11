/** Formats elementary fractional notation without interpreting HTML or running scripts. */
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatMathText(value) {
 const source=String(value??'');
 const fraction=/(-?\d{1,5})\s*\/\s*(\d{1,5})/g;
 let result='',offset=0,match;
 while((match=fraction.exec(source))!==null){
  const start=match.index,end=start+match[0].length;
  const previous=source[start-1]||'',next=source[end]||'';
  // Do not format pieces of URLs, dates, or longer slash-separated strings.
  if(/[\w\/:]/.test(previous)||/[\w\/]/.test(next))continue;
  result+=esc(source.slice(offset,start));
  result+=`<span class="math-frac" role="math" aria-label="${esc(match[1])} из ${esc(match[2])}"><span class="math-num">${esc(match[1])}</span><span class="math-den">${esc(match[2])}</span></span>`;
  offset=end;
 }
 return result+esc(source.slice(offset));
}
