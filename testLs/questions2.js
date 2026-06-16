const questions2 = [
{
category:"java",
difficulty:"medium",
question: `다음 코드의 실행 결과는?

\`\`\`java
class A{
    int x=100;

    void print(){
        System.out.print("A");
    }
}

class B extends A{
    int x=200;

    void print(){
        System.out.print("B");
    }
}

public class Main{
    public static void main(String[] args){
        A obj = new B();

        System.out.print(obj.x);
        obj.print();
    }
}
\`\`\`
`,
options:[
"100A",
"100B",
"200A",
"200B"
],
answer:1,
hint:"필드와 메서드의 바인딩 시점이 다르다.",
explanation:"필드는 A 기준(100), 메서드는 오버라이딩된 B 호출."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
public class Main{
    public static void main(String[] args){

        int a=5;

        System.out.print(a++ + ++a);
    }
}
\`\`\`
`,
options:[
"10",
"11",
"12",
"13"
],
answer:2,
hint:"후위 증가와 전위 증가 순서를 따져보자.",
explanation:"5 + 7 = 12"
},

{
category:"java",
difficulty:"easy",
question:"다형성의 설명으로 옳은 것은?",
options:[
"여러 클래스를 하나로 합치는 기술",
"부모 타입으로 자식 객체 참조",
"클래스 다중상속",
"객체 복제"
],
answer:1,
hint:"업캐스팅을 떠올려보자.",
explanation:"부모 참조변수로 자식 객체를 참조 가능."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
String a="abc";
String b="abc";

System.out.print(a==b);
\`\`\`
`,
options:[
"true",
"false",
"오류",
"null"
],
answer:0,
hint:"문자열 리터럴은 String Pool 사용.",
explanation:"동일 리터럴은 같은 주소 참조."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
String a=new String("abc");
String b=new String("abc");

System.out.print(a==b);
\`\`\`
`,
options:[
"true",
"false",
"abc",
"오류"
],
answer:1,
hint:"new 사용 여부가 중요.",
explanation:"서로 다른 객체."
},

{
category:"java",
difficulty:"easy",
question:"추상 클래스 특징은?",
options:[
"객체 생성 가능",
"추상메서드 포함 가능",
"상속 불가",
"메서드 선언 불가"
],
answer:1,
hint:"abstract 키워드.",
explanation:"추상 클래스는 추상메서드 포함 가능."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
int[] arr={1,2,3};

System.out.print(arr.length);
\`\`\`
`,
options:[
"2",
"3",
"4",
"오류"
],
answer:1,
hint:"배열 길이 확인.",
explanation:"원소 3개."
},

{
category:"java",
difficulty:"medium",
question: `실행 결과는?

\`\`\`java
for(int i=0;i<3;i++){
    System.out.print(i);
}
\`\`\`
`,
options:[
"012",
"123",
"0123",
"03"
],
answer:0,
hint:"i<3 조건 확인.",
explanation:"0 1 2 출력."
},

{
category:"java",
difficulty:"medium",
question:"인터페이스 특징은?",
options:[
"객체 생성 가능",
"다중 구현 가능",
"상속 불가",
"필드 선언 불가"
],
answer:1,
hint:"Java 다중상속 대체.",
explanation:"인터페이스는 다중 구현 가능."
},

{
category:"java",
difficulty:"medium",
question:"예외 처리 구문은?",
options:[
"try-catch",
"if-catch",
"error-catch",
"throw-catch"
],
answer:0,
hint:"가장 기본적인 예외 처리.",
explanation:"try-catch 사용."
},

{
category:"java",
difficulty:"medium",
question:`ArrayList 특징은?`,
options:[
"크기 고정",
"동적 크기",
"정렬 강제",
"키-값 구조"
],
answer:1,
hint:"배열과 비교.",
explanation:"동적으로 크기 변경."
},

{
category:"java",
difficulty:"easy",
question:"HashMap 특징은?",
options:[
"중복 키 허용",
"키-값 저장",
"정렬 필수",
"인덱스 저장"
],
answer:1,
hint:"Map 계열 특징.",
explanation:"Key-Value 구조."
},

{
category:"java",
difficulty:"medium",
question:`Math.abs(-10)의 결과는?`,
options:[
"-10",
"10",
"0",
"오류"
],
answer:1,
hint:"절대값 함수.",
explanation:"절대값 반환."
},

{
category:"java",
difficulty:"easy",
question:"생성자 특징은?",
options:[
"반환형 존재",
"클래스명 동일",
"상속 가능",
"static 필수"
],
answer:1,
hint:"객체 생성 시 호출.",
explanation:"생성자는 클래스명과 동일."
},

{
category:"java",
difficulty:"medium",
question:`10/3 결과(int)은?`,
options:[
"3",
"3.3",
"4",
"오류"
],
answer:0,
hint:"정수 나눗셈.",
explanation:"소수점 버림."
},

{
category:"java",
difficulty:"medium",
question:"final 변수 의미는?",
options:[
"상수",
"상속",
"예외",
"추상"
],
answer:0,
hint:"값 변경 여부.",
explanation:"값 변경 불가."
},

{
category:"java",
difficulty:"medium",
question:`System.out.print(true && false);`,
options:[
"true",
"false",
"1",
"오류"
],
answer:1,
hint:"AND 연산.",
explanation:"둘 다 참이어야 true."
},

{
category:"java",
difficulty:"medium",
question:"JVM 의미는?",
options:[
"Java Virtual Machine",
"Java Variable Manager",
"Java Version Machine",
"Java View Manager"
],
answer:0,
hint:"Java 실행 환경.",
explanation:"JVM = Java Virtual Machine."
},

{
category:"java",
difficulty:"hard",
question:"오버로딩 특징은?",
options:[
"메서드 재정의",
"매개변수 변경",
"상속 필수",
"추상메서드"
],
answer:1,
hint:"같은 이름의 메서드.",
explanation:"매개변수 타입 또는 개수 변경."
},

{
category:"java",
difficulty:"hard",
question:`Wrapper Class가 아닌 것은?`,
options:[
"Integer",
"Double",
"Boolean",
"StringBuilder"
],
answer:3,
hint:"기본형 Wrapper 확인.",
explanation:"StringBuilder는 Wrapper 클래스가 아니다."
},
{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
#include <stdio.h>

int main(){
    int a=10;
    int *p=&a;

    printf("%d", *p);

    return 0;
}
\`\`\`
`,
options:[
"10",
"주소값",
"0",
"오류"
],
answer:0,
hint:"* 연산자는 역참조이다.",
explanation:"*p는 a가 저장한 값인 10."
},

{
category:"c",
difficulty:"medium",
question: `실행 결과는?

\`\`\`c
char str[]="KOREA";

printf("%c", str[2]);
\`\`\`
`,
options:[
"K",
"O",
"R",
"E"
],
answer:2,
hint:"배열 인덱스는 0부터 시작.",
explanation:"str[2] = R"
},

{
category:"c",
difficulty:"hard",
question: `실행 결과는?

\`\`\`c
char str[]="KOREA";

printf("%c", *(str+3));
\`\`\`
`,
options:[
"R",
"E",
"A",
"O"
],
answer:1,
hint:"포인터와 배열은 밀접하다.",
explanation:"*(str+3)은 str[3]과 동일."
},

{
category:"c",
difficulty:"medium",
question:"문자열 종료 문자는?",
options:[
"EOF",
"\\n",
"\\0",
"NULL"
],
answer:2,
hint:"널 문자.",
explanation:"문자열 끝은 \\0."
},

{
category:"c",
difficulty:"medium",
question:`실행 결과는?

\`\`\`c
int a=5;

printf("%d", ++a);
\`\`\`
`,
options:[
"5",
"6",
"7",
"오류"
],
answer:1,
hint:"전위 증가.",
explanation:"출력 전에 증가."
},

{
category:"c",
difficulty:"medium",
question:`실행 결과는?

\`\`\`c
int a=5;

printf("%d", a++);
\`\`\`
`,
options:[
"5",
"6",
"7",
"오류"
],
answer:0,
hint:"후위 증가.",
explanation:"출력 후 증가."
},

{
category:"c",
difficulty:"medium",
question:`실행 결과는?

\`\`\`c
int arr[3]={1,2,3};

printf("%d", arr[1]);
\`\`\`
`,
options:[
"1",
"2",
"3",
"오류"
],
answer:1,
hint:"배열 두 번째 요소.",
explanation:"arr[1]=2"
},

{
category:"c",
difficulty:"hard",
question:`실행 결과는?

\`\`\`c
int a=10;
int b=3;

printf("%d", a%b);
\`\`\`
`,
options:[
"0",
"1",
"2",
"3"
],
answer:1,
hint:"나머지 연산.",
explanation:"10 % 3 = 1"
},

{
category:"c",
difficulty:"medium",
question:"sizeof 연산자의 역할은?",
options:[
"주소 반환",
"자료형 크기 반환",
"배열 길이 반환",
"메모리 할당"
],
answer:1,
hint:"바이트 단위.",
explanation:"자료형의 메모리 크기."
},

{
category:"c",
difficulty:"medium",
question:"구조체(struct)의 목적은?",
options:[
"반복문",
"여러 자료형 묶음",
"메모리 해제",
"함수 호출"
],
answer:1,
hint:"사용자 정의 자료형.",
explanation:"다양한 타입을 하나로 묶음."
},

{
category:"c",
difficulty:"hard",
question:`실행 결과는?

\`\`\`c
int arr[3]={10,20,30};

printf("%d", *(arr+1));
\`\`\`
`,
options:[
"10",
"20",
"30",
"오류"
],
answer:1,
hint:"배열명은 포인터.",
explanation:"*(arr+1)=20"
},

{
category:"c",
difficulty:"medium",
question:"malloc 함수의 목적은?",
options:[
"메모리 해제",
"동적 메모리 할당",
"배열 선언",
"파일 생성"
],
answer:1,
hint:"실행 중 메모리 확보.",
explanation:"malloc은 메모리 할당."
},

{
category:"c",
difficulty:"easy",
question:"free 함수의 역할은?",
options:[
"동적 메모리 해제",
"메모리 생성",
"포인터 증가",
"배열 초기화"
],
answer:0,
hint:"malloc과 짝.",
explanation:"할당된 메모리 반환."
},

{
category:"c",
difficulty:"medium",
question:"NULL 포인터 의미는?",
options:[
"0번지",
"빈 주소",
"배열 시작",
"파일 포인터"
],
answer:1,
hint:"아무것도 가리키지 않음.",
explanation:"유효한 주소가 없다."
},

{
category:"c",
difficulty:"hard",
question:`실행 결과는?

\`\`\`c
int a=3;

switch(a){

case 1:
printf("A");
break;

case 3:
printf("B");
break;

default:
printf("C");
}
\`\`\`
`,
options:[
"A",
"B",
"C",
"오류"
],
answer:1,
hint:"일치하는 case.",
explanation:"case 3 수행."
},

{
category:"c",
difficulty:"medium",
question:"재귀함수란?",
options:[
"함수 복사",
"자기 자신 호출",
"함수 삭제",
"포인터 함수"
],
answer:1,
hint:"factorial 구현.",
explanation:"함수 내부에서 자기 자신 호출."
},

{
category:"c",
difficulty:"hard",
question:`실행 결과는?

\`\`\`c
int x=1;

while(x<4){
printf("%d",x);
x++;
}
\`\`\`
`,
options:[
"123",
"0123",
"1234",
"234"
],
answer:0,
hint:"while 조건 확인.",
explanation:"1,2,3 출력."
},

{
category:"c",
difficulty:"medium",
question:"break문의 역할은?",
options:[
"함수 종료",
"반복 종료",
"프로그램 종료",
"메모리 삭제"
],
answer:1,
hint:"반복문 탈출.",
explanation:"가장 가까운 반복문 종료."
},

{
category:"c",
difficulty:"hard",
question:`실행 결과는?

\`\`\`c
int a=2;

if(a>1)
printf("A");

else
printf("B");
\`\`\`
`,
options:[
"A",
"B",
"AB",
"오류"
],
answer:0,
hint:"조건식 평가.",
explanation:"2>1 참."
},

{
category:"c",
difficulty:"hard",
question:`실행 결과는?

\`\`\`c
int a=0;

for(int i=1;i<=3;i++)
a+=i;

printf("%d",a);
\`\`\`
`,
options:[
"3",
"5",
"6",
"9"
],
answer:2,
hint:"1+2+3",
explanation:"합계는 6."
},
{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a=[1,2,3,4,5]

print(a[1:4])
\`\`\`
`,
options:[
"[1,2,3]",
"[2,3,4]",
"[2,3,4,5]",
"[1,2,3,4]"
],
answer:1,
hint:"슬라이싱의 끝 인덱스는 포함되지 않는다.",
explanation:"1~3번 인덱스 요소 반환."
},

{
category:"python",
difficulty:"easy",
question: `실행 결과는?

\`\`\`python
a=[1,2,3]

print(len(a))
\`\`\`
`,
options:[
"2",
"3",
"4",
"오류"
],
answer:1,
hint:"리스트 길이 확인.",
explanation:"원소는 3개."
},

{
category:"python",
difficulty:"medium",
question:"Python 리스트 선언 기호는?",
options:[
"()",
"{}",
"[]",
"<>"
],
answer:2,
hint:"가장 많이 사용하는 자료구조.",
explanation:"리스트는 [] 사용."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a=(1,2,3)

print(type(a).__name__)
\`\`\`
`,
options:[
"list",
"tuple",
"dict",
"set"
],
answer:1,
hint:"소괄호 자료형.",
explanation:"튜플(Tuple)이다."
},

{
category:"python",
difficulty:"medium",
question:"Dictionary 특징은?",
options:[
"중복 키 허용",
"Key-Value 구조",
"인덱스 전용",
"정렬 필수"
],
answer:1,
hint:"JSON 구조와 유사.",
explanation:"키와 값으로 구성."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a={"name":"kim"}

print(a["name"])
\`\`\`
`,
options:[
"name",
"kim",
"dict",
"오류"
],
answer:1,
hint:"키로 접근한다.",
explanation:"name 키의 값은 kim."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
for i in range(3):
    print(i,end="")
\`\`\`
`,
options:[
"012",
"123",
"0123",
"1234"
],
answer:0,
hint:"range(3)의 범위 확인.",
explanation:"0~2 출력."
},

{
category:"python",
difficulty:"easy",
question:"함수 선언 키워드는?",
options:[
"func",
"function",
"def",
"method"
],
answer:2,
hint:"Python 함수 선언.",
explanation:"def 사용."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
def add(a,b):
    return a+b

print(add(3,4))
\`\`\`
`,
options:[
"5",
"6",
"7",
"8"
],
answer:2,
hint:"매개변수 합.",
explanation:"3+4=7"
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
x=10

if x>5:
    print("A")
else:
    print("B")
\`\`\`
`,
options:[
"A",
"B",
"AB",
"오류"
],
answer:0,
hint:"조건식 확인.",
explanation:"10은 5보다 크다."
},

{
category:"python",
difficulty:"hard",
question:"lambda의 목적은?",
options:[
"반복문",
"익명 함수",
"예외 처리",
"상속"
],
answer:1,
hint:"한 줄 함수.",
explanation:"이름 없는 함수 생성."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
a=[1,2,3]

a.append(4)

print(len(a))
\`\`\`
`,
options:[
"3",
"4",
"5",
"오류"
],
answer:1,
hint:"append 후 길이 확인.",
explanation:"원소 4개."
},

{
category:"python",
difficulty:"medium",
question:"상속 선언 문법은?",
options:[
"extends",
"implements",
"class B(A)",
"inherit"
],
answer:2,
hint:"부모 클래스를 괄호에 작성.",
explanation:"Python 상속 문법."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
print(5//2)
\`\`\`
`,
options:[
"2",
"2.5",
"3",
"1"
],
answer:0,
hint:"몫 연산자.",
explanation:"정수 몫 반환."
},

{
category:"python",
difficulty:"medium",
question: `실행 결과는?

\`\`\`python
print(5%2)
\`\`\`
`,
options:[
"1",
"2",
"2.5",
"0"
],
answer:0,
hint:"나머지 연산.",
explanation:"5를 2로 나눈 나머지."
},

{
category:"python",
difficulty:"medium",
question:"예외 처리 구문은?",
options:[
"try-catch",
"try-except",
"catch-finally",
"error-catch"
],
answer:1,
hint:"Java와 다르다.",
explanation:"Python은 except 사용."
},

{
category:"python",
difficulty:"hard",
question: `실행 결과는?

\`\`\`python
a=[1,2]
b=[3,4]

print(a+b)
\`\`\`
`,
options:[
"[1,2,3,4]",
"[4,6]",
"[1,2]",
"오류"
],
answer:0,
hint:"리스트 덧셈 의미.",
explanation:"리스트 연결(concatenation)."
},

{
category:"python",
difficulty:"medium",
question:"set 자료형 특징은?",
options:[
"중복 허용",
"중복 제거",
"정렬 필수",
"키 저장"
],
answer:1,
hint:"집합 자료형.",
explanation:"중복 데이터 제거."
},

{
category:"python",
difficulty:"hard",
question: `실행 결과는?

\`\`\`python
print(bool(0))
\`\`\`
`,
options:[
"True",
"False",
"0",
"오류"
],
answer:1,
hint:"0의 논리값.",
explanation:"0은 False."
},

{
category:"python",
difficulty:"hard",
question: `실행 결과는?

\`\`\`python
def fact(n):
    if n<=1:
        return 1
    return n*fact(n-1)

print(fact(4))
\`\`\`
`,
options:[
"12",
"24",
"36",
"48"
],
answer:1,
hint:"재귀 팩토리얼.",
explanation:"4×3×2×1=24"
},
{
category:"sql",
difficulty:"easy",
question:"데이터를 조회하는 명령어는?",
options:[
"INSERT",
"UPDATE",
"DELETE",
"SELECT"
],
answer:3,
hint:"CRUD 중 Read.",
explanation:"SELECT는 데이터를 조회한다."
},

{
category:"sql",
difficulty:"easy",
question:"데이터를 삽입하는 명령어는?",
options:[
"INSERT",
"UPDATE",
"DELETE",
"ALTER"
],
answer:0,
hint:"Create 역할.",
explanation:"INSERT는 새로운 행 추가."
},

{
category:"sql",
difficulty:"medium",
question:`다음 SQL의 결과는?

\`\`\`sql
SELECT COUNT(*)
FROM EMP;
\`\`\`
`,
options:[
"행의 개수",
"열의 개수",
"NULL 개수",
"급여 합계"
],
answer:0,
hint:"COUNT(*) 의미.",
explanation:"전체 행 수를 반환한다."
},

{
category:"sql",
difficulty:"medium",
question:`다음 SQL의 의미는?

\`\`\`sql
SELECT SUM(SAL)
FROM EMP;
\`\`\`
`,
options:[
"급여 평균",
"급여 합계",
"최대 급여",
"최소 급여"
],
answer:1,
hint:"SUM 함수.",
explanation:"SAL 컬럼의 합계 계산."
},

{
category:"sql",
difficulty:"medium",
question:`다음 SQL의 의미는?

\`\`\`sql
SELECT AVG(SAL)
FROM EMP;
\`\`\`
`,
options:[
"합계",
"최대값",
"평균",
"개수"
],
answer:2,
hint:"AVG 함수.",
explanation:"평균값 계산."
},

{
category:"sql",
difficulty:"medium",
question:"GROUP BY의 역할은?",
options:[
"정렬",
"그룹 집계",
"삭제",
"조인"
],
answer:1,
hint:"집계 함수와 함께 사용.",
explanation:"데이터를 그룹화한다."
},

{
category:"sql",
difficulty:"medium",
question:"HAVING의 역할은?",
options:[
"집계 전 조건",
"집계 후 조건",
"정렬",
"삭제"
],
answer:1,
hint:"WHERE와 비교.",
explanation:"GROUP BY 결과에 조건 적용."
},

{
category:"sql",
difficulty:"easy",
question:"정렬을 수행하는 절은?",
options:[
"GROUP BY",
"HAVING",
"ORDER BY",
"SORT"
],
answer:2,
hint:"ASC, DESC 사용.",
explanation:"ORDER BY는 정렬 수행."
},

{
category:"sql",
difficulty:"medium",
question:"기본키(Primary Key)의 특징은?",
options:[
"중복 허용",
"NULL 허용",
"중복과 NULL 불가",
"외래키 역할"
],
answer:2,
hint:"엔터티 식별.",
explanation:"고유값만 가능."
},

{
category:"sql",
difficulty:"medium",
question:"외래키(Foreign Key)의 역할은?",
options:[
"정렬",
"테이블 연결",
"인덱스 생성",
"암호화"
],
answer:1,
hint:"참조 관계.",
explanation:"다른 테이블의 PK 참조."
},

{
category:"sql",
difficulty:"hard",
question:"INNER JOIN 결과는?",
options:[
"왼쪽 전체",
"오른쪽 전체",
"공통 데이터",
"모든 데이터"
],
answer:2,
hint:"교집합 개념.",
explanation:"양쪽 모두 존재하는 행만 조회."
},

{
category:"sql",
difficulty:"hard",
question:"LEFT OUTER JOIN 특징은?",
options:[
"오른쪽 전체",
"왼쪽 전체",
"교집합만",
"NULL 제거"
],
answer:1,
hint:"LEFT 의미.",
explanation:"왼쪽 테이블 기준 전체 조회."
},

{
category:"sql",
difficulty:"medium",
question:"DDL에 해당하는 것은?",
options:[
"SELECT",
"INSERT",
"CREATE",
"UPDATE"
],
answer:2,
hint:"정의어.",
explanation:"CREATE는 DDL."
},

{
category:"sql",
difficulty:"medium",
question:"DML에 해당하는 것은?",
options:[
"DROP",
"ALTER",
"CREATE",
"SELECT"
],
answer:3,
hint:"데이터 조작.",
explanation:"SELECT는 DML."
},

{
category:"sql",
difficulty:"hard",
question:`실행 결과는?

\`\`\`sql
SELECT *
FROM EMP
WHERE SAL > 3000;
\`\`\`
`,
options:[
"3000 이상",
"3000 초과",
"3000 미만",
"전체 조회"
],
answer:1,
hint:"> 연산 의미.",
explanation:"초과 조건."
},

{
category:"sql",
difficulty:"hard",
question:`실행 결과는?

\`\`\`sql
SELECT *
FROM EMP
WHERE ENAME LIKE 'K%';
\`\`\`
`,
options:[
"K 포함",
"K로 끝남",
"K로 시작",
"K만 조회"
],
answer:2,
hint:"% 위치 확인.",
explanation:"K로 시작하는 문자열."
},

{
category:"sql",
difficulty:"medium",
question:"NULL 값을 찾는 조건은?",
options:[
"= NULL",
"== NULL",
"IS NULL",
"LIKE NULL"
],
answer:2,
hint:"NULL 비교는 특별하다.",
explanation:"IS NULL 사용."
},

{
category:"sql",
difficulty:"medium",
question:"서브쿼리(Subquery)란?",
options:[
"조인",
"쿼리 안의 쿼리",
"인덱스",
"트랜잭션"
],
answer:1,
hint:"Nested Query.",
explanation:"SQL 내부에 포함된 SQL."
},

{
category:"sql",
difficulty:"hard",
question:"COMMIT의 의미는?",
options:[
"롤백",
"저장",
"삭제",
"잠금"
],
answer:1,
hint:"트랜잭션 완료.",
explanation:"변경사항을 영구 반영."
},

{
category:"sql",
difficulty:"hard",
question:"ROLLBACK의 의미는?",
options:[
"복구",
"삭제",
"조회",
"잠금"
],
answer:0,
hint:"트랜잭션 취소.",
explanation:"이전 COMMIT 시점까지 되돌림."
},
{
category:"db",
difficulty:"medium",
question:"1정규형(1NF)의 조건은?",
options:[
"원자값 유지",
"부분 함수 종속 제거",
"이행 종속 제거",
"결정자 제거"
],
answer:0,
hint:"정규화의 첫 단계.",
explanation:"속성값은 더 이상 분해할 수 없는 원자값이어야 한다."
},

{
category:"db",
difficulty:"medium",
question:"2정규형(2NF)의 조건은?",
options:[
"원자성",
"부분 함수 종속 제거",
"이행 종속 제거",
"다치 종속 제거"
],
answer:1,
hint:"1NF를 만족한 상태.",
explanation:"부분 함수 종속 제거."
},

{
category:"db",
difficulty:"medium",
question:"3정규형(3NF)의 조건은?",
options:[
"원자성",
"부분 함수 종속 제거",
"이행 함수 종속 제거",
"조인 종속 제거"
],
answer:2,
hint:"2NF 이후 제거 대상.",
explanation:"이행 종속 제거."
},

{
category:"db",
difficulty:"hard",
question:"트랜잭션 ACID 중 Atomicity의 의미는?",
options:[
"일관성",
"독립성",
"원자성",
"지속성"
],
answer:2,
hint:"All or Nothing.",
explanation:"전부 수행되거나 전부 취소."
},

{
category:"db",
difficulty:"hard",
question:"트랜잭션 ACID 중 Durability 의미는?",
options:[
"원자성",
"지속성",
"독립성",
"일관성"
],
answer:1,
hint:"Commit 이후 상태.",
explanation:"장애 발생 후에도 데이터 유지."
},

{
category:"os",
difficulty:"hard",
question:"Deadlock 발생 조건이 아닌 것은?",
options:[
"상호배제",
"점유와 대기",
"비선점",
"병렬처리"
],
answer:3,
hint:"Coffman 조건.",
explanation:"병렬처리는 교착상태 조건이 아니다."
},

{
category:"os",
difficulty:"medium",
question:"프로세스(Process)의 의미는?",
options:[
"실행 중인 프로그램",
"파일",
"CPU",
"메모리"
],
answer:0,
hint:"운영체제 기본 개념.",
explanation:"실행 중인 프로그램."
},

{
category:"os",
difficulty:"medium",
question:"스레드(Thread)의 의미는?",
options:[
"파일",
"프로세스 내부 실행 단위",
"DB 연결",
"캐시"
],
answer:1,
hint:"Light Weight Process.",
explanation:"프로세스 내부 작업 흐름."
},

{
category:"os",
difficulty:"medium",
question:"Round Robin 스케줄링 특징은?",
options:[
"비선점",
"선점형",
"실시간 전용",
"우선순위 전용"
],
answer:1,
hint:"Time Quantum 사용.",
explanation:"대표적인 선점형 스케줄링."
},

{
category:"os",
difficulty:"medium",
question:"가상메모리(Virtual Memory)의 목적은?",
options:[
"CPU 향상",
"메모리 확장 효과",
"보안 강화",
"파일 압축"
],
answer:1,
hint:"보조기억장치 활용.",
explanation:"실제 메모리보다 크게 사용 가능."
},

{
category:"network",
difficulty:"medium",
question:"OSI 7계층 중 네트워크 계층 프로토콜은?",
options:[
"HTTP",
"TCP",
"IP",
"FTP"
],
answer:2,
hint:"라우팅 담당.",
explanation:"IP는 Network Layer 프로토콜."
},

{
category:"network",
difficulty:"medium",
question:"TCP 특징은?",
options:[
"비연결형",
"신뢰성 보장",
"브로드캐스트",
"빠르지만 손실 허용"
],
answer:1,
hint:"3-Way Handshake.",
explanation:"연결형, 신뢰성 보장."
},

{
category:"network",
difficulty:"medium",
question:"UDP 특징은?",
options:[
"연결형",
"신뢰성 보장",
"비연결형",
"흐름제어 지원"
],
answer:2,
hint:"속도 우선.",
explanation:"빠르지만 신뢰성 보장 없음."
},

{
category:"network",
difficulty:"hard",
question:"DNS의 역할은?",
options:[
"IP→도메인",
"도메인→IP",
"암호화",
"인증"
],
answer:1,
hint:"인터넷 전화번호부.",
explanation:"도메인을 IP 주소로 변환."
},

{
category:"network",
difficulty:"medium",
question:"HTTPS 기본 포트는?",
options:[
"21",
"25",
"80",
"443"
],
answer:3,
hint:"SSL/TLS 사용.",
explanation:"HTTPS는 443 사용."
},

{
category:"security",
difficulty:"hard",
question:"XSS 공격이란?",
options:[
"SQL 조작",
"스크립트 삽입",
"세션 복제",
"패킷 위조"
],
answer:1,
hint:"Cross Site Scripting.",
explanation:"웹페이지에 악성 스크립트 삽입."
},

{
category:"security",
difficulty:"hard",
question:"CSRF 공격이란?",
options:[
"암호 해독",
"요청 위조",
"버퍼 오버플로우",
"포트 스캔"
],
answer:1,
hint:"사용자 권한 악용.",
explanation:"정상 사용자인 것처럼 요청 전송."
},

{
category:"security",
difficulty:"hard",
question:"SQL Injection 공격은?",
options:[
"SQL 삽입 공격",
"세션 탈취",
"암호화 공격",
"DoS 공격"
],
answer:0,
hint:"입력값 검증 부족.",
explanation:"악성 SQL문 삽입."
},

{
category:"security",
difficulty:"medium",
question:"AES 암호화 방식은?",
options:[
"대칭키",
"비대칭키",
"해시",
"전자서명"
],
answer:0,
hint:"속도가 빠름.",
explanation:"대표적인 대칭키 암호."
},

{
category:"sw",
difficulty:"medium",
question:"Scrum에서 Product Owner의 역할은?",
options:[
"개발",
"테스트",
"제품 백로그 관리",
"DB 설계"
],
answer:2,
hint:"요구사항 우선순위 결정.",
explanation:"제품 백로그를 관리하고 비즈니스 가치를 극대화한다."
}
];