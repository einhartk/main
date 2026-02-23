// === 데이터 마이그레이션 ===

// 기존 데이터를 부분 동기화 방식으로 마이그레이션
class DataMigration {
  constructor() {
    this.isPartialSyncEnabled = false;
  }

  async migrateLegacyCompressedToV2(legacyData, dataPath) {
    const basePath = `${dataPath}/v2`;
    const now = Date.now();

    // 기존 v2 초기화
    await realtimeDB.ref(basePath).set(null);

    const updates = {};

    // expedition slots
    let expeditionSlots = [];
    if (legacyData.es) {
      try {
        expeditionSlots = JSON.parse(legacyData.es);
      } catch (e) {
        console.error('❌ [MIGRATION] failed to parse legacy es:', e);
        expeditionSlots = [];
      }
    }

    // expedition names
    let expeditionNames = [];
    if (legacyData.esn) {
      try {
        expeditionNames = JSON.parse(legacyData.esn);
      } catch (e) {
        console.error('❌ [MIGRATION] failed to parse legacy esn:', e);
        expeditionNames = [];
      }
    }

    updates[`${basePath}/expedition/meta/slotCount`] = 8;
    updates[`${basePath}/expedition/meta/updatedAt`] = now;

    for (let slotIndex = 0; slotIndex < 8; slotIndex++) {
      const name = expeditionNames[slotIndex] ?? `원정대 ${slotIndex + 1}`;
      updates[`${basePath}/expedition/names/${slotIndex}`] = name;

      const members = Array.isArray(expeditionSlots?.[slotIndex]) ? expeditionSlots[slotIndex] : [];
      updates[`${basePath}/expedition/slots/${slotIndex}/meta/updatedAt`] = now;
      updates[`${basePath}/expedition/slots/${slotIndex}/meta/size`] = members.length;
      updates[`${basePath}/expedition/slots/${slotIndex}/meta/updatedBy`] = legacyData.u || null;

      for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
        const member = members[memberIndex];
        updates[`${basePath}/expedition/slots/${slotIndex}/members/${memberIndex}`] = (member === undefined ? null : member);
      }
    }

    // raid tabs
    let raidTabs = {};
    if (legacyData.rt) {
      try {
        raidTabs = JSON.parse(legacyData.rt);
      } catch (e) {
        console.error('❌ [MIGRATION] failed to parse legacy rt:', e);
        raidTabs = {};
      }
    }

    const raidIds = Object.keys(raidTabs || {});
    updates[`${basePath}/raids/meta/updatedAt`] = now;
    updates[`${basePath}/raids/meta/raidCount`] = raidIds.length;

    raidIds.forEach((raidId) => {
      const diffs = raidTabs[raidId] || {};
      const diffIds = Object.keys(diffs);
      updates[`${basePath}/raids/${raidId}/meta/updatedAt`] = now;
      updates[`${basePath}/raids/${raidId}/meta/difficultyCount`] = diffIds.length;

      diffIds.forEach((difficultyId) => {
        const parties = Array.isArray(diffs[difficultyId]) ? diffs[difficultyId] : [];
        updates[`${basePath}/raids/${raidId}/${difficultyId}/meta/updatedAt`] = now;
        updates[`${basePath}/raids/${raidId}/${difficultyId}/meta/partyCount`] = parties.length;

        parties.forEach((party, idx) => {
          if (!party) return;
          const partyId = party.id || party.uniqueId || `P${idx + 1}`;
          const members = Array.isArray(party.members) ? party.members : [];
          const meta = { ...party };
          delete meta.members;
          meta.id = meta.id || partyId;
          meta.raidId = meta.raidId || raidId;
          meta.difficultyId = meta.difficultyId || difficultyId;
          meta.updatedAt = now;
          meta.updatedBy = legacyData.u || null;
          meta.memberCount = members.filter(m => m !== null && m !== undefined).length;

          const partyBase = `${basePath}/raids/${raidId}/${difficultyId}/parties/${partyId}`;
          updates[`${partyBase}/meta`] = meta;

          for (let mi = 0; mi < members.length; mi++) {
            const m = members[mi];
            updates[`${partyBase}/members/${mi}`] = (m === undefined ? null : m);
          }
        });
      });
    });

    // metadata
    updates[`${basePath}/metadata/version`] = '2.0';
    updates[`${basePath}/metadata/migratedAt`] = now;
    updates[`${basePath}/metadata/source`] = 'data_migration_from_legacy_compressed';
    updates[`${basePath}/metadata/legacyTimestamp`] = legacyData.t || null;
    updates[`${basePath}/metadata/legacyUser`] = legacyData.u || null;

    await realtimeDB.ref().update(updates);
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

  _shouldCleanupLegacy() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const cleanup = urlParams.get('cleanupLegacy');
      return cleanup === '1' || cleanup === 'true';
    } catch (_) {
      return false;
    }
  }

  // 마이그레이션 실행
  async migrateToPartialSync() {
    console.log('🔄 [MIGRATION] 부분 동기화 방식으로 마이그레이션 시작...');
    
    try {
      const syncCode = window.realtimeSync?.getSyncCode();
      if (!syncCode) {
        console.error('❌ [MIGRATION] syncCode가 없습니다.');
        return false;
      }

      const dataPath = `syncSessions/${syncCode}`;
      
      // 1. 기존 데이터 확인
      const legacySnapshot = await realtimeDB.ref(`${dataPath}/d`).once('value');
      if (!legacySnapshot.exists()) {
        console.log('📝 [MIGRATION] 마이그레이션할 기존 데이터가 없습니다.');
        return true;
      }

      const legacyData = legacySnapshot.val();
      console.log('📂 [MIGRATION] 기존 데이터 확인:', legacyData);

      // v2 모드: 정규화 스키마로 변환 저장
      if (DataMigration.isV2ModeEnabled()) {
        await this.migrateLegacyCompressedToV2(legacyData, dataPath);

        // v2 테스트 모드에서는 기본적으로 legacy(d) 삭제하지 않음
        if (this._shouldCleanupLegacy()) {
          await this.cleanupLegacyData();
        }

        console.log('✅ [MIGRATION] v2 정규화 방식으로 마이그레이션 완료');
        return true;
      }

      // 2. 레이드 데이터 마이그레이션
      if (legacyData.rt) {
        await this.migrateRaidData(legacyData.rt, dataPath);
      }

      // 3. 원정대 데이터 마이그레이션
      if (legacyData.es) {
        await this.migrateExpeditionData(legacyData.es, dataPath);
      }

      // 4. 원정대 슬롯 이름 마이그레이션
      if (legacyData.esn) {
        await this.migrateExpeditionSlotNames(legacyData.esn, dataPath);
      }

      // 5. 선택된 레이드/난이도 마이그레이션
      if (legacyData.sr) {
        await this.migrateSelectedRaid(legacyData.sr, dataPath);
      }

      // 6. 마이그레이션 완료 후 기존 데이터 삭제
      await this.cleanupLegacyData();

      console.log('✅ [MIGRATION] 부분 동기화 방식으로 마이그레이션 완료');
      return true;

    } catch (error) {
      console.error('❌ [MIGRATION] 마이그레이션 실패:', error);
      return false;
    }
  }

  // 레이드 데이터 마이그레이션
  async migrateRaidData(raidTabsData, dataPath) {
    console.log('🔄 [MIGRATION] 레이드 데이터 마이그레이션 시작...');
    
    try {
      const raidTabs = JSON.parse(raidTabsData);
      const raidPath = `${dataPath}/raids`;
      
      // 레이드별로 처리
      for (const [raidId, difficulties] of Object.entries(raidTabs)) {
        console.log(`📋 [MIGRATION] 레이드 ${raidId} 마이그레이션 중...`);
        
        for (const [difficultyId, parties] of Object.entries(difficulties)) {
          console.log(`📋 [MIGRATION] 난이도 ${difficultyId} 마이그레이션 중...`);
          
          // 파티 데이터 마이그레이션
          const partiesData = {};
          const order = [];
          
          // 각 파티 처리
          parties.forEach((party, index) => {
            if (party) {
              const partyId = party.id || `P${index + 1}`;
              
              // 파티 객체 정규화
              const normalizedParty = {
                id: partyId,
                uniqueId: party.uniqueId || `${raidId}-${difficultyId}-${partyId}`,
                displayName: party.displayName || party.name || `${raidId} ${difficultyId} ${partyId}`,
                name: party.name || party.displayName || `${raidId} ${difficultyId} ${partyId}`,
                raidId: raidId,
                difficultyId: difficultyId,
                raidName: party.raidName || raidId,
                difficultyName: party.difficultyName || difficultyId,
                order: party.order || 0,
                cleared: party.cleared || false,
                scheduledWeekday: party.scheduledWeekday || null,
                scheduledHour: party.scheduledHour || null,
                scheduledTime: party.scheduledTime || null,
                scheduledTimeDisplay: party.scheduledTimeDisplay || '',
                createdAt: party.createdAt || new Date().toISOString(),
                members: party.members || [],
                maxSupports: party.maxSupports || 1,
                size: party.size || 4,
                minIlvl: party.minIlvl || 0,
                minCombatPower: party.minCombatPower || 0
              };
              
              partiesData[partyId] = normalizedParty;
              order.push(partyId);
              
              console.log(`  📝 [MIGRATION] 파티 ${partyId} 마이그레이션 완료 (${normalizedParty.members.length}명)`);
            }
          });
          
          // 순서 정보 추가
          partiesData._order = order;
          
          // Firebase에 저장
          await realtimeDB.ref(`${raidPath}/${raidId}/${difficultyId}/parties`).set(partiesData);
          console.log(`✅ [MIGRATION] ${raidId}/${difficultyId} 난이도 마이그레이션 완료 (${order.length}개 파티)`);
        }
      }
      
      console.log('✅ [MIGRATION] 레이드 데이터 마이그레이션 완료');
    } catch (error) {
      console.error('❌ [MIGRATION] 레이드 데이터 마이그레이션 실패:', error);
      throw error;
    }
  }

  // 원정대 데이터 마이그레이션
  async migrateExpeditionData(expeditionData, dataPath) {
    console.log('🔄 [MIGRATION] 원정대 데이터 마이그레이션 시작...');
    
    try {
      const expeditionSlots = JSON.parse(expeditionData);
      const expeditionPath = `${dataPath}/expedition/slots`;
      
      for (let i = 0; i < expeditionSlots.length; i++) {
        const slotCharacters = expeditionSlots[i] || [];
        
        const slotData = {
          characters: slotCharacters,
          metadata: {
            name: `원정대 ${i + 1}`,
            createdAt: new Date().toISOString()
          }
        };
        
        await realtimeDB.ref(`${expeditionPath}/${i}`).set(slotData);
        console.log(`  📝 [MIGRATION] 원정대 슬롯 ${i} 마이그레이션 완료 (${slotCharacters.length}명)`);
      }
      
      console.log('✅ [MIGRATION] 원정대 데이터 마이그레이션 완료');
    } catch (error) {
      console.error('❌ [MIGRATION] 원정대 데이터 마이그레이션 실패:', error);
      throw error;
    }
  }

  // 원정대 슬롯 이름 마이그레이션
  async migrateExpeditionSlotNames(slotNamesData, dataPath) {
    console.log('🔄 [MIGRATION] 원정대 슬롯 이름 마이그레이션 시작...');
    
    try {
      const slotNames = JSON.parse(slotNamesData);
      const expeditionPath = `${dataPath}/expedition/slots`;
      
      for (let i = 0; i < slotNames.length; i++) {
        const slotName = slotNames[i] || `원정대 ${i + 1}`;
        
        await realtimeDB.ref(`${expeditionPath}/${i}/metadata/name`).set(slotName);
        console.log(`  📝 [MIGRATION] 원정대 슬롯 ${i} 이름 마이그레이션 완료: ${slotName}`);
      }
      
      console.log('✅ [MIGRATION] 원정대 슬롯 이름 마이그레이션 완료');
    } catch (error) {
      console.error('❌ [MIGRATION] 원정대 슬롯 이름 마이그레이션 실패:', error);
      throw error;
    }
  }

  // 선택된 레이드 마이그레이션
  async migrateSelectedRaid(selectedRaidId, dataPath) {
    console.log('🔄 [MIGRATION] 선택된 레이드 마이그레이션 시작...');
    
    try {
      const metadataPath = `${dataPath}/metadata`;
      
      // 선택된 레이드 정보
      const selectedData = {
        selectedRaid: selectedRaidId,
        migratedAt: new Date().toISOString(),
        migrationVersion: '1.0'
      };
      
      await realtimeDB.ref(`${metadataPath}/selectedRaid`).set(selectedRaidId);
      await realtimeDB.ref(`${metadataPath}/migrationInfo`).set(selectedData);
      
      console.log(`✅ [MIGRATION] 선택된 레이드 마이그레이션 완료: ${selectedRaidId}`);
    } catch (error) {
      console.error('❌ [MIGRATION] 선택된 레이드 마이그레이션 실패:', error);
      throw error;
    }
  }

  // 기존 데이터 삭제
  async cleanupLegacyData() {
    console.log('🗑️ [MIGRATION] 기존 데이터 삭제 시작...');
    
    try {
      const syncCode = window.realtimeSync?.getSyncCode();
      if (!syncCode) {
        console.warn('⚠️ [MIGRATION] syncCode가 없어 기존 데이터 삭제를 건너뜁니다.');
        return;
      }
      
      const dataPath = `syncSessions/${syncCode}`;
      
      // 기존 압축 데이터(d) 삭제 확인
      const legacySnapshot = await realtimeDB.ref(`${dataPath}/d`).once('value');
      if (legacySnapshot.exists()) {
        await realtimeDB.ref(`${dataPath}/d`).remove();
        console.log('✅ [MIGRATION] 기존 압축 데이터(d) 삭제 완료');
      } else {
        console.log('📝 [MIGRATION] 삭제할 기존 데이터가 없습니다.');
      }
      
      // 타임스탬프(a)는 남겨둠 (동기화에 필요)
      console.log('✅ [MIGRATION] 기존 데이터 정리 완료 (타임스탬프는 유지)');
    } catch (error) {
      console.error('❌ [MIGRATION] 기존 데이터 삭제 실패:', error);
      throw error;
    }
  }

  // 마이그레이션 상태 확인
  async checkMigrationStatus() {
    try {
      const syncCode = window.realtimeSync?.getSyncCode();
      if (!syncCode) {
        return { status: 'no_sync_code', message: '동기화 코드가 없습니다.' };
      }

      const dataPath = `syncSessions/${syncCode}`;
      
      // 기존 데이터 확인
      const legacySnapshot = await realtimeDB.ref(`${dataPath}/d`).once('value');
      const hasLegacy = legacySnapshot.exists();
      
      // 부분 동기화 데이터 확인
      const partialPath = DataMigration.isV2ModeEnabled() ? `${dataPath}/v2/raids` : `${dataPath}/raids`;
      const partialSnapshot = await realtimeDB.ref(partialPath).once('value');
      const hasPartial = partialSnapshot.exists();
      
      if (hasLegacy && hasPartial) {
        return { status: 'both_exist', message: '기존 데이터와 부분 동기화 데이터가 모두 존재합니다.' };
      } else if (hasLegacy && !hasPartial) {
        return { status: 'needs_migration', message: '마이그레이션이 필요합니다.' };
      } else if (!hasLegacy && hasPartial) {
        return { status: 'already_migrated', message: '이미 마이그레이션되었습니다.' };
      } else {
        return { status: 'no_data', message: '데이터가 없습니다.' };
      }
    } catch (error) {
      return { status: 'error', message: `확인 중 오류: ${error.message}` };
    }
  }

  // 전체 마이그레이션 실행 (상태 확인 + 실행)
  async executeFullMigration() {
    console.log('🔄 [MIGRATION] 전체 마이그레이션 프로세스 시작...');
    
    // 1. 상태 확인
    const status = await this.checkMigrationStatus();
    console.log('📊 [MIGRATION] 마이그레이션 상태:', status);
    
    if (status.status === 'needs_migration') {
      // 2. 마이그레이션 실행
      const success = await this.migrateToPartialSync();
      if (success) {
        console.log('✅ [MIGRATION] 전체 마이그레이션 성공 완료');
        return { success: true, message: '마이그레이션이 성공적으로 완료되었습니다.' };
      } else {
        console.error('❌ [MIGRATION] 전체 마이그레이션 실패');
        return { success: false, message: '마이그레이션에 실패했습니다.' };
      }
    } else if (status.status === 'already_migrated') {
      console.log('📝 [MIGRATION] 이미 마이그레이션됨');
      return { success: true, message: '이미 마이그레이션되었습니다.' };
    } else {
      console.log('📝 [MIGRATION] 마이그레이션 불필요:', status.message);
      return { success: true, message: status.message };
    }
  }
}

// 전역으로 내보내기
window.DataMigration = DataMigration;

// 전역 인스턴스 생성
if (!window.dataMigration) {
  window.dataMigration = new DataMigration();
}
