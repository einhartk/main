// Realtime Sync Manager
class RealtimeSync {
    constructor() {
        this.isConnected = false;
        this.syncCode = null;
        this.dbRef = null;
        this.currentUser = null;
        this.userRef = null;
        this.presenceInterval = null;
        this.lastSyncTime = 0;
        this.currentSlotLock = null;
        this.slotLockHeartbeat = null;
        this.editLockTimeout = null;
        this.lastBroadcastId = null; // 마지막 수신 공지 ID
        this.isEditing = false; // 편집 상태
        this.editingUser = null; // 현재 편집 중인 사용자
        // 변경 시에만 동기화: 마지막으로 보낸 payload (에코 스킵 + 더티 체크용)
        this._lastPushedRt = null;
        this._lastPushedEs = null;
        this._lastPushedEsn = null;
        this._lastPushedAt = 0;
        this.pageVisibility = null;
        this.isPageActive = true;
        this.lastActivityTime = Date.now();
        this.staleTabThreshold = 5 * 60 * 1000; // 5분
        this.heartbeatInterval = 30000; // 기본 30초
        this.inactiveHeartbeatInterval = 120000; // 비활성 시 2분
    }

    // userId에서 브라우저/기기 suffix를 제거한 "base user" 키
    // 예: User_1234567890_abcdef_xyzBrowser -> User_1234567890_abcdef
    getBaseUserKey(userId) {
        const raw = String(userId || '');
        if (!raw) return '';
        
        // 기본 사용자 ID 형식: User_<timestamp>_<random>
        // 브라우저 ID는 마지막에 추가되므로 제거
        const parts = raw.split('_');
        if (parts.length >= 3) {
            // 처음 3개 부분만 사용 (User + timestamp + random)
            return parts.slice(0, 3).join('_');
        }
        return raw;
    }

    encodeSlotKey(slotKey) {
        return String(slotKey || '').replace(/[.#$\[\]/]/g, '_');
    }

    async acquireSlotLock(slotKey, ttlMs = 45000) {
        if (!this.isConnected || !this.dbRef) return true;
        if (!slotKey) return false;

        const encodedKey = this.encodeSlotKey(slotKey);
        const lockRef = this.dbRef.child('slotLocks').child(encodedKey);

        const me = this.currentUser;
        const meBase = this.getBaseUserKey(me);

        try {
            const res = await lockRef.transaction((current) => {
                const now = Date.now();
                if (!current) {
                    return { user: me, baseUser: meBase, ts: now, ttlMs };
                }

                const ts = current.ts || 0;
                const curTtl = current.ttlMs || ttlMs;
                const expired = now - ts > curTtl;
                if (expired) {
                    return { user: me, baseUser: meBase, ts: now, ttlMs };
                }

                const ownerBase = current.baseUser || this.getBaseUserKey(current.user);
                if (ownerBase && meBase && ownerBase === meBase) {
                    return { ...current, user: me, baseUser: meBase, ts: now, ttlMs: curTtl };
                }

                return;
            });

            if (!res.committed) {
                return false;
            }

            this.currentSlotLock = { key: slotKey, ref: lockRef };
            lockRef.onDisconnect().remove();

            if (this.slotLockHeartbeat) {
                clearInterval(this.slotLockHeartbeat);
                this.slotLockHeartbeat = null;
            }
            this.slotLockHeartbeat = setInterval(() => {
                try {
                    lockRef.update({ ts: Date.now(), user: me, baseUser: meBase });
                } catch (_) {}
            }, 10000);

            return true;
        } catch (e) {
            console.error('❌ [SLOT LOCK] acquire failed', e);
            return false;
        }
    }

    async releaseSlotLock(slotKey) {
        if (!this.isConnected || !this.dbRef) return;

        const keyToRelease = slotKey || (this.currentSlotLock ? this.currentSlotLock.key : null);
        if (!keyToRelease) return;

        const encodedKey = this.encodeSlotKey(keyToRelease);
        const lockRef = this.dbRef.child('slotLocks').child(encodedKey);
        const meBase = this.getBaseUserKey(this.currentUser);
        const isMyLock = this.currentSlotLock && this.currentSlotLock.key === keyToRelease;

        try {
            const snap = await lockRef.once('value');
            const v = snap.val();
            const ownerBase = v?.baseUser || this.getBaseUserKey(v?.user);
            const ownerMatch = v && ownerBase && meBase && ownerBase === meBase;
            // 본인 소유로 확인되거나, 이 클라이언트가 획득한 락이면 반드시 제거 (제약 실패 등 조기 return 시 락 해제 보장)
            if (ownerMatch || isMyLock) {
                await lockRef.remove();
            }
        } catch (e) {
            console.error('❌ [SLOT LOCK] release failed', e);
        } finally {
            if (this.slotLockHeartbeat) {
                clearInterval(this.slotLockHeartbeat);
                this.slotLockHeartbeat = null;
            }
            if (this.currentSlotLock && this.currentSlotLock.key === keyToRelease) {
                this.currentSlotLock = null;
            }
        }
    }

    async isSlotLockedByOther(slotKey, ttlFallbackMs = 45000) {
        if (!this.isConnected || !this.dbRef) return false;
        if (!slotKey) return false;

        const encodedKey = this.encodeSlotKey(slotKey);
        const lockRef = this.dbRef.child('slotLocks').child(encodedKey);

        try {
            const snap = await lockRef.once('value');
            const v = snap.val();
            if (!v || !v.user) return false;

            const now = Date.now();
            const ts = v.ts || 0;
            const ttl = v.ttlMs || ttlFallbackMs;
            if (now - ts > ttl) {
                await lockRef.remove();
                return false;
            }

            const ownerBase = v.baseUser || this.getBaseUserKey(v.user);
            const meBase = this.getBaseUserKey(this.currentUser);
            if (ownerBase && meBase && ownerBase === meBase) return false;

            return true;
        } catch (e) {
            console.error('❌ [SLOT LOCK] check failed', e);
            return false;
        }
    }

    // 현재 사용자 정보 가져오기
    getCurrentUser() {
        // 기존 사용자 ID 확인
        let storedUser = localStorage.getItem('currentUser');
        
        // 기존 ID가 있으면 고유 ID 생성
        if (storedUser) {
            // 브라우저/기기별 고유 ID 추가
            const browserId = this.getBrowserId();
            const uniqueId = `${storedUser}_${browserId}`;
            
            // localStorage에 고유 ID 저장
            localStorage.setItem('uniqueUserId', uniqueId);
            return uniqueId;
        }
        
        // 새로운 사용자 ID 생성
        const newUser = `User_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('currentUser', newUser);
        
        // 브라우저/기기별 고유 ID 추가
        const browserId = this.getBrowserId();
        const uniqueId = `${newUser}_${browserId}`;
        
        localStorage.setItem('uniqueUserId', uniqueId);
        return uniqueId;
    }
    
    // 브라우저/기기별 고유 ID 생성
    getBrowserId() {
        let browserId = localStorage.getItem('browserId');
        
        if (!browserId) {
            // 랜덤 ID 생성
            browserId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('browserId', browserId);
        }
        
        return browserId;
    }

    // URL에서 동기화 코드 추출
    getSyncCode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('syncCode') || urlParams.get('code');
    }

    // 실시간 동기화 초기화
    init(syncCode) {
        this.syncCode = syncCode;
        // Realtime Database 사용으로 복원
        this.dbRef = realtimeDB.ref(`syncSessions/${syncCode}`);
        
                
        // 데이터 변경 감지 리스너
        // IMPORTANT: 루트(value) 구독은 editLock/users 같은 부수 데이터 변경에도 매번 호출되어
        //            아직 업데이트되지 않은 d(이전 값)로 UI가 롤백되는 문제가 생김.
        //            그래서 실제 데이터 노드(d)만 구독한다.
        this.dbRef.child('d').on('value', (snapshot) => {
            const d = snapshot.val();
            if (!d) return;
            this.handleRemoteUpdate({ d });
        });

        // Legacy wrapper 지원: syncSessions/<code>/raidData/d
        this.dbRef.child('raidData').child('d').on('value', (snapshot) => {
            const d = snapshot.val();
            if (!d) return;
            this.handleRemoteUpdate({ d });
        });
        
        // 공지 수신 리스너
        this.dbRef.child('broadcast').on('value', (snapshot) => {
            const notification = snapshot.val();
            if (notification && notification.isBroadcast) {
                const now = Date.now();
                
                // 만료된 공지는 무시하고 삭제
                if (notification.expiry && now > notification.expiry) {
                    this.dbRef.child('broadcast').remove();
                    return;
                }

                // 중복 수신 방지: 같은 ID의 공지는 다시 표시하지 않음
                if (this.lastBroadcastId !== notification.id) {
                    this.lastBroadcastId = notification.id;
                    this.handleBroadcastNotification(notification);

                    setTimeout(() => {
                        this.dbRef.child('broadcast').remove();
                    }, 1000);
                }
            }
        });
        
        // 사용자 접속 정보 등록
        this.registerUserPresence();
        
        // 접속 상태 표시
        this.showSyncStatus();
        
        // 자동 동기화 설정
        this.setupAutoSync();
        
        // 페이지 가시성 감지 설정
        this.setupPageVisibilityDetection();
        
        this.isConnected = true;
    }

    // 원격 데이터 처리 - 역직렬화 버전 (오래된 탭 방지 강화)
    handleRemoteUpdate(data) {
        if (!data) return;
        if (!data.d) return;

        const compressedData = data.d;
        const now = Date.now();
        
        // 오래된 탭에서의 동기화 방지: 10분 이상 비활성 상태였으면 동기화 건너뛰기
        const inactiveTime = now - this.lastActivityTime;
        if (inactiveTime > 10 * 60 * 1000 && !this.isPageActive) {
            return;
        }
        
        // 우리가 방금 보낸 업데이트 에코면 스킵 (불필요한 파싱/리렌더·메모리 절감)
        if (this._lastPushedAt && (now - this._lastPushedAt) < 4000 &&
            compressedData.rt === this._lastPushedRt &&
            compressedData.es === this._lastPushedEs &&
            compressedData.esn === this._lastPushedEsn) {
            return;
        }

        // 역직렬화
        if (compressedData.rt) {
            try {
                state.raidTabs = JSON.parse(compressedData.rt);
            } catch (error) {
                console.error('❌ [SYNC] Failed to parse raidTabs:', error);
            }
        }
        
        if (compressedData.rt) {
            try {
                const raidTabs = JSON.parse(compressedData.rt);
                let totalParties = 0;
                
                Object.keys(raidTabs).forEach(raidId => {
                    const difficulties = raidTabs[raidId];
                    Object.keys(difficulties).forEach(difficultyId => {
                        const parties = difficulties[difficultyId] || [];
                        totalParties += parties.length;
                        
                        parties.forEach((party, partyIndex) => {
                            // 공격대 로드
                        });
                    });
                });
                
                // 전체 공격대 로드 완료
            } catch (error) {
                console.error('❌ [SYNC] 공격대 정보 로드 실패:', error);
            }
        }
        if (compressedData.es) {
            try {
                state.expeditionSlots = JSON.parse(compressedData.es);
            } catch (error) {
                console.error('❌ [SYNC] Failed to parse expeditionSlots:', error);
            }
        }
        if (compressedData.esn) {
            try {
                state.expeditionSlotNames = JSON.parse(compressedData.esn);
            } catch (error) {
                console.error('❌ [SYNC] Failed to parse expeditionSlotNames:', error);
                state.expeditionSlotNames = Array.from({length:8}, (_, i) => `원정대 ${i + 1}`);
            }
        } else {
            state.expeditionSlotNames = Array.from({length:8}, (_, i) => `원정대 ${i + 1}`);
        }

        // UI 업데이트 (무한 루프 방지)
        this.updateUISafely();
        
        // 사용자 알림 (저장 구조에 따라 u 위치가 다를 수 있음)
        const updateUser = (data && data.d && data.d.u) ? data.d.u : data.u;
        this.showUpdateNotification(updateUser);
    }

    // 업데이트 알림 (간단/안전 버전)
    showUpdateNotification(updateUser) {
        try {
            if (!updateUser) return;
            if (updateUser === this.currentUser) return;

            // 조용히 처리 (UI 토스트 등은 추후 확장 가능)
        } catch (e) {}
    }

    // 안전한 UI 업데이트 (무한 루프 방지)
    updateUISafely() {
        try {
            // 무한 루프 방지를 위해 임시로 동기화 비활성화
            const wasConnected = this.isConnected;
            this.isConnected = false;
            
            renderRaidTabs();
            renderRaidParties();
            renderExpedition();
            
            // 원정대 관리 모달이 열려있으면 모달 내용도 업데이트
            const expeditionModal = document.getElementById('expeditionModal');
            if (expeditionModal && expeditionModal.classList.contains('show')) {
                if (typeof renderExpeditionModal === 'function') {
                    renderExpeditionModal();
                }
            }
            
            // 다시 동기화 활성화
            this.isConnected = wasConnected;
        } catch (error) {
            console.error('❌ [SYNC] UI update error:', error);
        }
    }

    // 사용자 접속 정보 등록 (Realtime Database)
    registerUserPresence() {
        this.userRef = this.dbRef.child('users').push();
        const userData = {
            name: this.getDisplayName(), // 표시 이름
            uniqueId: this.currentUser, // 고유 ID
            joinedAt: Date.now(),
            lastSeen: Date.now(),
            color: this.getUserColor(),
            isActive: this.isPageActive,
            pageVisibility: this.pageVisibility,
            tabId: this.getBrowserId() // 탭별 고유 ID
        };
        
        this.userRef.set(userData);
        
        // 접속 종료 시 정리
        this.userRef.onDisconnect().remove();
        
        // 주기적으로 활동 시간 업데이트
        this.presenceInterval = setInterval(() => {
            if (this.isConnected) {
                this.updatePresence();
            }
        }, this.heartbeatInterval);
        
            }
    
    // 페이지 가시성 감지 설정
    setupPageVisibilityDetection() {
        // 페이지 가시성 변경 감지
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // 페이지 활동 감지 (마우스, 키보드)
        ['mousedown', 'keydown', 'scroll', 'click'].forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivityTime = Date.now();
                if (!this.isPageActive) {
                    this.isPageActive = true;
                    this.adjustHeartbeatInterval();
                }
            }, { passive: true });
        });
        
        // 주기적으로 비활성 상태 체크
        setInterval(() => {
            this.checkInactivity();
        }, 60000); // 1분마다 체크
    }
    
    // 가시성 변경 처리
    handleVisibilityChange() {
        this.isPageActive = !document.hidden;
        this.pageVisibility = !document.hidden;
        
        if (this.isPageActive) {
            // 페이지가 활성화되면 데이터 동기화 확인
            this.verifyDataFreshness();
        }
        
        this.adjustHeartbeatInterval();
        this.updateUserPresence();
    }
    
    // 비활성 상태 체크
    checkInactivity() {
        const now = Date.now();
        const inactiveTime = now - this.lastActivityTime;
        
        if (inactiveTime > this.staleTabThreshold && this.isPageActive) {
            this.isPageActive = false;
            this.adjustHeartbeatInterval();
            this.showStaleTabWarning();
        }
    }
    
    // 하트비트 간격 조정
    adjustHeartbeatInterval() {
        const newInterval = this.isPageActive ? this.heartbeatInterval : this.inactiveHeartbeatInterval;
        
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
        }
        
        this.presenceInterval = setInterval(() => {
            if (this.isConnected) {
                this.updatePresence();
            }
        }, newInterval);
    }
    
    // 사용자 접속 정보 업데이트
    updatePresence() {
        if (this.userRef) {
            this.userRef.update({ 
                lastSeen: Date.now(),
                isActive: this.isPageActive,
                pageVisibility: this.pageVisibility
            });
        }
    }
    
    // 사용자 접속 정보 업데이트 (상태 변경 시)
    updateUserPresence() {
        if (this.userRef) {
            this.userRef.update({
                isActive: this.isPageActive,
                pageVisibility: this.pageVisibility,
                lastSeen: Date.now()
            });
        }
    }
    
    // 데이터 신선도 확인
    async verifyDataFreshness() {
        if (!this.isConnected) return;
        
        try {
            const now = Date.now();
            const snapshot = await this.dbRef.child('a').once('value');
            const lastUpdateTime = snapshot.val() || 0;
            
            // 마지막 업데이트가 1분 이상이면 데이터 새로고침
            if (now - lastUpdateTime > 60000) {
                await this.forceDataRefresh();
            }
        } catch (error) {
            console.error('❌ [SYNC] Error verifying data freshness:', error);
        }
    }
    
    // 강제 데이터 새로고침
    async forceDataRefresh() {
        try {
            const snapshot = await this.dbRef.child('d').once('value');
            const data = snapshot.val();
            
            if (data) {
                this.handleRemoteUpdate({ d: data });
                this.showNotification('데이터가 새로고침되었습니다.', 'info');
            }
        } catch (error) {
            console.error('❌ [SYNC] Error refreshing data:', error);
        }
    }
    
    // 오래된 탭 경고 표시
    showStaleTabWarning() {
        this.showNotification(
            '오래된 탭입니다. 데이터 동기화를 위해 새로고침해주세요.', 
            'warning',
            10000
        );
    }
    
    // 알림 표시 함수
    showNotification(message, type = 'info', duration = 5000) {
        // 기존 알림이 있으면 제거
        const existingNotification = document.getElementById('syncNotification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.id = 'syncNotification';
        notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`; 
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-info-circle me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }
    
    // 표시 이름 가져오기
    getDisplayName() {
        // currentUser가 없으면 localStorage에서 가져오기
        if (!this.currentUser) {
            this.currentUser = this.getCurrentUser();
        }
        
        // 기본 사용자 ID만 사용 (고유 ID 제외)
        const baseUser = this.getBaseUserKey(this.currentUser);
        
        // 기본 사용자 ID가 없으면 localStorage에서 기본 ID 가져오기
        const displayName = baseUser || localStorage.getItem('currentUser') || 'User';
        
        // 이름이 너무 길면 줄이기
        if (displayName.length > 20) {
            const parts = displayName.split('_');
            if (parts.length >= 3) {
                return `${parts[0]}_${parts[1].slice(-4)}_${parts[2].slice(0, 6)}`;
            }
        }
        
        return displayName;
    }
    
    // 사용자 색상 생성
    getUserColor() {
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#6c757d'];
        
        // currentUser가 없으면 localStorage에서 가져오기
        if (!this.currentUser) {
            this.currentUser = this.getCurrentUser();
        }
        
        const baseUser = this.getBaseUserKey(this.currentUser) || this.currentUser || 'User';
        const hash = baseUser.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }

    // 충돌 감지 및 잠금 기능
    async checkEditLock() {
        if (!this.isConnected) return true;
        
        try {
            const lockRef = this.dbRef.child('editLock');
            const snapshot = await lockRef.once('value');
            const lockData = snapshot.val();
            
            if (lockData && lockData.user) {
                const now = Date.now();
                const lockTime = lockData.timestamp || 0;
                const lockTimeout = 30000; // 30초 타임아웃
                
                // 잠금 시간이 지났 경우 잠금 해제
                if (now - lockTime > lockTimeout) {
                    await lockRef.remove();
                                        return true;
                }
                
                // 다른 사용자가 편집 중인 경우
                const lockOwnerBase = this.getBaseUserKey(lockData.user);
                const meBase = this.getBaseUserKey(this.currentUser);

                // base user가 다를 때만 타인으로 간주
                if (lockOwnerBase && meBase && lockOwnerBase !== meBase) {
                                        return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ [SYNC] Error checking edit lock:', error);
            return true; // 에러 시 편집 허용
        }
    }
    
    // 편집 잠금 설정
    async setEditLock() {
        if (!this.isConnected) return;
        
        try {
            const lockRef = this.dbRef.child('editLock');
            await lockRef.set({
                user: this.currentUser,
                timestamp: Date.now()
            });
            
            this.isEditing = true;
            this.editingUser = this.currentUser;
            
            // 잠금 타임아웃 설정 (30초 후 자동 해제)
            this.editLockTimeout = setTimeout(() => {
                this.clearEditLock();
            }, 30000);
            
                    } catch (error) {
            console.error('❌ [SYNC] Error setting edit lock:', error);
        }
    }
    
    // 편집 잠금 해제
    async clearEditLock() {
        if (!this.isConnected) return;
        
        try {
            const lockRef = this.dbRef.child('editLock');
            await lockRef.remove();
            
            this.isEditing = false;
            this.editingUser = null;
            
            if (this.editLockTimeout) {
                clearTimeout(this.editLockTimeout);
                this.editLockTimeout = null;
            }
            
                    } catch (error) {
            console.error('❌ [SYNC] Error clearing edit lock:', error);
        }
    }

    // 자동 동기화 설정
    setupAutoSync() {
                
        // 기존 렌더링 함수를 래핑하여 동기화 추가 (자동 저장 제거)
        const originalRenderRaidParties = window.renderRaidParties;
        window.renderRaidParties = function() {
            originalRenderRaidParties.apply(this, arguments);
            // 자동 저장 제거 - 사용자가 직접 저장해야 함
        };
        
        const originalRenderExpedition = window.renderExpedition;
        window.renderExpedition = function() {
            originalRenderExpedition.apply(this, arguments);
            // 자동 저장 제거 - 사용자가 직접 저장해야 함
        };
        
            }

    // Firebase에 데이터 동기화 (Realtime Database) - 변경이 있을 때만 전송 (오래된 탭 방지)
    syncToFirebase() {
        if (!this.isConnected) return;
        
        // 오래된 탭에서의 동기화 방지
        const inactiveTime = Date.now() - this.lastActivityTime;
        if (inactiveTime > 10 * 60 * 1000 && !this.isPageActive) {
            return Promise.resolve();
        }

        const serializedRaidTabs = JSON.stringify(state.raidTabs);
        const serializedExpedition = JSON.stringify(state.expeditionSlots);
        const serializedExpeditionSlotNames = JSON.stringify(state.expeditionSlotNames);

        // 수정된 내역이 없으면 전송 스킵 (메모리·트래픽 절감)
        if (this._lastPushedRt === serializedRaidTabs &&
            this._lastPushedEs === serializedExpedition &&
            this._lastPushedEsn === serializedExpeditionSlotNames) {
            return Promise.resolve();
        }

        const compressedData = {
            rt: serializedRaidTabs,
            es: serializedExpedition,
            esn: serializedExpeditionSlotNames,
            t: Date.now(),
            u: this.currentUser
        };

        this._lastPushedRt = serializedRaidTabs;
        this._lastPushedEs = serializedExpedition;
        this._lastPushedEsn = serializedExpeditionSlotNames;
        this._lastPushedAt = Date.now();

        if (window.transactionManager) {
            return window.transactionManager.syncTransaction(compressedData);
        }
        const p = this.dbRef.update({
            d: compressedData,
            a: Date.now()
        });
        this.lastSyncTime = Date.now();
        return p;
    }

    // 편집 잠금을 활용한 동기화 (CRUD 발생 시 즉시 저장용)
    async syncToFirebaseWithLock() {
        if (!this.isConnected) return false;

        const canEdit = await this.checkEditLock();
        if (!canEdit) {
            return false;
        }

        try {
            await this.setEditLock();
            await this.syncToFirebase();
            await this.clearEditLock();
            return true;
        } catch (e) {
            console.error('❌ [SYNC] syncToFirebaseWithLock failed:', e);
            try {
                await this.clearEditLock();
            } catch (_) {}
            return false;
        }
    }

    // 동기화 상태 표시
    showSyncStatus() {
        const syncStatus = document.getElementById('syncStatus');
        const syncCodeDisplay = document.getElementById('syncCodeDisplay');
        
        if (syncStatus && syncCodeDisplay) {
            syncStatus.style.display = 'block';
            syncCodeDisplay.textContent = this.syncCode;
            
            // 접속 중인 사용자 목록 업데이트
            this.updateConnectedUsers();
        }
    }

    // 접속 중인 사용자 목록 업데이트 (Realtime Database)
    updateConnectedUsers() {
        const connectedUsers = document.getElementById('connectedUsers');
        if (!connectedUsers) return;
        
        // 기존 리스너가 있으면 제거
        if (this.usersListener) {
            this.dbRef.child('users').off('value', this.usersListener);
        }
        
        // 실시간 리스너 설정
        this.usersListener = (snapshot) => {
            const users = snapshot.val();
            if (users) {
                // 중복 사용자 제거 (같은 기본 사용자 이름)
                const uniqueUsers = {};
                Object.values(users).forEach(user => {
                    // 같은 baseUser가 여러 탭에 있으면 가장 활성적인 것만 표시
                    const baseUser = this.getBaseUserKey(user.uniqueId);
                    if (!uniqueUsers[baseUser] || 
                        (user.isActive && !uniqueUsers[baseUser].isActive) ||
                        (user.lastSeen > uniqueUsers[baseUser].lastSeen)) {
                        uniqueUsers[baseUser] = user;
                    }
                });
                
                const userCount = Object.keys(uniqueUsers).length;
                const userNames = Object.values(uniqueUsers).map(user => user.name).join(', ');
                connectedUsers.innerHTML = `<small><span class="user-indicator"></span>${userCount}명 접속 중: ${userNames}</small>`;
            } else {
                connectedUsers.innerHTML = `<small><span class="user-indicator"></span>1명 접속 중: ${this.currentUser}</small>`;
            }
        };
        
        this.dbRef.child('users').on('value', this.usersListener);
    }
    
    // 랜덤 코드 생성
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 동기화 상태 확인
    checkConnectionStatus() {
        const status = {
            isConnected: this.isConnected,
            syncCode: this.syncCode,
            hasDbRef: !!this.dbRef,
            currentUser: this.currentUser,
            lastSyncTime: this.lastSyncTime
        };
        
                
        // UI에 상태 표시
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            const statusText = status.isConnected ? 
                `🟢 연결됨 (${status.syncCode})` : 
                `🔴 연결 안됨`;
            
            syncStatus.innerHTML = `
                <strong>실시간 동기화 상태:</strong> ${statusText}<br>
                <small>사용자: ${status.currentUser} | 마지막 동기화: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleTimeString() : '없음'}</small>
                <div id="connectedUsers"></div>
            `;
            
            if (status.isConnected) {
                this.updateConnectedUsers();
            }
        }
        
        return status;
    }

    // 동기화 테스트
    async testSync() {
        if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
                        return false;
        }
        
                
        try {
            // 테스트 데이터 전송
            const testData = {
                test: true,
                timestamp: Date.now(),
                user: window.realtimeSync.currentUser
            };
            
            await window.realtimeSync.dbRef.child('test').set(testData);
                        
            // 3초 후 데이터 확인
            setTimeout(() => {
                window.realtimeSync.dbRef.child('test').once('value', (snapshot) => {
                    if (snapshot.exists()) {
                                            }
                });
            }, 3000);
            
            return true;
        } catch (error) {
            console.error('❌ [SYNC TEST] 테스트 실패:', error);
            return false;
        }
    }

    // 전체 공지 전송 (시크릿 커맨드)
    async sendBroadcastNotification(message, type = 'info', duration = 5000) {
        if (!this.isConnected) {
            console.error('❌ [BROADCAST] 동기화가 연결되지 않았습니다.');
            return false;
        }

        try {
            const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const notification = {
                id: notificationId,
                message: message,
                type: type, // 'info', 'warning', 'error', 'success'
                timestamp: Date.now(),
                duration: duration,
                sender: this.currentUser,
                isBroadcast: true,
                expiry: Date.now() + 30000 // 30초 후 자동 만료
            };

            // 트랜잭션으로 공지 전송 (동시성 문제 해결)
            if (window.transactionManager) {
                await window.transactionManager.broadcastTransaction(notification);
            } else {
                // Fallback: 기존 방식
                await this.dbRef.child('broadcast').set(notification);
            }
            
            return true;
        } catch (error) {
            console.error('❌ [BROADCAST] 공지 전송 실패:', error);
            return false;
        }
    }

    // 공지 수신 처리
    handleBroadcastNotification(notification) {
        if (!notification || !notification.isBroadcast) return;

        // 자신이 보낸 공지는 표시하지 않음 (선택적)
        // if (notification.sender === this.currentUser) return;

        // 공지 모달 표시
        this.showBroadcastModal(notification);
    }

    // 공지 모달 표시
    showBroadcastModal(notification) {
        const modalId = `broadcastModal_${notification.id}`;
        
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const typeClasses = {
            'info': 'alert-info',
            'warning': 'alert-warning', 
            'error': 'alert-danger',
            'success': 'alert-success'
        };

        const typeIcons = {
            'info': 'bi-info-circle',
            'warning': 'bi-exclamation-triangle',
            'error': 'bi-x-circle', 
            'success': 'bi-check-circle'
        };

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi ${typeIcons[notification.type] || 'bi-info-circle'}"></i>
                                전체 공지
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert ${typeClasses[notification.type] || 'alert-info'} mb-0">
                                <div class="d-flex align-items-start">
                                    <i class="bi ${typeIcons[notification.type] || 'bi-info-circle'} me-2"></i>
                                    <div class="flex-grow-1">
                                        <p class="mb-1">${notification.message}</p>
                                        <small class="text-muted">
                                            전송자: ${notification.sender}<br>
                                            시간: ${new Date(notification.timestamp).toLocaleString()}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);
        
        // 모달 표시
        modal.show();
        
        // 자동 닫기 (duration이 0이 아닌 경우에만)
        if (notification.duration > 0) {
            setTimeout(() => {
                try {
                    modal.hide();
                    // 모달이 완전히 닫힌 후 제거
                    modalElement.addEventListener('hidden.bs.modal', () => {
                        modalElement.remove();
                    }, { once: true });
                } catch (e) {
                    // 에러 발생 시 강제 제거
                    modalElement.remove();
                }
            }, notification.duration);
        } else {
            // 수동 닫기 시 제거
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            }, { once: true });
        }
    }

    // 동기화 종료
    disconnect() {
        try {
            if (this.slotLockHeartbeat) {
                clearInterval(this.slotLockHeartbeat);
                this.slotLockHeartbeat = null;
            }
            if (this.currentSlotLock) {
                // best-effort release
                this.releaseSlotLock(this.currentSlotLock.key);
            }
        } catch (_) {}

        if (this.userRef) {
            this.userRef.remove();
        }
        
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
        }
        
        // 사용자 리스너 정리
        if (this.usersListener && this.dbRef) {
            this.dbRef.child('users').off('value', this.usersListener);
            this.usersListener = null;
        }
        
        if (this.dbRef) {
            this.dbRef.off();
            
            // 연결 해제 시 남아있는 공지 정리
            this.dbRef.child('broadcast').remove().catch(() => {
                // 실패해도 무시 (best-effort)
            });
        }
        
        this.isConnected = false;
        this.lastBroadcastId = null; // 공지 ID 초기화
        
        // 동기화 상태 숨김
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.style.display = 'none';
        }
    }

    // 동기화 상태 확인
    isSyncActive() {
        return this.isConnected && this.syncCode;
    }
}

// 전역 실시간 동기화 인스턴스 생성
window.realtimeSync = new RealtimeSync();

// 전역 함수로 노출
window.testSync = () => window.realtimeSync.testSync();
window.checkSyncStatus = () => window.realtimeSync.checkConnectionStatus();

// 🔥 **Firebase 히스토리 주기적 정리 (6시간마다)**
setInterval(async () => {
  if (window.realtimeSync && typeof window.realtimeSync.isSyncActive === 'function' && window.realtimeSync.isSyncActive()) {
    try {
      await cleanupFirebaseHistory();
    } catch (error) {
      console.error('🧹 [SYNC] Firebase 히스토리 주기적 정리 실패:', error);
    }
  }
}, 6 * 60 * 60 * 1000); // 6시간

// 페이지 로드 시 자동 실시간 동기화 시작
document.addEventListener('DOMContentLoaded', () => {
    // URL 파라미터 확인
    const syncCode = window.realtimeSync.getSyncCode();
    if (syncCode) {
                window.realtimeSync.init(syncCode);
    } else {
        // URL에 동기화 코드가 없으면 자동으로 세션 생성
                window.realtimeSync.createSession();
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.realtimeSync.isSyncActive()) {
        window.realtimeSync.disconnect();
    }
});
