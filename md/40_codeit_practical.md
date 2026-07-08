# [문서40] 코드잇 알고리즘 실습 ④ Greedy — 구현 손코딩
> 매 순간 가장 좋아 보이는 선택. 조건: 최적 부분 구조 + 탐욕적 선택 속성.
> for문·정렬·임시변수의 이유를 흐름과 함께 정리했습니다.

---

## 1. 최소 개수로 거스름돈 주기

문제: 큰 단위부터 최대한 사용해 거스름돈을 최소 개수로.

```python
def min_coin_count(value, coin_list):
    num_coins = 0                 # 임시변수: 사용한 화폐 개수를 누적
    coin_list.sort(reverse=True)  # 큰 단위부터 쓰려고 내림차순 정렬 (그리디 선택 준비)
    # for 이유: 각 화폐 단위를 큰 것부터 한 번씩 훑으며 최대한 사용
    for coin in coin_list:
        num_coins += value // coin   # 이 단위로 낼 수 있는 최대 장수
        value %= coin                # 그러고 남은 금액으로 갱신
    return num_coins

default_coin_list = [100, 500, 10, 50]
print(min_coin_count(1440, default_coin_list))  # 10
print(min_coin_count(1700, default_coin_list))  # 5
```

**논리 흐름**
- 정렬(내림차순)이 그리디의 핵심: "가장 큰 단위부터"라는 탐욕적 선택을 위해 먼저 큰 값이 오게 정렬한다.
- `//`와 `%`의 역할 분담: `value // coin`은 '이 단위를 몇 장 쓸까'(선택), `value %= coin`은 '쓰고 남은 금액'(다음 단계로 넘길 상태). 이 둘로 금액이 단계마다 줄어든다.
- 임시변수 `num_coins`: 단계별로 쓴 장수를 모으는 누적자.
- 한계: 배수 관계 단위(한국 화폐)라서 그리디가 최적. `[1,3,4]`처럼 임의 단위면 틀릴 수 있어 그땐 DP.

## 2. 카드 게임 최대 곱 (Max Product)

문제: 플레이어별 3장 중 하나씩 뽑아 곱했을 때 최대. (양수 카드 기준 각자 최댓값 선택)

```python
def max_product(cards):
    result = 1   # 임시변수: 곱을 누적. 곱셈의 시작값은 1(0이면 전부 0이 됨)
    # for 이유: 플레이어마다 독립적으로 '그 플레이어의 최선'을 골라 곱한다
    for player_cards in cards:
        result *= max(player_cards)   # 각 플레이어의 최댓값을 선택(탐욕적 선택)
    return result

test_cards = [[1, 2, 3], [4, 6, 1], [8, 2, 4], [3, 2, 5], [5, 2, 3], [3, 2, 1]]
print(max_product(test_cards))  # 10800
```

**논리 흐름**
- `result = 1`로 시작하는 이유: 곱셈의 항등원은 1. 0으로 시작하면 어떤 값을 곱해도 0.
- 각 플레이어에서 `max`만 보면 되는 이유: 플레이어 선택이 서로 독립적이고 카드가 양수라, 각자 최댓값을 고르면 전체 곱도 최대(국소 최적 → 전역 최적).

## 3. 수업 선택 (Activity Selection)

문제: `(시작, 종료)` 수업들 중 겹치지 않게 최대 개수를 듣는다.

```python
def course_selection(course_list):
    # 종료 시간 기준 정렬 → '먼저 끝나는 것부터'라는 그리디 선택의 토대
    sorted_list = sorted(course_list, key=lambda x: x[1])
    my_selection = [sorted_list[0]]   # 임시변수: 가장 먼저 끝나는 수업을 무조건 선택
    # for 이유: 정렬된 순서대로 훑으며 '겹치지 않으면 추가'를 판단
    for course in sorted_list:
        # 직전 선택의 종료시간(my_selection[-1][1])보다 늦게 시작하면 안 겹침
        if course[0] > my_selection[-1][1]:
            my_selection.append(course)
    return my_selection

print(course_selection([(6, 10), (2, 3), (4, 5), (6, 8), (9, 16)]))
# [(2, 3), (4, 5), (6, 8), (9, 16)]
```

**논리 흐름**
- 정렬 기준이 `x[1]`(종료 시간)인 이유: 빨리 끝날수록 뒤에 남는 시간이 많다 → 더 많은 수업을 넣을 여지. 이게 이 문제의 정답 전략.
- 임시변수 `my_selection`이자 상태: 마지막 원소 `[-1]`가 "직전에 고른 수업". 그 종료시간과만 비교하면 겹침 판정이 끝난다(정렬돼 있어 그 이전과는 자동으로 안 겹침).
- `course[0] > my_selection[-1][1]`: 새 수업 시작 > 직전 수업 종료 → 겹치지 않음.

## 그리디 함정 정리 (면접 대비)

- 그리디는 **국소 최적 → 전역 최적**이 보장될 때만 정답. 증명(교환 논법)이나 반례 탐색으로 확인.
- 안 통하면 DP(문서39)로. "거스름돈도 단위가 이상하면 DP"가 대표 예시.
- 전략 후보를 세우고 **반례를 먼저 던져보는 습관**이 그리디 문제의 핵심. (수업 선택도 "가장 짧은 것부터"는 반례 존재 → "먼저 끝나는 것부터"가 정답)
