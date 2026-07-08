# [문서38] 코드잇 알고리즘 실습 ② Brute Force·분할 정복 — 구현 손코딩
> 완전 탐색으로 정답 로직을 확정한 뒤, 분할 정복으로 효율을 끌어올리는 흐름.
> 각 코드에 for문·인덱스·임시변수·내부 함수의 이유를 함께 정리했습니다.

---

## 1. Brute Force — 가까운 매장 찾기 (Closest Pair)

문제: 좌표 리스트에서 직선 거리가 가장 가까운 두 점. 모든 쌍을 이중 반복문으로 비교.

```python
# [내부 함수] 두 점의 직선 거리. 거리 계산을 이름으로 고정해 본문을 깔끔하게.
from math import sqrt
def distance(store1, store2):
    return sqrt((store1[0] - store2[0]) ** 2 + (store1[1] - store2[1]) ** 2)

def closest_pair(coordinates):
    pair = [coordinates[0], coordinates[1]]   # 임시로 첫 두 점을 '현재 최단쌍'으로 둠
    # 이중 for 이유: '모든 쌍'을 봐야 하므로 두 인덱스 조합이 전부 필요.
    for i in range(len(coordinates) - 1):        # 앞 점
        for j in range(i + 1, len(coordinates)): # 뒤 점은 i 다음부터 → 중복/자기자신 방지
            store1, store2 = coordinates[i], coordinates[j]
            if distance(pair[0], pair[1]) > distance(store1, store2):
                pair = [store1, store2]   # 더 가까운 쌍을 만나면 갱신
    return pair

print(closest_pair([(2, 3), (12, 30), (40, 50), (5, 1), (12, 10), (3, 4)]))
# [(2, 3), (3, 4)]
```

**논리 흐름**
- 인덱스 제어의 핵심 `j = i + 1`: `(A,B)`와 `(B,A)`는 같은 쌍이고 `(A,A)`는 무의미. j를 i보다 뒤에서 시작해 각 쌍을 딱 한 번만 본다.
- 임시변수 `pair`: "지금까지 본 최단쌍"을 계속 들고 다니는 기억 장치. 없으면 비교 결과를 저장할 곳이 없다.
- 내부 함수 `distance`: 같은 식을 조건문에서 두 번 쓰는데, 함수로 빼면 본문이 "더 가까우면 갱신"으로 읽힌다.

## 2. Brute Force — 빗물 채우기 (Trapping Rain)

문제: 각 칸의 왼쪽/오른쪽 최고 높이 중 작은 값에서 자기 높이를 뺀 만큼 물이 고인다.

```python
def trapping_rain(buildings):
    total_height = 0   # 임시변수: 칸마다 고이는 물을 누적할 그릇
    # for 범위가 1 ~ len-1 인 이유: 양 끝 칸은 한쪽 벽이 없어 물을 담을 수 없다.
    for i in range(1, len(buildings) - 1):
        max_left = max(buildings[:i])       # 나보다 왼쪽에서 가장 높은 벽
        max_right = max(buildings[i + 1:])  # 나보다 오른쪽에서 가장 높은 벽
        upper_bound = min(max_left, max_right)   # 물은 '낮은 벽' 높이까지만 찬다
        total_height += max(0, upper_bound - buildings[i])  # 음수면(내가 더 높으면) 0
    return total_height

print(trapping_rain([3, 0, 0, 2, 0, 4]))                     # 10
print(trapping_rain([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
```

**논리 흐름**
- 인덱스 제어: 끝 두 칸을 제외(`1`부터 `len-1`)하는 게 핵심. 담는 통은 양쪽에 벽이 있어야 성립한다.
- `min(왼쪽최고, 오른쪽최고)`: 낮은 쪽 벽으로 물이 넘치므로 둘 중 작은 값이 수위 상한.
- `max(0, ...)`: 현재 건물이 양쪽 벽보다 높으면 물이 안 고임 → 음수 방지.
- 한계: 칸마다 `max()`를 매번 다시 계산 → O(n²). 문서41에서 왼/오른쪽 최고값을 미리 배열에 저장해 O(n)으로 최적화.

## 3. 분할 정복 — merge (정렬된 두 리스트 합치기)

```python
def merge(list1, list2):
    i = j = 0             # 두 리스트를 각각 훑는 포인터. 인덱스 2개가 필요.
    merged_list = []      # 임시변수: 정렬 결과를 담을 새 리스트
    # while 이유: 두 리스트를 동시에, 서로 다른 속도로 소모한다. 단일 for로는 표현 곤란.
    while i < len(list1) and j < len(list2):
        if list1[i] > list2[j]:
            merged_list.append(list2[j]); j += 1   # 작은 쪽을 담고 그 포인터만 전진
        else:
            merged_list.append(list1[i]); i += 1
    # 한쪽이 먼저 소진되면, 남은 쪽은 이미 정렬돼 있으니 통째로 이어붙인다
    if i == len(list1):
        merged_list += list2[j:]
    elif j == len(list2):
        merged_list += list1[i:]
    return merged_list

print(merge([1, 2, 3, 4], [5, 6, 7, 8]))  # [1, 2, 3, 4, 5, 6, 7, 8]
print(merge([4, 7, 8, 9], [1, 3, 6, 10])) # [1, 3, 4, 6, 7, 8, 9, 10]
```

**논리 흐름**
- 포인터 2개 이유: 두 리스트에서 각각 "다음에 비교할 위치"가 독립적으로 움직인다. 작은 값을 담은 쪽만 +1 전진.
- 남은 항목 처리: 한쪽이 끝나도 다른 쪽엔 값이 남는다. 그 남은 부분은 이미 정렬돼 있으므로 슬라이스로 붙이면 끝.

## 4. 분할 정복 — 합병 정렬 (Merge Sort)

문제: 반씩 나눠 각각 정렬한 뒤 merge로 합친다.

```python
def merge_sort(my_list):
    if len(my_list) <= 1:          # base case: 1개 이하면 이미 정렬됨
        return my_list
    left = my_list[:len(my_list) // 2]    # 반 나누기 위해 중간 인덱스로 슬라이스
    right = my_list[len(my_list) // 2:]
    # 각 반쪽을 재귀로 정렬한 뒤, 정렬된 둘을 merge로 합친다
    return merge(merge_sort(left), merge_sort(right))

print(merge_sort([28, 13, 9, 30, 1, 48, 5, 7, 15]))
# [1, 5, 7, 9, 13, 15, 28, 30, 48]
```

**논리 흐름**
- 재귀인 이유: "리스트 정렬 = 반쪽 정렬 두 번 + 합치기"라는 자기 참조 구조. base case(1개 이하)에서 쪼개기가 멈춘다.
- for가 없는 이유: 반복 대신 '분할'이 일을 한다. 실제 비교/정렬 작업은 전부 내부 함수 `merge`가 담당 → 역할 분리가 명확.

## 5. 분할 정복 — Partition (퀵 정렬의 분할)

문제: 마지막 원소를 pivot으로, 작은 값은 왼쪽·큰 값은 오른쪽으로 나누고 pivot 최종 위치 리턴.

```python
# [내부 함수] 자리 교환. 퀵 정렬 전체에서 재사용되므로 따로 뺀다.
def swap_elements(my_list, index1, index2):
    my_list[index1], my_list[index2] = my_list[index2], my_list[index1]

def partition(my_list, start, end):
    i = b = start     # i: 훑는 위치 / b: 'pivot보다 작은 값'이 채워질 경계
    p = end           # pivot은 맨 끝 원소
    # for 대신 while로 i를 굴린다. i가 pivot 위치 p에 닿기 전까지.
    while i < p:
        if my_list[i] <= my_list[p]:      # pivot보다 작거나 같으면
            swap_elements(my_list, i, b)  # 경계 b 자리로 보내고
            b += 1                        # 경계를 한 칸 넓힌다
        i += 1
    swap_elements(my_list, b, p)   # 마지막에 pivot을 경계 b로 이동 → 좌우가 나뉜다
    return b                       # 이제 b가 pivot의 확정 위치

list1 = [4, 3, 6, 2, 7, 1, 5]
pivot_index = partition(list1, 0, len(list1) - 1)
print(list1, pivot_index)
```

**논리 흐름**
- 인덱스 2개 `i`, `b`의 역할 분담: `i`는 모든 원소를 훑는 '스캐너', `b`는 '작은 값 구역의 끝' 경계. 작은 값을 만날 때만 b가 전진하므로, b 왼쪽은 항상 pivot보다 작은 값들로 유지된다.
- 마지막 swap: 루프가 끝나면 b는 "작은 값 구역 바로 다음". 그 자리에 pivot을 넣으면 왼쪽=작은 값, 오른쪽=큰 값으로 딱 갈린다.
- 내부 함수 `swap_elements`: 퀵 정렬 전 과정에서 반복되는 동작이라 빼두면 재사용·가독성 둘 다 좋다.

## 6. 분할 정복 — 퀵 정렬 (Quicksort)

```python
def quicksort(my_list, start, end):
    if end - start < 1:   # base case: 범위에 원소가 0~1개면 정렬할 게 없다
        return
    pivot = partition(my_list, start, end)   # 한 번 나누면 pivot은 제자리 확정
    quicksort(my_list, start, pivot - 1)     # pivot 왼쪽(작은 값들)만 재귀 정렬
    quicksort(my_list, pivot + 1, end)       # pivot 오른쪽(큰 값들)만 재귀 정렬

def quicksort_wrapper(my_list):
    # 래퍼 이유: 사용자는 start/end를 몰라도 되게, 첫 호출 인자를 대신 채워준다
    quicksort(my_list, 0, len(my_list) - 1)

nums = [28, 13, 9, 30, 1, 48, 5, 7, 15]
quicksort_wrapper(nums)
print(nums)  # [1, 5, 7, 9, 13, 15, 28, 30, 48]
```

**논리 흐름**
- `pivot ± 1`로 재귀 범위 제어: pivot은 이미 제 위치라 다시 건드리지 않는다. 그 양옆만 각각 정렬.
- 래퍼 함수 `quicksort_wrapper`가 있는 이유: 실제 재귀는 `start`, `end` 인덱스가 필요한데 사용자가 매번 `0, len-1`을 넘기는 건 번거롭고 실수하기 쉽다. 래퍼가 그 초기값을 감춰준다.
- merge_sort와 대비: 퀵은 추가 리스트 없이 **제자리(in-place)** 교환으로 정렬 → 메모리 이득. 대신 나쁜 피벗이면 최악 O(n²).
