/** Static, escaped rendering of draft publication/legal pages. */
import {LEGAL_LINKS,legalPageById} from './legal-content.js';
import {mayEraseLocalProfile} from './user-data.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function legalLinksHTML(){
 return LEGAL_LINKS.map(item=>`<a href="#legal/${item.id}" data-legal="${item.id}">${esc(item.title)}</a>`).join('');
}
export function legalDataPanelHTML({mode='adult',account=false,choice='unset'}={}){
 const analyticsLabel=mode==='student'?'В школьном режиме продуктовые события не отправляются.':choice==='accepted'?'Разрешена':choice==='declined'?'Отключена':'Не выбрана';
 return `<section class="legal-data-controls" aria-labelledby="legal-control-heading">
 <h2 id="legal-control-heading">Действия с данными на этом устройстве</h2>
 <div class="legal-data-action"><div><h3>Экспорт профиля</h3><p>Сохранить текущий ${mode==='student'?'школьный':'взрослый'} профиль в JSON. Файл может содержать историю ответов и диалогов помощника. Не передавай его посторонним.</p></div>
 <button class="btn secondary" type="button" data-action="legal-export">Скачать прогресс</button></div>
 <div class="legal-data-action"><div><h3>Необязательная статистика</h3><p>${analyticsLabel} ${mode==='adult'?'Выбор относится к браузеру. Отказ не удаляет прошлые записи в облаке.':''}</p></div>
 ${mode==='adult'?`<button class="btn outline" type="button" data-action="legal-analytics-toggle">${choice==='accepted'?'Отозвать согласие':'Разрешить статистику'}</button>`:''}</div>
 <div class="legal-data-action"><div><h3>Удаление локального профиля</h3><p>${account?'Взрослый аккаунт подключён к облаку: локальная очистка могла бы затронуть и синхронизируемый прогресс, поэтому здесь она отключена.':'Удалить текущие учебные данные только из браузера после подтверждения. Это нельзя отменить.'}</p></div>
 <button class="btn outline" type="button" data-action="legal-erase-local" ${!mayEraseLocalProfile(mode,account)?'disabled aria-disabled="true"':''}>Очистить локально</button></div>
 <div class="legal-cloud-delete"><h3>Удаление аккаунта и облачных данных</h3>
 <p>${account?'Ты вошёл во взрослый аккаунт.':'Для управления взрослым облачным аккаунтом сначала нужно войти.'} Безопасное самостоятельное удаление пока <strong>не подключено</strong>: нельзя удалять Auth-пользователя только из браузера или имитировать запрос.</p>
 <p>Серверная функция удаления подготовлена, но не развёрнута. Официальный контакт оператора ещё должен быть назначен до широкого запуска. Не публикуй персональные сведения в открытом GitHub.</p>
 <a href="https://github.com/RadNass/Znayu/blob/main/docs/account-deletion.md" target="_blank" rel="noopener noreferrer">Техническое описание механизма удаления ↗</a></div>
 </section>`;
}
export function renderLegalPage(id,context={}){
 const doc=legalPageById(id);
 if(!doc)return '<section class="legal-empty"><h1>Документ не найден</h1><button class="btn outline" data-nav="home">На главную</button></section>';
 const blocks=doc.sections.map(section=>`<section class="legal-section"><h2>${esc(section.title)}</h2>
 ${(section.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');
 const extern=(doc.links||[]).length?`<section class="legal-section"><h2>Полезные ссылки</h2>
 <div class="legal-external">${doc.links.map(x=>`<a href="${esc(x.href)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} ↗</a>`).join('')}</div></section>`:'';
 return `<div class="legal-layout"><aside class="legal-index" aria-label="Документы Znayu">
 <strong>Информация о Znayu</strong>${LEGAL_LINKS.map(x=>`<a href="#legal/${x.id}" data-legal="${x.id}" ${x.id===doc.id?'aria-current="page"':''}>${esc(x.title)}</a>`).join('')}</aside>
 <article class="legal-paper"><div class="breadcrumbs"><button data-nav="home">Главная</button> › <span>${esc(doc.title)}</span></div>
 <span class="legal-draft-badge">ЧЕРНОВИК · ТРЕБУЕТ ПРОВЕРКИ</span><h1>${esc(doc.title)}</h1><p class="legal-summary">${esc(doc.summary)}</p>
 <div class="legal-draft-warning"><strong>Документ не утверждён.</strong> Оператор, адрес обращений, размещение данных и права на материалы уточняются. Это не окончательное юридическое соглашение или гарантия соответствия законодательству.</div>
 ${blocks}${extern}${doc.id==='data'?legalDataPanelHTML(context):''}
 <div class="legal-last">Редакция для обсуждения: 15 октября 2026 года. Финальная версия будет опубликована после подтверждения данных оператора и юридической проверки.</div>
 </article></div>`;
}
