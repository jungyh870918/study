# [문서42] 자료구조 구현 ① 링크드 리스트 — 직접 구현
> 코드잇 자료구조 강의에서 '직접 코드로 구현한' 부분만 추출한 정리.
> 파이썬 내장 리스트로 끝나는 개념 설명이 아니라, Node/LinkedList 클래스를 손으로 짜는 파트입니다.

---

## 0. 무엇을 '구현'했나 (설명 vs 구현 구분)

- **설명만**: 동적 배열, 파이썬 리스트/딕셔너리/셋의 내부 특성, 시간복잡도 비교 — 내장 자료형을 '쓰는' 관점.
- **직접 구현**: `Node` 클래스와 이를 엮은 `LinkedList`(싱글리·더블리), 해시 테이블, 힙, 이진 탐색 트리, 그래프. 이 문서부터는 구현 파트만 다룹니다.

---

## 1. Node — 링크드 리스트의 기본 단위

```python
class Node:
    """더블리 링크드 리스트용 노드"""
    def __init__(self, data):
        self.data = data       # 저장할 값
        self.prev = None       # 이전 노드 참조
        self.next = None       # 다음 노드 참조
```

**논리 흐름**
- 배열과 다른 점: 배열은 '메모리에 연속 배치'라 인덱스 접근이 O(1)이지만, 링크드 리스트는 각 노드가 `next`(와 `prev`) 참조로 흩어져 이어진다.
- `prev`/`next`를 둘 다 두는 이유: 더블리는 양방향 이동이 가능해 특정 노드 삭제 시 이전 노드를 O(1)에 찾을 수 있다. 싱글리라면 `next`만 둔다.

## 2. 더블리 링크드 리스트

```python
class LinkedList:
    def __init__(self):
        self.head = None       # 첫 노드
        self.tail = None       # 마지막 노드

    def find_node_at(self, index):
        """index번째 노드를 리턴 (0부터)"""
        # for 이유: 인덱스 접근이 안 되므로 head부터 next를 index번 따라간다
        iterator = self.head
        for _ in range(index):
            iterator = iterator.next
        return iterator

    def append(self, data):
        """맨 뒤에 추가"""
        new_node = Node(data)
        if self.head is None:          # 빈 리스트면 head=tail=새 노드
            self.head = new_node
            self.tail = new_node
        else:                          # 기존 tail 뒤에 연결하고 tail 갱신
            self.tail.next = new_node
            new_node.prev = self.tail
            self.tail = new_node

    def insert_after(self, node, data):
        """특정 노드 뒤에 삽입"""
        new_node = Node(data)
        if node is self.tail:          # 맨 뒤면 append와 동일 처리
            self.append(data)
        else:
            next_node = node.next
            # 임시변수 next_node: 끊기 전에 뒤쪽 연결을 붙잡아 둬야 링크가 안 끊긴다
            node.next = new_node
            new_node.prev = node
            new_node.next = next_node
            next_node.prev = new_node

    def delete(self, node_to_delete):
        """노드 삭제 — 앞뒤를 서로 잇는다"""
        if node_to_delete is self.head and node_to_delete is self.tail:
            self.head = None
            self.tail = None
        elif node_to_delete is self.head:      # 머리 삭제
            self.head = self.head.next
            self.head.prev = None
        elif node_to_delete is self.tail:      # 꼬리 삭제
            self.tail = self.tail.prev
            self.tail.next = None
        else:                                  # 중간 삭제: 앞뒤를 직접 연결
            node_to_delete.prev.next = node_to_delete.next
            node_to_delete.next.prev = node_to_delete.prev
        return node_to_delete.data
```

**논리 흐름**
- `find_node_at`에 for가 필요한 이유: 링크드 리스트는 인덱스로 바로 못 간다. head부터 `next`를 index번 따라가는 순회가 유일한 접근법 → 접근이 O(n).
- 삽입/삭제에서 임시변수(`next_node` 등)가 필수인 이유: 링크를 다시 걸기 전에 원래 연결을 변수에 붙잡아 두지 않으면, 한쪽을 바꾸는 순간 반대쪽 노드로 가는 길을 잃는다.
- head/tail 특수 처리: 삭제·삽입 시 끝단은 `prev`나 `next`가 없어 일반 로직이 None 참조 에러를 낸다. 그래서 경우를 나눈다.
- 장단점: 삽입·삭제는 O(1)(노드 참조만 있으면), 대신 인덱스 접근은 O(n). 배열과 정반대의 트레이드오프.

## 3. 삽입/삭제 시간복잡도 요약

| 연산 | 배열(동적) | 링크드 리스트 |
|------|-----------|--------------|
| 인덱스 접근 | O(1) | O(n) |
| 맨 끝 삽입 | 분할상환 O(1) | O(1) |
| 중간 삽입/삭제 | O(n) (밀기) | O(1) (노드 참조 시) |

포인트(면접): "링크드 리스트는 **접근을 포기하고 삽입/삭제를 얻는** 자료구조. 노드 참조만 있으면 O(1)에 끊고 잇는다."
