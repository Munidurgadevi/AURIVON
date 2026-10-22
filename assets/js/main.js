document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();
  initHeadingSplit();
  initTeamCards();
});
function initTypewriter() {
  const wrap = document.querySelector('[data-typewriter]');
  if (!wrap) return;
  const target = wrap.querySelector('.typewriter-text');
  const caret = wrap.querySelector('.typewriter-caret');
  const text = wrap.dataset.typewriter;
  const loop = wrap.dataset.loop !== 'false';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!target || reduceMotion) return; 

  const TYPE_SPEED = 85;   
  const ERASE_SPEED = 45;  
  const HOLD = 2600;        
  const PAUSE = 500;        
  let i = 0;
  let erasing = false;

  function tick() {
    if (!erasing) {
      i++;
      target.textContent = text.slice(0, i);
      if (i === text.length) {
        if (!loop) {
          if (caret) caret.classList.add('is-done'); 
          return;
        }
        erasing = true;
        return setTimeout(tick, HOLD);
      }
      return setTimeout(tick, TYPE_SPEED);
    }
    i--;
    target.textContent = text.slice(0, i);
    if (i === 0) {
      erasing = false;
      return setTimeout(tick, PAUSE);
    }
    setTimeout(tick, ERASE_SPEED);
  }

  target.textContent = '';
  setTimeout(tick, 400);
}
function initHeadingSplit() {
  document.querySelectorAll('h2').forEach(h => {
    if (h.querySelector('.h-a, .h-b')) return;
    const words = h.textContent.trim().split(/\s+/);
    if (words.length < 2) return;
    const half = Math.ceil(words.length / 2);
    const first = document.createElement('span');
    first.className = 'h-a';
    first.textContent = words.slice(0, half).join(' ');
    const second = document.createElement('span');
    second.className = 'h-b';
    second.textContent = words.slice(half).join(' ');
    h.textContent = '';
    h.append(first, ' ', second);
  });
}
function initTeamCards() {
  const members = document.querySelectorAll('.ht-member');
  if (!members.length) return;

  members.forEach(member => {
    member.addEventListener('click', () => {
      if (!window.matchMedia('(hover: none)').matches) return;
      const wasOpen = member.classList.contains('is-open');
      members.forEach(m => m.classList.remove('is-open'));
      if (!wasOpen) member.classList.add('is-open');
    });

    member.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        member.classList.toggle('is-open');
      }
    });
  });
}