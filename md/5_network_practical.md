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

## 2. API 통신 디버깅 — 개발자 관점 (응답이 안 오거나 이상할 때)
두 방향: (A)내가 클라이언트 (B)내가 서버. 접근이 다름.

### A. 클라이언트 입장 "왜 응답이 안 오지/이상하지?"
첫 원칙: 머릿속 코드 말고 "실제 나간 요청"부터 눈으로 봐라.
1) 브라우저 개발자도구 Network 탭:
   - 상태 코드부터. 4xx=내 요청 잘못(내 코드), 5xx=서버 잘못(서버 로그), CORS/요청 안 뜸=브라우저가 막음, pending 멈춤=타임아웃.
   - 실제 Request URL/Headers/Payload/Response 확인. "보낸다고 생각한 것" vs "실제 보낸 것"이 다른 게 대부분.
2) curl/Postman으로 코드 밖에서 재현(격리):
   curl -v -X POST url -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{...}'
   - curl 되는데 내 코드 안 됨 → 내 코드가 요청 잘못 생성(헤더 누락/직렬화/인코딩)
   - curl도 안 됨 → 서버 문제거나 스펙 자체가 틀림 → API 문서 확인
   - 개발자도구 "Copy as cURL"로 그대로 복제(필수 팁). -v로 헤더·TLS까지 다 보임.
3) 상태 코드별 분기:
   400=payload/Content-Type/필수필드 / 401=토큰 만료·누락 / 403=권한 / 404=URL·버전 / 405=메서드 / 422=유효성 / 429=rate limit / 5xx=내 문제 아님(서버 로그) / 타임아웃=과부하·타임아웃 설정
4) 그래도 모르면 API 문서(요청 스펙 대조, 4xx는 대개 여기 답)→요청/응답 로깅(axios/fetch 인터셉터로 전체 남김).

### B. 서버 입장 "내 서버가 응답을 제대로 못 주네?"
첫 원칙: 요청이 도달했는지, 어디까지 실행됐는지 로그로 추적.
1) 요청이 들어오긴 했나: 액세스 로그 확인. 안 찍힘→요청이 서버까지 못 옴(라우팅/방화벽/포트=아래 인프라 진단) or 리버스 프록시에서 막힘. 찍힘→서버 안 문제.
2) 어디서 터졌나: 애플리케이션 에러 로그+스택 트레이스(몇 번째 줄/어느 함수). 500이면 반드시 원인 예외가 로그에. "500 떴다"만 보지 말고 스택을 봐라.
3) 자주 터지는 서버측 원인:
   - DB 연결/쿼리(커넥션 풀 고갈, 느린 쿼리, 타임아웃)
   - 외부 API 호출 실패(내가 부른 서비스가 죽음/느림→내 응답도 지연, circuit breaker 없으면 연쇄 장애)
   - Null/직렬화 오류(예상 못 한 데이터 형태)
   - 타임아웃 체인(클라 타임아웃 < 내 서버가 DB/외부 기다리는 시간)
   - 예외 삼킴(try-catch로 먹어 로그에 안 남음=조용히 실패, 최악)
4) 재현·격리: 로컬에서 같은 요청 재현(되면 환경 문제, 안 되면 코드 문제). 요청 ID(correlation ID)로 클라~서버~DB 관통 추적(MSA 필수).

### 두 관점 가르는 핵심
응답 이상 → 상태 코드? 4xx=내 요청(클라 코드/API 문서), 5xx=서버(로그/스택), 응답 없음=도달 여부부터(액세스 로그 or 인프라 진단).
한 문장: "상태 코드로 클라(4xx)냐 서버(5xx)냐 가르고, curl로 코드 밖 재현해 격리. 클라면 실제 나간 요청을 Network/로그로 API 문서와 대조, 서버면 액세스 로그로 도달·에러 로그 스택으로 터진 지점 추적."

---

## 3. 네트워크/인프라 진단 (요청이 서버까지 도달 안 할 때)
정의: 위 B-1에서 '요청이 안 찍힘'이면 이 인프라 계층 진단으로. 계층을 좁혀 범인 격리.

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

## 4. ping 사용법/경험
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

## 5. 웹서버 셋업 경험 (Nginx 기준)
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

## 6. SSH 통신 경험 (심화)
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

## 7. 소켓 통신 구현 (심화)
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

## 8. WebSocket (채팅앱 핵심)
정의: HTTP로 시작해 양방향 지속 연결로 업그레이드하는 프로토콜. 서버가 클라에게 먼저 push 가능.
왜 채팅에 필요:
- HTTP는 요청-응답만 → 서버가 새 메시지 알아서 못 밀어줌
- 옛날 폴링(계속 물어보기)=비효율 → WebSocket은 한 번 연결하면 양쪽 아무때나 전송
동작: 클라 "Upgrade: websocket" 요청 → 서버 101 Switching Protocols → 같은 TCP가 양방향 채널로 → 프레임 단위 송수신. (ws:// / wss://)

---

## 9. 채팅앱 설계 (종합)
구성: [브라우저]--WebSocket-->[채팅서버]--Redis Pub/Sub-->[다른 서버]--> [DB 영속화]

핵심 이슈(5년차):
① 서버 여러 대: A는 서버1, B는 서버2 → Redis Pub/Sub(또는 Kafka)로 인스턴스 간 메시지 전파. 스케일아웃하면 필수.
② 순서 보장: 서버 시퀀스 번호/타임스탬프로 정렬.
③ 전달 보장(at-least-once): 끊긴 사이 메시지 → DB 저장, 재접속 시 커서(마지막 읽은 이후) 복구.
④ presence(온라인 상태): Redis TTL+하트비트, 끊기면 만료.
⑤ 확장성: WebSocket 연결을 여러 서버 분산 + LB(sticky 또는 상태 외부화).

경험 서술: "브라우저-서버는 WebSocket, 서버 여러 대라 Redis Pub/Sub로 인스턴스 간 전파. 메시지는 DB 저장해 재접속 시 커서로 놓친 것 복구, presence는 Redis TTL+하트비트, 순서는 서버 시퀀스로 보장."

---

## 10. REST vs gRPC vs GraphQL
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

---

## 11. PuTTY / PEM 키 / keygen (서버 접속)
정의: 클라우드 서버는 비번 아닌 키페어(.pem)로 접속(SSH 공개키 인증). 개인키 가진 사람만 통과.
Windows PuTTY: AWS는 .pem(OpenSSH) 제공, PuTTY는 .ppk만 씀 → PuTTYgen으로 pem→ppk 변환 후 등록. 리눅스/맥은 ssh -i key.pem user@IP 바로.
★ 함정:
- pem 권한 너무 열리면 거부 → chmod 400 key.pem
- 유저명 AMI마다 다름: Amazon Linux=ec2-user, Ubuntu=ubuntu, CentOS=centos
- pem 분실 시 복구 불가 → 인스턴스 키 재설정
경험: "EC2에 PuTTYgen으로 pem→ppk 변환 등록, ubuntu 유저·400 권한 이슈 해결."

## 12. WAS / DB 서버 분리 (3-tier)
구성: [웹 Nginx 퍼블릭]→[WAS Tomcat/gunicorn 프라이빗]→[DB 프라이빗, 외부차단]
왜 분리:
- 보안: DB를 프라이빗 서브넷, WAS만 접근
- 확장: WAS는 스케일아웃, DB는 별도 증설/복제
- 장애 격리: 웹 죽어도 DB 살아있음
★ 방화벽 규칙이 여기서 나옴:
- 웹: 인바운드 80/443만
- WAS: 웹에서 오는 것만(8080), 외부 차단
- DB: WAS 보안그룹에서 오는 3306만, 나머지 차단
경험: "DB는 WAS 보안그룹발 3306만 허용, 나머지 차단."

## 13. 인바운드/아웃바운드/방화벽/UFW
정의: 인바운드=들어오는(외부→서버), 아웃바운드=나가는(서버→외부). 방화벽이 규칙으로 통제.
기본 정책: 잘된 방화벽은 인바운드 기본 차단(deny)+필요 포트만 허용(화이트리스트). 아웃바운드는 보통 허용, 강한 환경은 제한(유출 방지).
UFW 실무:
  ufw default deny incoming / ufw default allow outgoing
  ufw allow 22/tcp / ufw allow 80,443/tcp
  ufw allow from 10.0.1.5 to any port 3306  (특정 IP만 DB)
  ufw enable / ufw status verbose
★ 함정:
- enable 전에 22(SSH) 먼저 허용 안 하면 자기 접속 끊김(흔한 사고)
- 클라우드는 2중 방화벽: UFW + 보안그룹. 둘 다 열어야. "UFW 열었는데 안 됨"→보안그룹 확인.
경험: "DB UFW로 WAS발 3306만, 보안그룹까지 이중으로 맞춤."

## 14. 웹 스크래핑
정의: 웹 데이터를 프로그램으로 수집. HTTP 요청→HTML 파싱→추출.
갈림:
- 정적: HTML에 데이터 있음 → requests+BeautifulSoup, 빠름
- 동적(SPA): JS가 데이터 채움 → HTML 텅 빔 → Selenium/Playwright로 JS 실행 후 수집(느림)
★ 실무 이슈:
- robots.txt/약관 확인(법적·윤리)
- Rate limit: 너무 빠르면 429/IP밴 → 딜레이·지수 백오프
- User-Agent/헤더 설정(봇 차단 회피)
- ★ 고급팁: "브라우저엔 보이는데 requests엔 안 잡힘"→JS 렌더링. 개발자도구 Network에서 실제 데이터 API(XHR)를 찾아 직접 호출하면 Selenium보다 훨씬 빠름.
경험: "동적 페이지라 백엔드 XHR API 직접 호출로 Selenium 없이 수집, 지수 백오프 적용."

## 15. CORS
정의: 브라우저가 다른 출처(스킴+호스트+포트) 리소스 접근을 제어하는 보안 장치. 동일 출처 정책(SOP) 완화.
★ 출처 = 스킴+호스트+포트 셋 다 같아야 동일. 하나라도 다르면 교차 출처.
- https://example.com vs http://example.com → 스킴 다름 ❌
- example.com vs api.example.com → 호스트 다름 ❌
- localhost:3000 vs localhost:8000 → 포트 다름 ❌ (경로만 다른 건 같은 출처 ✅)
★ "같은 호스트 다른 포트"도 다른 출처 → CORS 막힘. localhost:3000(프론트)→localhost:8000(API)이 개발 최다 사례. "localhost인데 왜 CORS?" = 브라우저가 포트까지 봄.
해결: ①서버가 Allow-Origin에 프론트 출처 명시 ②프론트 개발서버 proxy로 같은 출처처럼 위장(CORS 자체 회피, React proxy/Vite server.proxy). 배포 시 같은 도메인 뒤 경로로 나눠(example.com=프론트, example.com/api=백엔드) CORS 회피 가능(리버스 프록시 원리).
★ 핵심 오해: CORS 에러는 서버가 아니라 "브라우저"가 막는 것. 서버는 정상 응답했지만 브라우저가 JS에 안 넘김. → curl/Postman은 되는데 브라우저만 실패 = CORS 시그니처.
Preflight(예비 요청):
- 위험 가능 요청 전 OPTIONS로 "허용돼?" 먼저 물음.
- 단순 요청(preflight 없음): 메서드 GET/HEAD/POST + Content-Type이 form-urlencoded/multipart/text-plain 중 하나 + 커스텀 헤더 없음.
- ★ application/json이면 조건 위반 → 무조건 preflight. Authorization 등 커스텀 헤더도 유발. 즉 요즘 JSON API는 대부분 OPTIONS 먼저 날아감.
서버 응답 헤더:
  Access-Control-Allow-Origin: https://myapp.com (credentials와 * 동시 불가)
  Access-Control-Allow-Methods / Allow-Headers
  Access-Control-Allow-Credentials: true (쿠키 보낼 때)
  Access-Control-Max-Age: 86400 (preflight 캐싱, 성능↑)
★ 흔한 실수:
- credentials 쓰며 Allow-Origin:* → 동작 안 함, 구체 출처 명시
- 서버가 OPTIONS 처리 안 함(404/405) → preflight 실패 → 실제 요청 차단
- Max-Age 없어 매번 preflight → 성능 저하
경험: "JSON API마다 preflight 떠서 서버 OPTIONS 처리+구체 출처+credentials true로 해결, Max-Age로 캐싱."

## 16. 트래픽 핸들링 (부하 대응)
정의: 몰리는 트래픽을 안정적으로 처리·분산·보호.
계층별 도구:
- 로드밸런싱: L4(IP/포트) / L7(URL/헤더). 라운드로빈/least_conn/IP해시
- 오토스케일링: 부하 따라 서버 수 자동 증감
- 캐싱: CDN(정적)/Redis(동적·세션)/HTTP 캐시헤더 → 원본 부하↓
- Rate limiting: 초당 요청 제한, 남용·DoS 방어(429)
- 큐잉: 급증을 Kafka/RabbitMQ로 완충 → 소화 가능 속도로 처리(backpressure)
- Circuit Breaker: 뒤 서비스 죽으면 빠르게 실패시켜 연쇄 장애 방지
- Graceful degradation: 과부하 시 핵심만 유지
★ 사고 흐름: 캐싱으로 원본 부하↓ → LB+오토스케일 수평확장 → 쓰기는 큐 완충 → 남용은 rate limit → 뒤 장애는 circuit breaker. 한 방법 아닌 "계층별 방어선" 겹치기.
경험: "이벤트 급증에 CDN으로 정적 부하 제거, WAS 오토스케일, 주문 쓰기는 Kafka 완충, 결제 외부API엔 circuit breaker로 연쇄 장애 차단."

## 17. 캐싱 실제 구현 (NestJS)
세 계층: [CDN 엣지]→[브라우저/HTTP캐시]→[NestJS+Redis]→[DB]. 바깥에서 막을수록 원본 부하↓.

### (1) HTTP 캐시 헤더 — 브라우저/CDN이 캐싱하게
@Header('Cache-Control', 'public, max-age=3600') 를 GET에 부여.
- public=CDN·프록시도 캐싱 / private=브라우저만(사용자별) / no-cache=캐싱하되 매번 검증 / no-store=절대 금지(민감)
- ETag: Nest(Express) 기본 생성. If-None-Match로 안 바뀌면 304 Not Modified(본문 없음)→대역폭 절약.

### (2) Redis — 서버사이드 캐싱 (@nestjs/cache-manager)
설정: CacheModule.registerAsync + redisStore(host/port, ttl).
방법A 자동(인터셉터): @UseInterceptors(CacheInterceptor) + @CacheTTL(300_000). URL을 키로 GET 응답 통째 캐싱.
방법B 수동(cache-aside, 가장 흔함):
  const cached = await cache.get(key); if(cached) return cached;
  const data = await repo.find(); await cache.set(key, data, ttl); return data;
  ★ 변경 시 무효화: await cache.del(`product:${id}`) — 안 하면 옛 데이터 노출.
세션: 서버 여러 대면 메모리 세션 불가(서버1 로그인→서버2 요청 시 세션 없음)→Redis로 외부화(상태 외부화).

### (3) CDN — Nest 바깥 인프라 계층
코드 아님. Nest가 할 일은 올바른 Cache-Control 내려주기. CDN(CloudFront/Cloudflare)이 헤더 보고 엣지에 캐싱.

### 흔한 실수(★)
- 무효화 누락: 데이터 바꿨는데 캐시 안 지워 옛 데이터 노출.
- 사용자별 데이터를 public 캐싱 → CDN이 캐싱해 남에게 노출. 반드시 private.
- Cache Stampede: 인기 키 동시 만료 → 요청 한꺼번에 DB로. TTL 지터/잠금으로 완화.
경험: "상품 조회 API는 CacheInterceptor로 Redis 캐싱, 수정 시 del로 무효화. 세션은 Redis 외부화, 정적은 Cache-Control 길게 줘 CDN 엣지 처리. 사용자별 데이터가 CDN 캐싱되던 사고를 private로 해결."

## 18. AWS 실무 핵심 개념
전체 그림: [사용자]→IGW→[퍼블릭:ALB/웹]→(SG 참조)→[프라이빗:WAS]→(Role로 S3)→[프라이빗:DB]. IAM이 "누가 조작"을 감싸고 SG/NACL이 트래픽 통제.

### IAM (누가 무엇을)
정의: AWS 리소스 접근 권한 통제. SG/NACL=트래픽, IAM=AWS 작업 권한.
4요소: User(장기 자격증명) / Group(User 묶음+정책) / Role(임시 자격증명, assume) / Policy(권한 정의 JSON).
★ User보다 Role: 액세스 키(User)=유출 위험 장기 자격. Role=임시라 안전. EC2→S3 접근 시 키 하드코딩 말고 Instance Profile(Role)로 → AWS가 임시 키 자동 발급·순환.
Policy 예: {Effect:Allow, Action:["s3:GetObject"], Resource:"arn:aws:s3:::bucket/*"}
★ 평가 규칙: 명시적 Deny > Allow / Allow 없으면 암묵적 Deny / 최소 권한 원칙(Admin 남발 금지).

### SG vs NACL vs IAM (세 방어선)
- SG: 인스턴스 레벨, Allow만, Stateful(인바운드 허용 시 응답 자동 허용)
- NACL: 서브넷 레벨, Allow+Deny, Stateless(응답용 아웃바운드 따로 열어야, ephemeral 포트 함정)
- IAM: AWS API/리소스 작업 권한
★ 킬러: "SG는 인스턴스 방화벽+stateful라 응답 자동 허용, NACL은 서브넷 방화벽+stateless라 양방향 다 열어야, IAM은 트래픽 아닌 AWS 작업 권한."

### VPC / 서브넷 / 화이트리스트
정의: VPC=AWS 안 격리된 가상 네트워크. 3-tier가 여기 올라감.
- 퍼블릭 서브넷: 라우팅이 IGW 가리킴 → 외부 통신. 웹/LB/NAT.
- 프라이빗 서브넷: IGW 없음 → DB 숨김. 나갈 땐 NAT 게이트웨이(아웃바운드만).
★ 화이트리스트: IP 하드코딩 대신 SG가 다른 SG 참조. "DB SG는 WAS SG발 3306만" → 오토스케일로 늘어도 IP 수정 불필요. IP 아닌 "역할(SG) 단위".

### VPN 설정
정의: 온프레미스/원격을 VPC에 안전 연결.
- Site-to-Site: 회사 DC↔VPC 암호화 터널
- Client VPN: 개별 사용자→VPC(원격근무자가 프라이빗 DB 접근)
대안: 베스천 호스트(점프 서버 SSH 경유) / SSM Session Manager(22 포트 안 열고 접속, 요즘 정석, 공격면 축소).

### S3 객체 생성/가져오기 (SDK v3)
정의: S3=객체 스토리지. 파일(객체)을 버킷에.
Node/Nest:
  const s3 = new S3Client({ region }); // 키 안 박음, EC2 Role 자동
  await s3.send(new PutObjectCommand({Bucket,Key,Body,ContentType})); // 업로드
  await s3.send(new GetObjectCommand({Bucket,Key})); // 가져오기
★ 포인트:
- Presigned URL: 서버가 임시 서명 URL 발급→클라가 서버 안 거치고 S3 직접 업/다운. 대용량 서버 부하 회피. 면접 단골.
- 자격증명 코드에 없음: S3Client에 region만, Role 임시 키를 SDK가 자동 사용(IAM Role 실활용).
- 버킷 정책 vs IAM 정책: 접근은 IAM(누가)+버킷정책(리소스측) 양쪽. 퍼블릭 노출 사고 다발.

면접 한 문장: "VPC에 퍼블릭/프라이빗 나눠 DB를 프라이빗에 숨기고, SG를 IP 아닌 SG 참조로 화이트리스트해 오토스케일 대응. 권한은 IAM으로, EC2는 키 대신 Role로 S3 접근해 유출 위험 제거."

## 17-B. AWS 네트워크 최소→하나씩 쌓기 (학습 순서)
각 단계 = 앞 단계의 한계 → 추가 → 연결 개념.

0. 빈 계정: 목표=웹서비스 안전하게 올리기.
1. VPC: 격리된 내 네트워크 상자. CIDR 10.0.0.0/16(사설 대역). 아직 외부 단절.
2. 서브넷: VPC를 칸막이. 퍼블릭 10.0.1.0/24 + 프라이빗 10.0.2.0/24. 이름만 나눔(아직 외부연결 없음). (실무: Multi-AZ로 고가용성)
3. IGW+라우팅: 밖으로 나가는 문. 퍼블릭 라우팅 0.0.0.0/0→IGW. ★이 라우팅이 있어야 진짜 퍼블릭. 프라이빗은 이 경로 없어 자동 격리 = 퍼블릭/프라이빗 실체.
4. Security Group: 인스턴스 문단속(최소 방화벽). 웹 SG 인바운드 443/80 from 0.0.0.0/0, 22 from 내IP. stateful이라 응답 자동. → 여기까지가 "웹 한 대 안전 노출" 최소 구성.
5. DB 프라이빗+SG 참조: DB를 프라이빗에, DB SG 인바운드 3306 from [WAS-SG]. IP 아닌 SG 참조 → 오토스케일 대응. 역할 단위 화이트리스트 완성.
6. NAT 게이트웨이: 프라이빗도 나가야(업데이트/외부API). 프라이빗 라우팅 0.0.0.0/0→NAT. 나가기만, 들어오긴 못함(비대칭 통로). NAT 원리.
7. IAM Role: WAS가 S3 접근. 키 하드코딩 대신 Instance Profile(Role) → SDK 임시 키 자동. 트래픽(SG)과 별개로 "누가 무슨 작업"을 IAM이 감쌈.
8+. 필요시: ALB(분산)/NACL(서브넷 방어,stateless)/Multi-AZ(고가용성)/VPN·SSM(관리접속)/CloudFront+Route53(CDN·DNS).

한 문장: "VPC로 격리→퍼블릭/프라이빗 분할→퍼블릭은 IGW 라우팅으로 외부와, 프라이빗은 NAT로 나가기만→SG로 인스턴스 문단속+DB는 WAS-SG 참조 화이트리스트→접근은 키 대신 IAM Role."

## 18. 서버리스 & AWS Lambda (함수형 API, 사용량 과금)
정의: 서버를 직접 관리 안 하고 코드(함수)만 올리면 클라우드가 실행·확장·과금. "서버 없다"가 아니라 "서버 신경 안 쓴다".
인과(기존 대비):
- EC2/EKS: 인스턴스 항상 띄움→요청 없어도 켜진 동안 과금, 확장 내가 설정.
- Lambda: 요청 올 때만 함수 잠깐 실행→실행한 만큼만 과금(안 쓰면 0원), 확장 자동.

AWS Lambda:
- 과금: 요청 수+실행시간(ms)×메모리. 안 쓰면 0원. 간헐적·예측 불가 워크로드 유리. 프리티어 월 100만 요청.
- 트리거: API Gateway(HTTP→Lambda), S3 이벤트(업로드 후 처리), SQS/SNS/EventBridge, DynamoDB Streams, 스케줄(cron).
- 서버리스 API: [클라]→API Gateway(라우팅)→Lambda(로직)→DynamoDB(서버리스 DB). 서버 0대로 API 운영.

장점: 비용 효율(쓴 만큼), 자동 확장(1~1만 알아서), 운영 부담 0, 빠른 개발.
★ 단점:
- 콜드 스타트: 한동안 안 쓰이면 꺼졌다가 첫 요청 때 초기화 시간(수백ms~수초). 지연 민감 서비스 문제(프로비저닝된 동시성으로 완화).
- 실행 시간 제한 15분(긴 작업 부적합).
- 무상태(매번 초기화, 상태는 DynamoDB/S3 외부화).
- 벤더 종속, 디버깅·로컬 테스트 어려움.
- ★ 비용 역전: 트래픽 지속적으로 많으면 오히려 EC2/EKS보다 비쌀 수 있음(항상 켜둘 거면 상시 서버가 쌈).

언제:
- 서버리스 유리: 간헐적·예측 불가 트래픽, 이벤트 기반(파일 업로드 후 처리), 배치·크론, 프로토타입, 트래픽 급변.
- 상시 서버 유리: 지속 높은 트래픽, 긴 실행, 낮은 지연 필수(콜드 스타트 곤란), 세밀한 제어.
★ 한 문장: "서버리스는 안 쓰면 0원+자동 확장이라 간헐적·이벤트 기반에 최적, 단 콜드 스타트·15분 제한 있고 지속 트래픽 많으면 상시 서버가 쌈. 워크로드 특성으로 선택."

다른 서버리스: Fargate(컨테이너 서버리스, 긴 작업), DynamoDB(NoSQL), S3(스토리지), API Gateway(API 관문). 조합하면 서버 0대로 완전한 서비스.
연결: 함수형 API=이벤트 드리븐의 서버리스 버전 / 오토스케일을 AWS가 함수 레벨 자동 / 무상태 강제(상태 외부화).

## 19. AWS 기본 서비스 지도 (카테고리별 대표 서비스)
큰 그림: 200개+ 서비스지만 5년차 핵심은 카테고리별 대표 1~2개. "이름-역할-언제 쓰나" 수준으로 넓고 얕게(핵심 개념은 깊게, 도구는 넓게 원칙).

### 컴퓨팅 (코드 실행)
- EC2: 가상 서버. OS부터 직접 관리, 가장 유연·관리 부담 큼. "클라우드 위 내 서버 한 대."
- Lambda: 서버리스 함수. 요청 올 때만 실행·쓴 만큼 과금·관리 없음.
- ECS/EKS: 컨테이너 오케스트레이션. ECS=AWS 고유(간단), EKS=관리형 쿠버네티스(표준).
- Fargate: 컨테이너를 서버리스로(노드 관리 없이). ECS/EKS와 결합.
★ 선택: 완전한 제어·상시=EC2, 간헐적·이벤트=Lambda, 컨테이너=ECS/EKS, 노드 관리 싫으면 Fargate.

### 스토리지
- S3: 객체 스토리지. 파일·이미지·백업·정적 사이트. 무한 용량·저렴·고내구성. 가장 많이 씀.
- EBS: EC2에 붙이는 디스크(블록). 한 인스턴스에 붙음. DB 데이터 등.
- EFS: 여러 EC2가 공유하는 파일 시스템.
★ 구분: 파일 저장·서빙=S3, EC2 디스크=EBS(한 대), 여러 서버 공유=EFS.

### 데이터베이스
- RDS: 관리형 관계형 DB(MySQL/PostgreSQL/Aurora). 백업·복제·패치를 AWS가. ("DB는 RDS가 대개 낫다")
- Aurora: AWS 제작 고성능 관계형(MySQL/PG 호환). RDS 상위.
- DynamoDB: 관리형 NoSQL. 서버리스·자동 확장·밀리초. 대규모 확장 강함.
- ElastiCache: 관리형 Redis/Memcached. 캐싱·세션.
★ 선택: 정형·트랜잭션=RDS/Aurora, 대규모·유연 스키마=DynamoDB, 캐시=ElastiCache.

### 네트워킹
- VPC: 내 가상 네트워크. 서브넷·라우팅·방화벽 격리.
- Route 53: DNS. 도메인·이름 해석·헬스체크 라우팅.
- CloudFront: CDN. 정적 자원 엣지 서빙(전세계 캐싱).
- ELB: 로드 밸런서. ALB(L7/HTTP)·NLB(L4/TCP).
- API Gateway: API 관문. 서버리스 API·rate limit·인증.
★ 흐름: 사용자→Route 53(DNS)→CloudFront(CDN)→ELB(분산)→EC2/Lambda, 전체가 VPC 안.

### 보안/권한
- IAM: 사용자·역할·권한. "누가 무엇을." 최소 권한.
- Security Group: 인스턴스 방화벽(허용 규칙). vs NACL(서브넷).
- Secrets Manager/Parameter Store: 시크릿 저장·회전.
- KMS: 암호화 키 관리. Cognito: 사용자 인증·회원관리.
★ IAM Role로 키 없이 권한(IRSA·OIDC), 시크릿은 Secrets Manager, 방화벽은 SG.

### 배포/운영
- CloudWatch: 모니터링·로그·메트릭·알람.
- CloudFormation: IaC(AWS 네이티브, Terraform은 멀티클라우드).
- ECR: Docker 이미지 저장소.
- CodePipeline/Build/Deploy: CI/CD.
- CloudTrail: API 호출 감사 로그.

### 메시징/비동기
- SQS: 메시지 큐. 작업 완충·비동기 분리(1:1).
- SNS: 발행-구독 알림(1:N 팬아웃, 푸시·이메일·SMS).
- EventBridge: 이벤트 버스(서비스 간 라우팅).
- Kinesis: 실시간 스트리밍.
★ 구분: 작업 큐=SQS, 알림 팬아웃=SNS, 이벤트 라우팅=EventBridge, 스트림=Kinesis.

### 전형적 웹 서비스 아키텍처 (조합)
사용자→Route 53(DNS)→CloudFront(CDN)→ALB(분산)→ECS/EKS·EC2(앱, Auto Scaling)→RDS(DB)+ElastiCache(캐시)→S3(파일). SQS로 비동기, CloudWatch로 모니터링, IAM으로 권한, 전체가 VPC 안.
★ 이 그림에 배운 게 다: CDN·LB·오토스케일·캐시·큐·모니터링(트래픽 핸들링)+VPC·IAM(네트워크)+RDS(DB).

### 우선순위
- 반드시: EC2, S3, RDS, VPC, IAM, Security Group, CloudWatch, ELB, Lambda, ECR
- 자주: DynamoDB, ElastiCache, SQS, CloudFront, Route 53, EKS/ECS, Secrets Manager
- 알면 좋음: SNS, EventBridge, CloudFormation, Cognito, KMS, Fargate

### 핵심 관점 (도구는 넓게, 개념은 깊게)
AWS 서비스는 "이름-역할-언제"만 알면 충분. 각각은 핵심 개념의 관리형 구현이라 개념 알면 바로 매핑: ElastiCache="Redis 관리형", EKS="쿠버네티스 관리형", RDS="DB 운영 대행", SQS="메시지 큐". 핵심(네트워크·DB·캐시·큐)이 튼튼하면 서비스는 이름표.
면접 한 문장: "AWS는 카테고리별 대표 서비스로 이해한다 — 컴퓨팅(EC2/Lambda), 스토리지(S3), DB(RDS/DynamoDB), 네트워킹(VPC/CloudFront/ELB), 권한(IAM), 큐(SQS), 모니터링(CloudWatch). 각각은 핵심 개념의 관리형 구현이라 개념을 알면 빠르게 익힌다."
