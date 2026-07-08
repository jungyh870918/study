# [문서45] 자료구조 구현 ④ 그래프 · DFS · BFS — 직접 구현
> 그래프 표현(인접 행렬 / 인접 리스트)과 두 가지 순회(깊이 우선·너비 우선) 구현.
> 코드잇 '지하철 노선도' 예제 맥락으로 노드 클래스를 직접 짭니다.

---

## 0. 그래프 표현 두 가지

- **인접 행렬**: `V×V` 2차원 배열. 두 노드 연결 여부를 O(1)에 확인. 공간 O(V²).
- **인접 리스트**: 각 노드가 '연결된 노드들의 리스트'를 가짐. 공간 O(V+E). 희소 그래프에 유리.

## 1. 그래프 노드 (인접 리스트 방식)

```python
class StationNode:
    """지하철 역 하나 = 그래프의 노드 하나"""
    def __init__(self, name):
        self.name = name
        self.adjacent_stations = []   # 인접 리스트: 연결된 역 노드들

    def add_connection(self, other_station):
        """양방향 연결 (무방향 그래프)"""
        self.adjacent_stations.append(other_station)
        other_station.adjacent_stations.append(self)
```

**논리 흐름**
- `adjacent_stations` 리스트가 곧 인접 리스트: 이 노드에 직접 연결된 이웃만 담는다. 안 연결된 노드는 아예 리스트에 없어 공간이 절약된다.
- `add_connection`이 양쪽에 append하는 이유: 무방향 그래프에선 A-B 연결이 곧 B-A 연결. 한쪽만 넣으면 반대 방향 탐색이 안 된다. (방향 그래프면 한쪽만 넣는다.)

## 2. 인접 행렬 만들기

```python
def create_adjacency_matrix(stations, station_order):
    n = len(stations)
    # 0으로 채운 n×n 행렬. 이중 컴프리헨션으로 각 행을 독립 생성.
    adjacency_matrix = [[0 for _ in range(n)] for _ in range(n)]

    for i in range(n):
        for j in range(n):
            # i번 역의 이웃에 j번 역이 있으면 1(연결됨)
            if station_order[j] in stations[station_order[i]].adjacent_stations:
                adjacency_matrix[i][j] = 1
    return adjacency_matrix
```

**논리 흐름**
- `[[0]*n for _ in range(n)]`가 아니라 이중 컴프리헨션을 쓰는 이유: `[[0]*n]*n`은 같은 리스트가 n번 복제돼 한 행을 바꾸면 전 행이 바뀐다. 각 행을 독립 객체로 만들어야 한다.
- 이중 for: 모든 (i, j) 쌍의 연결 여부를 채워야 하므로 행렬 전체를 훑는다 → 만드는 데 O(V²).

## 3. DFS (깊이 우선 탐색)

한 방향으로 갈 수 있는 데까지 파고든 뒤 되돌아온다. 스택(또는 재귀)으로 구현.

```python
def dfs_recursive(node, visited):
    visited.add(node.name)      # 방문 표시 (재방문 방지 = 무한 루프 방지)
    print(node.name)
    # for 이유: 현재 노드의 모든 이웃을 하나씩 확인
    for neighbor in node.adjacent_stations:
        if neighbor.name not in visited:      # 아직 안 간 이웃만
            dfs_recursive(neighbor, visited)  # 그 이웃으로 '더 깊이' 파고듦

# 스택 버전 (재귀 없이)
def dfs_iterative(start):
    visited = set()
    stack = [start]             # 스택: 다음에 방문할 후보를 LIFO로 관리
    while stack:
        node = stack.pop()      # 가장 최근에 넣은 것부터 (깊이 우선의 핵심)
        if node.name in visited:
            continue
        visited.add(node.name)
        print(node.name)
        for neighbor in node.adjacent_stations:
            if neighbor.name not in visited:
                stack.append(neighbor)
```

**논리 흐름**
- `visited` 집합이 필수인 이유: 그래프는 사이클이 있어 표시 없이 돌면 같은 노드를 무한히 재방문한다. set을 쓰는 건 '방문했나' 확인이 O(1)이라서.
- 스택(pop)이 깊이 우선을 만든다: 가장 최근에 발견한 이웃을 먼저 꺼내니, 한 갈래로 계속 파고들게 된다. 재귀는 호출 스택이 이 역할을 대신한다.

## 4. BFS (너비 우선 탐색)

가까운 노드부터 층층이 넓게 퍼진다. 큐로 구현. 최단 경로(간선 수 기준)에 유리.

```python
from collections import deque

def bfs(start):
    visited = set()
    visited.add(start.name)     # 큐에 넣을 때 바로 방문 표시 (중복 삽입 방지)
    queue = deque([start])      # 큐: 먼저 넣은 것부터 꺼내는 FIFO
    while queue:
        node = queue.popleft()  # 가장 먼저 넣은 것부터 (너비 우선의 핵심)
        print(node.name)
        for neighbor in node.adjacent_stations:
            if neighbor.name not in visited:
                visited.add(neighbor.name)
                queue.append(neighbor)   # 이웃을 큐 뒤에 추가
```

**논리 흐름**
- 큐(FIFO)가 너비 우선을 만든다: 먼저 발견한(=더 가까운) 노드를 먼저 처리하니, 시작점에서 거리 1인 노드들 → 거리 2 → ... 순으로 층층이 퍼진다.
- `deque`를 쓰는 이유: 파이썬 리스트의 `pop(0)`은 O(n)(앞을 빼면 전체가 밀림). `deque.popleft()`는 O(1)이라 큐로 적합.
- 방문 표시를 '큐에 넣을 때' 하는 이유(DFS와 차이): 꺼낼 때 표시하면 같은 노드가 큐에 여러 번 들어갈 수 있다. 넣는 순간 표시해 중복 삽입을 막는다.

## DFS vs BFS 요약 (면접 대비)

| | DFS | BFS |
|--|-----|-----|
| 보조 자료구조 | 스택 / 재귀 | 큐(deque) |
| 순회 방식 | 깊이 먼저(한 갈래 끝까지) | 너비 먼저(가까운 층부터) |
| 최단 경로 | 보장 안 됨 | 무가중치 그래프에서 보장 |
| 시간복잡도 | O(V+E) | O(V+E) |

포인트: "무가중치 그래프의 최단 경로는 BFS. 가중치가 있으면 다익스트라. 단순 완전 탐색·경로 존재 여부는 DFS가 간결."
