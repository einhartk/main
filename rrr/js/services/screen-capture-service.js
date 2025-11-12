/**
 * 화면 캡처 및 텍스트 인식을 처리하는 서비스
 */
const ScreenCaptureService = {
    /**
     * 화면 캡처 및 텍스트 인식 실행
     * @returns {Promise<Object>} 캡처 및 인식 결과
     */
    async captureAndRecognize() {
        let stream = null;
        
        try {
            // 화면 캡처 스트림 가져오기
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'never',
                    displaySurface: 'window'
                },
                audio: false,
                preferCurrentTab: false
            });

            // 비디오 요소 생성 및 스트림 연결
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            
            // 1. 캐릭터명을 위한 중앙 영역 캡처 (화면 중앙 600x150 픽셀)
            const centerCanvas = document.createElement('canvas');
            const centerX = video.videoWidth / 2;
            const centerY = video.videoHeight / 2;
            const centerWidth = 600;
            const centerHeight = 150;
            
            centerCanvas.width = centerWidth;
            centerCanvas.height = centerHeight;
            const centerCtx = centerCanvas.getContext('2d');
            
            // 화면 중앙에서 캡처
            const centerRect = {
                x: Math.max(0, centerX - centerWidth/2),
                y: Math.max(0, centerY - centerHeight/2),
                width: centerWidth,
                height: centerHeight
            };
            
            centerCtx.drawImage(
                video,
                centerRect.x,
                centerRect.y,
                centerRect.width,
                centerRect.height,
                0,
                0,
                centerWidth,
                centerHeight
            );
            
            console.log(`[중앙 캡처 영역] X:${centerRect.x}, Y:${centerRect.y}, 너비:${centerWidth}, 높이:${centerHeight}`);
            
            // 2. 왼쪽 상단 영역 캡처 (카던/가토 체크용, 400x200 픽셀)
            const topLeftCanvas = document.createElement('canvas');
            const topLeftWidth = 400;
            const topLeftHeight = 200;
            
            topLeftCanvas.width = topLeftWidth;
            topLeftCanvas.height = topLeftHeight;
            const topLeftCtx = topLeftCanvas.getContext('2d');
            
            // 화면 왼쪽 상단에서 캡처
            const topLeftRect = {
                x: 0,
                y: 0,
                width: topLeftWidth,
                height: topLeftHeight
            };
            
            topLeftCtx.drawImage(
                video,
                topLeftRect.x,
                topLeftRect.y,
                topLeftRect.width,
                topLeftRect.height,
                0,
                0,
                topLeftWidth,
                topLeftHeight
            );
            
            console.log(`[좌상단 캡처 영역] X:${topLeftRect.x}, Y:${topLeftRect.y}, 너비:${topLeftWidth}, 높이:${topLeftHeight}`);
            
            // 3. OCR로 텍스트 추출 (병렬 처리)
            console.log('텍스트 인식 중...');
            
            // 중앙 영역 (캐릭터명 인식)
            const centerResult = await Tesseract.recognize(
                centerCanvas,
                'kor+eng',
                {
                    logger: m => console.log('중앙 영역 OCR:', m.status),
                    tessedit_char_whitelist: '가-힣a-zA-Z0-9',
                    preserve_interword_spaces: true,
                    tessedit_pageseg_mode: 7,  // 단일 텍스트 행으로 처리
                }
            );
            
            // 왼쪽 상단 영역 (카던/가토 인식)
            const topLeftResult = await Tesseract.recognize(
                topLeftCanvas,
                'kor+eng',  // 영어도 포함하여 인식
                {
                    logger: m => console.log('좌상단 영역 OCR:', m.status),
                    tessedit_char_whitelist: '가디언토벌카오스던전 0123456789/',  // 공백, 숫자, 슬래시 추가
                    preserve_interword_spaces: true,
                    tessedit_pageseg_mode: 6,  // 흐름이 있는 단일 블록으로 처리 (7에서 변경)
                    tessedit_ocr_engine_mode: 3,  // 기본 + LSTM 엔진 사용
                    user_defined_dpi: 300,  // 더 높은 해상도로 처리
                    textord_min_linesize: 2.5,  // 작은 텍스트도 인식하도록 조정
                    tessedit_pageseg_autoonly: 0  // 자동 세그멘테이션 비활성화
                }
            );
            
            console.log('--- 인식 결과 ---');
            console.log('중앙 텍스트:', centerResult.data.text);
            console.log('좌상단 텍스트:', topLeftResult.data.text);
            
            return {
                centerText: centerResult.data.text,
                topLeftText: topLeftResult.data.text,
                success: true
            };
            
        } catch (error) {
            console.error('캡처 처리 중 오류:', error);
            return {
                success: false,
                error: this._getErrorMessage(error)
            };
        } finally {
            // 정리
            if (stream) {
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
        }
    },
    
    /**
     * 캡처된 텍스트를 처리합니다.
     * @param {string} centerText - 화면 중앙에서 추출된 텍스트
     * @param {string} topLeftText - 화면 좌상단에서 추출된 텍스트
     * @returns {Object} 처리 결과
     */
    processCapturedText(centerText, topLeftText) {
        const result = {
            characterName: null,
            hasChaos: false,
            hasGuardian: false,
            success: false,
            error: null
        };
        
        try {
            // 1. 캐릭터명 처리
            result.characterName = this._processCharacterName(centerText);
            
            // 2. 게임 컨텐츠 확인
            const contentCheck = this._checkGameContent(topLeftText);
            result.hasChaos = contentCheck.hasChaos;
            result.hasGuardian = contentCheck.hasGuardian;
            
            result.success = true;
            
        } catch (error) {
            console.error('텍스트 처리 중 오류:', error);
            result.error = '텍스트 처리 중 오류가 발생했습니다.';
            result.success = false;
        }
        
        return result;
    },
    
    /**
     * 중앙 영역에서 캐릭터명을 처리합니다.
     * @private
     * @param {string} centerText - 중앙 영역 텍스트
     * @returns {string|null} 추출된 캐릭터명 또는 null
     */
    _processCharacterName(centerText) {
        if (!centerText) return null;
        
        // 개행 문자를 기준으로 분리
        const lines = centerText.split('\n').filter(line => line.trim() !== '');
        
        // 각 라인에서 캐릭터명 추출 시도
        for (const line of lines) {
            // 한글, 영문 대소문자, 숫자, 공백만 허용
            const match = line.match(/[가-힣a-zA-Z0-9\s]+/);
            if (match) {
                const potentialName = match[0].trim();
                // 일정 길이 이상인 경우에만 유효한 캐릭터명으로 간주
                if (potentialName.length >= 2) {
                    return potentialName;
                }
            }
        }
        
        return null;
    },
    
    /**
     * 게임 컨텐츠(카던/가토)를 확인합니다.
     * @private
     * @param {string} text - 분석할 텍스트
     * @returns {Object} 컨텐츠 확인 결과
     */
    _checkGameContent(text) {
        const result = {
            hasChaos: false,
            hasGuardian: false
        };
        
        if (!text) return result;
        
        // 카오스 던전 확인
        const chaosKeywords = ['카오스', '카던', 'chaos'];
        result.hasChaos = chaosKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // 가디언 토벌 확인
        const guardianKeywords = ['가디언', '가토', 'guardian'];
        result.hasGuardian = guardianKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        return result;
    },
    
    /**
     * 오류 메시지를 가져옵니다.
     * @private
     * @param {Error} error - 발생한 오류
     * @returns {string} 사용자에게 표시할 오류 메시지
     */
    _getErrorMessage(error) {
        if (error.message.includes('스트림이 종료') || error.message.includes('permission')) {
            return '화면 공유가 취소되었습니다.';
        } else if (error.message.includes('처리 시간이 초과')) {
            return '처리 시간이 초과되었습니다. 다시 시도해주세요.';
        } else {
            return '화면 캡처에 실패했습니다. 다시 시도해주세요.';
        }
    },
    
    /**
     * 유사한 캐릭터를 찾습니다.
     * @param {string} text - 비교할 텍스트
     * @param {Array} characters - 캐릭터 목록
     * @returns {Object|null} 가장 유사한 캐릭터 또는 null
     */
    findSimilarCharacter(text, characters) {
        if (!text || !characters || characters.length === 0) return null;
        
        // 특수문자 제거 및 소문자 변환
        const normalize = str => String(str || '').replace(/[^\w가-힣]/g, '').toLowerCase();
        const normalizedText = normalize(text);
        
        if (!normalizedText) return null;
        
        // 유사도 점수를 계산하는 함수
        const calculateSimilarity = (str1, str2) => {
            const len = Math.min(str1.length, str2.length);
            if (len === 0) return 0;
            
            let matchCount = 0;
            for (let i = 0; i < len; i++) {
                if (str1[i] === str2[i]) matchCount++;
            }
            
            return (matchCount / len) * 100;
        };
        
        let maxSimilarity = 0;
        let mostSimilarChar = null;
        
        // 모든 캐릭터와 유사도 비교
        for (const char of characters) {
            const charName = normalize(char.CharacterName);
            if (!charName) continue;
            
            // 유사도 계산 (0~100)
            const similarity = calculateSimilarity(normalizedText, charName);
            
            // 현재까지의 최대 유사도보다 높으면 업데이트
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                mostSimilarChar = char;
            }
        }
        
        // 유사도가 일정 점수 이상인 경우에만 반환
        return maxSimilarity >= 60 ? mostSimilarChar : null;
    }
};

// 전역에서 접근 가능하도록 설정 (모듈이 아닌 경우)
if (typeof window !== 'undefined') {
    window.ScreenCaptureService = ScreenCaptureService;
}
