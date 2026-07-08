# [문서37] 코드잇 알고리즘 실습 ① 탐색·정렬·재귀 — 구현 손코딩
> 코드잇 「하나의 문제, 여러 가지 알고리즘」 실습 문제와 정답 코드 모음.
> 각 코드에 논리 흐름(for문·인덱스·임시변수·내부 함수의 이유)을 함께 정리했습니다. 파이썬 기준.

---

## 1. 선형 탐색 (Linear Search)

문제: 리스트를 처음부터 하나씩 확인해 `element`의 인덱스를 리턴. 없으면 `None`.

```python
def linear_search(element, some_list):
    # for문 이유: '인덱스를 리턴해야' 하므로 값이 아니라 위치 i가 필요하다.
    #            그래서 for-each(for x in list)가 아니라 range(len())로 인덱스를 돈다.
    for i in range(len(some_list)):
        if some_list[i] == element:
            return i          # 찾은 즉시 위치 리턴 → 뒤는 볼 필요 없음
    return None               # 루프를 끝까지 돌았다 = 못 찾았다

print(linear_search(2, [2, 3, 5, 7, 11]))   # 0
print(linear_search(11, [2, 3, 5, 7, 11]))  # 4
print(linear_search(0, [2, 3, 5, 7, 11]))   # None
```

**논리 흐름**
- 인덱스 제어: `range(len(some_list))`로 0→끝까지. 위치를 리턴해야 하니 `i`가 반드시 필요하다.
- `return None`의 위치: for문 **바깥**. 루프 안에서 못 찾고 빠져나온 뒤에야 "없음"이 확정되기 때문. 루프 안에 두면 첫 원소만 보고 성급히 None을 낸다.

## 2. 이진 탐색 (Binary Search)

문제: **정렬된** 리스트에서 탐색 범위를 절반씩 좁혀 `element`를 찾음.

```python
def binary_search(element, some_list):
    # 인덱스 2개로 '탐색 범위'를 표현 → 범위를 좁히는 게 이 알고리즘의 본질
    start_index = 0
    end_index = len(some_list) - 1

    # while 이유: for처럼 정해진 횟수가 아니라 '범위가 남아있는 동안' 반복.
    #            매번 절반씩 줄어 반복 횟수를 미리 알 수 없다.
    while start_index <= end_index:
        midpoint = (start_index + end_index) // 2   # 범위의 가운데
        if some_list[midpoint] == element:
            return midpoint
        elif some_list[midpoint] > element:
            end_index = midpoint - 1     # 가운데가 크다 → 오른쪽 버리고 왼쪽만
        else:
            start_index = midpoint + 1   # 가운데가 작다 → 왼쪽 버리고 오른쪽만
    return None

print(binary_search(2, [2, 3, 5, 7, 11]))   # 0
print(binary_search(11, [2, 3, 5, 7, 11]))  # 4
```

**논리 흐름**
- 인덱스 제어: `start`/`end` 두 포인터가 탐색 범위의 경계. `midpoint ± 1`로 이미 확인한 가운데를 범위에서 확실히 제외해야 무한 루프가 안 난다.
- 종료 조건 `start <= end`: 두 포인터가 교차하면(범위가 비면) 없는 것.
- for가 아닌 while인 이유: 반복 횟수가 데이터에 따라 달라지고, 인덱스가 +1/-1이 아니라 절반씩 점프하기 때문.

## 3. 선택 정렬 (Selection Sort)

문제: 남은 구간에서 최솟값을 찾아 맨 앞부터 채운다.

```python
# [내부 함수 1] 두 위치의 값을 맞바꾼다. '정렬 = 자리 바꾸기'를 한 줄로 캡슐화.
def swap_elements(my_list, index1, index2):
    my_list[index1], my_list[index2] = my_list[index2], my_list[index1]
    return my_list

# [내부 함수 2] start_index부터 끝까지 중 '최솟값의 위치'를 찾아준다.
#              값이 아니라 위치를 리턴하는 이유: swap하려면 인덱스가 필요해서.
def find_min_index(my_list, start_index):
    min_index = start_index          # 일단 첫 칸을 최소라고 가정
    for i in range(start_index + 1, len(my_list)):   # 그 다음 칸부터 비교
        if my_list[i] < my_list[min_index]:
            min_index = i            # 더 작은 걸 만나면 후보 갱신
    return min_index

def selection_sort(my_list):
    # 바깥 for: 정렬이 확정될 '왼쪽 경계' i를 0→끝까지 밀고 간다.
    for i in range(len(my_list)):
        min_index = find_min_index(my_list, i)   # i 이후 구간의 최솟값 위치
        swap_elements(my_list, i, min_index)     # 그 최솟값을 i 자리에 고정
    return my_list

print(selection_sort([2, 1, 6, 3, 9, 1, 24, 15]))  # [1, 1, 2, 3, 6, 9, 15, 24]
```

**논리 흐름**
- 내부 함수를 왜 나눴나: `find_min_index`(찾기)와 `swap_elements`(바꾸기)로 역할을 쪼개면 `selection_sort` 본문이 "찾아서 → 맨 앞에 놓는다"로 읽힌다. 한 함수에 다 넣으면 로직이 뒤엉킨다.
- `find_min_index`가 위치를 리턴하는 이유: swap에는 인덱스가 필요하다. 최솟'값'만 알면 어디 있는지 몰라 못 바꾼다.
- 인덱스 제어: 바깥 `i`는 "여기까지 정렬 끝"의 경계. 안쪽은 `i+1`부터 비교(이미 i는 후보로 잡았으니 그 다음부터).

## 4. 삽입 정렬 (Insertion Sort)

문제: 현재 원소를 앞쪽 정렬된 부분의 알맞은 자리에 끼워 넣는다.

```python
def insertion_sort(my_list):
    # 바깥 for: i=1부터. 0번은 홀로 '정렬됨'으로 간주하고 1번부터 끼워넣기 시작.
    for i in range(1, len(my_list)):
        temp = my_list[i]     # 임시변수 이유: 아래에서 값을 오른쪽으로 밀며 my_list[i]를
                              # 덮어쓰기 때문에, 지금 꽂을 값을 미리 빼서 보관해야 한다.
        prev = i - 1          # 바로 왼쪽(정렬된 구간의 끝)부터 비교 시작
        # while 이유: 몇 칸을 밀지 미리 모른다. temp보다 큰 값이 계속되는 '동안' 민다.
        while prev >= 0 and my_list[prev] > temp:
            my_list[prev + 1] = my_list[prev]   # 큰 값을 오른쪽으로 한 칸 밀기
            prev -= 1                           # 더 왼쪽으로 이동
        my_list[prev + 1] = temp   # 밀기가 끝난 자리에 보관해둔 값을 꽂는다
    return my_list

print(insertion_sort([2, 1, 6, 3, 9, 1, 24, 15]))  # [1, 1, 2, 3, 6, 9, 15, 24]
```

**논리 흐름**
- 임시변수 `temp`가 필수인 이유: 값을 오른쪽으로 밀면 `my_list[i]` 자리가 앞 값으로 덮인다. 미리 `temp`에 빼두지 않으면 꽂을 값을 잃어버린다.
- 인덱스 제어: `prev`가 왼쪽으로 내려가며 자리를 만든다. 루프 종료 후 `prev+1`이 정확한 삽입 위치(마지막으로 -1 된 걸 되돌림).
- `prev >= 0` 조건: 리스트 맨 앞을 넘어가지 않게 막는 경계 검사.

## 5. 재귀 — 피보나치

```python
def fib(n):
    if n < 3:          # base case: n이 1이나 2면 곧장 1. 재귀를 멈추는 바닥.
        return 1
    # 자기보다 작은 두 문제로 쪼개서 합친다 (n = (n-1) + (n-2))
    return fib(n - 1) + fib(n - 2)

print(fib(10))  # 55
```

**논리 흐름**
- for가 아니라 재귀인 이유: "n번째 = 앞 두 개의 합"이라는 정의 자체가 자기 참조. base case(`n<3`)가 없으면 무한히 파고들어 멈추지 않는다.
- 단점: 같은 `fib(k)`를 여러 번 다시 계산 → 지수 시간. 문서39의 메모이제이션이 이 낭비를 없앤다.

## 6. 재귀 — 숫자 합 / 자릿수 합

```python
# 1 ~ n 까지의 합: n을 떼어내고 '1~(n-1)의 합'이라는 작은 문제에 더한다
def triangle_number(n):
    if n == 1:                 # base case
        return 1
    return n + triangle_number(n - 1)

print(triangle_number(10))  # 55

# 각 자릿수의 합: 맨 뒤 한 자리(n%10)를 떼고, 나머지(n//10)로 재귀
def sum_digits(n):
    if n < 10:                 # base case: 한 자리면 그 자체가 답
        return n
    return n % 10 + sum_digits(n // 10)

print(sum_digits(1234))  # 10
```

**논리 흐름**
- `%`와 `//`의 역할 분담: `n % 10`은 지금 처리할 '맨 뒤 한 자리', `n // 10`은 '아직 안 본 나머지 자리들'. 이 둘로 문제를 한 자리씩 줄인다.
- base case가 두 함수의 안전장치: 각각 `n==1`, `n<10`에서 멈춰야 무한 재귀를 피한다.

## 7. 재귀 — 리스트 뒤집기

```python
def flip(some_list):
    if len(some_list) <= 1:    # base case: 0개나 1개면 뒤집어도 그대로
        return some_list
    # 맨 앞 하나를 떼고(some_list[0]), 나머지를 뒤집은 뒤 그 하나를 맨 뒤에 붙인다
    return flip(some_list[1:]) + [some_list[0]]

print(flip([1, 2, 3, 4, 5, 6]))  # [6, 5, 4, 3, 2, 1]
```

**논리 흐름**
- 문제 축소 방식: `some_list[1:]`(맨 앞 뺀 나머지)로 매번 크기가 1 줄어 base case로 수렴한다.
- 순서가 뒤집히는 원리: 맨 앞 원소를 항상 '맨 뒤'에 붙이므로, 재귀가 풀리며 첫 원소들이 차례로 끝쪽에 쌓인다.

## 8. 재귀 — 하노이의 탑

문제: 원판 n개를 시작 기둥에서 목표 기둥으로 옮기는 과정 출력.

```python
# [내부 함수] 원판 한 개 이동을 '출력'으로 표현. 실제 이동 = 로그 한 줄.
def move_disk(disk_num, start_peg, end_peg):
    print("%d번 원판을 %d번 기둥에서 %d번 기둥으로 이동" % (disk_num, start_peg, end_peg))

def hanoi(num_disks, start_peg, end_peg):
    if num_disks == 0:         # base case: 옮길 원판이 없으면 아무것도 안 함
        return
    other_peg = 6 - start_peg - end_peg   # 나머지 기둥 번호 (1+2+3=6 트릭)
    hanoi(num_disks - 1, start_peg, other_peg)   # ① 위 n-1개를 보조 기둥으로
    move_disk(num_disks, start_peg, end_peg)     # ② 맨 아래 큰 원판을 목표로
    hanoi(num_disks - 1, other_peg, end_peg)     # ③ 보조의 n-1개를 목표 위로

hanoi(3, 1, 3)
```

**논리 흐름**
- `6 - start - end` 트릭: 기둥 번호가 1,2,3이라 합이 항상 6. 시작·목표를 빼면 나머지 보조 기둥이 나온다. if-else로 경우를 나눌 필요가 없다.
- 내부 함수 `move_disk`를 분리한 이유: "원판 하나 옮기기"라는 최소 동작을 이름으로 고정하면, `hanoi` 본문이 ①보조로 치우고 ②큰 거 옮기고 ③다시 얹는 3단계로 명확히 읽힌다.
- 세 줄의 순서가 곧 알고리즘: 큰 원판을 옮기려면 그 위를 먼저 비워야(①) 하고, 옮긴 뒤 다시 덮어야(③) 한다.
