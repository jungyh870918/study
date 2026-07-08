# [문서39] 코드잇 알고리즘 실습 ③ Dynamic Programming — 구현 손코딩
> 중복되는 부분 문제 + 최적 부분 구조 → 계산 결과를 저장해 재사용.
> Memoization(하향식·재귀+캐시)과 Tabulation(상향식·반복문+테이블) 두 방식을 나란히.

---

## 1. 피보나치 — Memoization (하향식)

이미 계산한 값은 사전(cache)에 저장해 재사용.

```python
def fib_memo(n, cache):
    if n < 3:
        return 1
    if n in cache:               # 이미 계산했으면 바로 리턴
        return cache[n]
    cache[n] = fib_memo(n - 1, cache) + fib_memo(n - 2, cache)
    return cache[n]

def fib(n):
    return fib_memo(n, {})

print(fib(100))  # 354224848179261915075
```

포인트: 캐시 없으면 `fib(100)`은 사실상 안 끝남(지수). 캐시로 각 n 1회 계산 → O(n).

## 2. 피보나치 — Tabulation (상향식)

작은 값부터 테이블을 채워 올라간다.

```python
def fib_tab(n):
    fib_table = [0, 1, 1]
    for i in range(3, n + 1):
        fib_table.append(fib_table[i - 1] + fib_table[i - 2])
    return fib_table[n]

print(fib_tab(56))  # 225851433717
```

**공간 최적화**(변수 2개만):

```python
def fib_optimized(n):
    current, previous = 1, 0
    for _ in range(n - 1):
        current, previous = current + previous, current
    return current

print(fib_optimized(16))  # 987
```

## 3. 새콤달콤 장사 — Memoization

문제: `price_list[i]` = i개 묶음의 가격. count개를 자유롭게 쪼개 팔 때 최대 수익.

```python
def max_profit_memo(price_list, count, cache):
    if count < 2:
        cache[count] = price_list[count]
        return cache[count]
    if count in cache:
        return cache[count]

    profit = price_list[count] if count < len(price_list) else 0
    for i in range(1, count // 2 + 1):
        profit = max(
            profit,
            max_profit_memo(price_list, i, cache)
            + max_profit_memo(price_list, count - i, cache)
        )
    cache[count] = profit
    return profit

def max_profit(price_list, count):
    return max_profit_memo(price_list, count, {})

print(max_profit([0, 100, 400, 800, 900, 1000], 5))   # 1400
print(max_profit([0, 100, 400, 800, 900, 1000], 10))  # 2800
```

## 4. 새콤달콤 장사 — Tabulation

```python
def max_profit(price_list, count):
    profit_table = [0]
    for i in range(1, count + 1):
        profit = price_list[i] if i < len(price_list) else 0
        for j in range(1, i // 2 + 1):
            profit = max(profit, profit_table[j] + profit_table[i - j])
        profit_table.append(profit)
    return profit_table[count]

print(max_profit([0, 100, 400, 800, 900, 1000], 5))   # 1400
```

## 5. Memoization vs Tabulation

| 구분 | Memoization | Tabulation |
|------|-------------|------------|
| 방향 | 하향식(재귀) | 상향식(반복문) |
| 저장소 | 사전(dict) | 리스트(테이블) |
| 계산 범위 | 필요한 부분 문제만 | 작은 것부터 전부 |
| 장점 | 불필요한 계산 스킵 | 재귀 오버헤드 없음·공간 최적화 쉬움 |

포인트(면접): "DP는 **분할 정복과 달리 부분 문제가 겹칠 때** 쓴다. 겹치니까 저장해서 재사용하는 것."
