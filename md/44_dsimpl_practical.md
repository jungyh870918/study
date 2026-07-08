# [문서44] 자료구조 구현 ③ 힙 · 이진 탐색 트리 — 직접 구현
> 완전 이진 트리를 배열로 표현한 힙(heapify)과, 노드 참조로 엮은 이진 탐색 트리(BST) 구현.

---

## 1. 힙 (Heap) — 배열로 표현하는 완전 이진 트리

핵심: 완전 이진 트리라 배열로 빈틈없이 담을 수 있다. 부모/자식 위치를 인덱스 계산으로 O(1)에 찾는다. (여기선 인덱스 1부터 사용)

```python
# 인덱스 관계 (1-based)
#   부모:  i // 2
#   왼쪽 자식:  i * 2
#   오른쪽 자식: i * 2 + 1

def swap(tree, index_1, index_2):
    tree[index_1], tree[index_2] = tree[index_2], tree[index_1]

def heapify(tree, index, tree_size):
    """index 노드를 자식들과 비교해 최대 힙 속성을 맞춘다 (아래로 내리기)"""
    left = index * 2
    right = index * 2 + 1
    largest = index   # 임시변수: 셋(자기·좌·우) 중 최댓값 위치를 담는다

    # 왼쪽 자식이 존재하고 더 크면 largest 갱신
    if left <= tree_size and tree[left] > tree[largest]:
        largest = left
    # 오른쪽 자식이 존재하고 더 크면 largest 갱신
    if right <= tree_size and tree[right] > tree[largest]:
        largest = right

    if largest != index:            # 자기가 최대가 아니면
        swap(tree, index, largest)  # 최댓값 자식과 자리 바꾸고
        heapify(tree, largest, tree_size)  # 내려간 자리에서 다시 재귀
```

**논리 흐름**
- 배열로 트리를 표현하는 이유: 완전 이진 트리는 빈 자리가 없어 배열에 순서대로 담으면 부모·자식 관계가 `i*2`, `i//2` 산술로 즉시 나온다 → 포인터 불필요.
- 임시변수 `largest`: 자기·왼쪽·오른쪽 세 후보 중 최대 위치를 추적. 세 번 비교한 결과를 담아 한 번만 swap한다.
- 재귀 `heapify`: 값을 아래로 한 칸 내렸으면 그 아래에서 힙 속성이 또 깨질 수 있어, 내려간 자리에서 반복. 최대 트리 높이만큼 → O(log n).

## 2. 힙 삽입 / 추출

```python
def reverse_heapify(tree, index):
    """새로 넣은 노드를 부모와 비교해 위로 올린다 (percolate up)"""
    parent = index // 2
    # while 이유: 부모보다 크면 계속 위로 올라간다. 몇 칸 올라갈지 미리 모른다.
    if 0 < parent and tree[index] > tree[parent]:
        swap(tree, index, parent)
        reverse_heapify(tree, parent)

def insert(tree, data):
    tree.append(data)               # ① 맨 끝(완전 트리 유지)에 추가
    reverse_heapify(tree, len(tree) - 1)  # ② 제자리까지 위로 올림

def extract_max(tree):
    """최댓값(root) 추출"""
    swap(tree, 1, len(tree) - 1)    # ① root와 맨 끝을 교환
    max_value = tree.pop()          # ② 맨 끝(원래 root)을 빼낸다
    heapify(tree, 1, len(tree) - 1) # ③ 새 root를 아래로 내려 힙 복구
    return max_value
```

**논리 흐름**
- 삽입은 '끝에 넣고 위로', 추출은 'root를 끝과 바꿔 빼고 아래로': 완전 이진 트리 모양(빈틈 없음)을 항상 유지하기 위한 정해진 절차다.
- 삽입/추출 모두 트리 높이만큼만 이동 → **O(log n)**. 이게 우선순위 큐로 힙을 쓰는 이유.

## 3. 이진 탐색 트리 (BST)

규칙: 각 노드에서 왼쪽 서브트리는 더 작은 값, 오른쪽은 더 큰 값. → 탐색이 평균 O(log n).

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.parent = None
        self.left_child = None
        self.right_child = None

class BinarySearchTree:
    def __init__(self):
        self.root = None

    def insert(self, data):
        new_node = Node(data)
        if self.root is None:
            self.root = new_node
            return
        # while 이유: 규칙을 따라 내려갈 위치를 찾을 때까지 좌/우로 이동
        iterator = self.root
        while True:
            if data < iterator.data:            # 작으면 왼쪽으로
                if iterator.left_child is None:
                    iterator.left_child = new_node
                    new_node.parent = iterator
                    return
                iterator = iterator.left_child
            else:                               # 크거나 같으면 오른쪽으로
                if iterator.right_child is None:
                    iterator.right_child = new_node
                    new_node.parent = iterator
                    return
                iterator = iterator.right_child

    def search(self, data):
        iterator = self.root
        while iterator is not None:
            if data == iterator.data:
                return iterator
            elif data < iterator.data:
                iterator = iterator.left_child   # 작으면 왼쪽만 본다
            else:
                iterator = iterator.right_child  # 크면 오른쪽만
        return None

    def print_inorder(self, node):
        """중위 순회 — BST를 in-order로 돌면 정렬된 순서로 출력된다"""
        if node is not None:
            self.print_inorder(node.left_child)   # 왼쪽(작은 값들)
            print(node.data)                       # 자기
            self.print_inorder(node.right_child)  # 오른쪽(큰 값들)
```

**논리 흐름**
- while로 좌/우를 고르는 게 탐색의 본질: 매 노드에서 값 비교 후 한쪽 서브트리만 남기고 반대쪽은 통째로 버린다 → 균형 잡히면 O(log n), 한쪽으로 쏠리면(정렬 입력) 최악 O(n).
- `parent` 참조를 두는 이유: 삭제 시 부모 링크를 다시 걸어야 해서. (삭제는 leaf / 자식 1개 / 자식 2개 세 경우로 나뉘는데, 자식 2개면 오른쪽 서브트리의 최솟값으로 대체)
- in-order 순회의 특성: 왼→자기→오른 순서라, BST를 in-order로 돌면 **자동으로 오름차순**이 된다. 면접 단골 포인트.

## 힙 vs BST (면접 대비)

| | 힙 | 이진 탐색 트리 |
|--|----|-------------|
| 목적 | 최대/최소 빠르게 꺼내기 | 정렬·탐색·범위 질의 |
| 구조 | 완전 이진 트리(배열) | 노드 참조 트리 |
| root | 항상 최대(또는 최소) | 중앙값 아님, 정렬 기준점 |
| 탐색 | 임의 값 탐색은 O(n) | 평균 O(log n) |
