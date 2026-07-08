# [문서40] 코드잇 알고리즘 실습 ④ Greedy — 구현 손코딩
> 매 순간 가장 좋아 보이는 선택. 조건: 최적 부분 구조 + 탐욕적 선택 속성.
> 그리디가 통하는지 "반례로 검증"하는 감각이 핵심.

---

## 1. 최소 개수로 거스름돈 주기

문제: 큰 단위부터 최대한 사용해 거스름돈을 최소 개수로.

```python
def min_coin_count(value, coin_list):
    num_coins = 0
    coin_list.sort(reverse=True)      # 큰 단위부터
    for coin in coin_list:
        num_coins += value // coin
        value %= coin
    return num_coins

default_coin_list = [100, 500, 10, 50]
print(min_coin_count(1440, default_coin_list))  # 12
print(min_coin_count(1700, default_coin_list))  # 8
```

포인트: 한국 화폐처럼 단위가 배수 관계면 그리디가 최적. **임의 단위(예: [1,3,4])면 그리디가 틀릴 수 있음** → 그땐 DP.

## 2. 카드 게임 최대 곱 (Max Product)

문제: 플레이어별 3장 중 하나씩 뽑아 곱했을 때 최대. (양수 카드 기준 각자 최댓값 선택)

```python
def max_product(cards):
    result = 1
    for player_cards in cards:
        result *= max(player_cards)
    return result

test_cards = [[1, 2, 3], [4, 6, 1], [8, 2, 4], [3, 2, 5], [5, 2, 3], [3, 2, 1]]
print(max_product(test_cards))  # 5400
```

## 3. 수업 선택 (Activity Selection)

문제: `(시작, 종료)` 수업들 중 겹치지 않게 최대 개수를 듣는다.

```python
def course_selection(course_list):
    sorted_list = sorted(course_list, key=lambda x: x[1])  # 종료 시간 기준
    my_selection = [sorted_list[0]]                        # 먼저 끝나는 것부터
    for course in sorted_list:
        if course[0] > my_selection[-1][1]:               # 직전 종료 이후 시작이면 선택
            my_selection.append(course)
    return my_selection

print(course_selection([(6, 10), (2, 3), (4, 5), (6, 8), (9, 16)]))
# [(2, 3), (4, 5), (6, 8), (9, 16)]
```

포인트: **"가장 먼저 끝나는 것부터"**가 정답 전략. "가장 짧은 것"이나 "가장 적게 겹치는 것"은 반례가 존재. 정렬 O(n log n)이 전체를 지배.

## 그리디 함정 정리 (면접 대비)

- 그리디는 **국소 최적 → 전역 최적**이 보장될 때만 정답. 증명(교환 논법)이나 반례 탐색으로 확인.
- 안 통하면 DP(문서39)로. "거스름돈도 단위가 이상하면 DP"가 대표 예시.
- 전략 후보를 세우고 **반례를 먼저 던져보는 습관**이 그리디 문제의 핵심.
