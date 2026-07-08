# [문서37] 코드잇 알고리즘 실습 ① 탐색·정렬·재귀 — 구현 손코딩
> 코드잇 「하나의 문제, 여러 가지 알고리즘」 실습 문제와 정답 코드 모음.
> 개념(문서11~15)이 "왜"라면, 여기는 "직접 짜보는" 손코딩 파트입니다. 파이썬 기준.

---

## 1. 선형 탐색 (Linear Search)

문제: 리스트를 처음부터 하나씩 확인해 `element`의 인덱스를 리턴. 없으면 `None`.

```python
def linear_search(element, some_list):
    for i in range(len(some_list)):
        if some_list[i] == element:
            return i
    return None

print(linear_search(2, [2, 3, 5, 7, 11]))   # 0
print(linear_search(0, [2, 3, 5, 7, 11]))   # None
print(linear_search(11, [2, 3, 5, 7, 11]))  # 4
```

포인트: 최악 O(n). 정렬 안 된 리스트에도 쓸 수 있는 게 유일한 장점.

## 2. 이진 탐색 (Binary Search)

문제: **정렬된** 리스트에서 탐색 범위를 절반씩 좁혀 `element`를 찾음.

```python
def binary_search(element, some_list):
    start_index = 0
    end_index = len(some_list) - 1

    while start_index <= end_index:
        midpoint = (start_index + end_index) // 2
        if some_list[midpoint] == element:
            return midpoint
        elif some_list[midpoint] > element:
            end_index = midpoint - 1
        else:
            start_index = midpoint + 1

    return None

print(binary_search(2, [2, 3, 5, 7, 11]))   # 0
print(binary_search(0, [2, 3, 5, 7, 11]))   # None
print(binary_search(11, [2, 3, 5, 7, 11]))  # 4
```

포인트: O(log n). 리스트 길이 128이면 선형 128회 vs 이진 7회. **정렬 전제**가 없으면 못 씀.

## 3. 선택 정렬 (Selection Sort)

문제: 남은 구간에서 최솟값을 찾아 맨 앞부터 채운다.

```python
def swap_elements(my_list, index1, index2):
    my_list[index1], my_list[index2] = my_list[index2], my_list[index1]
    return my_list

def find_min_index(my_list, start_index):
    min_index = start_index
    for i in range(start_index + 1, len(my_list)):
        if my_list[i] < my_list[min_index]:
            min_index = i
    return min_index

def selection_sort(my_list):
    for i in range(len(my_list)):
        min_index = find_min_index(my_list, i)
        swap_elements(my_list, i, min_index)
    return my_list

print(selection_sort([2, 1, 6, 3, 9, 1, 24, 15]))  # [1, 1, 2, 3, 6, 9, 15, 24]
```

포인트: 항상 O(n²). 비교는 많아도 교환(swap)은 최소라는 특징.

## 4. 삽입 정렬 (Insertion Sort)

문제: 현재 원소를 앞쪽 정렬된 부분의 알맞은 자리에 끼워 넣는다.

```python
def insertion_sort(my_list):
    for i in range(1, len(my_list)):
        temp = my_list[i]
        prev = i - 1
        while prev >= 0 and my_list[prev] > temp:
            my_list[prev + 1] = my_list[prev]
            prev -= 1
        my_list[prev + 1] = temp
    return my_list

print(insertion_sort([2, 1, 6, 3, 9, 1, 24, 15]))  # [1, 1, 2, 3, 6, 9, 15, 24]
```

포인트: 최악 O(n²)이지만 **거의 정렬된 데이터**엔 O(n)에 가까움. 안정 정렬.

## 5. 재귀 — 피보나치

문제: n번째 피보나치 수를 재귀로.

```python
def fib(n):
    if n < 3:
        return 1
    return fib(n - 1) + fib(n - 2)

print(fib(10))  # 55
```

포인트: 순수 재귀는 지수 시간(중복 계산). → 문서40의 DP(메모이제이션)로 개선.

## 6. 재귀 — 숫자 합 / 자릿수 합

```python
# 1 ~ n 까지의 합
def triangle_number(n):
    if n == 1:
        return 1
    return n + triangle_number(n - 1)

print(triangle_number(10))  # 55

# 각 자릿수의 합
def sum_digits(n):
    if n < 10:
        return n
    return n % 10 + sum_digits(n // 10)

print(sum_digits(1234))  # 10
```

포인트: 재귀의 핵심은 **base case**(종료 조건)와 **더 작은 문제로 환원**.

## 7. 재귀 — 리스트 뒤집기

```python
def flip(some_list):
    if len(some_list) <= 1:
        return some_list
    return flip(some_list[1:]) + [some_list[0]]

print(flip([1, 2, 3, 4, 5, 6]))  # [6, 5, 4, 3, 2, 1]
```

## 8. 재귀 — 하노이의 탑

문제: 원판 n개를 시작 기둥에서 목표 기둥으로 옮기는 과정 출력.

```python
def move_disk(disk_num, start_peg, end_peg):
    print("%d번 원판을 %d번 기둥에서 %d번 기둥으로 이동" % (disk_num, start_peg, end_peg))

def hanoi(num_disks, start_peg, end_peg):
    if num_disks == 0:
        return
    other_peg = 6 - start_peg - end_peg
    hanoi(num_disks - 1, start_peg, other_peg)
    move_disk(num_disks, start_peg, end_peg)
    hanoi(num_disks - 1, other_peg, end_peg)

hanoi(3, 1, 3)
```

포인트: `6 - start - end`로 나머지 기둥을 구하는 게 핵심 트릭(기둥 번호 합이 항상 6).
