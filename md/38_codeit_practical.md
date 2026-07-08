# [문서38] 코드잇 알고리즘 실습 ② Brute Force·분할 정복 — 구현 손코딩
> 완전 탐색으로 정답 로직을 확정한 뒤, 분할 정복으로 효율을 끌어올리는 흐름.
> 합병 정렬·퀵 정렬을 직접 구현합니다.

---

## 1. Brute Force — 가까운 매장 찾기 (Closest Pair)

문제: 좌표 리스트에서 직선 거리가 가장 가까운 두 점을 찾는다. 모든 쌍을 이중 반복문으로 비교.

```python
from math import sqrt

def distance(store1, store2):
    return sqrt((store1[0] - store2[0]) ** 2 + (store1[1] - store2[1]) ** 2)

def closest_pair(coordinates):
    pair = [coordinates[0], coordinates[1]]
    for i in range(len(coordinates) - 1):
        for j in range(i + 1, len(coordinates)):
            store1, store2 = coordinates[i], coordinates[j]
            if distance(pair[0], pair[1]) > distance(store1, store2):
                pair = [store1, store2]
    return pair

print(closest_pair([(2, 3), (12, 30), (40, 50), (5, 1), (12, 10), (3, 4)]))
# [(2, 3), (3, 4)]
```

포인트: 모든 쌍 비교 → O(n²). "일단 정답부터 확실히" 낼 때의 기본기.

## 2. Brute Force — 빗물 채우기 (Trapping Rain)

문제: 건물 높이 리스트에서 고이는 빗물 총량. 각 칸의 왼쪽/오른쪽 최고 높이 중 작은 값에서 자기 높이를 뺀 만큼.

```python
def trapping_rain(buildings):
    total_height = 0
    for i in range(1, len(buildings) - 1):
        max_left = max(buildings[:i])
        max_right = max(buildings[i + 1:])
        upper_bound = min(max_left, max_right)
        total_height += max(0, upper_bound - buildings[i])
    return total_height

print(trapping_rain([3, 0, 0, 2, 0, 4]))                     # 10
print(trapping_rain([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
```

포인트: 매 칸마다 `max()`를 다시 계산 → O(n²). 문서41에서 O(n)으로 최적화.

## 3. 분할 정복 — merge (정렬된 두 리스트 합치기)

```python
def merge(list1, list2):
    i = j = 0
    merged_list = []
    while i < len(list1) and j < len(list2):
        if list1[i] > list2[j]:
            merged_list.append(list2[j]); j += 1
        else:
            merged_list.append(list1[i]); i += 1
    # 남은 항목 이어붙이기
    if i == len(list1):
        merged_list += list2[j:]
    elif j == len(list2):
        merged_list += list1[i:]
    return merged_list

print(merge([1, 2, 3, 4], [5, 6, 7, 8]))  # [1, 2, 3, 4, 5, 6, 7, 8]
print(merge([4, 7, 8, 9], [1, 3, 6, 10])) # [1, 3, 4, 6, 7, 8, 9, 10]
```

## 4. 분할 정복 — 합병 정렬 (Merge Sort)

문제: 반씩 나눠 각각 정렬한 뒤 merge로 합친다.

```python
def merge_sort(my_list):
    if len(my_list) <= 1:          # base case
        return my_list
    left = my_list[:len(my_list) // 2]
    right = my_list[len(my_list) // 2:]
    return merge(merge_sort(left), merge_sort(right))

print(merge_sort([28, 13, 9, 30, 1, 48, 5, 7, 15]))
# [1, 5, 7, 9, 13, 15, 28, 30, 48]
```

포인트: 항상 O(n log n), **안정 정렬**. 대가는 O(n) 추가 메모리.

## 5. 분할 정복 — Partition (퀵 정렬의 분할)

문제: 마지막 원소를 pivot으로, 작은 값은 왼쪽·큰 값은 오른쪽으로 나누고 pivot 최종 위치를 리턴.

```python
def swap_elements(my_list, index1, index2):
    my_list[index1], my_list[index2] = my_list[index2], my_list[index1]

def partition(my_list, start, end):
    i = b = start
    p = end
    while i < p:
        if my_list[i] <= my_list[p]:
            swap_elements(my_list, i, b)
            b += 1
        i += 1
    swap_elements(my_list, b, p)
    return b

list1 = [4, 3, 6, 2, 7, 1, 5]
pivot_index = partition(list1, 0, len(list1) - 1)
print(list1, pivot_index)
```

## 6. 분할 정복 — 퀵 정렬 (Quicksort)

```python
def quicksort(my_list, start, end):
    if end - start < 1:
        return
    pivot = partition(my_list, start, end)
    quicksort(my_list, start, pivot - 1)
    quicksort(my_list, pivot + 1, end)

def quicksort_wrapper(my_list):
    quicksort(my_list, 0, len(my_list) - 1)

nums = [28, 13, 9, 30, 1, 48, 5, 7, 15]
quicksort_wrapper(nums)
print(nums)  # [1, 5, 7, 9, 13, 15, 28, 30, 48]
```

포인트: 평균 O(n log n), **제자리(in-place)** 정렬이라 추가 메모리 적음. 최악(정렬된 데이터+나쁜 피벗) O(n²) → 실무는 랜덤/중앙값 피벗으로 회피.
