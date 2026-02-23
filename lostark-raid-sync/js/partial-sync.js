// === 부분 동기화 시스템 ===

// 부분 동기화 관리자
class PartialSyncManager {
  constructor() {
    this.dbRef = null;
    this.baseRef = null;
    this.currentUser = null;
    this.syncCode = null;
    this.listeners = new Map();
    this.isV2Mode = false;
  }

  // 초기화
  init(syncCode) {
    this.syncCode = syncCode;
    this.dbRef = realtimeDB.ref(`syncSessions/${syncCode}`);
    this.isV2Mode = PartialSyncManager.isV2ModeEnabled();
    this.baseRef = this.isV2Mode ? this.dbRef.child('v2') : this.dbRef;
    this.currentUser = window.realtimeSync?.currentUser || 'unknown';
    
    console.log('🔄 [PARTIAL SYNC] 초기화 완료:', { syncCode, mode: this.isV2Mode ? 'v2' : 'legacy' });
  }

  static isV2ModeEnabled() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const v2 = urlParams.get('v2');
      const mode = urlParams.get('mode');
      return v2 === '1' || v2 === 'true' || mode === 'v2';
    } catch (_) {
      return false;
    }
  }

  _ensureInit() {
    if (!this.baseRef) {
      throw new Error('PartialSyncManager is not initialized');
    }
  }

  _getPartyBaseRef(raidId, difficultyId, partyId) {
    this._ensureInit();
    if (!this.isV2Mode) {
      return this.baseRef.child(`raids/${raidId}/${difficultyId}/parties/${partyId}`);
    }
    return this.baseRef.child(`raids/${raidId}/${difficultyId}/parties/${partyId}`);
  }

  _normalizePartyForV2(party, raidId, difficultyId) {
    const safeParty = party || {};
    const members = Array.isArray(safeParty.members) ? safeParty.members : [];
    const meta = { ...safeParty };
    delete meta.members;
    meta.raidId = meta.raidId || raidId;
    meta.difficultyId = meta.difficultyId || difficultyId;
    meta.updatedAt = Date.now();
    meta.updatedBy = this.currentUser;
    meta.memberCount = members.filter(m => m !== null && m !== undefined).length;
    return { meta, members };
  }

  // 파티 동기화
  async syncParty(raidId, difficultyId, partyId, action, data) {
    try {
      const partyRef = this._getPartyBaseRef(raidId, difficultyId, partyId);
      const now = Date.now();

      if (!this.isV2Mode) {
        switch (action) {
          case 'add':
            await partyRef.set(data);
            break;
          case 'update':
            await partyRef.update(data);
            break;
          case 'delete':
            await partyRef.remove();
            break;
        }
      } else {
        switch (action) {
          case 'add': {
            const normalized = this._normalizePartyForV2(data, raidId, difficultyId);
            await partyRef.child('meta').set(normalized.meta);

            // members는 index 기반으로 저장
            const membersUpdate = {};
            normalized.members.forEach((m, idx) => {
              membersUpdate[idx] = (m === undefined ? null : m);
            });
            await partyRef.child('members').set(membersUpdate);

            await this.baseRef.child(`raids/${raidId}/${difficultyId}/meta`).update({ updatedAt: now });
            break;
          }
          case 'update': {
            // update는 meta patch or 전체 party object 둘 다 허용
            // data가 members를 포함하면 members까지 set
            const hasMembers = data && Object.prototype.hasOwnProperty.call(data, 'members');
            if (hasMembers) {
              const normalized = this._normalizePartyForV2(data, raidId, difficultyId);
              await partyRef.child('meta').set(normalized.meta);

              const membersUpdate = {};
              normalized.members.forEach((m, idx) => {
                membersUpdate[idx] = (m === undefined ? null : m);
              });
              await partyRef.child('members').set(membersUpdate);
            } else {
              // meta의 일부 업데이트
              await partyRef.child('meta').update({
                ...(data || {}),
                updatedAt: now,
                updatedBy: this.currentUser
              });
            }
            await this.baseRef.child(`raids/${raidId}/${difficultyId}/meta`).update({ updatedAt: now });
            break;
          }
          case 'delete':
            await partyRef.remove();
            break;
        }
      }
      
      console.log(`✅ [PARTIAL SYNC] 파티 ${action} 완료:`, { raidId, difficultyId, partyId });
      return true;
    } catch (error) {
      console.error('❌ [PARTIAL SYNC] 파티 동기화 실패:', error);
      return false;
    }
  }

  // 멤버 동기화
  async syncPartyMember(raidId, difficultyId, partyId, memberIndex, action, data) {
    try {
      const partyRef = this._getPartyBaseRef(raidId, difficultyId, partyId);
      const memberRef = this.isV2Mode
        ? partyRef.child(`members/${memberIndex}`)
        : partyRef.child(`members/${memberIndex}`);
      
      switch (action) {
        case 'add':
        case 'update':
          await memberRef.set(data);
          if (this.isV2Mode) {
            await partyRef.child('meta').update({ updatedAt: Date.now(), updatedBy: this.currentUser });
          }
          break;
        case 'delete':
          await memberRef.remove();
          if (this.isV2Mode) {
            await partyRef.child('meta').update({ updatedAt: Date.now(), updatedBy: this.currentUser });
          }
          break;
      }
      
      console.log(`✅ [PARTIAL SYNC] 멤버 ${action} 완료:`, { raidId, difficultyId, partyId, memberIndex });
      return true;
    } catch (error) {
      console.error('❌ [PARTIAL SYNC] 멤버 동기화 실패:', error);
      return false;
    }
  }

  async syncExpeditionSlotName(slotIndex, action, data) {
    try {
      this._ensureInit();
      const nameRef = this.isV2Mode
        ? this.baseRef.child(`expedition/names/${slotIndex}`)
        : this.baseRef.child(`expedition/slots/${slotIndex}/metadata/name`);

      switch (action) {
        case 'add':
        case 'update':
          await nameRef.set(data);
          break;
        case 'delete':
          await nameRef.remove();
          break;
      }
      return true;
    } catch (error) {
      console.error('❌ [PARTIAL SYNC] 원정대 이름 동기화 실패:', error);
      return false;
    }
  }

  // 원정대 슬롯 동기화
  async syncExpeditionSlot(slotIndex, action, data) {
    try {
      const slotRef = this.isV2Mode
        ? this.baseRef.child(`expedition/slots/${slotIndex}`)
        : this.baseRef.child(`expedition/slots/${slotIndex}`);
      
      switch (action) {
        case 'update':
          if (this.isV2Mode) {
            // v2: data는 members 배열 또는 { members: [...] } 형태 지원
            const members = Array.isArray(data) ? data : (Array.isArray(data?.members) ? data.members : []);
            const membersUpdate = {};
            members.forEach((m, idx) => {
              membersUpdate[idx] = (m === undefined ? null : m);
            });
            await slotRef.child('members').set(membersUpdate);
            await slotRef.child('meta').update({ updatedAt: Date.now(), updatedBy: this.currentUser, size: members.length });
          } else {
            await slotRef.set(data);
          }
          break;
        case 'delete':
          await slotRef.remove();
          break;
      }
      
      console.log(`✅ [PARTIAL SYNC] 원정대 슬롯 ${action} 완료:`, { slotIndex });
      return true;
    } catch (error) {
      console.error('❌ [PARTIAL SYNC] 원정대 슬롯 동기화 실패:', error);
      return false;
    }
  }

  // 메타데이터 업데이트
  async updateMetadata(metadata) {
    try {
      const metaRef = this.isV2Mode ? this.baseRef.child('metadata') : this.baseRef.child('metadata');
      await metaRef.update(metadata);
      
      console.log('✅ [PARTIAL SYNC] 메타데이터 업데이트 완료:', metadata);
      return true;
    } catch (error) {
      console.error('❌ [PARTIAL SYNC] 메타데이터 업데이트 실패:', error);
      return false;
    }
  }

  // 실시간 리스너 설정
  setupPartialListeners() {
    if (!this.dbRef) {
      console.warn('⚠️ [PARTIAL SYNC] dbRef가 초기화되지 않아 리스너 설정을 건너뜁니다.');
      return;
    }

    const raidsRef = this.isV2Mode ? this.baseRef.child('raids') : this.baseRef.child('raids');
    const expeditionSlotsRef = this.isV2Mode ? this.baseRef.child('expedition/slots') : this.baseRef.child('expedition/slots');
    const expeditionNamesRef = this.isV2Mode ? this.baseRef.child('expedition/names') : null;
    
    // 레이드 리스너
    raidsRef.on('value', (snapshot) => {
      const raids = snapshot.val() || {};
      console.log('🔄 [PARTIAL SYNC] 레이드 데이터 업데이트:', Object.keys(raids));

      if (this.isV2Mode) {
        // v2 -> state.raidTabs 역정규화
        const newRaidTabs = {};
        Object.entries(raids || {}).forEach(([raidId, raidNode]) => {
          if (raidId === 'meta') return;
          const difficulties = raidNode || {};
          newRaidTabs[raidId] = {};
          Object.entries(difficulties).forEach(([difficultyId, diffNode]) => {
            if (difficultyId === 'meta') return;
            const partiesNode = diffNode?.parties || {};
            const partyArr = [];
            Object.entries(partiesNode).forEach(([partyId, partyNode]) => {
              const meta = partyNode?.meta || null;
              if (!meta) return;
              const membersNode = partyNode?.members || {};
              const members = [];
              const indices = Object.keys(membersNode).map(k => Number(k)).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b);
              indices.forEach((idx) => {
                members[idx] = membersNode[idx];
              });
              partyArr.push({ ...meta, id: meta.id || partyId, members });
            });
            // order 기준 정렬(없으면 id)
            partyArr.sort((a, b) => (a.order || 0) - (b.order || 0));
            newRaidTabs[raidId][difficultyId] = partyArr;
          });
        });
        state.raidTabs = newRaidTabs;
      }
      
      // UI 업데이트
      if (typeof renderRaidTabs === 'function') {
        renderRaidTabs();
      }
      if (typeof renderRaidParties === 'function') {
        renderRaidParties();
      }
    });
    
    // 원정대 리스너
    expeditionSlotsRef.on('value', (snapshot) => {
      const slots = snapshot.val() || {};
      console.log('🔄 [PARTIAL SYNC] 원정대 데이터 업데이트:', Object.keys(slots));

      if (this.isV2Mode) {
        const newSlots = Array.from({ length: 8 }, () => []);
        Object.entries(slots || {}).forEach(([slotIndexStr, slotNode]) => {
          const slotIndex = Number(slotIndexStr);
          if (Number.isNaN(slotIndex)) return;
          const membersNode = slotNode?.members || {};
          const members = [];
          const indices = Object.keys(membersNode).map(k => Number(k)).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b);
          indices.forEach((idx) => {
            members[idx] = membersNode[idx];
          });
          newSlots[slotIndex] = members;
        });
        state.expeditionSlots = newSlots;
      }
      
      // UI 업데이트
      if (typeof renderExpedition === 'function') {
        renderExpedition();
      }
    });

    if (expeditionNamesRef) {
      expeditionNamesRef.on('value', (snapshot) => {
        const names = snapshot.val() || {};
        const newNames = Array.from({ length: 8 }, (_, i) => `원정대 ${i + 1}`);
        Object.entries(names || {}).forEach(([slotIndexStr, name]) => {
          const slotIndex = Number(slotIndexStr);
          if (Number.isNaN(slotIndex)) return;
          newNames[slotIndex] = name;
        });
        state.expeditionSlotNames = newNames;
        if (typeof renderExpedition === 'function') {
          renderExpedition();
        }
      });
    }
    
    console.log('✅ [PARTIAL SYNC] 부분 동기화 리스너 설정 완료');
  }

  // 리스너 정리
  cleanup() {
    this.listeners.forEach((ref, key) => {
      ref.off();
      this.listeners.delete(key);
    });
    console.log('🧹 [PARTIAL SYNC] 리스너 정리 완료');
  }
}

// 전역으로 내보내기
window.PartialSyncManager = PartialSyncManager;

// 전역 인스턴스 생성
if (!window.partialSyncManager) {
  window.partialSyncManager = new PartialSyncManager();
}
