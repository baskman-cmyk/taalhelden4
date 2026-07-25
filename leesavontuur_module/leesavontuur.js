(function(){
  const DATA=window.LEESAVONTUUR_DATA;
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const state={story:0,question:0,correct:0,points:0,attempts:0,answered:false,speaking:false,completed:new Set()};
  let root, opts={};

  function paragraphHtml(story){
    let text=esc(story.body);
    story.vocab.forEach(v=>{
      const safe=v.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      text=text.replace(new RegExp(`\\b(${safe})(en|s)?\\b`,'i'),`<button class="la-word" data-word="${esc(v.word)}">$&</button>`);
    });
    return text.split(/\n+/).map(p=>`<p>${p}</p>`).join('');
  }

  function vocabArt(word){ return ""; }

  function renderShell(){
    root.innerHTML=`<div class="la-shell">
      <section class="la-reader">
        <header class="la-head">
          <div class="la-brand"><div class="la-brand-icon">🌍</div><div><h2>Leesavontuur</h2><p>Reis, lees en ontdek de wereld</p></div></div>
          <div class="la-country"><span style="font-size:28px">🇺🇸</span><div><strong>Amerika</strong><div class="la-country-progress"><i id="laCountryBar"></i></div></div></div>
        </header>
        <div class="la-hero" id="laHero"></div>
        <div class="la-story-intro"><span style="font-size:32px">📖</span><div class="la-number" id="laStoryNumber"></div><div><h3 id="laTitle"></h3><div class="la-meta"><span>◷ ongeveer 3 minuten</span><button class="la-read" id="laRead">🔊 Lees voor</button></div></div></div>
        <article class="la-story" id="laStory"></article>
        <section class="la-vocab"><h4>📖 Woordenschat</h4><div class="la-vocab-grid" id="laVocab"></div></section>
        <footer class="la-bottom"><div class="la-dots" id="laDots"></div><strong id="laLocation"></strong></footer>
      </section>
      <aside class="la-quiz">
        <div class="la-quiz-top"><div class="la-metrics"><div><small id="laQLabel"></small></div><div><small>✅ Goed</small><strong id="laGood">0</strong></div><div><small>⭐ Punten</small><strong id="laPoints">0</strong></div></div><div class="la-progress"><span id="laProgress"></span></div></div>
        <section class="la-question" id="laQuestion"><h3 id="laQText"></h3><div class="la-answers" id="laAnswers"></div><div class="la-feedback" id="laFeedback"></div><button class="la-next" id="laNext">Volgende vraag →</button></section>
        <section class="la-result" id="laResult"><div style="font-size:68px">🏅</div><h3>Tekst voltooid!</h3><p id="laResultText"></p><button class="la-next show" id="laContinue">Volgende verhaal →</button></section>
        <div class="la-tip">💡 <strong>Tip:</strong> klik op de oranje woorden om hun betekenis te zien.</div>
      </aside>
    </div>`;
    root.querySelector('#laNext').addEventListener('click',nextQuestion);
    root.querySelector('#laContinue').addEventListener('click',()=>loadStory(Math.min(state.story+1,DATA.stories.length-1)));
    root.querySelector('#laRead').addEventListener('click',readStory);
  }

  function loadStory(index){
    state.story=index; state.question=0; state.correct=0; state.points=0; state.attempts=0; state.answered=false;
    const s=DATA.stories[index];
    root.querySelector('#laHero').style.backgroundImage=`url("${s.image || DATA.covers[String(s.id)]}")`;
    root.querySelector('#laStoryNumber').textContent=index+1;
    root.querySelector('#laTitle').textContent=s.title;
    root.querySelector('#laLocation').textContent=s.location;
    root.querySelector('#laStory').innerHTML=paragraphHtml(s);
    root.querySelector('#laVocab').innerHTML=s.vocab.map(v=>`<div class="la-vocab-card"><div><strong>${esc(v.word)}</strong><p>${esc(v.meaning)}</p></div></div>`).join('');
    root.querySelectorAll('.la-word').forEach(btn=>btn.addEventListener('click',()=>{const v=s.vocab.find(x=>x.word===btn.dataset.word); if(v) alert(v.word.toUpperCase()+"\n\n"+v.meaning);}));
    root.querySelector('#laQuestion').style.display='block'; root.querySelector('#laResult').classList.remove('show');
    renderDots(); renderQuestion(); updateCountry();
  }

  function renderDots(){
    root.querySelector('#laDots').innerHTML=DATA.stories.map((s,i)=>`<button class="la-dot ${i===state.story?'active':''} ${state.completed.has(s.id)?'done':''}" data-i="${i}" title="${esc(s.title)}">${i+1}</button>`).join('');
    root.querySelectorAll('.la-dot').forEach(b=>b.addEventListener('click',()=>loadStory(Number(b.dataset.i))));
  }

  function renderQuestion(){
    const s=DATA.stories[state.story], q=s.questions[state.question];
    state.attempts=0;state.answered=false;
    root.querySelector('#laQLabel').textContent=`Vraag ${state.question+1} van ${s.questions.length}`;
    root.querySelector('#laQText').textContent=q.q;
    root.querySelector('#laProgress').style.width=`${((state.question+1)/s.questions.length)*100}%`;
    root.querySelector('#laFeedback').className='la-feedback'; root.querySelector('#laNext').className='la-next';
    const box=root.querySelector('#laAnswers');box.innerHTML='';
    if(q.type==='mc'){
      q.options.forEach((opt,i)=>{const b=document.createElement('button');b.className='la-answer';b.innerHTML=`<span class="la-letter">${String.fromCharCode(65+i)}</span><span>${esc(opt)}</span>`;b.addEventListener('click',()=>checkMC(i,b));box.appendChild(b);});
    }else{
      box.innerHTML=`<input id="laOpen" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px" placeholder="Typ je antwoord"><button class="la-answer" id="laCheckOpen"><span class="la-letter">✓</span><span>Controleer antwoord</span></button>`;
      root.querySelector('#laCheckOpen').addEventListener('click',checkOpen);
    }
    updateMetrics();
  }

  function feedback(good,title,text){
    const f=root.querySelector('#laFeedback');
    f.className=`la-feedback show ${good?'good':'bad'}`;
    f.innerHTML=`<div><h4>${good?'✅':'❌'} ${esc(title)}</h4><p>${esc(text)}</p>${good?'<span class="la-point">+1 punt ⭐</span>':''}</div>`;
  }

  function checkMC(choice,button){
    if(state.answered)return;
    const q=DATA.stories[state.story].questions[state.question];state.attempts++;
    if(choice===q.correct){
      state.answered=true;state.correct++;state.points++;button.classList.add('correct');root.querySelectorAll('.la-answer').forEach(b=>b.disabled=true);
      feedback(true,'Goed gedaan!','Dit antwoord past bij de informatie in de tekst.');root.querySelector('#laNext').classList.add('show');
      if(typeof opts.onPointsEarned==='function')opts.onPointsEarned(1,DATA.stories[state.story]);
      root.dispatchEvent(new CustomEvent('leesavontuur:points',{detail:{points:1,story:DATA.stories[state.story]}}));
    }else{
      button.classList.add('wrong');button.disabled=true;
      if(state.attempts===1)feedback(false,'Nog niet goed','Lees het betreffende stukje nog eens en probeer een ander antwoord.');
      else{state.answered=true;const all=[...root.querySelectorAll('.la-answer')];if(all[q.correct])all[q.correct].classList.add('reveal');all.forEach(b=>b.disabled=true);feedback(false,'Bekijk het goede antwoord',`Het juiste antwoord is ${String.fromCharCode(65+q.correct)}.`);root.querySelector('#laNext').classList.add('show');}
    }
    updateMetrics();
  }

  function checkOpen(){
    if(state.answered)return;
    const q=DATA.stories[state.story].questions[state.question],value=root.querySelector('#laOpen').value.trim().toLowerCase();
    if(!value)return;state.attempts++;
    const hit=(q.keywords||[]).some(k=>value.includes(k));
    if(hit){state.answered=true;state.correct++;state.points++;feedback(true,'Goed uitgelegd!',q.model||'Je antwoord bevat de belangrijkste informatie.');root.querySelector('#laNext').classList.add('show');if(typeof opts.onPointsEarned==='function')opts.onPointsEarned(1,DATA.stories[state.story]);}
    else if(state.attempts===1)feedback(false,'Nog niet helemaal','Kijk nog eens in de tekst en probeer opnieuw.');
    else{state.answered=true;feedback(false,'Vergelijk jouw antwoord',q.model||'Lees het stukje nog eens.');root.querySelector('#laNext').classList.add('show');}
    updateMetrics();
  }

  function nextQuestion(){
    const s=DATA.stories[state.story];
    if(state.question<s.questions.length-1){state.question++;renderQuestion();}
    else{state.completed.add(s.id);root.querySelector('#laQuestion').style.display='none';root.querySelector('#laResult').classList.add('show');root.querySelector('#laResultText').textContent=`Je had ${state.correct} van de ${s.questions.length} vragen goed en verdiende ${state.points} punten.`;renderDots();updateCountry();}
  }

  function updateMetrics(){root.querySelector('#laGood').textContent=state.correct;root.querySelector('#laPoints').textContent=state.points;}
  function updateCountry(){root.querySelector('#laCountryBar').style.width=`${Math.round(state.completed.size/DATA.stories.length*100)}%`;}

  function readStory(){
    if(!('speechSynthesis'in window))return alert('Voorlezen wordt niet ondersteund.');
    const btn=root.querySelector('#laRead');
    if(state.speaking){speechSynthesis.cancel();state.speaking=false;btn.textContent='🔊 Lees voor';return;}
    const voices=speechSynthesis.getVoices(),dutch=voices.filter(v=>/^nl/i.test(v.lang)),preferred=['Claire','Colette','Ellen','Fenna','Lotte','Sofie','Google Nederlands'];
    let voice=dutch.find(v=>preferred.some(n=>v.name.toLowerCase().includes(n.toLowerCase())))||dutch.find(v=>/female|vrouw|claire|colette|ellen|fenna|lotte|sofie/i.test(v.name))||dutch[0];
    const u=new SpeechSynthesisUtterance(DATA.stories[state.story].body);u.lang='nl-NL';if(voice)u.voice=voice;u.rate=.76;u.pitch=1.04;u.volume=.86;u.onend=()=>{state.speaking=false;btn.textContent='🔊 Lees voor';};
    state.speaking=true;btn.textContent='■ Stop';speechSynthesis.cancel();speechSynthesis.speak(u);
  }

  window.Leesavontuur={
    init(options={}){
      opts=options;root=typeof options.root==='string'?document.querySelector(options.root):(options.root||document.querySelector('#leesavontuur-root'));
      if(!root)throw new Error('Leesavontuur: root-element niet gevonden.');
      renderShell();loadStory(options.startStory||0);
    }
  };
})();