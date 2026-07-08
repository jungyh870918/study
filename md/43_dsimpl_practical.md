# [문서43] 자료구조 구현 ② 해시 테이블 — 직접 구현
> 파이썬 딕셔너리의 '속' 구현. 해시 함수 + 충돌 처리(체이닝 / 오픈 어드레싱)를 손으로 짭니다.

---

## 1. 해시 테이블의 뼈대

핵심 아이디어: key를 해시 함수로 정수(인덱스)로 바꿔, 배열의 그 자리에 값을 저장. 접근이 평균 O(1).

```python
def hash_function(key, array_size):
    """key를 0 ~ array_size-1 범위의 인덱스로 변환"""
    hash_value = hash(key)          # 파이썬 내장 hash로 정수화
    return hash_value % array_size  # 배열 크기로 나눈 나머지 → 유효 인덱스
```

**논리 흐름**
- `% array_size`가 핵심: 해시값이 아무리 커도 나머지 연산으로 배열 범위 안 인덱스로 접혀 들어온다.
- 충돌(collision): 서로 다른 key가 같은 인덱스로 가는 문제. 아래 두 방식으로 해결한다.

## 2. 충돌 처리 A — 체이닝 (Chaining)

각 배열 칸에 링크드 리스트를 매달아, 충돌하면 그 리스트에 이어 붙인다.

```python
class Node:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def find_node_with_key(self, key):
        # for/while 이유: 같은 칸(체인) 안에서 key가 일치하는 노드를 순회 탐색
        iterator = self.head
        while iterator is not None:
            if iterator.key == key:
                return iterator
            iterator = iterator.next
        return None

    def insert_at_head(self, key, value):
        new_node = Node(key, value)
        new_node.next = self.head   # 맨 앞 삽입: 기존 head를 뒤로 밀고
        self.head = new_node        # 새 노드를 head로

class HashTable:
    def __init__(self, capacity):
        self._capacity = capacity
        # 각 칸마다 빈 링크드 리스트를 미리 깔아 둔다
        self._table = [LinkedList() for _ in range(capacity)]

    def _hash(self, key):
        return hash(key) % self._capacity

    def insert(self, key, value):
        index = self._hash(key)
        node = self._table[index].find_node_with_key(key)
        if node is not None:
            node.value = value      # 이미 있으면 값만 갱신
        else:
            self._table[index].insert_at_head(key, value)  # 없으면 체인에 추가

    def look_up(self, key):
        index = self._hash(key)
        node = self._table[index].find_node_with_key(key)
        return node.value if node else None
```

**논리 흐름**
- `[LinkedList() for _ in range(capacity)]`로 미리 채우는 이유: 나중에 어떤 칸이든 바로 체인에 매달 수 있게 빈 리스트를 깔아 둔다. (리스트 컴프리헨션으로 각 칸에 독립된 객체 생성 — `[LinkedList()]*n`은 같은 객체가 복제돼 버그)
- 삽입 전 `find_node_with_key`: 같은 key면 새로 넣지 않고 값만 덮어야 딕셔너리처럼 동작한다.
- 시간복잡도: 해시가 고르면 평균 O(1). 최악(다 한 칸에 몰림)엔 O(n).

## 3. 충돌 처리 B — 오픈 어드레싱 (Open Addressing)

충돌하면 다음 빈 칸을 찾아 들어간다(선형 탐사).

```python
class HashTable:
    def __init__(self, capacity):
        self._capacity = capacity
        self._keys = [None] * capacity     # key 저장 배열
        self._values = [None] * capacity   # value 저장 배열

    def _hash(self, key):
        return hash(key) % self._capacity

    def insert(self, key, value):
        start = self._hash(key)
        # for 이유: 시작 인덱스부터 한 칸씩 이동하며 '빈 자리 또는 같은 key'를 찾는다
        for i in range(self._capacity):
            index = (start + i) % self._capacity   # 배열 끝을 넘으면 앞으로 순환
            if self._keys[index] is None or self._keys[index] == key:
                self._keys[index] = key
                self._values[index] = value
                return
        raise Exception("해시 테이블이 가득 참")

    def look_up(self, key):
        start = self._hash(key)
        for i in range(self._capacity):
            index = (start + i) % self._capacity
            if self._keys[index] == key:
                return self._values[index]
            if self._keys[index] is None:   # 빈 칸을 만나면 = 그 key는 없음
                return None
        return None
```

**논리 흐름**
- `(start + i) % capacity`가 핵심: 충돌 시 `+1`씩 이동하되, 배열 끝을 넘으면 나머지 연산으로 맨 앞으로 돌아온다(원형 순회).
- look_up이 `None` 칸에서 멈추는 이유: 삽입은 항상 앞에서부터 채우므로, 빈 칸을 만났다는 건 그 뒤엔 이 key가 없다는 뜻.
- 체이닝 vs 오픈 어드레싱: 체이닝은 추가 메모리(링크드 리스트)를 쓰고 삭제가 쉽다. 오픈 어드레싱은 배열만 써 캐시 효율이 좋지만 삭제가 까다롭고 적재율이 높아지면 급격히 느려진다.

포인트(면접): "파이썬 dict는 오픈 어드레싱 기반 해시 테이블. 평균 O(1) 조회의 대가로, 최악엔 O(n)이고 해시 충돌·적재율 관리가 성능을 좌우한다."
