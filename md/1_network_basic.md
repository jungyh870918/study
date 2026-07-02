# [문서1] 네트워크 기본 — 면접 실전용
> 포맷: 용어 정의 → 핵심 개념(한두 줄) → 문제 정의/인과관계
> 첫 질문엔 정의/핵심만, 후속 질문에서 디테일 확장.

---

## 1. 계층 모델
정의: OSI 7=관심사 분리 참조모델, 실무는 TCP/IP 4계층. 실전 가치 = "장애가 몇 층인지 끊는 진단 축".
인과: L2=같은 네트워크(MAC, 홉마다 바뀜), L3=다른 네트워크(IP, 종단 유지) → 라우팅 성립.
후속: 캡슐화(Segment→Packet→Frame) / 진단축 L3=ping·라우팅, L4=포트·방화벽, L7=앱로그 / 앵커 L2=MAC, L3=IP, L4=TCP

---

## 2. TCP 핸드셰이크 & 상태
정의: 3-way = 양쪽 송신·수신 능력 상호확인. 4-way = 전이중이라 방향별 독립 종료.
문제/해결:
- TIME_WAIT = 능동 종료자(먼저 끊은 쪽) 2×MSL 대기. 폭증 → 포트 고갈 → keep-alive/커넥션 풀.
- CLOSE_WAIT = 상대 FIN 받고 내 앱이 close() 안 함. 폭증 → 애플리케이션 버그.
대비: TIME_WAIT는 커널이 정리, CLOSE_WAIT는 앱이 안 닫으면 영구 잔존.
후속: 왜 3번(2=수신능력 확인불가, 4=SYN+ACK 합쳐 불필요) / ISN 랜덤 / SYN Flood→SYN Cookie

---

## 3. 흐름제어 vs 혼잡제어
정의: 흐름제어 = 수신자 버퍼 배려(rwnd). 혼잡제어 = 네트워크 경로 배려(cwnd). 송신량 = min(rwnd, cwnd).
문제/해결:
- Zero Window = 수신 버퍼 꽉 참 → 송신 정지. TCP의 backpressure.
- 처리량 < 대역폭 → BDP(=대역폭×RTT)만큼 window 미확보. Window Scaling 확인.
후속: Slow Start(지수)→Congestion Avoidance(선형) AIMD 톱니 / CUBIC(손실기반) vs BBR(대역폭기반) / 누적 ACK→3 dup ACK→Fast Retransmit, SACK / HOL Blocking→HTTP/3(QUIC)

---

## 4. MTU/MSS · 지연 범인
정의: MTU = L2 프레임 페이로드 최대(1500). MSS = TCP 데이터 최대(MTU−40=1460), 3-way 때 광고.
증상 → 범인:
- VPN 켜면 특정 사이트 불가 → 터널 헤더로 MTU 초과 → MSS Clamping
- 큰 응답만 멈춤 → PMTUD 블랙홀(ICMP 차단) → ICMP 허용
- 작은 요청 40ms 밀림 → Nagle × Delayed ACK → TCP_NODELAY
- 대역폭 OK인데 지연 널뜀 → Bufferbloat → AQM(FQ-CoDel)

---

## 5. TLS 인증 · HTTPS 핸드셰이크
정의: TLS = 암호화 + 무결성 + 인증. TCP 위, HTTP 아래.
인과: 암호화만으론 상대가 진짜인지 모름 → 인증서(신원 증명) 필요.
키 역할: 비대칭(RSA/ECDHE)=키 교환용(느림), 대칭(AES)=본 통신용(빠름).
인증서 체인: CA가 서명. Root CA(내장 trust store)→중간 CA→서버 인증서 검증.
- SNI: 한 IP 여러 도메인일 때 ClientHello에 도메인 명시 → 맞는 인증서 제시.
- 폐기 확인: CRL / OCSP / OCSP Stapling(성능↑)
버전:
- TLS 1.2 = 2-RTT.
- TLS 1.3 = 1-RTT(+재접속 0-RTT). ECDHE 강제 → Forward Secrecy. 레거시(RSA키교환/RC4/SHA-1) 제거. 0-RTT는 재전송 공격 위험 → 멱등 요청만.
사슬: DNS → TCP 3-way → TLS(인증서 검증+키 합의→세션키) → HTTP 암호화 전송.
진단: 신뢰불가=체인끊김/자체서명 / 도메인불일치=SAN / 특정클라 실패=버전·cipher / 엉뚱한 인증서=SNI 미전송 / 느림=OCSP Stapling

---

## 6. URL 입력하면 벌어지는 일 (순서)
1.URL 파싱 2.캐시/HSTS 확인 3.DNS(브라우저→OS→hosts→ISP 재귀→Root→TLD→권한NS) 4.ARP(게이트웨이 MAC) 5.TCP 3-way 6.TLS 핸드셰이크 7.HTTP 요청 8.서버 처리(리버스 프록시→WAS→DB) 9.렌더링 10.keep-alive/종료
계층: DNS(L7)→ARP(L2)→TCP(L4)→TLS(L6)→HTTP(L7)
지연 포인트: DNS 지연 / TCP RTT / TLS 왕복 / TTFB / 렌더 블로킹

---

## 7. VPN
정의: 암호화 터널로 트래픽을 VPN 서버까지 감싸 보냄. 원래 IP 패킷을 통째로 캡슐화+암호화.
인과: 통째 캡슐화 → 새 헤더 → MTU 감소 → MSS clamping 필요.
효과: 도청 방지 / 출발지 IP 은폐 / 사내망 접근. 프로토콜: IPsec(L3), WireGuard, OpenVPN.

---

## 8. 프록시 vs 리버스 프록시
정의: 포워드 = 클라이언트 대신(클라 앞). 리버스 = 서버 대신(서버 앞).
포워드: 사내 통제/캐싱/익명화/차단. 서버는 프록시 IP만 봄.
리버스(핵심): 클라가 진짜 서버로 착각. 역할 = 로드밸런싱 / TLS 종료 / 캐싱 / 보안(실서버 은폐, WAF) / 라우팅. Nginx, HAProxy, LB.
- TLS 종료: 리버스 프록시가 TLS 대신 처리 → 뒤 실서버는 평문 HTTP.
대비: "포워드는 클라를 숨기고, 리버스는 서버를 숨긴다."

---

---

## 9. 스위치·라우터·MAC·ARP·DNS (패킷의 여정)
스위치 vs 라우터:
정의: 스위치(L2)=같은 네트워크 내 MAC으로 프레임 전달. 라우터(L3)=다른 네트워크 간 IP로 경로 결정.
인과: 서브넷 마스크로 "같은 네트워크냐" 판단 → 같으면 스위치, 다르면 게이트웨이(라우터).
후속: 스위치=MAC 테이블 학습, 라우터=라우팅 테이블. 모르면 스위치는 flooding, 라우터는 default route.

MAC & ARP:
정의: MAC=NIC 하드웨어 주소(같은 네트워크 한정). ARP="이 IP의 MAC이 뭐냐"를 브로드캐스트로 알아냄(IP→MAC).
핵심: IP는 종단까지 고정, MAC은 홉마다 바뀜. 밖으로 나갈 땐 ARP로 게이트웨이 MAC 획득(서버 MAC 아님).
후속: ARP 캐시 / ARP Spoofing(가짜 응답 MITM) / GARP(장애 절체 광고).

DNS:
정의: 도메인→IP 분산 계층형 이름 시스템.
인과: 클라는 재귀 리졸버에 "답만 다오"(재귀), 리졸버가 Root→TLD→권한NS 반복 질의.
후속: A/AAAA/CNAME/MX/NS/TXT / TTL(낮추면 변경 빨리·부하↑) / UDP 53(크면 TCP 53).

ICMP/ping/traceroute:
정의: ICMP=IP계층 제어·오류 통보(데이터 운반 아님). ping=생존+RTT, traceroute=경로 홉 추적.
traceroute 원리: TTL을 1,2,3...로 늘려 각 홉의 "시간초과 ICMP"로 경로 발견.
후속: ping 실패 ≠ 서비스 다운(ICMP만 막았을 수도) / ICMP 전면차단→PMTUD 블랙홀.

패킷의 여정: DNS로 IP→서브넷 판단→(원격이면)ARP로 게이트웨이 MAC→프레임 전송(IP고정,MAC 홉마다 교체)→라우터가 다음 홉 반복 결정.

---

## 전체 인과 사슬
계층 분리→진단축 / L4가 신뢰성(3-way, SEQ/ACK) / 얼마나=min(rwnd,cwnd) / 한 번에=MSS
어긋나면 → 연결(TIME/CLOSE_WAIT), 버퍼(Zero Window), 경로(PMTUD), 큐(Bufferbloat)
한문장: "TCP는 3-way로 연결, SEQ/ACK로 신뢰성·순서 보장, 전송량은 min(rwnd,cwnd), 단위는 MSS. 트러블은 연결상태/버퍼/경로크기/큐 넷 중 하나."
