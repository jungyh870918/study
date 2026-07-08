# [문서39] 코드잇 알고리즘 실습 ③ Dynamic Programming — 구현 손코딩
> 중복되는 부분 문제 + 최적 부분 구조 → 계산 결과를 저장해 재사용.
> Memoization(하향식·재귀+캐시)과 Tabulation(상향식·반복문+테이블)의 흐름 차이를 주석으로.

---

## 1. 피보나치 — Memoization (하향식)

이미 계산한 값은 사전(cache)에 저장해 재사용.

```python
def fib_memo(n, cache):
    if n < 3:
        return 1
    if n in cache:               # 이미 계산한 적 있으면 재계산 없이 즉시 리턴
        return cache[n]
    # 처음 보는 n만 계산하고, 결과를 cache에 '적립'해 다음을 대비
    cache[n] = fib_memo(n - 1, cache) + fib_memo(n - 2, cache)
    return cache[n]

def fib(n):
    return fib_memo(n, {})   # 래퍼: 빈 캐시({})를 만들어 넘겨줌. 사용자는 n만 넘긴다.

print(fib(100))  # 354224848179261915075
```

**논리 흐름**
- 임시변수 `cache`(사전)의 역할: 같은 `fib(k)`가 재귀 트리에서 수없이 반복 호출된다. 한 번 구하면 저장해두고 다음엔 꺼내 쓴다 → 지수 시간이 O(n)으로.
- 래퍼 `fib(n)`가 필요한 이유: 재귀 함수는 캐시를 인자로 받아야 하는데, 사용자가 매번 빈 사전을 만들어 넘기는 건 번거롭다. 래퍼가 초기 캐시를 대신 만든다.
- `if n in cache`의 위치: base case 다음, 계산 전. "이미 있으면 계산 자체를 건너뛴다"가 메모이제이션의 전부.

## 2. 피보나치 — Tabulation (상향식)

작은 값부터 테이블을 채워 올라간다.

```python
def fib_tab(n):
    fib_table = [0, 1, 1]   # 인덱스를 값과 맞추려 0번 자리를 채워둠(0,1,2번 시드)
    # for 이유: 재귀 없이 '작은 n → 큰 n' 순서로 테이블을 차곡차곡 채운다
    for i in range(3, n + 1):
        fib_table.append(fib_table[i - 1] + fib_table[i - 2])  # 앞 두 칸을 더해 추가
    return fib_table[n]

print(fib_tab(56))  # 225851433717
```

**공간 최적화**(변수 2개만):

```python
def fib_optimized(n):
    # 테이블 전체가 필요 없다. 바로 앞 두 값만 있으면 다음을 만들 수 있다.
    current, previous = 1, 0
    for _ in range(n - 1):
        # 임시변수 없이 '동시 대입'으로 두 값을 한 번에 갱신
        current, previous = current + previous, current
    return current

print(fib_optimized(16))  # 987
```

**논리 흐름**
- 하향식 vs 상향식: 메모이제이션은 "큰 문제에서 시작해 필요할 때 내려간다", 테이뷸레이션은 "작은 것부터 쌓아 올린다". for가 자연스러운 건 후자.
- 동시 대입 `a, b = b, a+b`가 임시변수를 대체: 파이썬은 우변을 먼저 다 계산한 뒤 좌변에 넣으므로, 별도 temp 없이 두 값을 안전하게 교체한다. (다른 언어라면 temp가 필요)

## 3. 새콤달콤 장사 — Memoization

문제: `price_list[i]` = i개 묶음의 가격. count개를 자유롭게 쪼개 팔 때 최대 수익.

```python
def max_profit_memo(price_list, count, cache):
    if count < 2:                      # base case: 0개·1개는 값이 고정
        cache[count] = price_list[count]
        return cache[count]
    if count in cache:                 # 이미 구한 개수면 재사용
        return cache[count]

    # 통째로 파는 경우를 먼저 후보로. (가격표 범위를 넘으면 0)
    profit = price_list[count] if count < len(price_list) else 0
    # for 이유: count개를 (i)+(count-i) 두 묶음으로 쪼개는 모든 방법을 비교
    for i in range(1, count // 2 + 1):   # 대칭이라 절반까지만 돌면 충분
        profit = max(
            profit,
            max_profit_memo(price_list, i, cache)
            + max_profit_memo(price_list, count - i, cache)
        )
    cache[count] = profit   # 이 개수의 최댓값을 적립
    return profit

def max_profit(price_list, count):
    return max_profit_memo(price_list, count, {})

print(max_profit([0, 100, 400, 800, 900, 1000], 5))   # 1200
print(max_profit([0, 100, 400, 800, 900, 1000], 10))  # 2500
```

**논리 흐름**
- `range(1, count//2 + 1)`로 절반까지만 도는 이유: `(i, count-i)`와 `(count-i, i)`는 같은 분할. 절반만 봐도 모든 조합을 커버 → 낭비 제거.
- 임시변수 `profit`: 여러 분할 후보 중 '지금까지의 최대'를 들고 다니는 누적자. `max()`로 계속 갱신.
- 캐시가 결정적인 이유: 큰 count는 작은 count들의 조합으로 쪼개지는데, 같은 작은 문제가 수없이 겹친다. 저장 안 하면 재계산 폭발.

## 4. 새콤달콤 장사 — Tabulation

```python
def max_profit(price_list, count):
    profit_table = [0]   # profit_table[k] = k개 팔 때 최대 수익. 0개는 0.
    # 바깥 for: 1개, 2개, ... count개 순으로 표를 채운다(상향식)
    for i in range(1, count + 1):
        profit = price_list[i] if i < len(price_list) else 0   # 통째 판매 후보
        # 안쪽 for: i를 두 묶음으로 쪼개되, '이미 표에 있는' 작은 답을 조합
        for j in range(1, i // 2 + 1):
            profit = max(profit, profit_table[j] + profit_table[i - j])
        profit_table.append(profit)
    return profit_table[count]

print(max_profit([0, 100, 400, 800, 900, 1000], 5))   # 1200
```

**논리 흐름**
- 이중 for의 의미: 바깥은 "몇 개짜리 답을 만들 차례인가", 안쪽은 "그 개수를 어떻게 쪼갤까". 안쪽이 참조하는 `profit_table[j]`는 이미 채워진 작은 답이라 재귀가 필요 없다.
- 메모이제이션과 결과는 같고 방식만 다름: 재귀로 내려가며 채우느냐(위→아래), 반복으로 쌓아 올리느냐(아래→위)의 차이.

## 5. Memoization vs Tabulation

| 구분 | Memoization | Tabulation |
|------|-------------|------------|
| 방향 | 하향식(재귀) | 상향식(반복문) |
| 저장소 | 사전(dict) | 리스트(테이블) |
| 계산 범위 | 필요한 부분 문제만 | 작은 것부터 전부 |
| 장점 | 불필요한 계산 스킵 | 재귀 오버헤드 없음·공간 최적화 쉬움 |

포인트(면접): "DP는 **분할 정복과 달리 부분 문제가 겹칠 때** 쓴다. 겹치니까 저장해서 재사용하는 것."
