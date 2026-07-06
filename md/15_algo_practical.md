# [문서15] 알고리즘 실전편 — 실무·코테 적용
> 이론을 실제 문제·실무에 어떻게 적용하나.

---

## 1. 코딩 테스트 접근 순서
1) 문제 이해+예시로 손으로 풀어보기
2) 제약조건(n 크기) 확인 → 허용 복잡도 역산 (n≤10⁶면 O(n log n) 이하)
3) 자료구조/알고리즘 후보 선정(치트)
4) 완전탐색으로 정답 로직 확정 → 시간초과면 최적화
5) 엣지 케이스(빈 입력, 최대, 중복, 음수)
★ n 크기로 복잡도 역산이 핵심: n≤20이면 O(2ⁿ) 가능, n≤10³이면 O(n²), n≤10⁶이면 O(n log n).

## 2. 자주 쓰는 실무 패턴
- 투 포인터: 정렬된 배열서 양끝/두 지점으로 O(n). 합·구간 문제.
- 슬라이딩 윈도우: 연속 구간 최댓값/합을 O(n)에. 고정/가변 창.
- 누적합(prefix sum): 구간 합을 O(1)에(미리 계산). 반복 구간 쿼리.
- 해시맵 활용: 중복 체크, 카운팅, 두 수의 합(O(n)).

## 3. 실무에서 자료구조 선택
- 빠른 조회 필요 → 해시맵/셋
- 순서 유지+빠른 조회 → 정렬된 구조(TreeMap)
- 최근 것부터 처리 → 스택
- 순서대로 처리/대기열 → 큐
- 우선순위 처리/Top-K → 힙(우선순위 큐)
- 캐시 → LRU(해시맵+이중연결리스트)
- 자동완성/접두사 → 트라이(Trie)

## 4. 실무에 알고리즘이 숨은 곳
- DB 인덱스 = B+Tree (네트워크/DB편 연결)
- 캐시 만료 = LRU
- 작업 스케줄러 = 우선순위 큐/위상정렬
- 추천/랭킹 = 힙(Top-K), 정렬
- 지도 길찾기 = 다익스트라/A*
- 문자열 검색 = KMP, 해시
- 중복 제거/그룹핑 = 해시셋, Union-Find
- 로드밸런서 해시 = 컨시스턴트 해싱

## 5. LRU 캐시 (단골 문제)
정의: 가장 오래 안 쓴 것부터 버리는 캐시.
구현: 해시맵(O(1) 조회) + 이중 연결 리스트(O(1) 순서 갱신). get/put 모두 O(1).
- 접근하면 그 노드를 리스트 맨 앞으로, 꽉 차면 맨 뒤(가장 오래된 것) 제거.
실무: Redis 메모리 정책, 브라우저 캐시. (네트워크 문서5 캐싱과 연결)

## 6. 경험 서술 예시
- "대량 로그에서 상위 K개 추출을 힙으로 O(n log k)에 처리했다."
- "중복 사용자 판별을 해시셋으로 O(n)에, 연결 그룹은 Union-Find로 묶었다."
- "구간 합 쿼리가 많아 누적합으로 전처리해 O(1) 응답으로 만들었다."

---

## 7. 자료구조 구현 (파이썬, 검증된 코드)

### 이진 탐색 트리(BST) — 인덱스 원리의 뼈대
```python
class BSTNode:
    def __init__(self, key):
        self.key, self.left, self.right = key, None, None

class BST:
    def __init__(self):
        self.root = None
    def insert(self, key):
        self.root = self._insert(self.root, key)
    def _insert(self, node, key):
        if node is None:
            return BSTNode(key)
        if key < node.key:
            node.left = self._insert(node.left, key)
        elif key > node.key:
            node.right = self._insert(node.right, key)
        return node
    def search(self, key):
        node = self.root
        while node:
            if key == node.key: return True
            node = node.left if key < node.key else node.right
        return False
    def inorder(self):  # 중위 순회 = 정렬된 순서
        res = []
        def dfs(n):
            if n: dfs(n.left); res.append(n.key); dfs(n.right)
        dfs(self.root)
        return res
```
★ 인덱스 연결: DB 인덱스=B+Tree. BST와 원리 같음("정렬된 트리로 탐색 반씩 줄임"). 차이: BST는 치우치면 O(n)→DB는 한 노드에 수백 키 담아 낮게(B+Tree)+리프 연결로 범위 검색. 중위 순회가 정렬 순인 게 BST 핵심.

### 힙(최소 힙) — 우선순위 큐/Top-K
```python
class MinHeap:
    def __init__(self):
        self.heap = []
    def push(self, val):
        self.heap.append(val)
        i = len(self.heap) - 1
        while i > 0:  # 위로 (부모와 비교)
            p = (i-1)//2
            if self.heap[i] < self.heap[p]:
                self.heap[i], self.heap[p] = self.heap[p], self.heap[i]
                i = p
            else: break
    def pop(self):  # 최솟값 제거
        if not self.heap: return None
        self.heap[0], self.heap[-1] = self.heap[-1], self.heap[0]
        val = self.heap.pop()
        i, n = 0, len(self.heap)
        while True:  # 아래로 (자식과 비교)
            small, l, r = i, 2*i+1, 2*i+2
            if l < n and self.heap[l] < self.heap[small]: small = l
            if r < n and self.heap[r] < self.heap[small]: small = r
            if small == i: break
            self.heap[i], self.heap[small] = self.heap[small], self.heap[i]
            i = small
        return val
```
★ 실무는 heapq: heapq.heapify(리스트) / heappush / heappop / nlargest(k, 리스트). 직접 구현은 원리 이해용.

## 8. 대표 코테 문제 10선 (검증된 풀이)

### [1] Two Sum (해시맵, O(n))
```python
def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen: return [seen[target-n], i]
        seen[n] = i
```
핵심: "이미 본 값"을 해시에 저장→보수(target-n) 존재 확인. 이중 루프 O(n²)를 O(n)으로.

### [2] 이진 탐색 (O(log n))
```python
def binary_search(arr, target):
    lo, hi = 0, len(arr)-1
    while lo <= hi:
        mid = (lo+hi)//2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid+1
        else: hi = mid-1
    return -1
```
전제: 정렬돼 있어야. 경계(lo<=hi, mid±1) 자주 틀림.

### [3] 슬라이딩 윈도우 (길이 k 최대합, O(n))
```python
def max_sum_window(arr, k):
    window = sum(arr[:k]); best = window
    for i in range(k, len(arr)):
        window += arr[i] - arr[i-k]  # 새것 더하고 옛것 뺌
        best = max(best, window)
    return best
```
핵심: 매번 다시 합산(O(nk)) 대신 창을 밀며 차이만(O(n)).

### [4] 투 포인터 (정렬 배열 합=target)
```python
def two_pointer(arr, target):
    lo, hi = 0, len(arr)-1
    while lo < hi:
        s = arr[lo]+arr[hi]
        if s == target: return [arr[lo], arr[hi]]
        elif s < target: lo += 1
        else: hi -= 1
```
핵심: 정렬 배열 양끝에서 좁혀감. 합 작으면 lo↑, 크면 hi↓.

### [5] BFS 최단 거리 (큐)
```python
from collections import deque
def bfs_shortest(graph, start, end):
    q = deque([(start, 0)]); visited = {start}
    while q:
        node, dist = q.popleft()
        if node == end: return dist
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt); q.append((nxt, dist+1))
    return -1
```
핵심: 가까운 것부터 층층이→가중치 없는 최단 거리. visited로 재방문 방지.

### [6] DFS 백트래킹 (부분집합)
```python
def subsets(nums):
    res = []
    def dfs(start, path):
        res.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            dfs(i+1, path)
            path.pop()  # 백트래킹
    dfs(0, [])
    return res
```
핵심: 선택→재귀→되돌림(pop). 조합/순열/순열 문제의 뼈대.

### [7] DP 피보나치 (메모이제이션, O(n))
```python
def fib(n, memo={}):
    if n <= 1: return n
    if n in memo: return memo[n]
    memo[n] = fib(n-1, memo) + fib(n-2, memo)
    return memo[n]
```
핵심: 순진한 재귀 O(2ⁿ)→저장으로 O(n). 겹치는 부분 문제 제거.

### [8] DP 계단 오르기 (Bottom-up)
```python
def climb(n):
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n+1): a, b = b, a+b
    return b
```
핵심: dp[n]=dp[n-1]+dp[n-2]. 변수 2개로 공간 O(1).

### [9] Top-K (힙)
```python
import heapq
def top_k(nums, k):
    return heapq.nlargest(k, nums)  # O(n log k)
```
핵심: 전체 정렬(O(n log n)) 대신 크기 k 힙 유지(O(n log k)).

### [10] 유효한 괄호 (스택)
```python
def valid_paren(s):
    stack = []; pairs = {')':'(', ']':'[', '}':'{'}
    for c in s:
        if c in '([{': stack.append(c)
        elif c in pairs:
            if not stack or stack.pop() != pairs[c]: return False
    return not stack
```
핵심: 여는 괄호 push, 닫는 괄호에 짝 맞는지 pop 확인. LIFO의 전형.

## 9. 코테 문제→도구 매핑 (반사)
- 두 수/중복/카운팅 → 해시맵
- 정렬 배열 탐색 → 이진 탐색
- 연속 구간 → 슬라이딩 윈도우/투 포인터
- 최단 거리(가중치 없음) → BFS
- 모든 경우/조합/순열 → DFS 백트래킹
- 최적화("최대/최소" + 겹치는 부분) → DP
- 상위/하위 K개 → 힙
- 괄호/후입선출/undo → 스택
- 그룹/연결 → Union-Find
