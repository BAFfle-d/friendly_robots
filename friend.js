(() => {
  // Make a robot friend: a coloring page that wakes up, then lives in RoboTown.
  const KEY='friendly-robots-friend';
  const esc=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pick=list=>list[Math.floor(Math.random()*list.length)];
  const still=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('pause-motion');
  const star=(x,y,R,r)=>Array.from({length:10},(_,i)=>{const a=Math.PI*i/5-Math.PI/2,d=i%2?r:R;return `${(x+d*Math.cos(a)).toFixed(1)},${(y+d*Math.sin(a)).toFixed(1)}`;}).join(' ');
  const tube=(d,focus='')=>`<path class="tube-out" data-region="limbs" d="${d}"/><path class="tube" data-region="limbs"${focus} d="${d}"/>`;
  const eye=(x,y,r,p)=>`<circle class="white" cx="${x}" cy="${y}" r="${r}"/><g class="pupils"><circle class="pupil" cx="${x}" cy="${y+1}" r="${p}"/><circle class="shine" cx="${x+p*.42}" cy="${y-p*.3}" r="${p*.36}"/></g>`;
  const ART={
    antenna:{
      ball:`<path class="ln" d="M100 54V25"/><circle class="r-glow" cx="100" cy="18" r="9"/>`,
      heart:`<path class="ln" d="M100 54V27"/><path class="r-glow" d="M100 29C87 21 84 10 91 5c4-3 8-1 9 3c1-4 5-6 9-3c7 5 4 16-9 24Z"/>`,
      star:`<path class="ln" d="M100 54V28"/><polygon class="r-glow" points="${star(100,17,14,6.5)}"/>`,
      bunny:`<path class="ln" d="M88 56 75 24M112 56l13-32"/><circle class="r-glow" cx="73" cy="18" r="8"/><circle class="r-glow" cx="127" cy="18" r="8"/>`,
      propeller:`<path class="ln" d="M100 54V22"/><g class="prop"><path class="r-glow" d="M100 19c-9-6-25-7-25 0s16 6 25 0c9 6 25 7 25 0s-16-6-25 0Z"/></g><circle class="r-trim" data-region="trim" cx="100" cy="19" r="4.5"/>`
    },
    head:{
      boxy:`<rect class="r-trim" data-region="trim" x="33" y="72" width="17" height="28" rx="6"/><rect class="r-trim" data-region="trim" x="150" y="72" width="17" height="28" rx="6"/><rect class="r-head" data-focus="head" x="45" y="46" width="110" height="78" rx="26"/><path class="glare" d="M60 66q3-8 13-10"/>`,
      round:`<circle class="r-trim" data-region="trim" cx="49" cy="86" r="11"/><circle class="r-trim" data-region="trim" cx="151" cy="86" r="11"/><ellipse class="r-head" data-focus="head" cx="100" cy="86" rx="53" ry="43"/><path class="glare" d="M63 70q5-12 17-16"/>`,
      dome:`<path class="r-head" data-focus="head" d="M47 112V94c0-31 23-50 53-50s53 19 53 50v18q0 12-12 12H59q-12 0-12-12Z"/><circle class="r-trim" data-region="trim" cx="47" cy="102" r="6.5"/><circle class="r-trim" data-region="trim" cx="153" cy="102" r="6.5"/><path class="glare" d="M60 76q6-16 22-22"/>`,
      tv:`<circle class="r-trim" data-region="trim" cx="34" cy="88" r="8"/><circle class="r-trim" data-region="trim" cx="166" cy="88" r="8"/><rect class="r-head" data-focus="head" x="38" y="52" width="124" height="72" rx="17"/><rect class="screen" x="49" y="62" width="102" height="52" rx="11"/><path class="glare" d="M57 72q2-4 7-5"/>`
    },
    eyes:{
      dots:eye(78,84,12,6.5)+eye(122,84,12,6.5),
      sparkle:eye(78,83,15,9.5)+eye(122,83,15,9.5)+`<circle class="shine" cx="74.5" cy="88" r="2"/><circle class="shine" cx="118.5" cy="88" r="2"/>`,
      happy:`<path class="ln thick" d="M66 89q12-15 24 0M110 89q12-15 24 0"/>`,
      visor:`<rect class="r-glow" data-region="glow" x="58" y="70" width="84" height="28" rx="14"/><g class="pupils"><circle class="pupil" cx="82" cy="84" r="6.5"/><circle class="pupil" cx="118" cy="84" r="6.5"/><circle class="shine" cx="84.5" cy="81.5" r="2.2"/><circle class="shine" cx="120.5" cy="81.5" r="2.2"/></g>`,
      wink:eye(78,84,12,6.5)+`<path class="ln thick" d="M110 87q12-12 24 0"/>`
    },
    mouth:{
      smile:`<path class="ln thick" d="M84 105q16 13 32 0"/>`,
      grin:`<path class="mouth" d="M82 102h36q-2 18-18 18q-16 0-18-18Z"/><path class="tongue" d="M90 114q10-7 20 0q-4 5-10 5t-10-5Z"/>`,
      oh:`<ellipse class="mouth" cx="100" cy="108" rx="7" ry="8.5"/>`,
      grille:`<rect class="white" x="80" y="100" width="40" height="15" rx="6"/><path class="ln" d="M90 101v13M100 101v13M110 101v13"/>`,
      cat:`<path class="ln thick" d="M85 104q7.5 9 15 0q7.5 9 15 0"/>`
    },
    body:{
      box:`<rect class="r-body" data-focus="body" x="56" y="132" width="88" height="76" rx="22"/>`,
      pill:`<rect class="r-body" data-focus="body" x="57" y="130" width="86" height="80" rx="38"/>`,
      bell:`<path class="r-body" data-focus="body" d="M70 132h60q12 0 14 12l8 48q2 14-12 14H60q-14 0-12-14l8-48q2-12 14-12Z"/>`
    },
    chest:{
      heart:`<path class="r-glow" data-focus="glow" d="M100 186c-16-10-21-22-13-29c5-4 11-2 13 3c2-5 8-7 13-3c8 7 3 19-13 29Z"/>`,
      gear:`<circle class="teeth" cx="100" cy="170" r="16"/><circle class="r-glow" data-focus="glow" cx="100" cy="170" r="12"/><circle class="white" cx="100" cy="170" r="4.5"/>`,
      star:`<polygon class="r-glow" data-focus="glow" points="${star(100,170,17,7.5)}"/>`,
      panel:`<rect class="white" x="78" y="156" width="44" height="28" rx="8"/><circle class="r-glow" data-focus="glow" cx="89" cy="170" r="5"/><circle class="dot-g" cx="100" cy="170" r="5"/><circle class="dot-y" cx="111" cy="170" r="5"/>`,
      bolt:`<path class="r-glow" data-focus="glow" d="M106 150 88 173h12l-5 18 19-25h-12Z"/>`
    },
    moves:{
      feet:`${tube('M82 206v25')}${tube('M118 206v25')}<ellipse class="r-trim" cx="78" cy="238" rx="18" ry="9"/><ellipse class="r-trim" cx="122" cy="238" rx="18" ry="9"/>`,
      wheel:`${tube('M100 206v18')}<g class="wheel"><circle class="r-trim" cx="100" cy="236" r="23"/><path class="ln" d="M100 216v40M80 236h40M86 222l28 28M114 222l-28 28"/><circle class="white" cx="100" cy="236" r="7"/></g>`,
      hover:`<g class="flame"><path class="fire" d="M80 222h12q0 13-6 24q-6-11-6-24Z"/><path class="fire" d="M108 222h12q0 13-6 24q-6-11-6-24Z"/><path class="fire-in" d="M83 224h6q0 7-3 13q-3-6-3-13ZM111 224h6q0 7-3 13q-3-6-3-13Z"/></g><path class="r-trim" d="M64 202h72l-11 22H75Z"/>`,
      spring:`<path class="tube-out spring" data-region="limbs" d="M100 205l-15 7 30 8-30 8 30 8-15 5"/><path class="tube spring" data-region="limbs" d="M100 205l-15 7 30 8-30 8 30 8-15 5"/><rect class="r-trim" x="76" y="243" width="48" height="12" rx="6"/>`
    }
  };
  const ARMS=`<g class="arm-l">${tube('M62 150c-16 4-24 16-27 34',' data-focus="limbs"')}<circle class="r-limbs" cx="34" cy="189" r="10"/></g><g class="arm-r">${tube('M138 150c16 4 24 16 27 34')}<circle class="r-limbs" cx="166" cy="189" r="10"/></g>`;
  const PARTS=[
    {id:'head',label:'Head',view:'22 38 156 92',options:[['boxy','Boxy'],['round','Round'],['dome','Dome'],['tv','TV']]},
    {id:'eyes',label:'Eyes',view:'52 62 96 46',options:[['dots','Bright'],['sparkle','Sparkly'],['happy','Happy'],['visor','Visor'],['wink','Winky']]},
    {id:'mouth',label:'Smile',view:'62 94 76 30',options:[['smile','Smile'],['grin','Big grin'],['oh','Oh!'],['grille','Speaker'],['cat','Kitty']]},
    {id:'antenna',label:'Antenna',view:'50 0 100 62',options:[['ball','Light'],['heart','Heart'],['star','Star'],['bunny','Bunny'],['propeller','Propeller']]},
    {id:'body',label:'Body',view:'20 112 160 104',options:[['box','Boxy'],['pill','Roly-poly'],['bell','Sturdy']]},
    {id:'chest',label:'Heart',view:'68 144 64 52',options:[['heart','Heart'],['gear','Gear'],['star','Star'],['panel','Buttons'],['bolt','Zap']]},
    {id:'moves',label:'Moves',view:'40 198 120 64',options:[['feet','Feet'],['wheel','One wheel'],['hover','Hover jets'],['spring','Springy']]}
  ];
  const REGIONS={head:'head',body:'body',limbs:'arms and legs',trim:'little bits',glow:'glowing lights'};
  const CRAYONS=[['#ffcf00','Sunny yellow'],['#ff8a19','Tangerine'],['#f6286d','Robo pink'],['#ffa3d1','Bubblegum'],['#8a32f2','Grape'],['#2364ee','Ocean blue'],['#45cbff','Sky blue'],['#00c4a7','Pond teal'],['#27ce47','Leaf green'],['#c9d2e3','Silver'],['#9a6a43','Cocoa'],['#ffffff','Cloud white']];
  const NAMES=['Pip','Sprocket','Juniper','Bolt','Nova','Biscuit','Tink','Pixel','Momo','Clementine','Gizmo','Lumi','Waffles','Ziggy','Pebble','Rivet','Dot','Bloop','Marigold','Beep'];
  const TRAITS={
    friendly:{label:'Being friendly',line:'I want to say hello to every robot in RoboTown. That’s a lot of hellos!'},
    giving:{label:'Being giving',line:'I’m going to help the roboduckies keep the pond sparkly clean.'},
    kind:{label:'Being kind',line:'If someone feels sad, I’ll sit with them until they feel better.'},
    you:{label:'Being me',line:'There’s only one me in the whole wide world. And only one you!'}
  };
  const WHITE={head:'#ffffff',body:'#ffffff',limbs:'#ffffff',trim:'#ffffff',glow:'#ffffff'};
  const blank=()=>({head:'boxy',eyes:'dots',mouth:'smile',antenna:'ball',body:'box',chest:'heart',moves:'feet',colors:{...WHITE},name:'',trait:'kind'});
  const clean=raw=>{
    const f=blank();if(!raw||typeof raw!=='object')return null;
    PARTS.forEach(p=>{if(p.options.some(o=>o[0]===raw[p.id]))f[p.id]=raw[p.id];});
    Object.keys(WHITE).forEach(r=>{const c=raw.colors&&raw.colors[r];if(/^#[0-9a-f]{6}$/i.test(c))f.colors[r]=c;});
    f.name=typeof raw.name==='string'?raw.name.trim().slice(0,14):'';
    if(TRAITS[raw.trait])f.trait=raw.trait;
    return f.name?f:null;
  };
  const load=()=>{try{return clean(JSON.parse(localStorage.getItem(KEY)));}catch{return null;}};
  const store=f=>{try{localStorage.setItem(KEY,JSON.stringify(f));}catch{}};
  const copy=f=>({...f,colors:{...f.colors}});
  const robotSVG=(f,{view='0 0 200 264',cls=''}={})=>{
    const c=f.colors;
    return `<svg class="robot moves-${f.moves} ${cls}" viewBox="${view}" style="--head:${c.head};--body:${c.body};--limbs:${c.limbs};--trim:${c.trim};--glow:${c.glow}" aria-hidden="true"><g class="bot"><g data-region="glow">${ART.antenna[f.antenna]}</g><g data-region="limbs">${ARMS}</g><g data-region="trim">${ART.moves[f.moves]}</g><rect class="r-trim" data-region="trim" data-focus="trim" x="86" y="114" width="28" height="22" rx="6"/><g data-region="body">${ART.body[f.body]}<g data-region="glow">${ART.chest[f.chest]}</g></g><g data-region="head">${ART.head[f.head]}<g class="blink">${ART.eyes[f.eyes]}</g>${ART.mouth[f.mouth]}<circle class="cheek" cx="61" cy="103" r="7"/><circle class="cheek" cx="139" cy="103" r="7"/></g></g></svg>`;
  };
  const say=(bubble,html,ms=4200)=>{bubble.innerHTML=html;bubble.classList.add('show');clearTimeout(bubble.timer);if(ms)bubble.timer=setTimeout(()=>bubble.classList.remove('show'),ms);};
  const SPARKS=['#ffe23b','#ffffff','#ff7ab0','#7fe7ff','#b98cff'];
  const burst=(host,x,y,count=12,spread=80)=>{
    if(still())return;
    for(let i=0;i<count;i++){
      const s=document.createElement('span'),a=Math.random()*Math.PI*2,d=spread*(.35+Math.random()*.75);
      s.className='spark';s.textContent='✦';s.style.cssText=`left:${x}px;top:${y}px;color:${pick(SPARKS)};font-size:${10+Math.random()*16}px`;
      host.append(s);
      s.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:`translate(calc(-50% + ${(Math.cos(a)*d).toFixed(1)}px),calc(-50% + ${(Math.sin(a)*d).toFixed(1)}px)) scale(1) rotate(${Math.round(Math.random()*180)}deg)`,opacity:0}],{duration:650+Math.random()*550,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>s.remove();
    }
  };

  // The workshop.
  let friend=load(),draft=friend?copy(friend):blank(),crayon=null,tab='head',talkTimer;
  const $=sel=>document.querySelector(sel);
  const pad=$('#maker-pad'),stage=$('#maker-robot'),makerBubble=$('#maker-bubble'),hint=$('#maker-hint'),nameInput=$('#robot-name'),wakeButton=$('#wake-button');
  const crayonCursor=color=>`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g transform='rotate(-40 16 16)' stroke='#152a84' stroke-width='1.6' stroke-linejoin='round'><path d='M16 1l5 9H11z' fill='${color}'/><rect x='11' y='10' width='10' height='21' rx='2' fill='${color}'/><rect x='11' y='15' width='10' height='9' fill='#ffffff90'/></g></svg>`)}") 6 4, pointer`;
  const drawMaker=(extra='')=>{
    stage.innerHTML=robotSVG(draft,{cls:`tracks ${extra}`});
    stage.querySelectorAll('[data-focus]').forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',`Color the ${REGIONS[el.dataset.focus]}`);});
    stage.style.cursor=crayon?crayonCursor(crayon[0]):'';
  };
  const drawOptions=()=>{
    $('#part-tabs').innerHTML=PARTS.map(p=>`<button type="button" role="tab" aria-selected="${p.id===tab}" aria-controls="part-options" data-tab="${p.id}">${p.label}</button>`).join('');
    const part=PARTS.find(p=>p.id===tab);
    $('#part-options').innerHTML=part.options.map(([id,label])=>`<button type="button" aria-pressed="${draft[tab]===id}" data-option="${id}">${robotSVG({...draft,[tab]:id},{view:part.view})}<span>${label}</span></button>`).join('');
  };
  const drawWake=()=>{const n=draft.name.trim();wakeButton.textContent=friend?`Save ${n||friend.name}’s new look ✦`:n?`Wake up, ${n}! ✦`:'Wake up! ✦';};
  const boop=()=>{const bot=stage.querySelector('.robot');bot.classList.remove('boop');void bot.getBoundingClientRect();bot.classList.add('boop');};
  $('#crayons').innerHTML=CRAYONS.map(([color,label])=>`<button type="button" class="crayon" role="radio" aria-checked="false" aria-label="${label} crayon" data-color="${color}" title="${label}"><svg viewBox="0 0 26 74" aria-hidden="true"><path d="M13 2 22 22H4Z" fill="${color}"/><rect x="4" y="21" width="18" height="51" rx="3" fill="${color}"/><path d="M4 32h18M4 58h18" stroke-width="1.5"/><rect class="band" x="4" y="36" width="18" height="18"/></svg></button>`).join('');
  $('#traits').innerHTML=Object.entries(TRAITS).map(([id,t])=>`<button type="button" role="radio" aria-checked="${draft.trait===id}" data-trait="${id}">${t.label}</button>`).join('');
  nameInput.value=draft.name;

  document.querySelector('#crayons').addEventListener('click',event=>{
    const button=event.target.closest('.crayon');if(!button)return;
    const same=crayon&&crayon[0]===button.dataset.color;
    crayon=same?null:CRAYONS.find(c=>c[0]===button.dataset.color);
    document.querySelectorAll('.crayon').forEach(b=>b.setAttribute('aria-checked',String(!same&&b===button)));
    hint.textContent=crayon?`${crayon[1]}! Now tap any part of your robot.`:'Pick a crayon, then tap your robot to color it in.';
    stage.style.cursor=crayon?crayonCursor(crayon[0]):'';
  });
  const colorAt=(target,x,y)=>{
    const region=target.closest('[data-region]')?.dataset.region;
    if(!region)return;
    if(!crayon){
      boop();say(makerBubble,friend?'Hee hee, that tickles!':'Hee hee, that tickles! Pick a crayon and color me in.',2600);return;
    }
    draft.colors[region]=crayon[0];
    drawMaker(friend?'awake':'');drawOptions();boop();
    const r=pad.getBoundingClientRect();burst(pad,x-r.left,y-r.top,5,34);
    hint.textContent=`You colored the ${REGIONS[region]} ${crayon[1].toLowerCase()}. Keep going!`;
  };
  stage.addEventListener('click',event=>colorAt(event.target,event.clientX,event.clientY));
  stage.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key)||!event.target.dataset.focus)return;
    event.preventDefault();const r=event.target.getBoundingClientRect();colorAt(event.target,r.left+r.width/2,r.top+r.height/2);
    stage.querySelector(`[data-focus="${event.target.dataset.focus}"]`)?.focus();
  });
  $('#part-tabs').addEventListener('click',event=>{const b=event.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;drawOptions();$('#part-options button[aria-pressed=true]')?.focus();});
  $('#part-options').addEventListener('click',event=>{const b=event.target.closest('[data-option]');if(!b)return;draft[tab]=b.dataset.option;drawMaker(friend?'awake':'');drawOptions();boop();$(`#part-options [data-option="${b.dataset.option}"]`)?.focus();});
  $('#traits').addEventListener('click',event=>{const b=event.target.closest('[data-trait]');if(!b)return;draft.trait=b.dataset.trait;document.querySelectorAll('[data-trait]').forEach(t=>t.setAttribute('aria-checked',String(t===b)));});
  nameInput.addEventListener('input',()=>{draft.name=nameInput.value.slice(0,14);drawWake();});
  $('#name-dice').addEventListener('click',()=>{draft.name=pick(NAMES.filter(n=>n!==draft.name));nameInput.value=draft.name;drawWake();});
  $('#surprise').addEventListener('click',()=>{
    PARTS.forEach(p=>{draft[p.id]=pick(p.options)[0];});
    Object.keys(WHITE).forEach(r=>{draft.colors[r]=pick(CRAYONS)[0];});
    if(!draft.name.trim()){draft.name=pick(NAMES);nameInput.value=draft.name;}
    drawMaker(friend?'awake':'');drawOptions();drawWake();boop();
    const r=pad.getBoundingClientRect();burst(pad,r.width/2,r.height/2,10,r.width*.4);
  });
  $('#start-fresh').addEventListener('click',()=>{draft={...blank(),name:draft.name,trait:draft.trait};drawMaker();drawOptions();drawWake();boop();hint.textContent='A fresh coloring page! Pick a crayon to begin.';});

  const done=$('#maker-done'),build=$('#maker-build');
  const showDone=()=>{
    const n=esc(friend.name);
    done.innerHTML=`<span class="tag">A NEW FRIEND FOR ROBOTOWN</span><h3>${n} is awake!</h3><p>Every robot in RoboTown has a home. ${n}’s home is in the park, right by the roboduckies.</p><div class="done-actions"><button type="button" class="button gold" id="send-home">Send ${n} home to RoboTown <span aria-hidden="true">↑</span></button><button type="button" class="button outline" id="print-friend">Print ${n} to color <span aria-hidden="true">✎</span></button></div><button type="button" class="text-button" id="keep-tinkering">Keep tinkering</button>`;
    build.hidden=true;done.hidden=false;done.querySelector('#send-home').focus({preventScroll:true});
  };
  done.addEventListener('click',event=>{
    if(event.target.closest('#keep-tinkering')){done.hidden=true;build.hidden=false;drawWake();nameInput.focus();}
    if(event.target.closest('#send-home'))sendHome();
    if(event.target.closest('#print-friend'))printFriend();
  });
  wakeButton.addEventListener('click',()=>{
    if(!draft.name.trim()){draft.name=pick(NAMES);nameInput.value=draft.name;}
    const first=!friend;
    friend=copy(draft);friend.name=friend.name.trim();store(friend);
    drawMaker('awake waving');boop();
    const r=pad.getBoundingClientRect();burst(pad,r.width/2,r.height*.42,24,r.width*.6);
    const white=Object.values(friend.colors).every(c=>c==='#ffffff');
    say(makerBubble,first?`Hi! I’m <b>${esc(friend.name)}</b>! Thank you for making me.`:'Ta-da! I love my new look!',0);
    clearTimeout(talkTimer);talkTimer=setTimeout(()=>say(makerBubble,white?'I’m white like a fresh coloring page. I like me just the way I am!':TRAITS[friend.trait].line,6000),2700);
    hint.textContent=`${friend.name} is awake! You can recolor them any time.`;
    showDone();drawHero();
  });

  // RoboTown: the friend who waits in the hero.
  const heroWrap=$('#hero-friend-wrap'),heroButton=$('#hero-friend'),heroBubble=$('#hero-bubble'),friendLine=$('#friend-line');
  let chat=0;
  const drawHero=()=>{
    heroButton.innerHTML=robotSVG(friend||blank(),{cls:`tracks ${friend?'awake':'asleep'}`});
    heroWrap.classList.toggle('sleeping',!friend);heroWrap.hidden=false;
    heroButton.setAttribute('aria-label',friend?`${friend.name}, your robot friend. Say hello.`:'A sleeping robot, waiting for a friend. Say hello.');
    friendLine.textContent=friend?`And ${friend.name}, waiting for you.`:'And a friend waiting for you.';
  };
  const chatter=()=>{
    const h=new Date().getHours(),starsLeft=document.querySelectorAll('.tiny-star:not(.found)').length;
    const time=h<5||h>=21?'It’s getting late. Robots recharge at night, and friends need their sleep too.':h<12?'Good morning! The roboduckies are already out paddling.':h<17?'Good afternoon! I was just helping water the flowers.':'The tower lights come on soon. It’s my favorite time of day.';
    return [time,TRAITS[friend.trait].line,'Thank you for making me. You’re a wonderful builder.',starsLeft?'Psst… I saw tiny stars hiding around here. Can you find them?':'You found every hidden star! You’re a real RoboTown explorer.','Have you met the RoboPets yet? I heard one of them is a dinosaur!','Be friendly. Be giving. Be kind. Be you. That’s the RoboTown way.','I’m the only robot in RoboTown who looks exactly like me. Just like you!'];
  };
  heroButton.addEventListener('click',()=>{
    const bot=heroButton.querySelector('.robot');
    if(!friend){
      bot.classList.remove('asleep');setTimeout(()=>bot.classList.add('asleep'),2600);
      say(heroBubble,'Zzz… oh! Hello. I’m waiting for someone to color me in and give me a name. Is it you? <a href="#friend">Build me ↓</a>',6500);return;
    }
    const lines=chatter();say(heroBubble,esc(lines[chat++%lines.length]),5200);
    bot.classList.remove('waving');void bot.getBoundingClientRect();bot.classList.add('waving');
  });
  const sendHome=()=>{
    const fly=()=>{
      heroWrap.style.visibility='';
      if(still()){say(heroBubble,'I’m home! Tap me any time. I’ll be right here.',5200);heroButton.focus({preventScroll:true});return;}
      const hero=$('.hero'),trail=setInterval(()=>{const h=hero.getBoundingClientRect(),b=heroButton.getBoundingClientRect();burst(hero,b.left-h.left+b.width/2,b.top-h.top+b.height*.7,2,26);},55);
      heroButton.animate([
        {transform:'translate(-42vw,62vh) scale(.3) rotate(-28deg)',opacity:0},
        {transform:'translate(-22vw,8vh) scale(.75) rotate(-12deg)',opacity:1,offset:.42},
        {transform:'translate(-3vw,-16vh) scale(1.1) rotate(10deg)',offset:.78},
        {transform:'none'}
      ],{duration:1800,easing:'cubic-bezier(.33,.6,.35,1)'}).onfinish=()=>{
        clearInterval(trail);
        const h=hero.getBoundingClientRect(),b=heroButton.getBoundingClientRect();burst(hero,b.left-h.left+b.width/2,b.top-h.top+b.height*.55,18,90);
        heroButton.querySelector('.robot').classList.add('waving');
        say(heroBubble,'I’m home! Tap me any time. I’ll be right here.',5600);heroButton.focus({preventScroll:true});
      };
    };
    heroWrap.style.visibility='hidden';
    window.scrollTo({top:0,behavior:still()?'auto':'smooth'});
    const start=performance.now(),wait=()=>window.scrollY<4||performance.now()-start>1600?fly():requestAnimationFrame(wait);
    requestAnimationFrame(wait);
  };
  const printFriend=()=>{
    const sheet=$('#print-sheet');
    sheet.innerHTML=`<h1>${esc(friend.name)}</h1>${robotSVG({...friend,colors:{...WHITE}})}<p>A FRIENDLY ROBOTS! friend, made by ________________________</p><p class="print-values">be friendly. ✧ be giving. ✧ be kind. ✧ be you.</p>`;
    document.body.classList.add('printing-friend');
    addEventListener('afterprint',()=>document.body.classList.remove('printing-friend'),{once:true});
    print();
  };

  // Friends react to the rest of RoboTown.
  $('#night-toggle').addEventListener('click',()=>{if(friend)say(heroBubble,document.body.classList.contains('night')?'Ooh, twilight! Look how my lights glow.':'Good morning, sunshine!',3400);});
  document.querySelectorAll('.tiny-star').forEach(s=>s.addEventListener('click',()=>{
    if(!friend||document.querySelectorAll('.tiny-star.found').length<3)return;
    heroWrap.classList.add('starred');setTimeout(()=>say(heroBubble,'You found all three little wonders! I’m so proud of you.',5600),600);
  }));
  let pointer=null,frame=0;
  const look=()=>{
    frame=0;
    document.querySelectorAll('.robot.tracks .pupils').forEach(g=>{
      const r=g.ownerSVGElement.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>innerHeight)return;
      const dx=pointer[0]-(r.left+r.width/2),dy=pointer[1]-(r.top+r.height*.32),d=Math.hypot(dx,dy)||1,m=Math.min(3.6,d/50);
      g.style.transform=`translate(${(dx/d*m).toFixed(2)}px,${(dy/d*m).toFixed(2)}px)`;
    });
  };
  addEventListener('pointermove',event=>{pointer=[event.clientX,event.clientY];if(!frame)frame=requestAnimationFrame(look);},{passive:true});

  drawMaker(friend?'awake':'');drawOptions();drawWake();drawHero();
  if(friend){
    let greeted=false;try{greeted=sessionStorage.getItem(KEY)==='greeted';sessionStorage.setItem(KEY,'greeted');}catch{}
    if(!greeted)setTimeout(()=>say(heroBubble,`Welcome back to RoboTown! I missed you.`,5200),1400);
  }
})();
