const questions = [

{
question: "Java에서 메서드 오버라이딩(Overriding)의 설명으로 옳은 것은?",
options: [
"메서드를 중복 정의하는 것",
"상속받은 메서드를 재정의하는 것",
"생성자를 여러 개 만드는 것",
"인터페이스를 구현하는 것"
],
answer: 1,
explanation: "오버라이딩은 부모 클래스의 메서드를 자식 클래스에서 재정의하는 것이다.",
hint: "오버라이딩은 상속 관계에서 부모의 메서드를 자식이 다시 정의하는 것입니다."
},

{
question: `다음 코드의 실행 결과는?

\`\`\`
class A{
    int x=10;
}

class B extends A{
    int x=20;
}

A a = new B();

System.out.print(a.x);
\`\`\``,
options:["10","20","30","오류"],
answer:0,
explanation:"필드는 참조변수 타입 기준으로 접근한다.",
hint:"필드는 정적 바인딩되므로 참조변수의 타입을 따릅니다."
},

{
question: `다음 코드의 결과는?

\`\`\`
int sum=0;

for(int i=1;i<=5;i++){
    sum+=i;
}

System.out.print(sum);
\`\`\``,
options:["10","15","20","25"],
answer:1,
explanation:"1+2+3+4+5=15",
hint:"1부터 5까지의 합을 계산해보세요."
},

{
question:"다형성(Polymorphism)의 특징은?",
options:[
"클래스를 하나만 생성",
"상속 금지",
"하나의 참조변수가 여러 객체를 참조",
"메서드 삭제"
],
answer:2,
explanation:"부모 타입 참조변수로 자식 객체를 참조할 수 있다.",
hint:"다형성은 하나의 인터페이스로 여러 구현을 사용하는 것입니다."
},

{
question:"Java에서 인터페이스의 특징은?",
options:[
"객체 생성 가능",
"다중 구현 가능",
"상속 불가",
"메서드 선언 불가"
],
answer:1,
explanation:"Java는 클래스 다중상속은 불가능하지만 인터페이스 다중 구현은 가능하다.",
hint:"클래스는 단일 상속만 가능하지만 인터페이스는 여러 개 구현할 수 있습니다."
},

{
question:"예외 처리 구문은?",
options:[
"if-catch",
"try-catch",
"throw-catch",
"error-catch"
],
answer:1,
explanation:"예외는 try-catch로 처리한다.",
hint:"Java에서 예외 처리는 try-catch 블록을 사용합니다."
},

{
question:"Java에서 객체 생성 키워드는?",
options:[
"create",
"make",
"new",
"instance"
],
answer:2,
explanation:"객체 생성 시 new 사용.",
hint:"객체를 생성할 때 사용하는 키워드는 new입니다."
},

{
question:"생성자의 특징은?",
options:[
"반환형 존재",
"클래스명과 동일",
"상속 가능",
"static 필수"
],
answer:1,
explanation:"생성자는 클래스명과 동일하며 반환형이 없다.",
hint:"생성자는 클래스 이름과 같고 반환 타입이 없습니다."
},

{
question:"추상 클래스 특징은?",
options:[
"객체 생성 가능",
"추상 메서드 포함 가능",
"상속 불가",
"메서드 선언 불가"
],
answer:1,
explanation:"추상 클래스는 추상 메서드를 포함할 수 있다.",
hint:"추상 클래스는 추상 메서드를 가질 수 있고 직접 객체 생성은 불가능합니다."
},

{
question:"final 키워드 의미는?",
options:[
"상속 가능",
"재정의 가능",
"변경 불가",
"객체 생성"
],
answer:2,
explanation:"final 변수는 상수, final 메서드는 재정의 불가.",
hint:"final은 변경할 수 없다는 의미입니다."
},

{
question: `\`\`\`
int a=10;
int b=20;

System.out.print(a>b ? a:b);
\`\`\``,
options:["10","20","30","오류"],
answer:1,
explanation:"삼항연산자로 더 큰 값 출력.",
hint:"삼항 연산자는 조건이 참이면 첫 번째 값, 거짓이면 두 번째 값을 반환합니다."
},

{
question:"컬렉션 프레임워크가 아닌 것은?",
options:[
"ArrayList",
"HashMap",
"LinkedList",
"Pointer"
],
answer:3,
explanation:"Pointer는 컬렉션이 아니다.",
hint:"Pointer는 C언어의 개념이고 Java 컬렉션 프레임워크에는 포함되지 않습니다."
},

{
question:"HashMap 특징은?",
options:[
"중복키 허용",
"키-값 저장",
"정렬 필수",
"인덱스 저장"
],
answer:1,
explanation:"HashMap은 Key-Value 구조.",
hint:"HashMap은 키와 값의 쌍으로 데이터를 저장하는 자료구조입니다."
},

{
question:"String 클래스 특징은?",
options:[
"가변",
"불변",
"상속 필수",
"인터페이스"
],
answer:1,
explanation:"String 객체는 Immutable.",
hint:"String 객체는 한 번 생성되면 변경할 수 없습니다(불변 객체)."
},

{
question:"equals() 목적은?",
options:[
"주소 비교",
"값 비교",
"메모리 삭제",
"객체 생성"
],
answer:1,
explanation:"내용 비교.",
hint:"equals()는 객체의 내용(값)을 비교하는 메서드입니다."
},

{
question:"== 연산자의 기본 동작은?",
options:[
"값 비교",
"주소 비교",
"길이 비교",
"문자열 비교"
],
answer:1,
explanation:"참조형에서는 주소 비교.",
hint:"참조형 변수에서 ==는 주소값을 비교합니다."
},

{
question:"ArrayList 특징은?",
options:[
"배열 크기 고정",
"동적 크기",
"키 저장",
"정렬 강제"
],
answer:1,
explanation:"동적으로 크기 변경 가능.",
hint:"ArrayList는 크기가 자동으로 조절되는 동적 배열입니다."
},

{
question:"Java의 기본 접근제한자가 아닌 것은?",
options:[
"public",
"private",
"protected",
"hidden"
],
answer:3,
explanation:"hidden은 존재하지 않는다.",
hint:"Java의 접근제한자는 public, private, protected, default(package-private)입니다."
},

{
question:"static 의미는?",
options:[
"객체별 생성",
"클래스 공유",
"상속 제한",
"메모리 해제"
],
answer:1,
explanation:"모든 객체가 공유.",
hint:"static 멤버는 클래스 레벨에서 모든 인스턴스가 공유합니다."
},

{
question:"JVM의 의미는?",
options:[
"Java Variable Manager",
"Java Virtual Machine",
"Java Version Manager",
"Java Visual Manager"
],
answer:1,
explanation:"Java 실행 환경.",
hint:"JVM은 Java Virtual Machine의 약자로 Java 프로그램을 실행하는 가상 머신입니다."
},

{
question: "C언어에서 포인터의 역할은?",
options:[
"변수 삭제",
"메모리 주소 저장",
"파일 생성",
"함수 호출"
],
answer:1,
explanation:"포인터는 메모리 주소를 저장하는 변수이다.",
hint:"포인터는 메모리의 주소값을 저장하는 변수입니다."
},

{
question: `\`\`\`
int a=10;
int *p=&a;

printf("%d", *p);
\`\`\``,
options:["0","10","주소값","오류"],
answer:1,
explanation:"*p는 a가 저장한 값인 10을 의미한다.",
hint:"*p는 역참조 연산자로 포인터가 가리키는 주소의 값을 가져옵니다."
},

{
question: `\`\`\`
char str[]="KOREA";

printf("%c", str[2]);
\`\`\``,
options:["K","O","R","E"],
answer:2,
explanation:"인덱스는 0부터 시작한다.",
hint:"배열 인덱스는 0부터 시작하므로 str[2]는 세 번째 문자입니다."
},

{
question: `\`\`\`
char str[]="KOREA";

printf("%c", *(str+3));
\`\`\``,
options:["R","E","A","O"],
answer:1,
explanation:"str[3]은 E이다.",
hint:"*(str+3)은 str[3]과 동일하며 네 번째 문자를 의미합니다."
},

{
question:"C언어에서 문자열 끝을 나타내는 문자는?",
options:[
"\\n",
"NULL",
"\\0",
"EOF"
],
answer:2,
explanation:"문자열 종료 문자는 Null Character(\\0)",
hint:"C언어에서 문자열은 null character(\\0)로 끝납니다."
},

{
question:"포인터 변수 선언 방법은?",
options:[
"int p;",
"int &p;",
"int *p;",
"pointer p;"
],
answer:2,
explanation:"포인터 선언 시 * 사용.",
hint:"포인터 변수 선언 시 자료형 뒤에 *를 붙입니다."
},

{
question: `\`\`\`
int a=5;

printf("%d", ++a);
\`\`\``,
options:["5","6","7","오류"],
answer:1,
explanation:"전위 증가 연산.",
hint:"++a는 먼저 증가시킨 후 값을 반환합니다."
},

{
question: `\`\`\`
int a=5;

printf("%d", a++);
\`\`\``,
options:["5","6","7","오류"],
answer:0,
explanation:"후위 증가이므로 출력 후 증가.",
hint:"a++는 먼저 값을 반환한 후 증가시킵니다."
},

{
question:"배열의 특징은?",
options:[
"동적 길이",
"동일 자료형 저장",
"주소 저장 전용",
"반드시 포인터"
],
answer:1,
explanation:"배열은 동일 타입 데이터를 연속 저장.",
hint:"배열은 동일한 자료형의 데이터를 연속된 메모리 공간에 저장합니다."
},

{
question:"sizeof 연산자의 용도는?",
options:[
"주소 반환",
"자료형 크기 반환",
"값 증가",
"함수 호출"
],
answer:1,
explanation:"메모리 크기를 반환.",
hint:"sizeof는 자료형이나 변수의 메모리 크기를 바이트 단위로 반환합니다."
},

{
question: `\`\`\`
int arr[3]={1,2,3};

printf("%d", arr[1]);
\`\`\``,
options:["1","2","3","오류"],
answer:1,
explanation:"두 번째 요소.",
hint:"arr[1]은 인덱스 1의 요소로 두 번째 값입니다."
},

{
question:"C언어에서 함수의 역할은?",
options:[
"코드 재사용",
"메모리 삭제",
"컴파일 중지",
"포인터 생성"
],
answer:0,
explanation:"중복 코드 제거 및 재사용.",
hint:"함수는 코드를 재사용하고 모듈화하는 데 사용됩니다."
},

{
question:"구조체(struct)의 목적은?",
options:[
"다른 자료형 묶기",
"배열 생성",
"반복문 생성",
"메모리 해제"
],
answer:0,
explanation:"여러 자료형을 하나로 묶는다.",
hint:"구조체는 서로 다른 자료형을 하나로 묶어서 관리합니다."
},

{
question:"switch문의 특징은?",
options:[
"문자열 비교",
"다중 분기",
"배열 생성",
"포인터 전용"
],
answer:1,
explanation:"여러 조건 분기 가능.",
hint:"switch문은 하나의 변수에 대해 여러 경우를 처리할 때 사용합니다."
},

{
question:"break문의 역할은?",
options:[
"반복 종료",
"함수 종료",
"변수 삭제",
"포인터 해제"
],
answer:0,
explanation:"반복문 또는 switch 종료.",
hint:"break는 반복문이나 switch문을 빠져나갈 때 사용합니다."
},

{
question:"malloc 함수의 목적은?",
options:[
"동적 메모리 할당",
"파일 생성",
"메모리 해제",
"배열 출력"
],
answer:0,
explanation:"실행 중 메모리 할당.",
hint:"malloc은 실행 시간에 동적으로 메모리를 할당하는 함수입니다."
},

{
question:"free 함수의 목적은?",
options:[
"파일 삭제",
"메모리 해제",
"변수 초기화",
"포인터 증가"
],
answer:1,
explanation:"malloc으로 할당한 메모리 반환.",
hint:"free는 동적으로 할당한 메모리를 해제하는 함수입니다."
},

{
question: `\`\`\`
int a=10;
int b=3;

printf("%d", a%b);
\`\`\``,
options:["1","2","3","4"],
answer:0,
explanation:"10을 3으로 나눈 나머지.",
hint:"%는 나머지 연산자로 10을 3으로 나눈 나머지는 1입니다."
},

{
question:"NULL 포인터 의미는?",
options:[
"0번지 참조",
"유효한 주소",
"아무것도 가리키지 않음",
"배열 시작"
],
answer:2,
explanation:"주소가 없는 포인터.",
hint:"NULL 포인터는 아무것도 가리키지 않는 포인터입니다."
},

{
question:"재귀함수란?",
options:[
"함수를 한 번만 호출",
"자기 자신 호출",
"포인터 반환",
"배열 생성"
],
answer:1,
explanation:"함수 내부에서 자기 자신을 호출.",
hint:"재귀함수는 함수 내부에서 자기 자신을 다시 호출하는 함수입니다."
},
{
question: `\`\`\`
a=[1,2,3,4,5]

print(a[1:4])
\`\`\``,
options:[
"[1,2,3]",
"[2,3,4]",
"[2,3,4,5]",
"[1,2,3,4]"
],
answer:1,
explanation:"슬라이싱의 끝 인덱스는 포함되지 않는다.",
hint:"파이썬 슬라이싱에서 끝 인덱스는 포함되지 않습니다."
},

{
question: `\`\`\`
a=[1,2,3]

print(len(a))
\`\`\``,
options:["2","3","4","오류"],
answer:1,
explanation:"리스트 길이는 3.",
hint:"len() 함수는 리스트의 요소 개수를 반환합니다."
},

{
question:"Python에서 리스트를 선언하는 기호는?",
options:["()","{}","[]","<>"],
answer:2,
explanation:"리스트는 [] 사용.",
hint:"파이썬에서 리스트는 대괄호 []를 사용하여 선언합니다."
},

{
question: `\`\`\`
a=(1,2,3)

print(type(a).__name__)
\`\`\``,
options:["list","tuple","dict","set"],
answer:1,
explanation:"()는 튜플.",
hint:"소괄호 ()는 튜플을 선언하는 기호입니다."
},

{
question:"딕셔너리(Dictionary)의 특징은?",
options:[
"순서 없는 키-값 저장",
"숫자만 저장",
"중복 키 허용",
"인덱스만 사용"
],
answer:0,
explanation:"Dictionary는 Key-Value 구조.",
hint:"딕셔너리는 키와 값의 쌍으로 데이터를 저장합니다."
},

{
question: `\`\`\`
a={"name":"kim"}

print(a["name"])
\`\`\``,
options:["kim","name","dict","오류"],
answer:0,
explanation:"키 name의 값 출력.",
hint:"딕셔너리에서 키를 사용하여 값을 조회합니다."
},

{
question: `\`\`\`
for i in range(3):
    print(i)
\`\`\``,
options:[
"1 2 3",
"0 1 2",
"0 1 2 3",
"1 2"
],
answer:1,
explanation:"range(3)은 0~2.",
hint:"range(n)은 0부터 n-1까지의 숫자를 생성합니다."
},

{
question:"Python에서 함수 선언 키워드는?",
options:[
"func",
"function",
"def",
"method"
],
answer:2,
explanation:"함수는 def 사용.",
hint:"파이썬에서 함수는 def 키워드로 선언합니다."
},

{
question: `\`\`\`
def add(a,b):
    return a+b

print(add(3,4))
\`\`\``,
options:["5","6","7","8"],
answer:2,
explanation:"3+4=7",
hint:"함수 호출 시 인자를 전달하고 반환값을 출력합니다."
},

{
question: `\`\`\`
x=10

if x>5:
    print("A")
else:
    print("B")
\`\`\``,
options:["A","B","AB","오류"],
answer:0,
explanation:"10은 5보다 크다.",
hint:"조건문에서 조건이 참이면 if 블록을 실행합니다."
},

{
question:"lambda의 용도는?",
options:[
"반복문",
"익명 함수",
"예외 처리",
"상속"
],
answer:1,
explanation:"lambda는 익명 함수.",
hint:"lambda는 이름 없는 함수를 간단하게 정의할 때 사용합니다."
},

{
question: `\`\`\`
a=[1,2,3]

a.append(4)

print(len(a))
\`\`\``,
options:["3","4","5","오류"],
answer:1,
explanation:"append 후 길이는 4.",
hint:"append()는 리스트 끝에 요소를 추가하는 메서드입니다."
},

{
question:"Python에서 상속 선언은?",
options:[
"extends",
"implements",
"class B(A)",
"inherit"
],
answer:2,
explanation:"부모 클래스를 괄호에 작성.",
hint:"파이썬에서 상속은 클래스 이름 뒤 괄호 안에 부모 클래스를 작성합니다."
},

{
question: `\`\`\`
print(5//2)
\`\`\``,
options:["2","2.5","3","1"],
answer:0,
explanation:"// 는 몫 연산.",
hint:"//는 정수 나눗셈(몫) 연산자입니다."
},

{
question: `\`\`\`
print(5%2)
\`\`\``,
options:["1","2","2.5","0"],
answer:0,
explanation:"나머지는 1.",
hint:"%는 나머지 연산자입니다."
},

{
question:"예외 처리 구문은?",
options:[
"try-catch",
"try-except",
"catch-finally",
"error-catch"
],
answer:1,
explanation:"Python은 try-except.",
hint:"파이썬에서 예외 처리는 try-except 구문을 사용합니다."
},

{
question: `\`\`\`
a=[1,2]

b=[3,4]

print(a+b)
\`\`\``,
options:[
"[1,2,3,4]",
"[4,6]",
"[1,2]",
"오류"
],
answer:0,
explanation:"리스트 연결.",
hint:"+ 연산자로 두 리스트를 연결할 수 있습니다."
},

{
question:"set 자료형 특징은?",
options:[
"중복 허용",
"중복 제거",
"정렬 필수",
"키 저장"
],
answer:1,
explanation:"set은 중복 제거.",
hint:"set은 중복된 요소를 자동으로 제거하는 자료형입니다."
},

{
question: `\`\`\`
print(bool(0))
\`\`\``,
options:[
"True",
"False",
"0",
"오류"
],
answer:1,
explanation:"0은 False.",
hint:"0은 False로 평가되고, 그 외의 숫자는 True로 평가됩니다."
},

{
question: `\`\`\`
def fact(n):
    if n<=1:
        return 1
    return n*fact(n-1)

print(fact(4))
\`\`\``,
options:[
"12",
"24",
"36",
"48"
],
answer:1,
explanation:"4×3×2×1 = 24",
hint:"팩토리얼은 재귀함수로 구현할 수 있습니다."
},
{
question:"SQL에서 데이터를 조회하는 명령어는?",
options:[
"INSERT",
"UPDATE",
"DELETE",
"SELECT"
],
answer:3,
explanation:"SELECT는 데이터를 조회하는 명령어이다.",
hint:"SELECT는 데이터베이스에서 데이터를 조회할 때 사용하는 DML 명령어입니다."
},

{
question:"SQL에서 데이터를 추가하는 명령어는?",
options:[
"INSERT",
"UPDATE",
"DELETE",
"CREATE"
],
answer:0,
explanation:"INSERT는 새로운 행을 추가한다.",
hint:"INSERT는 테이블에 새로운 데이터를 추가할 때 사용합니다."
},

{
question:"SQL에서 데이터를 수정하는 명령어는?",
options:[
"ALTER",
"UPDATE",
"MODIFY",
"CHANGE"
],
answer:1,
explanation:"UPDATE는 기존 데이터를 수정한다.",
hint:"UPDATE는 기존 데이터를 수정할 때 사용하는 DML 명령어입니다."
},

{
question:"SQL에서 데이터를 삭제하는 명령어는?",
options:[
"REMOVE",
"DROP",
"DELETE",
"ERASE"
],
answer:2,
explanation:"DELETE는 데이터를 삭제한다.",
hint:"DELETE는 테이블의 데이터를 삭제할 때 사용합니다."
},

{
question:`EMP 테이블에 사원이 5명 있다.

\`\`\`
SELECT COUNT(*)
FROM EMP;
\`\`\``,
options:[
"4",
"5",
"6",
"EMP"
],
answer:1,
explanation:"COUNT(*)는 전체 행 수를 반환한다.",
hint:"COUNT(*)는 테이블의 전체 행 수를 세는 집계 함수입니다."
},

{
question:`\`\`\`
SELECT SUM(SAL)
FROM EMP;
\`\`\``,
options:[
"급여 합계",
"급여 평균",
"급여 최대값",
"행 개수"
],
answer:0,
explanation:"SUM은 합계 함수이다.",
hint:"SUM은 지정된 컬럼의 합계를 구하는 집계 함수입니다."
},

{
question:`\`\`\`
SELECT AVG(SAL)
FROM EMP;
\`\`\``,
options:[
"합계",
"평균",
"최대값",
"최소값"
],
answer:1,
explanation:"AVG는 평균 함수이다.",
hint:"AVG는 지정된 컬럼의 평균을 구하는 집계 함수입니다."
},

{
question:"GROUP BY의 목적은?",
options:[
"정렬",
"그룹 집계",
"삭제",
"조인"
],
answer:1,
explanation:"GROUP BY는 그룹별 집계를 수행한다.",
hint:"GROUP BY는 데이터를 그룹화하여 집계 함수를 적용할 때 사용합니다."
},

{
question:"HAVING의 목적은?",
options:[
"집계 전 조건",
"집계 후 조건",
"정렬",
"삭제"
],
answer:1,
explanation:"HAVING은 GROUP BY 결과에 조건을 적용한다.",
hint:"HAVING은 GROUP BY로 그룹화한 결과에 조건을 적용할 때 사용합니다."
},

{
question:"ORDER BY의 목적은?",
options:[
"정렬",
"삭제",
"추가",
"조인"
],
answer:0,
explanation:"ORDER BY는 결과를 정렬한다.",
hint:"ORDER BY는 조회 결과를 정렬할 때 사용합니다."
},

{
question:"기본키(Primary Key)의 특징은?",
options:[
"NULL 허용",
"중복 허용",
"NULL 및 중복 불가",
"외래키 역할"
],
answer:2,
explanation:"기본키는 NULL과 중복을 허용하지 않는다.",
hint:"기본키는 각 행을 고유하게 식별하며 NULL과 중복을 허용하지 않습니다."
},

{
question:"외래키(Foreign Key)의 역할은?",
options:[
"중복 제거",
"테이블 연결",
"정렬",
"암호화"
],
answer:1,
explanation:"다른 테이블의 기본키를 참조한다.",
hint:"외래키는 다른 테이블의 기본키를 참조하여 테이블 간의 관계를 설정합니다."
},

{
question:"INNER JOIN의 의미는?",
options:[
"합집합",
"교집합",
"차집합",
"곱집합"
],
answer:1,
explanation:"양쪽 테이블에 공통으로 존재하는 데이터 조회.",
hint:"INNER JOIN은 두 테이블에서 일치하는 데이터만 조회합니다(교집합)."
},

{
question:"LEFT JOIN의 의미는?",
options:[
"왼쪽 테이블 전체",
"오른쪽 테이블 전체",
"교집합만",
"차집합만"
],
answer:0,
explanation:"왼쪽 테이블 데이터를 모두 조회한다.",
hint:"LEFT JOIN은 왼쪽 테이블의 모든 데이터와 오른쪽 테이블의 일치하는 데이터를 조회합니다."
},

{
question:"DDL에 해당하는 것은?",
options:[
"SELECT",
"INSERT",
"CREATE",
"UPDATE"
],
answer:2,
explanation:"CREATE는 DDL(Data Definition Language).",
hint:"DDL은 데이터 정의 언어로 CREATE, ALTER, DROP 등이 포함됩니다."
},

{
question:"DML에 해당하는 것은?",
options:[
"ALTER",
"DROP",
"CREATE",
"SELECT"
],
answer:3,
explanation:"SELECT는 DML이다.",
hint:"DML은 데이터 조작 언어로 SELECT, INSERT, UPDATE, DELETE 등이 포함됩니다."
},

{
question:`\`\`\`
SELECT *
FROM EMP
WHERE SAL > 3000;
\`\`\``,
options:[
"급여가 3000 이상",
"급여가 3000 초과",
"급여가 3000 이하",
"전체 조회"
],
answer:1,
explanation:"> 는 초과를 의미한다.",
hint:">는 초과, >=는 이상을 의미합니다."
},

{
question:`\`\`\`
SELECT *
FROM EMP
WHERE ENAME LIKE 'K%';
\`\`\``,
options:[
"K로 끝남",
"K 포함",
"K로 시작",
"K만 존재"
],
answer:2,
explanation:"K%는 K로 시작하는 문자열.",
hint:"LIKE에서 %는 임의의 문자열을 의미하며, 'K%'는 K로 시작하는 문자열을 찾습니다."
},

{
question:"NULL 값을 찾는 조건은?",
options:[
"= NULL",
"IS NULL",
"== NULL",
"LIKE NULL"
],
answer:1,
explanation:"NULL 비교는 IS NULL 사용.",
hint:"NULL 비교는 =가 아닌 IS NULL을 사용해야 합니다."
},

{
question:"서브쿼리(Subquery)란?",
options:[
"테이블 생성",
"쿼리 안의 쿼리",
"조인",
"인덱스"
],
answer:1,
explanation:"하나의 SQL문 안에 포함된 SQL문.",
hint:"서브쿼리는 다른 쿼리 내부에 포함된 하위 쿼리입니다."
},
{
question:"1정규형(1NF)의 조건은?",
options:[
"원자값 유지",
"부분 함수 종속 제거",
"이행 함수 종속 제거",
"후보키 제거"
],
answer:0,
explanation:"1NF는 속성값의 원자성을 만족해야 한다.",
hint:"1정규형은 각 속성이 원자값(더 이상 분할할 수 없는 값)을 가져야 합니다."
},

{
question:"2정규형(2NF)의 조건은?",
options:[
"원자성",
"부분 함수 종속 제거",
"이행 종속 제거",
"BCNF 만족"
],
answer:1,
explanation:"부분 함수 종속 제거가 핵심이다.",
hint:"2정규형은 1정규형을 만족하면서 부분 함수 종속을 제거해야 합니다."
},

{
question:"3정규형(3NF)의 조건은?",
options:[
"원자성",
"부분 함수 종속 제거",
"이행 함수 종속 제거",
"조인 제거"
],
answer:2,
explanation:"3NF는 이행 종속을 제거한다.",
hint:"3정규형은 2정규형을 만족하면서 이행 함수 종속을 제거해야 합니다."
},

{
question:"트랜잭션 ACID 중 원자성을 의미하는 것은?",
options:[
"Consistency",
"Isolation",
"Atomicity",
"Durability"
],
answer:2,
explanation:"Atomicity는 전부 수행 또는 전부 취소.",
hint:"원자성은 트랜잭션이 모두 실행되거나 전혀 실행되지 않아야 한다는 속성입니다."
},

{
question:"트랜잭션 ACID 중 일관성을 의미하는 것은?",
options:[
"Consistency",
"Isolation",
"Atomicity",
"Durability"
],
answer:0,
explanation:"Consistency는 데이터 일관성 유지.",
hint:"일관성은 트랜잭션 실행前后 데이터베이스가 일관된 상태를 유지해야 한다는 속성입니다."
},

{
question:"Deadlock 발생 조건이 아닌 것은?",
options:[
"상호배제",
"점유와 대기",
"비선점",
"병렬처리"
],
answer:3,
explanation:"병렬처리는 교착상태 조건이 아니다.",
hint:"교착상태 발생 조건은 상호배제, 점유와 대기, 비선점, 환형 대기 4가지입니다."
},

{
question:"Round Robin 스케줄링 특징은?",
options:[
"비선점",
"선점형",
"실시간 전용",
"단일 프로세스"
],
answer:1,
explanation:"Round Robin은 대표적인 선점형 스케줄링.",
hint:"Round Robin은 시간 할당량을 기준으로 프로세스를 순환하는 선점형 스케줄링입니다."
},

{
question:"프로세스(Process)의 설명으로 옳은 것은?",
options:[
"실행 중인 프로그램",
"메모리",
"CPU",
"파일"
],
answer:0,
explanation:"프로세스는 실행 중인 프로그램.",
hint:"프로세스는 메모리에 로드되어 실행 중인 프로그램 인스턴스입니다."
},

{
question:"스레드(Thread)의 설명은?",
options:[
"프로세스 내부 실행 단위",
"데이터베이스",
"파일",
"운영체제"
],
answer:0,
explanation:"스레드는 프로세스 내 작업 흐름.",
hint:"스레드는 프로세스 내에서 실행되는 가장 작은 실행 단위입니다."
},

{
question:"가상메모리(Virtual Memory)의 목적은?",
options:[
"CPU 향상",
"메모리 확장 효과",
"네트워크 연결",
"보안 강화"
],
answer:1,
explanation:"보조기억장치를 활용해 메모리를 확장한다.",
hint:"가상메모리는 하드디스크를 메모리처럼 사용하여 실제 메모리보다 큰 프로그램을 실행할 수 있습니다."
},

{
question:"OSI 7계층 중 네트워크 계층 프로토콜은?",
options:[
"TCP",
"UDP",
"IP",
"HTTP"
],
answer:2,
explanation:"IP는 Network Layer 프로토콜.",
hint:"네트워크 계층(3계층)은 라우팅을 담당하며 IP가 대표적인 프로토콜입니다."
},

{
question:"TCP의 특징은?",
options:[
"비연결형",
"신뢰성 보장",
"브로드캐스트",
"속도 최우선"
],
answer:1,
explanation:"TCP는 연결형, 신뢰성 보장.",
hint:"TCP는 연결 지향적이고 신뢰성을 보장하는 전송 계층 프로토콜입니다."
},

{
question:"UDP의 특징은?",
options:[
"연결형",
"신뢰성 보장",
"비연결형",
"3-way Handshake"
],
answer:2,
explanation:"UDP는 빠르지만 신뢰성 보장이 없다.",
hint:"UDP는 비연결형으로 빠르지만 신뢰성 보장이 없는 전송 계층 프로토콜입니다."
},

{
question:"DNS의 역할은?",
options:[
"IP→도메인",
"도메인→IP",
"암호화",
"인증"
],
answer:1,
explanation:"도메인을 IP 주소로 변환한다.",
hint:"DNS는 도메인 이름을 IP 주소로 변환해주는 시스템입니다."
},

{
question:"HTTPS의 기본 포트 번호는?",
options:[
"21",
"25",
"80",
"443"
],
answer:3,
explanation:"HTTPS는 443 포트 사용.",
hint:"HTTPS는 보안 통신을 위해 443 포트를 기본적으로 사용합니다."
},

{
question:"XSS 공격이란?",
options:[
"SQL 삽입",
"스크립트 삽입 공격",
"패킷 분석",
"암호 해독"
],
answer:1,
explanation:"웹페이지에 악성 스크립트를 삽입한다.",
hint:"XSS(Cross-Site Scripting)은 웹페이지에 악성 스크립트를 삽입하는 공격입니다."
},

{
question:"CSRF 공격이란?",
options:[
"세션 탈취",
"요청 위조",
"암호 해독",
"포트 스캔"
],
answer:1,
explanation:"사용자의 권한을 이용해 요청을 위조한다.",
hint:"CSRF(Cross-Site Request Forgery)은 사용자의 권한을 이용해 요청을 위조하는 공격입니다."
},

{
question:"SQL Injection 공격이란?",
options:[
"네트워크 공격",
"악성 SQL 삽입",
"암호화 공격",
"버퍼 공격"
],
answer:1,
explanation:"입력값을 통해 SQL을 조작한다.",
hint:"SQL Injection은 입력값을 조작하여 데이터베이스를 공격하는 기법입니다."
},

{
question:"AES 암호화 방식은?",
options:[
"대칭키",
"비대칭키",
"해시",
"전자서명"
],
answer:0,
explanation:"AES는 대표적인 대칭키 암호화.",
hint:"AES는 암호화와 복호화에 같은 키를 사용하는 대칭키 암호화 방식입니다."
},

{
question:"Scrum에서 제품 요구사항을 관리하는 역할은?",
options:[
"개발자",
"Tester",
"Product Owner",
"DBA"
],
answer:2,
explanation:"PO(Product Owner)가 제품 백로그를 관리한다.",
hint:"Product Owner는 제품 백로그를 관리하고 우선순위를 결정하는 역할입니다."
}
];