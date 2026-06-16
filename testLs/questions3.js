const questions3 = [
{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
public class Main{
    public static void main(String[] args){
        int[] arr = {1, 2, 3, 4, 5};
        
        for(int i = 0; i < arr.length; i++){
            arr[i] = arr[i] * 2;
        }
        
        System.out.print(arr[2]);
    }
}
\`\`\`
`,
options:[
"3",
"6",
"9",
"12"
],
answer:1,
hint:"배열 요소에 2를 곱함.",
explanation:"arr[2]는 3이고, 3*2=6"
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
String str = "Hello";
str = str + " World";

System.out.print(str.length());
\`\`\`
`,
options:[
"5",
"11",
"12",
"오류"
],
answer:1,
hint:"문자열 길이 확인.",
explanation:"Hello World는 11글자."
},

{
category:"java",
difficulty:"easy",
question:"static 키워드의 의미는?",
options:[
"객체 생성 필요",
"클래스 레벨",
"지역 변수",
"상속"
],
answer:1,
hint:"인스턴스와 무관.",
explanation:"static은 클래스 레벨의 멤버."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
int x = 10;
int y = 20;

System.out.print(x > y ? x : y);
\`\`\`
`,
options:[
"10",
"20",
"true",
"false"
],
answer:1,
hint:"삼항 연산자.",
explanation:"x > y가 false이므로 y 출력."
},

{
category:"java",
difficulty:"hard",
question:"인터페이스와 추상 클래스의 차이는?",
options:[
"둘 다 객체 생성 가능",
"인터페이스는 다중 구현 가능",
"추상 클래스는 다중 상속 가능",
"차이 없음"
],
answer:1,
hint:"상속 vs 구현.",
explanation:"인터페이스는 다중 구현 가능, 추상 클래스는 단일 상속."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
int a = 5;
int b = 10;
int *p = &a;

*p = 20;

printf("%d", a);
\`\`\`
`,
options:[
"5",
"10",
"20",
"오류"
],
answer:2,
hint:"포인터를 통한 간접 참조.",
explanation:"*p는 a를 참조하므로 a가 20으로 변경."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;

printf("%d", *(p + 2));
\`\`\`
`,
options:[
"1",
"2",
"3",
"4"
],
answer:2,
hint:"포인터 연산.",
explanation:"*(p+2) = arr[2] = 3"
},

{
category:"c",
difficulty:"easy",
question:"& 연산자의 역할은?",
options:[
"비트 AND",
"주소 연산자",
"논리 AND",
"할당"
],
answer:1,
hint:"주소를 가져옴.",
explanation:"&는 변수의 주소를 반환."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
int a = 10;
int b = 20;

printf("%d", a && b);
\`\`\`
`,
options:[
"0",
"1",
"10",
"20"
],
answer:1,
hint:"논리 AND 연산.",
explanation:"둘 다 0이 아니므로 true(1)."
},

{
category:"c",
difficulty:"hard",
question:"구조체 포인터 접근 연산자는?",
options:[
".",
"->",
"::",
":"
],
answer:1,
hint:"포인터용 멤버 접근.",
explanation:"->는 구조체 포인터의 멤버 접근."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a = [1, 2, 3]
a.reverse()

print(a)
\`\`\`
`,
options:[
"[1, 2, 3]",
"[3, 2, 1]",
"오류",
"[2, 1, 3]"
],
answer:1,
hint:"리스트 역순.",
explanation:"reverse()는 리스트를 역순으로 변경."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a = "hello"
print(a.upper())
\`\`\`
`,
options:[
"hello",
"HELLO",
"Hello",
"오류"
],
answer:1,
hint:"대문자 변환.",
explanation:"upper()는 모든 문자를 대문자로 변환."
},

{
category:"python",
difficulty:"easy",
question:"Python의 주석 기호는?",
options:[
"//",
"/* */",
"#",
"--"
],
answer:2,
hint:"한 줄 주석.",
explanation:"Python은 #으로 주석 처리."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a = [1, 2, 3]
a.remove(2)

print(a)
\`\`\`
`,
options:[
"[1, 2, 3]",
"[1, 3]",
"[2, 3]",
"오류"
],
answer:1,
hint:"값으로 삭제.",
explanation:"remove(2)는 값 2를 삭제."
},

{
category:"python",
difficulty:"hard",
question: `실행 결과는?

\`\`\`python
a = {1: 'one', 2: 'two'}
print(a.get(3, 'three'))
\`\`\`
`,
options:[
"'one'",
"'two'",
"'three'",
"오류"
],
answer:2,
hint:"get 메서드의 기본값.",
explanation:"키가 없으면 기본값 반환."
},

{
category:"sql",
difficulty:"medium",
question: `다음 SQL의 결과는?

\`\`\`sql
SELECT MAX(SAL)
FROM EMP;
\`\`\`
`,
options:[
"최소 급여",
"최대 급여",
"평균 급여",
"급여 합계"
],
answer:1,
hint:"MAX 함수.",
explanation:"최대값 반환."
},

{
category:"sql",
difficulty:"medium",
question: `다음 SQL의 결과는?

\`\`\`sql
SELECT MIN(SAL)
FROM EMP;
\`\`\`
`,
options:[
"최소 급여",
"최대 급여",
"평균 급여",
"급여 합계"
],
answer:0,
hint:"MIN 함수.",
explanation:"최소값 반환."
},

{
category:"sql",
difficulty:"easy",
question:"DISTINCT의 역할은?",
options:[
"정렬",
"중복 제거",
"필터링",
"그룹화"
],
answer:1,
hint:"유일한 값만.",
explanation:"중복 행을 제거."
},

{
category:"sql",
difficulty:"medium",
question: `다음 SQL의 의미는?

\`\`\`sql
SELECT *
FROM EMP
WHERE SAL BETWEEN 3000 AND 5000;
\`\`\`
`,
options:[
"3000 미만",
"3000 초과 5000 미만",
"3000 이상 5000 이하",
"5000 초과"
],
answer:2,
hint:"범위 검색.",
explanation:"BETWEEN은 포함 범위."
},

{
category:"sql",
difficulty:"hard",
question:"UNION과 UNION ALL의 차이는?",
options:[
"없음",
"UNION은 중복 제거",
"UNION ALL은 중복 제거",
"속도만 다름"
],
answer:1,
hint:"중복 처리 여부.",
explanation:"UNION은 중복 제거, UNION ALL은 중복 포함."
},

{
category:"db",
difficulty:"medium",
question:"BCNF(보이스-코드 정규형)의 조건은?",
options:[
"원자성",
"부분 종속 제거",
"이행 종속 제거",
"결정자가 모두 후보키"
],
answer:3,
hint:"강한 정규형.",
explanation:"모든 결정자가 후보키여야 함."
},

{
category:"db",
difficulty:"medium",
question:"ER 다이어그에서 다중성 표현은?",
options:[
"1:1",
"1:N",
"M:N",
"모두 정답"
],
answer:3,
hint:"관계의 유형.",
explanation:"일대일, 일대다, 다대다 관계."
},

{
category:"db",
difficulty:"easy",
question:"기본키(Primary Key)의 특징은?",
options:[
"중복 허용",
"NULL 허용",
"고유값",
"여러 개 가능"
],
answer:2,
hint:"식별자.",
explanation:"각 행을 고유하게 식별."
},

{
category:"db",
difficulty:"medium",
question:"외래키(Foreign Key)의 제약은?",
options:[
"참조 무결성",
"도메인 무결성",
"개체 무결성",
"NULL 무결성"
],
answer:0,
hint:"참조 관계.",
explanation:"참조하는 키가 존재해야 함."
},

{
category:"db",
difficulty:"hard",
question:"트랜잭션 격리 수준이 아닌 것은?",
options:[
"READ UNCOMMITTED",
"READ COMMITTED",
"REPEATABLE READ",
"FULL ACCESS"
],
answer:3,
hint:"격리 수준 4가지.",
explanation:"FULL ACCESS는 격리 수준이 아님."
},

{
category:"os",
difficulty:"medium",
question:"페이지 교체 알고리즘이 아닌 것은?",
options:[
"LRU",
"LFU",
"FIFO",
"BFS"
],
answer:3,
hint:"메모리 관리.",
explanation:"BFS는 그래프 탐색 알고리즘."
},

{
category:"os",
difficulty:"medium",
question:"교착상태(Deadlock) 해결 방법은?",
options:[
"예방, 회피, 검출, 회복",
"삭제, 수정, 조회",
"생성, 소멸, 복사",
"읽기, 쓰기, 실행"
],
answer:0,
hint:"Deadlock 처리.",
explanation:"4가지 해결 방법."
},

{
category:"os",
difficulty:"easy",
question:"CPU 스케줄링의 목적은?",
options:[
"메모리 관리",
"CPU 효율성",
"파일 관리",
"네트워크 관리"
],
answer:1,
hint:"프로세스 관리.",
explanation:"CPU 사용 효율 최대화."
},

{
category:"os",
difficulty:"medium",
question:"세마포어(Semaphore)의 역할은?",
options:[
"메모리 할당",
"동기화",
"파일 압축",
"네트워크 연결"
],
answer:1,
hint:"프로세스 동기화.",
explanation:"공유 자원 접근 제어."
},

{
category:"os",
difficulty:"hard",
question:"페이지 부재(Page Fault) 발생 시?",
options:[
"CPU 종료",
"페이지 스왑",
"메모리 삭제",
"프로세스 강제 종료"
],
answer:1,
hint:"가상 메모리.",
explanation:"디스크에서 페이지를 로드."
},

{
category:"network",
difficulty:"medium",
question:"HTTP 상태 코드 404의 의미는?",
options:[
"성공",
"리다이렉트",
"클라이언트 오류",
"서버 오류"
],
answer:2,
hint:"Not Found.",
explanation:"요청한 리소스를 찾을 수 없음."
},

{
category:"network",
difficulty:"medium",
question:"HTTP 상태 코드 500의 의미는?",
options:[
"성공",
"리다이렉트",
"클라이언트 오류",
"서버 오류"
],
answer:3,
hint:"Internal Server Error.",
explanation:"서버 내부 오류."
},

{
category:"network",
difficulty:"easy",
question:"IP 주소 버전 4의 비트 수는?",
options:[
"32비트",
"64비트",
"128비트",
"256비트"
],
answer:0,
hint:"IPv4.",
explanation:"IPv4는 32비트 주소 체계."
},

{
category:"network",
difficulty:"medium",
question:"서브넷 마스크의 역할은?",
options:[
"암호화",
"네트워크 분할",
"압축",
"라우팅"
],
answer:1,
hint:"네트워크 주소 추출.",
explanation:"IP 주소에서 네트워크 부분 식별."
},

{
category:"network",
difficulty:"hard",
question:"OSPF 라우팅 프로토콜의 특징은?",
options:[
"거리 벡터",
"링크 상태",
"경로 벡터",
"하이브리드"
],
answer:1,
hint:"Link State.",
explanation:"OSPF는 링크 상태 프로토콜."
},

{
category:"security",
difficulty:"medium",
question:"해시(Hash) 함수의 특징은?",
options:[
"가역성",
"단방향",
"압축 불가",
"암호화만 가능"
],
answer:1,
hint:"복호화 불가.",
explanation:"해시는 단방향 함수."
},

{
category:"security",
difficulty:"medium",
question:"공개키 암호화 방식은?",
options:[
"대칭키",
"비대칭키",
"해시",
"전자서명"
],
answer:1,
hint:"공개키/개인키.",
explanation:"RSA 등 비대칭키 암호."
},

{
category:"security",
difficulty:"easy",
question:"방화벽(Firewall)의 역할은?",
options:[
"암호화",
"네트워크 필터링",
"백업",
"압축"
],
answer:1,
hint:"보안 장벽.",
explanation:"허용/거부 트래픽 제어."
},

{
category:"security",
difficulty:"medium",
question:"SSL/TLS의 역할은?",
options:[
"압축",
"암호화 통신",
"라우팅",
"DNS"
],
answer:1,
hint:"HTTPS.",
explanation:"통신 암호화 프로토콜."
},

{
category:"security",
difficulty:"hard",
question:"DDoS 공격의 특징은?",
options:[
"단일 공격자",
"분산 서비스 거부",
"암호 해독",
"세션 탈취"
],
answer:1,
hint:"Distributed.",
explanation:"다수의 공격자가 동시 공격."
},

{
category:"sw",
difficulty:"medium",
question:"애자일(Agile) 방법론 특징은?",
options:[
"계획 중심",
"반복적 개발",
"문서 중심",
"단계적 개발"
],
answer:1,
hint:"스프린트.",
explanation:"짧은 주기 반복 개발."
},

{
category:"sw",
difficulty:"medium",
question:"CI/CD의 의미는?",
options:[
"Continuous Integration/Continuous Deployment",
"Code Integration/Code Deployment",
"Central Integration/Central Deployment",
"Computer Integration/Computer Deployment"
],
answer:0,
hint:"지속적 통합/배포.",
explanation:"자동화된 빌드/배포 파이프라인."
},

{
category:"sw",
difficulty:"easy",
question:"Git의 역할은?",
options:[
"컴파일",
"버전 관리",
"테스트",
"배포"
],
answer:1,
hint:"분산 버전 관리.",
explanation:"소스 코드 버전 관리 시스템."
},

{
category:"sw",
difficulty:"medium",
question:"TDD(Test Driven Development) 순서는?",
options:[
"테스트-코드-리팩토링",
"코드-테스트-리팩토링",
"리팩토링-테스트-코드",
"테스트-리팩토링-코드"
],
answer:0,
hint:"테스트 먼저.",
explanation:"테스트 작성 후 코드 구현."
},

{
category:"sw",
difficulty:"hard",
question:"SOLID 원칙이 아닌 것은?",
options:[
"단일 책임",
"개방-폐쇄",
"리스코 치환",
"데이터 은닉"
],
answer:3,
hint:"객체지향 5원칙.",
explanation:"데이터 은닉은 SOLID 원칙이 아님."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
int[] arr = {5, 3, 1, 4, 2};
Arrays.sort(arr);

System.out.print(arr[0]);
\`\`\`
`,
options:[
"1",
"2",
"5",
"오류"
],
answer:0,
hint:"배열 정렬.",
explanation:"오름차순 정렬 후 첫 번째 요소는 1."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
String str = "Java";
str = str.replace('a', 'A');

System.out.print(str);
\`\`\`
`,
options:[
"Java",
"jAvA",
"JAvA",
"오류"
],
answer:2,
hint:"문자 치환.",
explanation:"소문자 a를 대문자 A로 치환."
},

{
category:"java",
difficulty:"hard",
question:"StringBuilder와 StringBuffer의 차이는?",
options:[
"둘 다 동기화",
"StringBuilder는 비동기화",
"StringBuffer는 비동기화",
"차이 없음"
],
answer:1,
hint:"스레드 안전성.",
explanation:"StringBuilder는 비동기화로 빠름, StringBuffer는 동기화."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
int x = 5;
int y = x++;

printf("%d %d", x, y);
\`\`\`
`,
options:[
"5 5",
"6 5",
"5 6",
"6 6"
],
answer:1,
hint:"후위 증가.",
explanation:"x는 6이 되고, y는 증가 전 값인 5."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
int arr[3] = {10, 20, 30};
int *p = arr;

printf("%d", *p++);
\`\`\`
`,
options:[
"10",
"20",
"30",
"오류"
],
answer:0,
hint:"포인터 증가.",
explanation:"*p는 10, 그 후 p는 다음 주소로 이동."
},

{
category:"c",
difficulty:"hard",
question:"typedef의 역할은?",
options:[
"메모리 할당",
"타입 별칭",
"함수 정의",
"구조체 정의"
],
answer:1,
hint:"타입 재정의.",
explanation:"기존 타입에 새로운 이름 부여."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a = [1, 2, 3]
b = a.copy()
b.append(4)

print(a)
\`\`\`
`,
options:[
"[1, 2, 3]",
"[1, 2, 3, 4]",
"오류",
"[4]"
],
answer:0,
hint:"얕은 복사.",
explanation:"copy()는 새로운 리스트 생성."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
x = 10
y = 10

print(x is y)
\`\`\`
`,
options:[
"True",
"False",
"오류",
"10"
],
answer:0,
hint:"객체 동일성.",
explanation:"작은 정수는 같은 객체 참조."
},

{
category:"python",
difficulty:"hard",
question:"데코레이터(Decorator)의 역할은?",
options:[
"클래스 생성",
"함수 수정 없이 기능 추가",
"메모리 관리",
"예외 처리"
],
answer:1,
hint:"함수 래핑.",
explanation:"기존 함수를 수정하지 않고 기능을 추가."
},

{
category:"sql",
difficulty:"medium",
question: `다음 SQL의 결과는?

\`\`\`sql
SELECT COUNT(DISTINCT DEPTNO)
FROM EMP;
\`\`\`
`,
options:[
"전체 행 수",
"중복 제거 부서 수",
"NULL 제거 행 수",
"급여 합계"
],
answer:1,
hint:"DISTINCT COUNT.",
explanation:"중복 제거된 부서 수."
},

{
category:"sql",
difficulty:"medium",
question: `다음 SQL의 결과는?

\`\`\`sql
SELECT ENAME, SAL
FROM EMP
ORDER BY SAL DESC;
\`\`\`
`,
options:[
"이름순",
"급여 오름차순",
"급여 내림차순",
"입사순"
],
answer:2,
hint:"DESC 정렬.",
explanation:"급여 높은 순서."
},

{
category:"sql",
difficulty:"hard",
question:"서브쿼리의 종류가 아닌 것은?",
options:[
"스칼라 서브쿼리",
"행 서브쿼리",
"테이블 서브쿼리",
"컬럼 서브쿼리"
],
answer:3,
hint:"반환 형태.",
explanation:"컬럼 서브쿼리는 표준 용어가 아님."
},

{
category:"db",
difficulty:"medium",
question:"정규화의 목적은?",
options:[
"데이터 중복 최소화",
"데이터 크기 증가",
"쿼리 속도 저하",
"보안 강화"
],
answer:0,
hint:"이상 현상 방지.",
explanation:"데이터 중복과 이상 현상 제거."
},

{
category:"db",
difficulty:"medium",
question:"이상 현상이 아닌 것은?",
options:[
"삽입 이상",
"삭제 이상",
"갱신 이상",
"읽기 이상"
],
answer:3,
hint:"데이터 무결성.",
explanation:"읽기 이상은 정규화 이상 현상이 아님."
},

{
category:"db",
difficulty:"hard",
question:"인덱스(Index)의 단점은?",
options:[
"검색 속도 향상",
"INSERT/UPDATE/DELETE 느려짐",
"정렬 지원",
"중복 허용"
],
answer:1,
hint:"쓰기 성능.",
explanation:"인덱스 유지 비용으로 쓰기 성능 저하."
},

{
category:"os",
difficulty:"medium",
question:"선점형 스케줄링 예시는?",
options:[
"FCFS",
"SJF",
"Round Robin",
"비선점형 우선순위"
],
answer:2,
hint:"시간 할당.",
explanation:"RR은 선점형 스케줄링."
},

{
category:"os",
difficulty:"medium",
question:"프로세스 상태 전환에서 Ready → Running은?",
options:[
"Dispatch",
"Interrupt",
"Time Slice",
"I/O Request"
],
answer:0,
hint:"스케줄러.",
explanation:"디스패치가 프로세스를 실행 상태로 전환."
},

{
category:"os",
difficulty:"hard",
question:"캐시(Cache) 지역성 원리가 아닌 것은?",
options:[
"시간 지역성",
"공간 지역성",
"순차 지역성",
"무작위 지역성"
],
answer:3,
hint:"참조 패턴.",
explanation:"무작위 지역성은 캐시 지역성이 아님."
},

{
category:"network",
difficulty:"medium",
question:"ARP 프로토콜의 역할은?",
options:[
"IP → MAC",
"MAC → IP",
"DNS",
"DHCP"
],
answer:0,
hint:"주소 변환.",
explanation:"IP 주소를 MAC 주소로 변환."
},

{
category:"network",
difficulty:"medium",
question:"DHCP의 역할은?",
options:[
"IP 주소 자동 할당",
"DNS 해석",
"라우팅",
"방화벽"
],
answer:0,
hint:"자동 구성.",
explanation:"IP 주소, 서브넷 마스크 등 자동 할당."
},

{
category:"network",
difficulty:"hard",
question:"TCP 3-Way Handshake 순서는?",
options:[
"SYN → SYN-ACK → ACK",
"ACK → SYN → SYN-ACK",
"SYN → ACK → SYN-ACK",
"SYN-ACK → SYN → ACK"
],
answer:0,
hint:"연결 수립.",
explanation:"클라이언트 SYN, 서버 SYN-ACK, 클라이언트 ACK."
},

{
category:"security",
difficulty:"medium",
question:"대칭키 암호화 예시는?",
options:[
"RSA",
"AES",
"DSA",
"ECC"
],
answer:1,
hint:"공개키/개인키.",
explanation:"AES는 대칭키 암호."
},

{
category:"security",
difficulty:"medium",
question:"비대칭키 암호화 예시는?",
options:[
"AES",
"DES",
"RSA",
"3DES"
],
answer:2,
hint:"공개키/개인키.",
explanation:"RSA는 비대칭키 암호."
},

{
category:"security",
difficulty:"hard",
question:"인증(Authentication)과 인가(Authorization)의 차이는?",
options:[
"동일함",
"인증은 신원 확인, 인가는 권한 부여",
"인가는 신원 확인, 인증은 권한 부여",
"둘 다 권한 부여"
],
answer:1,
hint:"Who vs What.",
explanation:"인증은 누구인지, 인가는 무엇을 할 수 있는지."
},

{
category:"sw",
difficulty:"medium",
question:"리팩토링(Refactoring)의 목적은?",
options:[
"기능 추가",
"코드 개선",
"버그 수정",
"테스트"
],
answer:1,
hint:"코드 품질.",
explanation:"외부 동작 변경 없이 내부 구조 개선."
},

{
category:"sw",
difficulty:"medium",
question:"코드 리뷰(Code Review)의 목적은?",
options:[
"속도 향상",
"코드 품질 향상",
"메모리 절약",
"파일 크기 감소"
],
answer:1,
hint:"협업 품질.",
explanation:"코드 품질, 버그 발견, 지식 공유."
},

{
category:"sw",
difficulty:"hard",
question:"데브옵스(DevOps)의 핵심은?",
options:[
"개발만",
"운영만",
"개발과 운영 통합",
"테스트만"
],
answer:2,
hint:"통합.",
explanation:"개발과 운영의 협업 및 자동화."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
String s1 = "Hello";
String s2 = new String("Hello");

System.out.print(s1 == s2);
\`\`\`
`,
options:[
"true",
"false",
"오류",
"Hello"
],
answer:1,
hint:"참조 비교.",
explanation:"s1은 리터럴, s2는 새 객체이므로 주소 다름."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
ArrayList<String> list = new ArrayList<>();
list.add("A");
list.add("B");
list.remove(0);

System.out.print(list.size());
\`\`\`
`,
options:[
"0",
"1",
"2",
"오류"
],
answer:1,
hint:"ArrayList 크기.",
explanation:"하나 제거 후 크기는 1."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
int a = 10;
int *p = &a;
int **pp = &p;

printf("%d", **pp);
\`\`\`
`,
options:[
"주소값",
"10",
"오류",
"0"
],
answer:1,
hint:"이중 포인터.",
explanation:"**pp는 a의 값인 10."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
struct Point{
    int x;
    int y;
};

struct Point p = {10, 20};
struct Point *ptr = &p;

printf("%d", ptr->x);
\`\`\`
`,
options:[
"10",
"20",
"오류",
"0"
],
answer:0,
hint:"구조체 포인터.",
explanation:"ptr->x는 p.x와 동일."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a = {1, 2, 3}
a.add(4)

print(len(a))
\`\`\`
`,
options:[
"3",
"4",
"오류",
"5"
],
answer:1,
hint:"set 자료형.",
explanation:"set은 중복 제거, add로 요소 추가."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a = [1, 2, 3]
b = a

b[0] = 10

print(a[0])
\`\`\`
`,
options:[
"1",
"10",
"오류",
"0"
],
answer:1,
hint:"참조 복사.",
explanation:"b는 a를 참조하므로 변경이 반영."
},

{
category:"sql",
difficulty:"medium",
question: `다음 SQL의 결과는?

\`\`\`sql
SELECT ENAME
FROM EMP
WHERE SAL >= (SELECT AVG(SAL) FROM EMP);
\`\`\`
`,
options:[
"전체 사원",
"평균 이상 급여 사원",
"평균 미만 급여 사원",
"급여 0인 사원"
],
answer:1,
hint:"서브쿼리 비교.",
explanation:"평균 급여 이상인 사원."
},

{
category:"sql",
difficulty:"medium",
question: `다음 SQL의 결과는?

\`\`\`sql
SELECT DEPTNO, COUNT(*)
FROM EMP
GROUP BY DEPTNO;
\`\`\`
`,
options:[
"전체 행 수",
"부서별 사원 수",
"급여 합계",
"평균 급여"
],
answer:1,
hint:"GROUP BY.",
explanation:"부서별 사원 수 집계."
},

{
category:"db",
difficulty:"medium",
question:"후보키(Candidate Key)의 정의는?",
options:[
"유일하지 않음",
"최소성",
"유일성 + 최소성",
"NULL 허용"
],
answer:2,
hint:"기본키 후보.",
explanation:"유일성과 최소성을 만족하는 키."
},

{
category:"db",
difficulty:"medium",
question:"슈퍼키(Super Key)의 정의는?",
options:[
"유일성만",
"최소성만",
"유일성 + 최소성",
"NULL만"
],
answer:0,
hint:"후보키 상위 개념.",
explanation:"유일성만 만족하면 슈퍼키."
},

{
category:"os",
difficulty:"medium",
question:"페이지 교체 알고리즘 LRU의 의미는?",
options:[
"Least Recently Used",
"Last Random Used",
"Longest Recent Use",
"Least Random Use"
],
answer:0,
hint:"최소 사용.",
explanation:"가장 오랫동안 사용되지 않은 페이지 교체."
},

{
category:"os",
difficulty:"medium",
question:"세그먼테이션(Segmentation)의 특징은?",
options:[
"고정 크기",
"가변 크기",
"페이지 단위",
"단일 크기"
],
answer:1,
hint:"논리적 단위.",
explanation:"논리적 단위로 메모리 분할."
},

{
category:"network",
difficulty:"medium",
question:"IPv6의 주소 길이는?",
options:[
"32비트",
"64비트",
"128비트",
"256비트"
],
answer:2,
hint:"IPv6.",
explanation:"IPv6는 128비트 주소 체계."
},

{
category:"network",
difficulty:"medium",
question:"NAT의 역할은?",
options:[
"암호화",
"주소 변환",
"라우팅",
"DNS"
],
answer:1,
hint:"사설 IP.",
explanation:"사설 IP를 공인 IP로 변환."
},

{
category:"security",
difficulty:"medium",
question:"해시 충돌(Hash Collision)이란?",
options:[
"해시 함수 오류",
"다른 데이터가 같은 해시값",
"해시값이 NULL",
"해시 함수 미정의"
],
answer:1,
hint:"충돌.",
explanation:"서로 다른 입력이 같은 해시값을 가짐."
},

{
category:"security",
difficulty:"medium",
question:"솔트(Salt)의 역할은?",
options:[
"암호화",
"해시 강화",
"압축",
"전송"
],
answer:1,
hint:"보안 강화.",
explanation:"해시에 임의값 추가하여 보안 강화."
},

{
category:"sw",
difficulty:"medium",
question:"코드 커버리지(Code Coverage)의 의미는?",
options:[
"코드 크기",
"테스트된 코드 비율",
"버그 수",
"커밋 수"
],
answer:1,
hint:"테스트 품질.",
explanation:"테스트가 실행한 코드의 비율."
},

{
category:"sw",
difficulty:"medium",
question:"모킹(Mocking)의 역할은?",
options:[
"실제 객체 사용",
"가짜 객체 생성",
"데이터베이스 연결",
"서버 배포"
],
answer:1,
hint:"테스트 더블.",
explanation:"테스트용 가짜 객체 생성."
}
];
