# 로스트아크 스타일 2D 웹 게임 - 요구사항

## 프로젝트 개요
Phaser 기반 2D 웹 게임 (로스트아크 스타일 쿼터뷰 느낌 액션 RPG), 싱글 플레이 기준 개발, 추후 4인 멀티 확장 고려

## 아키텍처 요구사항
- 상태(state) 기반 구조 사용
- input / systems / render 완전 분리
- Phaser는 render 계층에서만 사용
- 게임 로직은 systems에만 작성
- 동일한 systems 코드를 서버(Node.js)로 옮길 수 있게 작성
- 클라이언트는 입력/렌더링 역할만 하도록 설계

## 기능 요구사항

### 1. 기본 시스템
- 마우스 클릭 이동 (target 좌표 기반 이동)
- 플레이어 이동 로직 (벡터 정규화 기반)
- 충돌 감지 (AABB 방식)
- 기본 몬스터 1종 (플레이어 추적 AI)

### 2. 스킬 시스템
- 쿨타임 존재
- 범위 공격 (원형 범위)
- state 기반으로 동작
- systems 레이어에서 처리
- render는 이펙트만 담당

### 3. Firebase 연동
- Firebase Authentication으로 로그인
- Firestore에 플레이어 데이터 저장
- 저장 데이터: level, hp, position(x,y)
- 저장은 주기적(10초) 또는 이벤트 기반
- 게임 로직은 Firebase에 의존하지 않도록 설계
- state → Firebase 단방향 저장 구조

### 4. 마을 및 NPC
- 마을 존(zone) 구현
- NPC 엔티티 (상인, 대장장이, 가이드 등)
- NPC 상호작용 시스템 (거리 기반)
- 대화 텍스트 표시

## 상태 구조
- **player**: x, y, targetX, targetY, hp, level, skills (nova: cooldown, remaining, radius, damage)
- **monsters**: 배열 (id, x, y, targetX, targetY, hp)
- **map**: width, height, colliders[] (충돌 데이터)
- **town**: id, name, npcs[] (id, x, y, name, role)
- **interactions**: targetNpcId, dialog
- **actions**: castNova, interact
- **effects**: [] (렌더용 이펙트 큐)

## 코드 구조
- **src/core/**: GameLoop.js
- **src/state/**: GameState.js
- **src/systems/**: InputSystem, MovementSystem, AISystem, CollisionSystem, SkillSystem, NPCSystem
- **src/entities/**: player.js, monster.js, npc.js
- **src/input/**: InputHandler.js
- **src/render/**: PhaserRenderer.js
- **src/physics/**: aabb.js
- **src/services/**: firebase.js, playerStore.js

## 중요 제약
- Phaser 객체를 state에 넣지 말 것
- render에서 로직 처리 금지
- input은 상태 변경만 수행
- 모든 게임 계산은 systems에서 수행
- 게임 로직은 Firebase에 의존하지 않도록 설계
- 정적 페이지에서 구동 (바닐라JS 기준)

## 조작 방법
- **LMB**: 클릭 이동
- **Q**: Nova 스킬
- **E**: NPC 상호작용
