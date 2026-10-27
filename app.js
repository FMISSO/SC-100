const A = document.querySelector('#app');
const offlineStatus = document.querySelector('#offline-status');
const progressStatus = document.querySelector('#progress-status');
let canSaveProgress = true;

function progressError(error) {
  console.error('Não foi possível acessar o progresso de estudo.', error);
  canSaveProgress = false;
  progressStatus.textContent = 'Não foi possível carregar ou salvar o progresso. Você pode estudar, mas o progresso desta sessão não será salvo. Nenhum dado anterior foi apagado.';
  progressStatus.hidden = false;
}

function loadProgress() {
  try {
    const stored = localStorage.getItem('sc100');
    if (stored !== null) {
      const state = JSON.parse(stored);
      if (!state || !['xp', 'n', 'c'].every(key => Number.isSafeInteger(state[key]) && state[key] >= 0)
          || state.c > state.n || !Array.isArray(state.seen)
          || !state.seen.every(index => Number.isInteger(index) && index >= 0 && index < DATA.lessons.length)
          || new Set(state.seen).size !== state.seen.length) {
        throw new Error('Formato de progresso inválido.');
      }
      return state;
    }
  } catch (error) {
    progressError(error);
  }
  return { xp: 0, n: 0, c: 0, seen: [] };
}

const S = loadProgress();
let Q = [], i = 0, score = 0, locked = false, fi = 0, flip = false;

function save() {
  if (!canSaveProgress) return;
  try {
    localStorage.setItem('sc100', JSON.stringify(S));
  } catch (error) {
    progressError(error);
  }
}

function render(content, view) {
  A.innerHTML = content;
  document.querySelectorAll('nav button').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  A.focus({ preventScroll: true });
}

function home() {
  render(`<div class="card"><h2>Painel</h2><div class="stats">
    <div class="stat"><b>${S.xp}</b><br>XP</div>
    <div class="stat"><b>${S.n ? Math.round(S.c / S.n * 100) : 0}%</b><br>Acertos</div>
    <div class="stat"><b>${S.seen.length}/${DATA.lessons.length}</b><br>Aulas</div>
    </div><p><a class="button" href="#aulas">Começar pelas aulas</a></p></div>
    <div class="card"><h3>Plano de 15 horas</h3><p>Blocos de 50 min + 10 min de pausa.
    Alterne aula, quiz, cards e cenário. Meta: ${DATA.lessons.length} aulas,
    ${DATA.questions.length} questões, ${DATA.flash.length} cards e ${DATA.scenarios.length} cenários.</p></div>`, 'inicio');
}

function learn() {
  render(DATA.lessons.map((lesson, index) => `<article class="card">
    <h2>${index + 1}. ${lesson[0]}</h2><p>${lesson[1]}</p>
    <a class="button" href="#aula-${index + 1}" aria-label="Abrir aula ${index + 1}: ${lesson[0]}">Abrir aula</a>
    ${S.seen.includes(index) ? '<p class="muted">Aula concluída</p>' : ''}
    </article>`).join(''), 'aulas');
}

function lesson(index) {
  if (!Number.isInteger(index) || index < 0 || index >= DATA.lessons.length) {
    console.error('Aula não encontrada:', index);
    render('<div class="card"><h2>Aula não encontrada</h2><a class="button" href="#aulas">Voltar às aulas</a></div>', 'aulas');
    return;
  }
  const [title, summary] = DATA.lessons[index];
  const completed = S.seen.includes(index);
  render(`<article class="card">
    <a href="#aulas">Voltar às aulas</a><p class="muted">Aula ${index + 1} de ${DATA.lessons.length}</p>
    <h2>${title}</h2><h3>Resumo da aula</h3><p>${summary}</p>
    <h3>Revisão ativa</h3><ol>
    <li>Explique o conceito com suas próprias palavras.</li>
    <li>Identifique um risco e como aplicaria os controles em uma arquitetura.</li>
    <li>Descreva como verificaria se esses controles estão funcionando.</li>
    </ol><button type="button" data-action="done" data-index="${index}" ${completed ? 'disabled' : ''}>
    ${completed ? 'Aula concluída' : 'Concluir aula +20 XP'}</button>
    <div class="actions">
    ${index > 0 ? `<a class="button secondary" href="#aula-${index}">Aula anterior</a>` : ''}
    ${index + 1 < DATA.lessons.length
      ? `<a class="button" href="#aula-${index + 2}">Próxima aula</a>`
      : '<a class="button" href="#aulas">Voltar à lista</a>'}
    </div></article>`, 'aulas');
}

function done(index) {
  if (!S.seen.includes(index)) {
    S.seen.push(index);
    S.xp += 20;
    save();
  }
  lesson(index);
}

function quiz() {
  Q = [...DATA.questions].sort(() => Math.random() - .5).slice(0, 10);
  i = score = 0;
  draw();
}

function draw() {
  if (i === Q.length) {
    render(`<div class="card"><h2>Resultado ${score}/${Q.length}</h2>
      <button type="button" data-action="quiz">Novo quiz</button></div>`, 'quiz');
    return;
  }
  locked = false;
  const question = Q[i];
  render(`<div class="card"><small>${question.d} • ${i + 1}/${Q.length}</small><h2>${question.q}</h2>
    ${question.o.map((option, index) => `<button type="button" class="opt" data-action="answer"
      data-index="${index}">${String.fromCharCode(65 + index)}) ${option}</button>`).join('')}
    <p id="fb" role="status"></p><button type="button" id="nx" class="hidden" data-action="next-question">Próxima</button></div>`, 'quiz');
}

function ans(index, button) {
  if (locked) return;
  locked = true;
  const question = Q[i], correct = index === question.a;
  S.n++;
  if (correct) {
    S.c++;
    S.xp += 10;
    score++;
  }
  A.querySelectorAll('.opt')[question.a].classList.add('ok');
  if (!correct) button.classList.add('bad');
  A.querySelector('#fb').innerHTML = `<b>${correct ? 'Correto' : 'Revise'}</b><br>${question.w}`;
  A.querySelector('#nx').classList.remove('hidden');
  save();
}

function cards() {
  if (fi >= DATA.flash.length) fi = 0;
  const card = DATA.flash[fi];
  render(`<div class="card"><small>${fi + 1}/${DATA.flash.length}</small>
    <button type="button" class="flash" data-action="flip" aria-label="Virar card: ${flip ? card[1] : card[0]}">
    <b>${flip ? card[1] : card[0]}</b></button><p>Toque para virar.</p>
    <button type="button" data-action="next-card">Próximo +5 XP</button></div>`, 'cards');
}

function scenario() {
  const text = DATA.scenarios[Math.floor(Math.random() * DATA.scenarios.length)];
  render(`<div class="card"><h2>Architecture Challenge</h2><p>${text}</p>
    <h3>Estruture sua resposta</h3><ol><li>Requisitos e ativos</li><li>Ameaças e riscos</li>
    <li>Controles e arquitetura</li><li>Operação e evidências</li><li>Trade-offs e risco residual</li></ol>
    <button type="button" data-action="next-scenario">Próximo +25 XP</button></div>`, 'cenario');
}

function renderRoute() {
  const route = location.hash.slice(1) || 'inicio';
  const match = /^aula-(\d+)$/.exec(route);
  if (match) {
    lesson(Number(match[1]) - 1);
    return;
  }
  switch (route) {
    case 'inicio': home(); break;
    case 'aulas': learn(); break;
    case 'quiz': quiz(); break;
    case 'cards': cards(); break;
    case 'cenario': scenario(); break;
    default:
      console.error('Página não encontrada:', route);
      render('<div class="card"><h2>Página não encontrada</h2><a class="button" href="#inicio">Voltar ao início</a></div>', '');
  }
}

document.querySelector('nav').addEventListener('click', event => {
  const button = event.target.closest('button[data-view]');
  if (!button) return;
  const hash = `#${button.dataset.view}`;
  if (location.hash === hash) renderRoute();
  else location.hash = hash;
});

A.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'done': done(Number(button.dataset.index)); break;
    case 'answer': ans(Number(button.dataset.index), button); break;
    case 'quiz': quiz(); break;
    case 'next-question': i++; draw(); break;
    case 'flip': flip = !flip; cards(); break;
    case 'next-card': fi++; flip = false; S.xp += 5; save(); cards(); break;
    case 'next-scenario': S.xp += 25; save(); scenario(); break;
  }
});

function offlineReady() {
  offlineStatus.textContent = 'Pronto para usar offline. Todas as aulas, questões e cards foram salvos neste dispositivo.';
  offlineStatus.dataset.state = 'ready';
}

function offlineError(error) {
  console.error('Não foi possível preparar o pacote offline.', error);
  offlineStatus.textContent = 'Não foi possível preparar o modo offline. Conecte-se à internet e recarregue antes de ativar o modo avião.';
  offlineStatus.dataset.state = 'error';
}

function watchWorker(worker) {
  offlineStatus.textContent = 'Salvando o conteúdo para uso offline. Aguarde antes de ativar o modo avião.';
  offlineStatus.dataset.state = 'loading';
  const checkState = () => {
    if (worker.state === 'activated' || worker.state === 'redundant') {
      worker.removeEventListener('statechange', checkState);
      if (worker.state === 'activated') offlineReady();
      else offlineError(new Error('A instalação do Service Worker falhou.'));
    }
  };
  worker.addEventListener('statechange', checkState);
  checkState();
}

async function prepareOffline() {
  if (location.protocol === 'file:') {
    offlineStatus.textContent = 'Arquivo local aberto. Para instalar o app e preparar o cache offline, abra por HTTPS ou localhost.';
    offlineStatus.dataset.state = 'error';
    return;
  }
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    offlineError(new Error('Este navegador precisa de HTTPS ou localhost e suporte a Service Worker.'));
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    registration.addEventListener('updatefound', () => {
      if (registration.installing) watchWorker(registration.installing);
    });
    const worker = registration.installing || registration.waiting || registration.active;
    if (worker) watchWorker(worker);
    else offlineError(new Error('Nenhum Service Worker disponível após o registro.'));
  } catch (error) {
    offlineError(error);
  }
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
prepareOffline();
