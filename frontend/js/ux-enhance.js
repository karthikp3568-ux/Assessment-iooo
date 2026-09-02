document.addEventListener('DOMContentLoaded', function(){
  // Reveal main auth card
  const authCard = document.querySelector('.auth-card');
  if(authCard){
    authCard.classList.add('reveal-up','float-subtle');
    setTimeout(()=>authCard.classList.remove('float-subtle'), 6000); // keep subtle float limited
  }

  // Ripple effect for buttons
  document.querySelectorAll('.btn').forEach(btn=>{
    btn.addEventListener('click', function(e){
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      this.appendChild(ripple);
      setTimeout(()=> ripple.remove(), 650);
    });
  });

  // Toggle server settings box
  const toggleBtn = document.getElementById('toggleServerSettingsBtn');
  const settingsBox = document.getElementById('serverSettingsBox');
  if(toggleBtn && settingsBox){
    toggleBtn.addEventListener('click', ()=> settingsBox.classList.toggle('hidden'));
  }

  // Quick demo buttons small animation
  const qs = document.getElementById('quickStudentBtn');
  const qa = document.getElementById('quickAdminBtn');
  [qs,qa].forEach(b=>{
    if(!b) return;
    b.addEventListener('mouseenter', ()=> b.classList.add('reveal-up'));
    b.addEventListener('animationend', ()=> b.classList.remove('reveal-up'));
  });

  // Scroll reveal for elements with .reveal-on-scroll
  const observers = [];
  const revealElems = document.querySelectorAll('.reveal-on-scroll');
  if(revealElems.length){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    revealElems.forEach(el=> io.observe(el));
    observers.push(io);
  }

  // Keyboard accessibility: press Enter on quick demo buttons
  [qs,qa].forEach(b=>{ if(b) b.addEventListener('keydown', (e)=>{ if(e.key==='Enter') b.click(); }); });
});
