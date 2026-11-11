(() => {
  const books = window.FRIENDLY_BOOKS;
  const byId = new Map(books.map(book => [book.id, book]));
  const categories = {stories:'Story time', imagination:'Magic & imagination', animals:'Animal friends', community:'Our community', explore:'Let\u2019s explore'};
  const places = {
    university:{title:'The tower that came first',eyebrow:'At the heart of RoboTown',text:'A big university tower once stood in a small town. Over the ages, the city grew up around it. New streets rose above old ones, and the small town became RoboTown. The tower still watches over it all.',extra:'Far in Earth\u2019s future, long after the humans have left, the robots care for the planet as a sanctuary. And right in the middle of their city, a giant park keeps growing.',icon:'tower'},
    duckies:{title:'Hello, roboduckies!',eyebrow:'Little friends. An important job.',text:'Those little yellow duckies are robots too! They paddle around the park\u2019s pond, helping to keep the water clean.',extra:'RoboTown is their home. Earth is their sanctuary. Even the smallest friends have a part in caring for it.',icon:'duck'},
    park:{title:'A great big green heart',eyebrow:'The park in the middle of everything',text:'Old streets and new skyways wind around a giant park. There are trees to sit beneath, paths to wander, and water full of busy little roboduckies.',extra:'The robots watch over Earth, giving its living things room to grow.',icon:'park'}
  };
  const esc = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const cover = (book,lazy=true) => `<img src="${esc(book.image)}" alt="${esc(book.title)} - book cover" ${lazy?'loading="lazy"':''}>`;
  document.querySelector('#new-grid').innerHTML = books.slice(0,2).map(book => `<article class="new-book" style="--book-color:${book.color}"><button class="new-cover" data-book="${book.id}" aria-label="Take a peek at ${esc(book.title)}">${cover(book)}</button><div class="new-copy"><span class="tag">${book.badge}</span><h3>${esc(book.short)}</h3><p class="subtitle">${esc(book.subtitle)}</p><p class="description">${esc(book.description)}</p><button class="text-button" data-book="${book.id}">Take a peek &#8599;</button></div></article>`).join('');
  document.querySelector('#book-grid').innerHTML = books.map(book => `<article class="book-card" data-categories="${book.categories.join(' ')}"><button class="book-image" style="--book-color:${book.color}" data-book="${book.id}" aria-label="Take a peek at ${esc(book.title)}">${cover(book)}</button><span class="book-category">${book.categories.map(c=>esc(categories[c])).join(' &middot; ')}</span><h3><button data-book="${book.id}">${esc(book.short)}</button></h3><p class="subtitle">${esc(book.subtitle)}</p></article>`).join('');
  const dialog=document.querySelector('#book-dialog');
  let opener=null;
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-book],[data-place]');
    if(!target)return;
    opener=target;
    const content=document.querySelector('#dialog-content');
    if(target.dataset.book){
      const book=byId.get(target.dataset.book);if(!book)return;
      content.innerHTML=`<div class="dialog-layout" style="--book-color:${book.color}"><div class="dialog-art">${cover(book,false)}</div><div class="dialog-copy"><span class="tag">${book.categories.map(c=>esc(categories[c])).join(' &middot; ')}</span><h2 id="dialog-title">${esc(book.title)}</h2><p>${esc(book.description)}</p><a class="button" href="${esc(book.url)}" target="_blank" rel="noopener sponsored">Find this book on Amazon &#8599;</a><small>Opens Amazon in a new tab. Ask a grown-up to join you. As an Amazon Associate I earn from qualifying purchases.</small></div></div>`;
    }else{
      const place=places[target.dataset.place];if(!place)return;
      const symbols={tower:'&#8962;',duck:'&#129414;',park:'&#10047;'};
      content.innerHTML=`<div class="place-story ${place.icon}"><div class="place-symbol" aria-hidden="true">${symbols[place.icon]}</div><span class="tag">${esc(place.eyebrow)}</span><h2 id="dialog-title">${esc(place.title)}</h2><p>${esc(place.text)}</p><p>${esc(place.extra)}</p><button class="button gold close-place">Keep exploring &#8594;</button></div>`;
    }
    dialog.showModal();
  });
  dialog.addEventListener('click',event=>{if(event.target.closest('.dialog-close,.close-place')){dialog.close();return;}if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>opener?.focus());
  const filterStatus=document.querySelector('#filter-status');
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    const filter=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    let count=0;
    document.querySelectorAll('[data-categories]').forEach(card=>{card.hidden=filter!=='all'&&!card.dataset.categories.split(' ').includes(filter);if(!card.hidden)count++;});
    filterStatus.textContent=`${count} ${count===1?'adventure':'adventures'} to explore.`;
  }));
  const nightButton=document.querySelector('#night-toggle');
  nightButton.addEventListener('click',()=>{const on=document.body.classList.toggle('night');nightButton.setAttribute('aria-pressed',String(on));nightButton.textContent=on?'Bring back the sunshine \u2600':'Make it twilight \u263e';});
  const motionButton=document.querySelector('#motion-toggle');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setMotion=paused=>{document.body.classList.toggle('pause-motion',paused);motionButton.setAttribute('aria-pressed',String(paused));motionButton.textContent=paused?'Let the magic move':'Pause the magic';};
  setMotion(reduced);motionButton.addEventListener('click',()=>setMotion(!document.body.classList.contains('pause-motion')));
  const fireflies=document.querySelector('.fireflies');
  for(let i=0;i<16;i++){const dot=document.createElement('i');dot.style.cssText=`--x:${8+i*5.7}%;--y:${40+(i*17)%55}%;--delay:${-(i*0.67)}s`;fireflies.append(dot);}
  let found=0,toastTimer;
  document.querySelectorAll('.tiny-star').forEach(star=>star.addEventListener('click',()=>{
    if(star.classList.contains('found'))return;
    found++;star.classList.add('found');star.disabled=true;
    const toast=document.querySelector('.toast');toast.textContent=['You found a little wonder! \u2726','Another tiny wonder, just for you. \u2726','Three little wonders. A whole world still to explore. \u2726'][found-1];
    document.querySelector('#star-note').textContent=found===3?'You found all three little wonders. \u2726':`${found} little ${found===1?'wonder found':'wonders found'}. Keep looking\u2026`;
    toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),4200);
  }));
})();
