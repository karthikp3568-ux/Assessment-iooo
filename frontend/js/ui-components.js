// Lightweight UI utilities for AssessX
(function(window, document){
  const UI = {};

  UI.notify = function({message='',type='info',timeout=3500}={}){
    let container = document.getElementById('assessx-notifications');
    if(!container){
      container = document.createElement('div');
      container.id = 'assessx-notifications';
      container.style.position = 'fixed';
      container.style.right = '1rem';
      container.style.top = '1rem';
      container.style.zIndex = 4000;
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = 'card';
    el.style.marginBottom = '0.6rem';
    el.style.minWidth = '220px';
    el.style.padding = '0.6rem 0.9rem';
    el.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
    el.innerHTML = `<div style="font-weight:700;margin-bottom:4px">${type.toUpperCase()}</div><div style="font-size:0.9rem;color:var(--text-muted)">${message}</div>`;
    container.appendChild(el);

    setTimeout(()=>{ el.style.transition='opacity 300ms'; el.style.opacity='0'; setTimeout(()=>el.remove(),350); }, timeout);
  };

  UI.initFloatingTimer = function(timerId){
    const el = document.getElementById(timerId);
    if(!el) return;
    // placeholder API: UI.updateTimer(id, seconds)
    UI.updateTimer = function(id, seconds){
      const h = Math.floor(seconds/3600).toString().padStart(2,'0');
      const m = Math.floor((seconds%3600)/60).toString().padStart(2,'0');
      const s = Math.floor(seconds%60).toString().padStart(2,'0');
      const target = document.getElementById(id);
      if(target) target.textContent = `${h}:${m}:${s}`;
    };
  };

  UI.initSkillRadarPlaceholder = function(containerId){
    const c = document.getElementById(containerId);
    if(!c) return;
    c.innerHTML = '<div style="padding:1rem;color:var(--text-muted)">Skill radar will render here when data is available.</div>';
  };

  // Expose
  window.AssessXUI = UI;
})(window, document);
