# [문서41] 코드잇 알고리즘 실습 ⑤ 종합 문제(Level 1~3) — 구현 손코딩
> 패러다임을 스스로 골라 푸는 종합 실습. 인덱스 제어·임시변수·전처리 배열의 이유를 흐름과 함께.

---

## 1. [Lv1] 빠르게 산 오르기 (Greedy)

문제: 약수터 위치 `water_stops`와 용량 `capacity`(km). 물 안 떨어지게 최소 약수터만 들르기.

```python
def select_stops(water_stops, capacity):
    stop_list = []     # 임시변수: 들를 약수터를 모으는 리스트
    prev_stop = 0      # 임시변수: 마지막으로 물 채운 위치(출발점 0). 거리 계산 기준.
    # for 이유: 약수터를 순서대로 훑으며 '여기까지 갈 수 있나'를 매번 판단
    for i in range(len(water_stops)):
        if water_stops[i] - prev_stop > capacity:   # 다음 약수터가 사정거리 밖이면
            stop_list.append(water_stops[i - 1])    # 바로 직전 약수터에서 채웠어야 함
            prev_stop = water_stops[i - 1]          # 기준점을 그 약수터로 갱신
    stop_list.append(water_stops[-1])   # 마지막 약수터(목적지)는 반드시 포함
    return stop_list

print(select_stops([1, 4, 5, 7, 11, 12, 13, 16, 18, 20, 22, 24, 26], 4))
# [4, 7, 11, 13, 16, 20, 24, 26]
```

**논리 흐름**
- 임시변수 `prev_stop`이 상태를 든다: "마지막으로 물 채운 곳". 현재 약수터와의 거리를 재는 기준이라 없으면 사정거리를 못 잰다.
- 인덱스 제어 `i-1`: 지금 약수터(i)에 못 가면, 갈 수 있었던 마지막 곳은 바로 직전(i-1). 그리디하게 "갈 수 있는 데까지 갔다가 막히기 직전에 채운다".
- 루프 밖 `append(water_stops[-1])`: 목적지는 조건과 무관하게 항상 들러야 하므로 마지막에 따로 추가.

## 2. [Lv2] 투자 귀재 규식이 (Kadane's Algorithm)

문제: 일별 수익 리스트에서 **연속 구간 최대합**.

```python
def sublist_max(profits):
    max_profit_so_far = profits[0]   # 임시변수 1: 지금까지 본 '전체' 최대합(정답 후보)
    max_check = profits[0]           # 임시변수 2: '현재 요소로 끝나는' 최대 구간합
    # for 이유: 각 위치를 한 번씩 지나며 두 값을 갱신 → O(n) 한 번 순회
    for i in range(1, len(profits)):
        # 핵심 선택: 앞 구간에 이어붙일까 vs 여기서 새로 시작할까
        max_check = max(max_check + profits[i], profits[i])
        # 그 결과가 역대 최대면 정답 후보 갱신
        max_profit_so_far = max(max_profit_so_far, max_check)
    return max_profit_so_far

print(sublist_max([7, -3, 4, -8]))                      # 8
print(sublist_max([-2, -3, 4, -1, -2, 1, 5, -3]))       # 7
```

**논리 흐름**
- 임시변수가 2개인 이유가 이 문제의 전부:
  - `max_check`는 "지금 이 칸에서 끝나는 최선의 구간합" (지역 상태).
  - `max_profit_so_far`는 "전체를 통틀어 본 최선" (전역 정답).
  - 지역 최선을 매 칸 갱신하고, 그중 역대 최고를 따로 기록한다.
- `max(max_check + profits[i], profits[i])`: 앞까지의 합이 마이너스면 버리고 새로 시작하는 게 이득. 이 한 줄이 Kadane의 심장.

## 3. [Lv2] 삼송전자 주식 분석 (One-pass)

문제: 한 번 사고 한 번 팔 때 최대 수익. (사는 날 팔 수는 없음)

```python
def max_profit(stock_prices):
    # 첫 이틀로 초기값 설정 (최소 2일 존재 가정)
    max_profit_so_far = stock_prices[1] - stock_prices[0]  # 임시변수: 최대 수익
    min_price_so_far = min(stock_prices[0], stock_prices[1])  # 임시변수: 최저 매수가
    # for가 2부터 시작: 0,1일은 위에서 이미 반영했으므로 2일차부터 이어감
    for i in range(2, len(stock_prices)):
        # 오늘 판다면? = 오늘 가격 - 지금까지 최저가. 그게 더 크면 갱신
        max_profit_so_far = max(max_profit_so_far, stock_prices[i] - min_price_so_far)
        # 그 다음, 오늘 가격으로 최저 매수가 갱신(미래에 팔 때 대비)
        min_price_so_far = min(min_price_so_far, stock_prices[i])
    return max_profit_so_far

print(max_profit([7, 1, 5, 3, 6, 4]))  # 5
print(max_profit([7, 6, 4, 3, 1]))     # -1  (계속 하락 → 최소 손실)
```

**논리 흐름**
- 인덱스가 2부터인 이유: 초기값을 0·1일로 이미 잡았으니 중복 없이 2일차부터 순회.
- 두 갱신의 순서가 중요: 먼저 "오늘 판 수익"을 평가(매수는 반드시 과거여야 하므로), 그 다음 최저가를 갱신. 순서를 바꾸면 같은 날 사고파는 게 껴서 틀린다.
- 임시변수 `min_price_so_far`: "지금까지의 최저 매수가"만 들고 있으면 매번 과거 전체를 다시 안 봐도 된다 → O(n).

## 4. [Lv2] 출근하는 방법 (계단 오르기 = 피보나치)

문제: 1칸 또는 2칸씩 올라 n계단 오르는 경우의 수.

```python
def staircase(n):
    # 앞 두 값만 있으면 다음을 만들 수 있다(피보나치 구조) → 변수 2개로 충분
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b   # 동시 대입으로 임시변수 없이 두 값 갱신
    return a

print(staircase(6))   # 13
print(staircase(25))  # 121393
```

**논리 흐름**
- 왜 피보나치인가: n번째 칸에 도달하는 방법 = (n-1에서 1칸) + (n-2에서 2칸). 즉 "앞 두 경우의 수의 합".
- 변수 2개면 되는 이유: 바로 앞 두 개만 있으면 다음이 나온다. 전체 배열을 저장할 필요가 없어 공간 O(1).
- `a, b = b, a+b`: 파이썬 동시 대입이 임시변수를 대신한다.

## 5. [Lv3] 강남역 폭우 II (빗물 O(n) 최적화)

문제: 문서38의 빗물 채우기를 O(n)으로. 왼쪽/오른쪽 최고 높이를 미리 배열에 저장.

```python
def trapping_rain(buildings):
    n = len(buildings)
    if n == 0:
        return 0
    # 전처리 배열 1: left_list[i] = 0~i 중 최고 높이 (왼쪽에서 누적)
    left_list = [0] * n
    left_list[0] = buildings[0]
    for i in range(1, n):
        left_list[i] = max(left_list[i - 1], buildings[i])  # 직전 최고 vs 지금

    # 전처리 배열 2: right_list[i] = i~끝 중 최고 높이 (오른쪽에서 누적)
    right_list = [0] * n
    right_list[-1] = buildings[-1]
    for i in range(n - 2, -1, -1):   # 뒤에서 앞으로 순회
        right_list[i] = max(right_list[i + 1], buildings[i])

    # 본 계산: 각 칸은 이제 max()를 다시 안 돌고 배열에서 바로 조회 → O(n)
    total_height = 0
    for i in range(n):
        upper_bound = min(left_list[i], right_list[i])
        total_height += max(0, upper_bound - buildings[i])
    return total_height

print(trapping_rain([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
```

**논리 흐름**
- 전처리 배열 2개가 최적화의 핵심: Brute Force(문서38)는 칸마다 `max(왼쪽)`, `max(오른쪽)`을 매번 다시 계산해 O(n²). 여기선 그 값을 **미리 한 번씩 누적 계산**해 배열에 저장 → 본 계산에서 조회만.
- 오른쪽 배열의 역방향 for(`n-2 → 0`): 오른쪽 최고값은 뒤에서부터 쌓아야 "직전(오른쪽) 최고 vs 지금"을 비교할 수 있다. 방향이 반대인 이유.
- 트레이드오프: 공간 O(n)을 더 써서 시간을 O(n²)→O(n)으로. 전형적인 '메모리로 속도 사기'.

## 6. [Lv3] 중복되는 항목 찾기 I (정렬)

문제: 길이 N+1 리스트에 1~N이 들어 있어 하나는 중복. 중복 수 찾기.

```python
def find_same_number(some_list):
    some_list.sort()   # 정렬하면 중복된 두 수는 반드시 '이웃'이 된다
    # for 이유: 이웃한 두 칸만 비교하면 되므로 한 번 순회로 충분
    for i in range(len(some_list) - 1):   # -1: i+1을 보니 끝 전까지만
        if some_list[i] == some_list[i + 1]:
            return some_list[i]

print(find_same_number([1, 4, 3, 5, 3, 2]))  # 3
```

**논리 흐름**
- 정렬이 문제를 단순화: 흩어진 중복을 찾으려면 모든 쌍을 봐야 하지만, 정렬하면 같은 값이 붙어 이웃 비교만으로 끝.
- 인덱스 `len-1`까지: `some_list[i+1]`을 참조하므로 마지막 칸에서 범위를 넘지 않게 하나 덜 돈다.

## 7. [Lv3] 중복되는 항목 찾기 II (이진 탐색 + 비둘기집 원리)

제약: 추가 공간 O(1), 원본 리스트 변형 금지.

```python
def find_same_number(some_list):
    low, high = 1, len(some_list) - 1   # '값의 범위' 1~N을 이진 탐색 (인덱스가 아님!)
    # while 이유: 범위가 한 점으로 좁혀질 때까지 절반씩 줄인다
    while low < high:
        mid = (low + high) // 2
        # low~mid 범위에 실제로 몇 개가 들어있는지 센다
        count = sum(1 for num in some_list if low <= num <= mid)
        if count > mid - low + 1:   # 칸 수보다 원소가 많다 = 중복은 이 절반 안
            high = mid
        else:                       # 아니면 중복은 반대쪽 절반
            low = mid + 1
    return low   # low == high로 좁혀진 그 값이 중복

print(find_same_number([1, 4, 3, 5, 3, 2]))              # 3
print(find_same_number([5, 2, 3, 4, 1, 6, 7, 8, 9, 3]))  # 3
```

**논리 흐름**
- 이진 탐색의 대상이 '값의 범위'인 게 핵심: 보통 이진 탐색은 인덱스를 좁히지만, 여기선 답이 될 수 있는 **숫자 범위 1~N**을 좁힌다.
- 비둘기집 원리(`count > mid - low + 1`): 1~mid 사이 '칸'은 `mid-low+1`개인데 원소가 그보다 많으면, 비둘기집 원리로 그 범위 안에 반드시 중복이 있다. 그쪽 절반만 남기고 버린다.
- 공간 O(1)인 이유: 사전·리스트를 새로 안 만들고 `low`/`high` 두 정수만 움직인다. "사전을 못 쓸 때"의 정석 풀이.
