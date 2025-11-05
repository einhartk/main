/* assets/js/event.js
   Event manager: 요일 시스템 + 특정 요일 이벤트 + 랜덤 이벤트 5종
   전역으로 노출: window.eventManager
*/

(function(global){
    const dayNames = ['월','화','수','목','금','토','일'];
  
    function safeLog(msg){
      // UI 있으면 쓰고, 없으면 콘솔
      if(global.UI && typeof global.UI.updateEventLog === 'function'){
        try { global.UI.updateEventLog(msg); } catch(e){ console.log(msg); }
      } else if(document.getElementById('eventLog')){
        const el = document.getElementById('eventLog');
        const p = document.createElement('div');
        p.textContent = msg;
        el.prepend(p);
      } else console.log(msg);
    }
  
    function safeNotify(msg){
      if(global.UI && typeof global.UI.showNotification === 'function') try{ global.UI.showNotification(msg); return; }catch(e){}
      // fallback: small temporary element
      const note = document.createElement('div'); note.textContent = msg;
      note.style.position='fixed'; note.style.right='12px'; note.style.bottom='12px';
      note.style.background='#222'; note.style.color='#fff'; note.style.padding='8px 12px'; note.style.borderRadius='6px';
      document.body.appendChild(note);
      setTimeout(()=>note.remove(),2000);
    }
  
    const eventManager = {
      currentDay: 1, // 1-based day count
      getWeekdayIndex(){
        return (this.currentDay - 1) % 7;
      },
      getWeekdayName(){
        return dayNames[this.getWeekdayIndex()];
      },
      // call to advance a day and trigger events
      nextDayAndTrigger(options = {}){
        // increment day
        this.currentDay++;
        // update UI day label if present
        if(document.getElementById('gameDay')){
          document.getElementById('gameDay').textContent = `지나간 날: ${this.currentDay}일째 • 요일: ${this.getWeekdayName()}`;
        }
        safeLog(`📅 ${this.currentDay}일째 — ${this.getWeekdayName()}요일`);
  
        // handle special weekday modifiers
        this.handleSpecialWeekday();
  
        // run a random event (unless caller passed skipRandom)
        if(!options.skipRandom) this.randomEvent();
      },
  
      handleSpecialWeekday(){
        const wd = this.getWeekdayName();
        // Apply persistent modifiers via global.player if available
        if(global.player){
          if(wd === '금'){
            // 금요일: 경험치 2배 flag
            global.player._xpMultiplier = 2;
            safeLog('✨ 금요일 보너스: 오늘 획득 경험치가 2배입니다!');
            safeNotify('금요일: EXP 2x!');
          } else {
            if(global.player._xpMultiplier && global.player._xpMultiplier !== 1){
              global.player._xpMultiplier = 1; // reset
            }
          }
          if(wd === '일'){
            // 일요일: 자동 휴식(완전 회복)
            global.player.hp = global.player.maxHp !== undefined ? global.player.maxHp : global.player.hp;
            safeLog('😴 일요일 자동 휴식: HP 전부 회복!');
            safeNotify('일요일: 자동 회복!');
            if(global.UI && typeof global.UI.updatePlayerPanel === 'function') global.UI.updatePlayerPanel(global.player);
          }
          if(wd === '수'){
            // 수요일: 상인 출현 확률 증가 (handled in randomEvent)
            safeLog('🔎 수요일: 상인 출현 확률이 조금 증가합니다.');
          }
        }
      },
  
      // main random event chooser (5 events)
      randomEvent(){
        // if player dead or missing, skip
        if(!global.player){ safeLog('⚠️ 플레이어 정보 없음 — 이벤트 생략'); return; }
  
        // determine roll weights; on 수요일 increase merchant chance
        const wd = this.getWeekdayName();
        // base weights array for [wolf, treasure, traveler, trap, merchant]
        let weights = [25, 20, 20, 20, 15]; // sum 100
        if(wd === '수'){ weights = [25, 18, 18, 17, 22]; } // merchant up
        if(global.player && global.player._eventBias && Array.isArray(global.player._eventBias)){
          // allow player-specific bias (optional)
          weights = global.player._eventBias;
        }
  
        const total = weights.reduce((a,b)=>a+b,0);
        let r = Math.floor(Math.random() * total);
        const pickIndex = (() => {
          let s=0;
          for(let i=0;i<weights.length;i++){
            s+=weights[i];
            if(r < s) return i;
          }
          return weights.length-1;
        })();
  
        switch(pickIndex){
          case 0: this._eventWolf(); break;
          case 1: this._eventTreasure(); break;
          case 2: this._eventTraveler(); break;
          case 3: this._eventTrap(); break;
          case 4: this._eventMerchant(); break;
          default: safeLog('아무 일도 일어나지 않았다.'); break;
        }
      },
  
      // Event implementations
      _eventWolf(){
        safeLog('🐺 늑대 조우! 전투가 시작됩니다.');
        // If Combat API exists, use it; else do fallback simple damage
        if(global.Combat && typeof global.Combat.start === 'function'){
          global.Combat.start(global.player, { name: '늑대', hp: 24, atk: 6, xpReward: 12, goldReward: 8 });
        } else if(window.startBattle){
          // older style function
          try{ startBattle(global.player, window.UI); } catch(e){ safeLog('전투 호출 실패: '+e.message); }
        } else {
          // fallback: small simulated fight
          const dmg = Math.max(1, Math.floor(Math.random()*8)+2);
          global.player.damage(dmg);
          safeLog(`늑대의 공격으로 HP -${dmg}`);
          if(global.UI && global.UI.updatePlayerPanel) global.UI.updatePlayerPanel(global.player);
        }
      },
  
      _eventTreasure(){
        const gold = Math.floor(Math.random()*30)+10;
        const xp = Math.floor(Math.random()*10)+5;
        // apply xp multiplier if active
        const mult = (global.player && global.player._xpMultiplier) ? global.player._xpMultiplier : 1;
        const gainedXp = Math.floor(xp * mult);
        if(global.player){
          global.player.gold = (global.player.gold || 0) + gold;
          global.player.exp = (global.player.exp || 0) + gainedXp;
        }
        safeLog(`💰 보물 발견! 골드 +${gold}, EXP +${gainedXp}`);
        safeNotify('보물을 발견했습니다!');
        if(global.UI && global.UI.updatePlayerPanel) global.UI.updatePlayerPanel(global.player);
      },
  
      _eventTraveler(){
        const xp = Math.floor(Math.random()*15)+8;
        const mult = (global.player && global.player._xpMultiplier) ? global.player._xpMultiplier : 1;
        const gainedXp = Math.floor(xp * mult);
        if(global.player) global.player.exp = (global.player.exp || 0) + gainedXp;
        safeLog(`🧙 여행자와 대화: 경험치 +${gainedXp}`);
        if(global.UI && global.UI.updatePlayerPanel) global.UI.updatePlayerPanel(global.player);
      },
  
      _eventTrap(){
        const dmg = Math.max(1, Math.floor((global.player && global.player.maxHp? global.player.maxHp : 40) * 0.15));
        if(global.player){
          global.player.damage ? global.player.damage(dmg) : (global.player.hp = Math.max(1, (global.player.hp || 1) - dmg));
        }
        safeLog(`⚠️ 함정 발생! HP -${dmg}`);
        if(global.UI && global.UI.updatePlayerPanel) global.UI.updatePlayerPanel(global.player);
      },
  
      _eventMerchant(){
        // merchant offers an item; chance to trade (we only give item)
        const items = ['포션','단검','방패','신비한 돌'];
        const item = items[Math.floor(Math.random()*items.length)];
        if(global.player){
          global.player.inventory = global.player.inventory || [];
          global.player.inventory.push(item);
        }
        safeLog(`🧳 수상한 상인 출현 — ${item}을(를 획득했습니다).`);
        safeNotify('상인과 조우했습니다.');
        if(global.UI && global.UI.updatePlayerPanel) global.UI.updatePlayerPanel(global.player);
      },
  
      // external call to trigger a specific event by name
      trigger(eventKey){
        switch(eventKey){
          case 'wolf': this._eventWolf(); break;
          case 'treasure': this._eventTreasure(); break;
          case 'traveler': this._eventTraveler(); break;
          case 'trap': this._eventTrap(); break;
          case 'merchant': this._eventMerchant(); break;
          default: safeLog('알 수 없는 이벤트 키: '+eventKey); break;
        }
      }
    };
  
    // expose globally
    global.eventManager = eventManager;
  
  })(window);
  