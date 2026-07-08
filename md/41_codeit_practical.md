# [문서41] 코드잇 알고리즘 실습 ⑤ 종합 문제(Level 1~3) — 구현 손코딩
> 패러다임을 스스로 골라 푸는 종합 실습. Kadane·비둘기집 원리 등 면접 단골이 섞여 있음.

---

## 1. [Lv1] 빠르게 산 오르기 (Greedy)

문제: 약수터 위치 `water_stops`와 용량 `capacity`(km). 물 안 떨어지게 최소 약수터만 들르기.

```python
def select_stops(water_stops, capacity):
    stop_list = []
    prev_stop = 0
    for i in range(len(water_stops)):
        if water_stops[i] - prev_stop > capacity:   # 못 가면 직전에서 채움
            stop_list.append(water_stops[i - 1])
            prev_stop = water_stops[i - 1]
    stop_list.append(water_stops[-1])               # 마지막은 반드시
    return stop_list

print(select_stops([1, 4, 5, 7, 11, 12, 13, 16, 18, 20, 22, 24, 26], 4))
# [4, 7, 11, 13, 16, 20, 24, 26]
```

## 2. [Lv2] 투자 귀재 규식이 (Kadane's Algorithm)

문제: 일별 수익 리스트에서 **연속 구간 최대합**.

```python
def sublist_max(profits):
    max_profit_so_far = profits[0]   # 지금까지 전체 최대
    max_check = profits[0]           # 현재 요소로 끝나는 최대 구간합
    for i in range(1, len(profits)):
        max_check = max(max_check + profits[i], profits[i])
        max_profit_so_far = max(max_profit_so_far, max_check)
    return max_profit_so_far

print(sublist_max([7, -3, 4, -8]))                      # 8
print(sublist_max([-2, -3, 4, -1, -2, 1, 5, -3]))       # 7
```

포인트: O(n). Brute Force O(n²)·분할정복 O(n log n)보다 우수. "이어붙일지 새로 시작할지"를 매 요소마다 결정하는 게 Kadane의 핵심.

## 3. [Lv2] 삼송전자 주식 분석 (One-pass)

문제: 한 번 사고 한 번 팔 때 최대 수익. (사는 날 팔 수는 없음)

```python
def max_profit(stock_prices):
    max_profit_so_far = stock_prices[1] - stock_prices[0]
    min_price_so_far = min(stock_prices[0], stock_prices[1])
    for i in range(2, len(stock_prices)):
        max_profit_so_far = max(max_profit_so_far, stock_prices[i] - min_price_so_far)
        min_price_so_far = min(min_price_so_far, stock_prices[i])
    return max_profit_so_far

print(max_profit([7, 1, 5, 3, 6, 4]))  # 5
print(max_profit([7, 6, 4, 3, 1]))     # -1  (계속 하락 → 최소 손실)
```

포인트: "지금까지의 최저 매수가"만 들고 한 번 순회 → O(n).

## 4. [Lv2] 출근하는 방법 (계단 오르기 = 피보나치)

문제: 1칸 또는 2칸씩 올라 n계단 오르는 경우의 수.

```python
def staircase(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print(staircase(6))   # 13
print(staircase(25))  # 121393
```

포인트: 경우의 수가 피보나치와 동일 → O(n). "n번째 = (n-1)번째 + (n-2)번째"임을 알아채는 게 관건.

## 5. [Lv3] 강남역 폭우 II (빗물 O(n) 최적화)

문제: 문서38의 빗물 채우기를 O(n)으로. 왼쪽/오른쪽 최고 높이를 미리 배열에 저장.

```python
def trapping_rain(buildings):
    n = len(buildings)
    if n == 0:
        return 0
    left_list = [0] * n
    left_list[0] = buildings[0]
    for i in range(1, n):
        left_list[i] = max(left_list[i - 1], buildings[i])

    right_list = [0] * n
    right_list[-1] = buildings[-1]
    for i in range(n - 2, -1, -1):
        right_list[i] = max(right_list[i + 1], buildings[i])

    total_height = 0
    for i in range(n):
        upper_bound = min(left_list[i], right_list[i])
        total_height += max(0, upper_bound - buildings[i])
    return total_height

print(trapping_rain([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
```

포인트: 매 칸 `max()` 재계산(O(n²)) → 전처리 배열로 O(n). 공간 O(n)을 쓰고 시간을 얻는 전형적 트레이드오프.

## 6. [Lv3] 중복되는 항목 찾기 I (정렬)

문제: 길이 N+1 리스트에 1~N이 들어 있어 하나는 중복. 중복 수 찾기.

```python
def find_same_number(some_list):
    some_list.sort()
    for i in range(len(some_list) - 1):
        if some_list[i] == some_list[i + 1]:   # 정렬하면 중복은 인접
            return some_list[i]

print(find_same_number([1, 4, 3, 5, 3, 2]))  # 3
```

## 7. [Lv3] 중복되는 항목 찾기 II (이진 탐색 + 비둘기집 원리)

제약: 추가 공간 O(1), 원본 리스트 변형 금지.

```python
def find_same_number(some_list):
    low, high = 1, len(some_list) - 1
    while low < high:
        mid = (low + high) // 2
        count = sum(1 for num in some_list if low <= num <= mid)
        if count > mid - low + 1:   # 범위 크기보다 원소가 많으면 중복은 이쪽
            high = mid
        else:
            low = mid + 1
    return low

print(find_same_number([1, 4, 3, 5, 3, 2]))              # 3
print(find_same_number([5, 2, 3, 4, 1, 6, 7, 8, 9, 3]))  # 3
```

포인트: **값의 범위**를 이진 탐색. "범위에 속한 개수 > 범위 크기면 그 안에 중복이 있다"(비둘기집 원리). 시간 O(n log n), 공간 O(1) — 사전을 못 쓸 때의 정석.
