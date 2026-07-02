# [문서5] 네트워크 실전편 — 개발에 녹여내는 지식
> 이론이 아니라 "실무에서 어떻게 쓰고, 면접에서 경험을 어떻게 말하나".
> 각 항목: 개념 → 실제 명령어/코드 → 경험 서술 포인트.

---

## 1. HTTP 에러 종류 (상태 코드)
정의: 서버가 요청 처리 결과를 3자리 숫자로 통보. 첫 자리로 분류.

### 4xx — 클라이언트 잘못
- 400 Bad Request: 요청 형식/문법 오류(잘못된 JSON, 필수 파라미터 누락)
- 401 Unauthorized: 인증 안 됨(로그인/토큰 없음) — "누구냐"
- 403 Forbidden: 인증됐지만 권한 없음 — "너인 건 알겠는데 안 돼"
- 404 Not Found: 리소스 없음
- 405 Method Not Allowed: 그 URL에 그 메서드 불가(GET만 되는데 POST)
- 409 Conflict: 상태 충돌(중복 생성, 낙관적 락 실패)
- 413 Payload Too Large: 본문 너무 큼
- 422 Unprocessable Entity: 문법은 맞지만 검증 실패(유효성)
- 429 Too Many Requests: 레이트 리밋 초과

### 5xx — 서버 잘못
- 500 Internal Server Error: 서버 코드 예외(가장 흔한 뭉뚱그림)
- 502 Bad Gateway: 리버스 프록시가 뒤 서버에서 잘못된 응답 받음(백엔드 다운/크래시)
- 503 Service Unavailable: 과부하/점검(일시적, Retry-After 가능)
- 504 Gateway Timeout: 프록시가 뒤 서버 응답을 제 시간에 못 받음(백엔드 느림)

★ 401 vs 403: 인증(누구냐) vs 인가(권한). 면접 단골.
★ 502 vs 504: 백엔드가 죽었나(502) vs 살았는데 느린가(504). 트러블슈팅 방향이 다름.

경험 서술: "리버스 프록시 뒤 WAS가 OOM으로 죽어 502가 떴고, 헬스체크+오토스케일로 대응."

---

## 2. 네트워크 에러 발생 시 확인 절차 (계층별 좁히기)
정의: 아래에서 위로(또는 위에서 아래로) 계층을 좁혀가며 범인 격리.

표준 순서:
1) 로컬 인터페이스 살았나 → `ip addr`, `ip link`
2) 게이트웨이까지 가나 → `ping <gateway>`
3) 외부 IP까지 가나 → `ping 8.8.8.8` (L3 확인)
4) DNS 되나 → `nslookup google.com` / `dig google.com` (IP는 되는데 도메인 안 되면 DNS 문제)
5) 경로 어디서 끊기나 → `traceroute <host>` / `mtr <host>`
6) 포트 열렸나 → `telnet <host> 443` / `nc -zv <host> 443` (L4)
7) 서비스 응답하나 → `curl -v https://<host>` (L7, TLS+HTTP)
8) 내 서버가 리슨 중인가 → `ss -tlnp`
9) 방화벽 확인 → `iptables -L` / 보안그룹

핵심 감별:
- ping 8.8.8.8 OK + nslookup 실패 → DNS 문제
- ping OK + telnet 포트 실패 → 방화벽/서비스 다운(L4)
- 포트 OK + curl TLS 실패 → 인증서/TLS(L6)
- curl 200 → 네트워크 정상, 앱 로직 문제(L7)

경험 서술: "IP는 되는데 도메인만 안 돼서 DNS 리졸버 문제로 좁혔고, resolv.conf의 네임서버가 죽어있었다."

---

## 3. ping 사용법/경험
정의: ICMP Echo로 생존 확인 + RTT 측정.

명령어:
- `ping google.com` — 기본
- `ping -c 4 host` — 4번만
- `ping -i 0.2 host` — 0.2초 간격
- `ping -s 1472 -M do host` — MTU 테스트(DF 켜고 큰 패킷). 실패하면 MTU 초과 지점 탐색
- `ping -f host` — flood(부하 테스트, root)

읽는 법:
- time=xx ms → RTT. 튀면 지연/혼잡
- 패킷 손실 % → 손실 있으면 링크 불안정
- Request timeout → 도달 실패 or ICMP 차단
- 주의: ping 실패 ≠ 서비스 다운(ICMP만 막았을 수도)

경험 서술: "간헐적 지연 민원에 ping으로 손실률·RTT 모니터링 걸어 특정 시간대 패킷 손실 확인 → 스위치 포트 이상 발견."

MTU 실전: `ping -s <size> -M do`로 크기 올리며 안 되는 지점 찾아 실질 MTU 역산 → MSS 조정.

---

## 4. 웹서버 셋업 경험 (Nginx 기준)
정의: Nginx = 리버스 프록시 + 정적 서빙 + TLS 종료 + 로드밸런싱.

기본 구성 요소:
- server 블록: 도메인(server_name), 포트(listen 443 ssl)
- location 블록: 경로별 라우팅
- proxy_pass: 뒤 WAS로 전달(리버스 프록시)
- ssl_certificate / ssl_certificate_key: 인증서(TLS 종료)
- upstream: 백엔드 풀(로드밸런싱)

핵심 설정 감각:
- 정적 파일은 Nginx가 직접, 동적은 proxy_pass로 WAS(gunicorn/uvicorn/tomcat)
- gzip 압축, 캐시 헤더, keepalive_timeout
- 502 나면 → 뒤 WAS 죽음/포트 불일치. 504 나면 → proxy_read_timeout 늘리거나 WAS 최적화
- Let's Encrypt(certbot)로 무료 인증서 자동 갱신

경험 서술: "Nginx 리버스 프록시로 TLS 종료하고 뒤 3대 WAS에 least_conn 로드밸런싱, certbot으로 인증서 자동 갱신 구성. 502 알람에 헬스체크 추가."

---

## 5. SSH 통신 경험 (심화)
정의: SSH = 신뢰 못할 네트워크 위 암호화된 원격 셸/터널. 포트 22. TLS와 구조 유사(키 교환→세션키→대칭키 암호화).

접속 시 벌어지는 일:
1) TCP 3-way(22) 2) 버전·알고리즘 협상 3) 키 교환(DH)→세션키(이후 암호화) 4) 서버 인증(host key ↔ known_hosts) 5) 사용자 인증(공개키/비번) 6) 채널 열림
★ known_hosts 경고("HOST KEY CHANGED"): 서버 재생성(정상) or MITM(위험). 무작정 지우지 말고 이유 확인.

공개키 인증 원리(핵심):
- 클라: 키쌍 생성(개인키 id_ed25519 / 공개키 .pub)
- 서버: 공개키를 ~/.ssh/authorized_keys 등록
- 접속: 서버 챌린지 → 클라가 개인키로 서명 → 서버가 공개키로 검증. 개인키는 네트워크에 안 흐름.
- 비번처럼 "비밀 전송"이 아니라 "서명을 검증" → 안전.

명령어:
- ssh user@host / ssh -i key.pem user@host / ssh -p 2222 user@host
- ssh-keygen -t ed25519 -C "email" (ed25519 권장)
- ssh-copy-id user@host (공개키 등록)
- scp file user@host:/path (복사), rsync -avz dir/ user@host:/path (증분)

포트 포워딩(필수):
- -L 로컬포워딩: 원격 자원을 내게 당김. ssh -L 5432:db-internal:5432 user@bastion → localhost:5432가 내부 DB로. (프라이빗 DB를 로컬 툴로 디버깅)
- -R 원격포워딩: 내 자원을 원격에 밀어냄. ssh -R 8080:localhost:3000 user@pub → pub:8080이 내 로컬로.
- -D 동적: SOCKS 프록시. ssh -D 1080 user@host → 통째 프록시.
- 한줄: -L=당겨오기, -R=밀어내기, -D=통째 프록시.

~/.ssh/config:
- Host 별칭 + HostName/User/IdentityFile/Port 지정 → ssh 별칭만으로 접속.
- ProxyJump bastion: 베스천 경유해 프라이빗 서브넷 진입(표준 패턴).

보안 하드닝(sshd_config):
- PasswordAuthentication no(공개키만) / PermitRootLogin no / Port 변경 / fail2ban / 보안그룹으로 22 제한.

트러블슈팅:
- Permission denied(publickey) → authorized_keys 미등록 or 키 권한
- Connection refused → sshd 안 뜸/포트 다름 (ss -tlnp)
- Connection timed out → 방화벽/보안그룹 22 인바운드
- HOST KEY CHANGED → 서버 재생성 or MITM
★ 권한 함정: ~/.ssh=700, 개인키=600. 너무 열리면 SSH가 키를 아예 무시. "키 맞는데 안 됨"의 최다 원인 → chmod 600.

경험 서술: "베스천 ProxyJump로 프라이빗 서브넷 접근, -L 포워딩으로 내부 DB에 로컬 DBeaver 붙여 디버깅. 공개키만 허용하고 fail2ban으로 하드닝."

---

## 6. 소켓 통신 구현 (심화)
정의: 소켓 = OS가 주는 통신 끝점(IP+포트). TCP 소켓은 "바이트 스트림" — 함정 대부분이 여기서.

API 흐름:
서버: socket()→bind()→listen()→accept()→recv/send→close()
클라: socket()→connect()→send/recv→close()

★ 메시지 경계가 없다 (제일 중요):
- TCP는 "메시지"를 모름, 바이트만 흐름.
- send("AAA")+send("BBB") → "AAABBB"로 뭉쳐 올 수 있음(뭉침)
- send("AAABBB") → "AAA"+"BBB"로 쪼개 올 수 있음(분할)
- 해결=프레이밍: ①길이 프리픽스 [4바이트 길이][데이터] ②구분자(\n 등)
- 한문장: "TCP는 스트림이라 메시지 경계가 없어 프레이밍이 필요하다."

부분 수신: recv(1024)는 1024 보장 안 함(그때 온 만큼만) → 원하는 만큼 모일 때까지 루프.

C10K(동시 접속):
- 순진: 연결1개=스레드1개 → 1만 연결=1만 스레드=폭발
- 해결: 논블로킹 소켓+이벤트 루프(epoll/kqueue) → 스레드1개가 수만 연결. Node/nginx/Redis 방식.

Nagle: 실시간이면 TCP_NODELAY.

경험 서술: "TCP는 스트림이라 경계가 없어 4바이트 길이 프리픽스로 프레이밍, epoll 논블로킹으로 동시 연결 처리."

---

## 7. WebSocket (채팅앱 핵심)
정의: HTTP로 시작해 양방향 지속 연결로 업그레이드하는 프로토콜. 서버가 클라에게 먼저 push 가능.
왜 채팅에 필요:
- HTTP는 요청-응답만 → 서버가 새 메시지 알아서 못 밀어줌
- 옛날 폴링(계속 물어보기)=비효율 → WebSocket은 한 번 연결하면 양쪽 아무때나 전송
동작: 클라 "Upgrade: websocket" 요청 → 서버 101 Switching Protocols → 같은 TCP가 양방향 채널로 → 프레임 단위 송수신. (ws:// / wss://)

---

## 8. 채팅앱 설계 (종합)
구성: [브라우저]--WebSocket-->[채팅서버]--Redis Pub/Sub-->[다른 서버]--> [DB 영속화]

핵심 이슈(5년차):
① 서버 여러 대: A는 서버1, B는 서버2 → Redis Pub/Sub(또는 Kafka)로 인스턴스 간 메시지 전파. 스케일아웃하면 필수.
② 순서 보장: 서버 시퀀스 번호/타임스탬프로 정렬.
③ 전달 보장(at-least-once): 끊긴 사이 메시지 → DB 저장, 재접속 시 커서(마지막 읽은 이후) 복구.
④ presence(온라인 상태): Redis TTL+하트비트, 끊기면 만료.
⑤ 확장성: WebSocket 연결을 여러 서버 분산 + LB(sticky 또는 상태 외부화).

경험 서술: "브라우저-서버는 WebSocket, 서버 여러 대라 Redis Pub/Sub로 인스턴스 간 전파. 메시지는 DB 저장해 재접속 시 커서로 놓친 것 복구, presence는 Redis TTL+하트비트, 순서는 서버 시퀀스로 보장."

---

## 9. REST vs gRPC vs GraphQL
정의: 셋 다 API 통신 방식. 어느 게 낫냐가 아니라 경계마다 맞는 걸 씀.

| | REST | gRPC | GraphQL |
|---|------|------|---------|
| 스타일 | HTTP 메서드+URL | RPC(원격 함수 호출) | 쿼리 언어 |
| 전송 | HTTP/1.1 | HTTP/2 | HTTP |
| 포맷 | JSON/텍스트 | Protobuf(바이너리) | JSON |
| 계약 | 느슨(문서 별도) | 엄격(.proto) | 스키마 |
| 강점 | 단순/호환/캐싱/디버깅 | 성능/저지연/스트리밍/강타입 | 정밀 페칭/단일 엔드포인트 |
| 약점 | over/under-fetch | 브라우저X(gRPC-Web 필요), 사람이 못 읽음 | 캐싱 어려움, N+1, 쿼리 복잡도 |

성능: gRPC 바이너리 직렬화가 JSON보다 ~3배 빠르고 메시지 30~35% 작음. HTTP/2 멀티플렉싱.

실무 정답(★):
- 공개 API → REST
- 내부 서비스 간(마이크로서비스) → gRPC
- 다양한 클라이언트의 서로 다른 데이터 요구(모바일/웹) → GraphQL
- 한 시스템에서 계층별로 섞어 씀(하이브리드가 정석)

RPC란: "원격 서버의 함수를 로컬 함수처럼 호출". gRPC는 .proto로 함수·타입 정의 → 서버/클라 코드 자동 생성(계약 강제, 타입 안정).

.proto 예:
  service ChatService {
    rpc SendMessage(Message) returns (Ack);          // unary
    rpc Subscribe(Room) returns (stream Message);     // 서버 스트리밍
    rpc Chat(stream Message) returns (stream Message); // 양방향 ★
  }

gRPC 스트리밍 4종:
- Unary: 1요청-1응답
- Server streaming: 1요청→여러 응답(알림 구독)
- Client streaming: 여러 요청→1응답(로그 업로드)
- Bidirectional: 양쪽 독립 스트림(실시간 채팅 ★)

한계: 브라우저 네이티브 X → gRPC-Web+프록시 필요. 그래서 브라우저 채팅=WebSocket, 서버 간=gRPC로 갈림.

GraphQL 주의:
- N+1 문제: 리졸버가 항목마다 쿼리 → DataLoader로 배치
- 쿼리 깊이/복잡도 제한(depth limiting) 필수 — 안 하면 DoS 위험
- introspection으로 스키마 노출 주의

경험 서술: "공개 API는 REST로 두되, 내부 마이크로서비스 간은 gRPC로 바꿔 지연을 줄였고, 프론트가 필요 데이터만 가져가도록 BFF에 GraphQL을 얹었다. GraphQL은 N+1이 터져 DataLoader로 배치 처리했다."
