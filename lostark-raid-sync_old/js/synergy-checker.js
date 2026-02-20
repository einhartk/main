// Synergy Checker - 시너지 비교 시스템
// 순수하게 시너지만 비교하여 중복 체크

class SynergyChecker {
  constructor() {
    // 시너지별 직업군 그룹화 (딜러만)
    this.synergyGroups = {
      // 치명타 시너지 직업군
      criticalRate: {
        name: '치명타 적중률',
        characters: [
          '건슬링어', '스트라이커', '기상술사', '배틀마스터', '데빌헌터', '아르카나',
          '도화가', '발키리' // 딜러 포지션일 때만
        ]
      },
      
      // 방어력 감소 직업군
      defenseDecrease: {
        name: '방어력 감소',
        characters: [
          '디스트로이어', '블래스터', '환수사', '서머너', '리퍼',
          '도화가', '바드' // 딜러 포지션일 때만
        ]
      },
      
      // 공격력 증가 직업군
      attackPowerIncrease: {
        name: '공격력 증가',
        characters: [
          '스카우터', '기공사'
        ]
      },
      
      // 치명타 적중시 피해량 증가 직업군
      criticalDamageIncrease: {
        name: '치명타 적중시 피해량 증가',
        characters: [
          '창술사', '발키리', '홀리나이트' // 딜러 포지션일 때만
        ]
      },
      
      // 적에게 주는 피해량 증가 직업군
      damageIncrease: {
        name: '적에게 주는 피해량 증가',
        characters: [
          '버서커', '인파이터', '호크아이', '소서리스', '브레이커', 
          '소울이터', '데모닉', '가디언나이트', '슬레이어'
        ]
      },
      
      // 방향성 피해량 증가 직업군
      directionalDamageIncrease: {
        name: '방향성 피해량 증가',
        characters: [
          '블레이드', '워로드'
        ]
      }
    };
  }

  // 파티의 시너지 타입만 추출 (포지션에 따른 시너지 구분)
  extractSynergyTypes(party) {
    const synergyTypes = new Set();
    
    // 파티 내 각 캐릭터의 시너지 타입 추출
    party.forEach(character => {
      // 서포터 역할 캐릭터는 서포터 시너지로 취급
      if (character.role === 'support') {
        synergyTypes.add('support');
        return;
      }
      
      // 딜러 역할 캐릭터는 해당 시너지 그룹에서 찾기
      Object.keys(this.synergyGroups).forEach(synergyType => {
        const group = this.synergyGroups[synergyType];
        if (group.characters.includes(character.className)) {
          synergyTypes.add(synergyType);
        }
      });
    });
    
    return Array.from(synergyTypes);
  }

  // 시너지 중복 체크 (순수하게 타입만 비교)
  checkSynergyOverlap(party) {
    const synergyTypes = this.extractSynergyTypes(party);
    const typeCount = {};
    
    // 각 시너지 타입별 개수 카운트
    synergyTypes.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    // 중복되는 시너지 타입 확인
    const overlaps = Object.keys(typeCount)
      .filter(type => typeCount[type] > 1)
      .map(type => ({
        type: type,
        typeName: this.synergyGroups[type].name,
        count: typeCount[type]
      }));
    
    return {
      overlaps,
      totalSynergyTypes: synergyTypes.length,
      uniqueTypes: synergyTypes,
      typeCount
    };
  }

  // 시너지 효율성 점수 계산 (중복이 적을수록 높은 점수)
  calculateSynergyEfficiency(party) {
    console.log(`🔍 [SYNERGY] 파티 효율 계산 시작: ${party.map(c => c.name || '알 수 없음').join(', ')}`);
    
    const overlapCheck = this.checkSynergyOverlap(party);
    const { overlaps, totalSynergyTypes } = overlapCheck;
    
    console.log(`  📊 총 시너지 타입: ${totalSynergyTypes}개`);
    console.log(`  ⚠️ 중복 시너지: ${overlaps.length}개`);
    
    // 기본 점수: 시너지 타입 수 × 10점
    let efficiencyScore = totalSynergyTypes * 10;
    
    // 중복 페널티: 중복된 시너지당 -15점
    overlaps.forEach(overlap => {
      console.log(`  ❌ ${overlap.typeName}: ${overlap.count}개 중복 (-${overlap.count * 15}점)`);
      efficiencyScore -= overlap.count * 15;
    });
    
    console.log(`  📈 최종 효율 점수: ${efficiencyScore}점`);
    
    // 최소 점수 보장
    efficiencyScore = Math.max(0, efficiencyScore);
    
    return {
      efficiencyScore,
      overlaps,
      totalSynergyTypes,
      recommendation: this.generateEfficiencyRecommendation(overlapCheck)
    };
  }

  // 효율성 추천 생성
  generateEfficiencyRecommendation(overlapCheck) {
    const { overlaps, totalSynergyTypes } = overlapCheck;
    const recommendations = [];
    
    if (overlaps.length === 0) {
      recommendations.push('시너지 중복이 없어 최적의 구성입니다.');
    } else {
      recommendations.push(`${overlaps.length}개의 시너지가 중복됩니다.`);
      
      overlaps.forEach(overlap => {
        recommendations.push(
          `${overlap.typeName}: ${overlap.count}개 중복`
        );
      });
      
      recommendations.push('중복되는 시너지를 피하면 더 효율적인 파티가 됩니다.');
    }
    
    return recommendations;
  }

  // 파티 단위 시너지 구성 확인
  getPartySynergyComposition(party) {
    const synergyTypes = new Set();
    const synergyDetails = [];
    
    console.log(`🔍 [SYNERGY] 파티 시너지 분석 시작: ${party.map(c => c.name || '알 수 없음').join(', ')}`);
    
    // 파티 내 각 캐릭터의 시너지 타입 추출
    party.forEach(character => {
      // 서포터 역할 캐릭터는 서포터 시너지로 취급
      if (character.role === 'support') {
        synergyTypes.add('support');
        synergyDetails.push({
          character: character.name,
          className: character.className,
          role: character.role,
          synergyType: 'support',
          synergyName: '서포터 시너지'
        });
        console.log(`  🛡️ ${character.name} (${character.className}) -> 서포터 시너지`);
        return;
      }
      
      // 딜러 역할 캐릭터는 해당 시너지 그룹에서 찾기
      Object.keys(this.synergyGroups).forEach(synergyType => {
        const group = this.synergyGroups[synergyType];
        if (group.characters.includes(character.className)) {
          synergyTypes.add(synergyType);
          synergyDetails.push({
            character: character.name,
            className: character.className,
            role: character.role,
            synergyType: synergyType,
            synergyName: group.name
          });
          console.log(`  ⚔️ ${character.name} (${character.className}) -> ${group.name} 시너지`);
        }
      });
    });
    
    const totalScore = synergyDetails.reduce((sum, detail) => {
      const score = detail.synergyType === 'support' ? 5 : 3;
      console.log(`  📊 ${detail.character} 시너지 점수: ${score} (${detail.synergyType})`);
      return sum + score;
    }, 0);
    
    console.log(`🔍 [SYNERGY] 파티 시너지 분석 완료: 총 ${synergyTypes.size}개 타입, 총 ${totalScore}점`);
    
    return {
      partySize: party.length,
      totalSynergyTypes: synergyTypes.size,
      uniqueSynergies: Array.from(synergyTypes),
      synergyDetails,
      synergyCount: {}
    };
  }

  // 파티 간 시너지 구성 비교
  comparePartySynergies(party1, party2) {
    const composition1 = this.getPartySynergyComposition(party1);
    const composition2 = this.getPartySynergyComposition(party2);
    
    // 각 파티의 시너지 타입 카운트
    const countSynergyTypes = (composition) => {
      const count = {};
      composition.synergyDetails.forEach(detail => {
        count[detail.synergyType] = (count[detail.synergyType] || 0) + 1;
      });
      return count;
    };
    
    const count1 = countSynergyTypes(composition1);
    const count2 = countSynergyTypes(composition2);
    
    // 파티 간 중복 시너지 확인
    const overlappingSynergies = [];
    const allSynergyTypes = new Set([...composition1.uniqueSynergies, ...composition2.uniqueSynergies]);
    
    allSynergyTypes.forEach(synergyType => {
      const countInParty1 = count1[synergyType] || 0;
      const countInParty2 = count2[synergyType] || 0;
      
      if (countInParty1 > 0 && countInParty2 > 0) {
        overlappingSynergies.push({
          synergyType,
          synergyName: this.getSynergyName(synergyType),
          party1Count: countInParty1,
          party2Count: countInParty2,
          totalOverlap: countInParty1 + countInParty2
        });
      }
    });
    
    return {
      party1: {
        composition: composition1,
        synergyCount: count1
      },
      party2: {
        composition: composition2,
        synergyCount: count2
      },
      overlappingSynergies,
      totalOverlapCount: overlappingSynergies.reduce((sum, overlap) => sum + overlap.totalOverlap, 0),
      uniqueSynergyTypes: allSynergyTypes.size,
      efficiency: this.calculatePartyComparisonEfficiency(composition1, composition2, overlappingSynergies)
    };
  }
  
  // 시너지 타입 이름 가져오기
  getSynergyName(synergyType) {
    if (synergyType === 'support') return '서포터 시너지';
    return this.synergyGroups[synergyType]?.name || synergyType;
  }
  
  // 파티 비교 효율성 계산
  calculatePartyComparisonEfficiency(comp1, comp2, overlaps) {
    // 전체 고유 시너지 타입 수
    const totalUniqueTypes = new Set([...comp1.uniqueSynergies, ...comp2.uniqueSynergies]).size;
    
    // 중복 페널티
    const overlapPenalty = overlaps.reduce((sum, overlap) => {
      return sum + (overlap.totalOverlap - 1) * 10; // 중복당 10점 페널티
    }, 0);
    
    // 기본 점수 (고유 시너지 타입 수 * 20)
    const baseScore = totalUniqueTypes * 20;
    
    // 최종 효율성 점수
    const efficiency = Math.max(0, baseScore - overlapPenalty);
    
    return {
      baseScore,
      overlapPenalty,
      efficiency,
      grade: this.getEfficiencyGrade(efficiency)
    };
  }
  
  // 효율성 등급
  getEfficiencyGrade(score) {
    if (score >= 80) return 'S';
    if (score >= 60) return 'A';
    if (score >= 40) return 'B';
    if (score >= 20) return 'C';
    return 'D';
  }

  // 최적의 파티 조합 추천 (시너지 중복 최소화)
  recommendOptimalParty(availableCharacters, partySize = 4) {
    // 🔥 성능 최적화: 조합 수 제한
    const MAX_COMBINATIONS = 200; // 최대 조합 수 제한
    const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시
    
    // 캐시 키 생성
    const cacheKey = JSON.stringify({
      characters: availableCharacters.map(c => `${c.name}-${c.className}-${c.role}`).sort(),
      partySize,
      timestamp: Date.now()
    });
    
    // 캐시 확인
    if (!this.combinationCache) {
      this.combinationCache = new Map();
    }
    
    const cached = this.combinationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log('✅ [PERF] 시너지 조합 캐시 히트');
      return cached.results;
    }
    
    const allCombinations = [];
    let combinationCount = 0;
    
    // 모든 가능한 조합 생성 (제한된 수만큼)
    this.generateCombinations(availableCharacters, partySize, (combination) => {
      // 조합 수 제한으로 성능 보호
      if (combinationCount++ >= MAX_COMBINATIONS) {
        return false; // 조기 종료
      }
      
      const efficiency = this.calculateSynergyEfficiency(combination);
      allCombinations.push({
        combination,
        efficiencyScore: efficiency.efficiencyScore,
        efficiency
      });
      
      return true; // 계속 진행
    });
    
    // 효율성 점수로 정렬
    allCombinations.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    
    // 상위 10개만 추천 (성능 최적화)
    const recommendations = allCombinations.slice(0, 10).map((item, index) => {
      const overlap = this.checkSynergyOverlap(item.combination);
      
      return {
        rank: index + 1,
        combination: item.combination,
        efficiencyScore: item.efficiencyScore,
        efficiency: item.efficiency,
        overlap,
        recommendation: this.generateRecommendation(item.combination, overlap, item.efficiency)
      };
    });
    
    // 결과 캐싱
    this.combinationCache.set(cacheKey, {
      results: recommendations,
      timestamp: Date.now()
    });
    
    // 캐시 크기 제한 (메모리 관리)
    if (this.combinationCache.size > 50) {
      const firstKey = this.combinationCache.keys().next().value;
      this.combinationCache.delete(firstKey);
    }
    
    console.log(`✅ [PERF] 시너지 조합 최적화 완료: ${combinationCount}개 조합 분석 (제한: ${MAX_COMBINATIONS})`);
    
    return recommendations;
  }

  // 조합 생성 헬퍼 함수
  generateCombinations(characters, size, callback, start = 0, current = []) {
    if (current.length === size) {
      callback([...current]);
      return;
    }

    for (let i = start; i < characters.length; i++) {
      current.push(characters[i]);
      this.generateCombinations(characters, size, callback, i + 1, current);
      current.pop();
    }
  }

  // 시너지 타입별 캐릭터 그룹화
  groupCharactersBySynergy(characters) {
    const groups = {};
    
    // 시너지 그룹 구조 초기화
    Object.keys(this.synergyGroups).forEach(type => {
      groups[type] = {
        typeName: this.synergyGroups[type].name,
        characters: []
      };
    });
    
    // 서포터 시너지 그룹 추가
    groups['support'] = {
      typeName: '서포터 시너지',
      characters: []
    };
    
    // 캐릭터별 시너지 그룹화
    characters.forEach(character => {
      // 서포터 역할 캐릭터는 서포터 그룹에만 추가
      if (character.role === 'support') {
        groups['support'].characters.push({
          name: character.name,
          className: character.className
        });
        return;
      }
      
      // 딜러 역할 캐릭터는 해당 시너지 그룹에 추가
      Object.keys(this.synergyGroups).forEach(synergyType => {
        const group = this.synergyGroups[synergyType];
        if (group.characters.includes(character.className)) {
          groups[synergyType].characters.push({
            name: character.name,
            className: character.className
          });
        }
      });
    });
    
    return groups;
  }
}

// 전역 인스턴스 생성
window.synergyChecker = new SynergyChecker();

// 전역 함수 노출
window.checkSynergyOverlap = (party) => {
  return window.synergyChecker.checkSynergyOverlap(party);
};

window.calculateSynergyEfficiency = (party) => {
  return window.synergyChecker.calculateSynergyEfficiency(party);
};

window.getSynergyBetween = (char1, char2) => {
  return window.synergyChecker.getSynergyBetween(char1, char2);
};

window.recommendOptimalParty = (characters, size) => {
  return window.synergyChecker.recommendOptimalParty(characters, size);
};

window.getPartySynergyComposition = (party) => {
  return window.synergyChecker.getPartySynergyComposition(party);
};

window.comparePartySynergies = (party1, party2) => {
  return window.synergyChecker.comparePartySynergies(party1, party2);
};

window.predictSynergyOverlap = (currentParty, newCharacter) => {
  return window.synergyChecker.predictSynergyOverlap(currentParty, newCharacter);
};

console.log('✅ Synergy Checker loaded');

// 테스트 함수
window.testSynergyChecker = function() {
  // 테스트용 캐릭터 데이터 (포지션 포함)
  const testCharacters = [
    { name: '캐릭터1', className: '건슬링어', role: 'dps' },
    { name: '캐릭터2', className: '스트라이커', role: 'dps' },
    { name: '캐릭터3', className: '바드', role: 'support' },
    { name: '캐릭터4', className: '도화가', role: 'dps' }, // 딜러 포지션 도화가
    { name: '캐릭터5', className: '도화가', role: 'support' }, // 서포터 포지션 도화가
    { name: '캐릭터6', className: '디스트로이어', role: 'dps' },
    { name: '캐릭터7', className: '블래스터', role: 'dps' },
    { name: '캐릭터8', className: '발키리', role: 'support' },
    { name: '캐릭터9', className: '발키리', role: 'dps' }, // 딜러 포지션 발키리
    { name: '캐릭터10', className: '홀리나이트', role: 'support' },
    { name: '캐릭터11', className: '홀리나이트', role: 'dps' }, // 딜러 포지션 홀리나이트
    { name: '캐릭터12', className: '버서커', role: 'dps' },
    { name: '캐릭터13', className: '소서리스', role: 'dps' },
    { name: '캐릭터14', className: '블레이드', role: 'dps' },
    { name: '캐릭터15', className: '워로드', role: 'dps' }
  ];

  console.log('🧪 파티 단위 시너지 체커 테스트 시작...');
  
  // 1. 파티별 시너지 구성 확인
  console.log('\n� 파티별 시너지 구성 확인:');
  const party1 = [testCharacters[0], testCharacters[1], testCharacters[6], testCharacters[7]]; // 건슬링어, 스트라이커, 블래스터, 발키리(서폿)
  const party2 = [testCharacters[2], testCharacters[4], testCharacters[8], testCharacters[9]]; // 바드(서폿), 도화가(서폿), 발키리(딜러), 홀리나이트(서폿)
  const party3 = [testCharacters[3], testCharacters[5], testCharacters[10], testCharacters[11]]; // 도화가(딜러), 디스트로이어, 홀리나이트(딜러), 버서커
  
  const composition1 = getPartySynergyComposition(party1);
  const composition2 = getPartySynergyComposition(party2);
  const composition3 = getPartySynergyComposition(party3);
  
  console.log('1파티 시너지 구성:', composition1);
  console.log('2파티 시너지 구성:', composition2);
  console.log('3파티 시너지 구성:', composition3);

  // 2. 파티 간 시너지 비교
  console.log('\n🔍 파티 간 시너지 비교:');
  const comparison1_2 = comparePartySynergies(party1, party2);
  const comparison1_3 = comparePartySynergies(party1, party3);
  const comparison2_3 = comparePartySynergies(party2, party3);
  
  console.log('1파티 vs 2파티 비교:', comparison1_2);
  console.log('1파티 vs 3파티 비교:', comparison1_3);
  console.log('2파티 vs 3파티 비교:', comparison2_3);

  // 3. 효율성 분석
  console.log('\n� 파티 효율성 분석:');
  console.log(`1파티 효율성: ${comparison1_2.efficiency.efficiency}점 (${comparison1_2.efficiency.grade}등급)`);
  console.log(`2파티 효율성: ${comparison1_2.efficiency.efficiency}점 (${comparison1_2.efficiency.grade}등급)`);
  console.log(`3파티 효율성: ${comparison2_3.efficiency.efficiency}점 (${comparison2_3.efficiency.grade}등급)`);

  // 4. 중복 시너지 상세 분석
  console.log('\n⚠️ 중복 시너지 상세 분석:');
  if (comparison1_2.overlappingSynergies.length > 0) {
    console.log('1파티 vs 2파티 중복 시너지:');
    comparison1_2.overlappingSynergies.forEach(overlap => {
      console.log(`  ${overlap.synergyName}: 1파티 ${overlap.party1Count}개, 2파티 ${overlap.party2Count}개 (총 ${overlap.totalOverlap}개)`);
    });
  } else {
    console.log('1파티 vs 2파티: 중복 시너지 없음 (최적!)');
  }

  // 5. 포지션별 시너지 구성 테스트
  console.log('\n🎭 포지션별 시너지 구성 테스트:');
  const dpsParty = [testCharacters[3], testCharacters[5], testCharacters[11], testCharacters[12]]; // 도화가(딜러), 디스트로이어, 홀리나이트(딜러), 버서커
  const supportParty = [testCharacters[2], testCharacters[4], testCharacters[7], testCharacters[8]]; // 바드(서폿), 도화가(서폿), 발키리(서폿), 발키리(딜러)
  
  const dpsComposition = getPartySynergyComposition(dpsParty);
  const supportComposition = getPartySynergyComposition(supportParty);
  
  console.log('딜러 위주 파티 시너지:', dpsComposition);
  console.log('서포터 위주 파티 시너지:', supportComposition);

  // 6. 최적 파티 추천 (전체 캐릭터 중)
  console.log('\n🎯 최적 파티 추천:');
  const recommendations = recommendOptimalParty(testCharacters, 4);
  recommendations.forEach((rec, index) => {
    console.log(`\n#${index + 1} 추천 (효율성 점수: ${rec.efficiencyScore})`);
    console.log('파티:', rec.combination.map(c => `${c.name}(${c.className}, ${c.role})`));
    console.log('추천:', rec.recommendation);
  });

  console.log('\n✅ 테스트 완료! 콘솔에서 결과를 확인하세요.');
};

// 실제 사용 예시 함수
window.checkCurrentPartySynergy = function() {
  if (!state.expeditionSlots) {
    console.error('원정대 데이터가 없습니다.');
    return;
  }

  // 원정대에서 사용 가능한 캐릭터들 가져오기
  const availableCharacters = [];
  state.expeditionSlots.forEach((slot, slotIndex) => {
    if (Array.isArray(slot)) {
      slot.forEach(char => {
        if (char && char.name) {
          availableCharacters.push({
            name: char.name,
            className: char.className
          });
        }
      });
    }
  });

  if (availableCharacters.length < 2) {
    console.error('시너지 체크를 위해서는 최소 2명의 캐릭터가 필요합니다.');
    return;
  }

  console.log(`🎯 시너지 체크 시작...`);
  console.log(`사용 가능한 캐릭터: ${availableCharacters.length}명`);

  // 현재 파티 구성이 있다면 체크
  if (state.raidTabs && state.selectedRaid) {
    const currentRaid = state.raidTabs[state.selectedRaid.id];
    if (currentRaid) {
      Object.keys(currentRaid).forEach(difficultyId => {
        const parties = currentRaid[difficultyId];
        if (Array.isArray(parties)) {
          parties.forEach((party, partyIndex) => {
            if (party.members && party.members.length > 0) {
              const validMembers = party.members.filter(m => m !== null);
              if (validMembers.length >= 2) {
                const partyCharacters = validMembers.map(member => ({
                  name: member.name,
                  className: member.className
                }));
                
                const overlap = checkSynergyOverlap(partyCharacters);
                const efficiency = calculateSynergyEfficiency(partyCharacters);
                
                console.log(`\n📋 ${state.selectedRaid.name} ${difficultyId} 파티${partyIndex + 1}:`);
                console.log('구성:', partyCharacters.map(c => `${c.name}(${c.className})`));
                console.log('시너지 중복:', overlap);
                console.log('효율성 점수:', efficiency.efficiencyScore);
                console.log('추천:', efficiency.recommendation);
              }
            }
          });
        }
      });
    }
  }

  // 최적 파티 추천
  if (availableCharacters.length >= 4) {
    console.log('\n🎯 최적 파티 추천:');
    const recommendations = recommendOptimalParty(availableCharacters, 4);
    recommendations.forEach((rec, index) => {
      console.log(`\n#${index + 1} (효율성 점수: ${rec.efficiencyScore})`);
      console.log('파티:', rec.combination.map(c => `${c.name}(${c.className})`));
      if (rec.overlaps.length > 0) {
        console.log('중복 시너지:', rec.overlaps.map(o => `${o.typeName} (${o.count}개)`));
      }
    });
  }

  return {
    availableCharacters: availableCharacters.length,
    synergyGroups: window.synergyChecker.groupCharactersBySynergy(availableCharacters)
  };
};

// 전역으로 노출
window.synergyChecker = new SynergyChecker();
