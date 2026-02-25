# 라이어 게임 (Liar Game)

실시간 멀티플레이어 소셜 추론 게임. 시민들은 주어진 키워드를 공유하지만, 라이어만 카테고리만 알고 있습니다. 서로 대화하며 라이어를 찾아내세요!

---

## 목차

- [게임 소개](#게임-소개)
- [기술 스택](#기술-스택)
- [env](#env)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [게임 플로우](#게임-플로우)
- [API 문서](#api-문서)
- [WebSocket 이벤트](#websocket-이벤트)
- [Redis 데이터 설계](#redis-데이터-설계)
- [카테고리 & 키워드](#카테고리--키워드)

---

## 게임 소개

라이어 게임은 소셜 추론 파티 게임입니다.

- **시민**: 랜덤으로 선택된 키워드(예: `치킨`)를 공유받습니다.
- **라이어**: 키워드 없이 카테고리(예: `음식`)만 알고 있습니다.
- **목표**: 시민들은 라이어를 찾아야 하고, 라이어는 들키지 않아야 합니다.
- 최대 **10명**이 한 방에 참여할 수 있습니다.

---

## env

### backend env

```
REDIS_SERVER=localhost
REDIS_PORT=1234
```

### front env

```
NEXT_PUBLIC_API_URL=https://api.test.com
NEXT_PUBLIC_WS_URL=https://wss.test.com
```

---

## 기술 스택

### 프론트엔드

| 항목          | 기술                    |
| ------------- | ----------------------- |
| 프레임워크    | Next.js 16 (App Router) |
| 언어          | TypeScript              |
| 스타일        | Tailwind CSS v4         |
| 실시간 통신   | Socket.IO Client v4     |
| 패키지 매니저 | npm                     |

### 백엔드

| 항목          | 기술                          |
| ------------- | ----------------------------- |
| 프레임워크    | NestJS v11                    |
| 언어          | TypeScript                    |
| 실시간 통신   | Socket.IO (WebSocket Gateway) |
| 세션 스토리지 | Redis (ioredis)               |
| 인증          | JWT (`@nestjs/jwt`)           |
| API 문서      | Swagger (`@nestjs/swagger`)   |

---

## 프로젝트 구조

```
liar-game/
├── front/                          # Next.js 프론트엔드
│   └── src/app/
│       ├── page.tsx                # 랜딩 페이지 (닉네임 입력 / 방 버튼)
│       ├── layout.tsx              # 루트 레이아웃 (Pretendard 폰트)
│       ├── globals.css             # 전역 스타일 & 커스텀 애니메이션
│       └── room/
│           ├── create/page.tsx     # 방 만들기
│           ├── join/page.tsx       # 방 참가
│           └── [roomId]/page.tsx   # 게임룸 (채팅 · 역할 · 게임 진행)
│
└── backend/                        # NestJS 백엔드
    └── src/
        ├── main.ts                 # 앱 진입점 (CORS, Swagger)
        ├── room/
        │   ├── room.controller.ts  # REST API 엔드포인트
        │   └── room.service.ts     # 방 생성/참가/퇴장 로직
        ├── game/
        │   ├── game.gateway.ts     # Socket.IO 게이트웨이
        │   └── result.category.ts  # 카테고리 & 키워드 데이터
        ├── redis/
        │   └── redis.service.ts    # Redis 연동
        └── jwt/                    # JWT 검증
```

---

## 시작하기

### 사전 요구사항

- Node.js 18+
- Redis 서버 실행 중

### 1. 백엔드 실행

```bash
cd backend
npm install
npm run start:dev
```

백엔드는 기본적으로 `http://localhost:5001`에서 실행됩니다.
Swagger API 문서: `http://localhost:5000/api`

### 2. 프론트엔드 실행

```bash
cd front
npm install
npm run dev
```

프론트엔드는 기본적으로 `http://localhost:5000`에서 실행됩니다.

### 환경 변수

백엔드 `.env` 예시:

```env
REDIS_SERVER=localhost
REDIS_PORT=6379
```

---

## 게임 플로우

```
1. 닉네임 입력
   └── POST /room/nickname → JWT 발급 → sessionStorage 저장

2. 방 생성 또는 참가
   ├── 방 만들기: POST /room/create → roomId 발급
   └── 방 참가:   POST /room/join  → roomId 입력 검증

3. 소켓 입장
   └── Socket.IO emit('join', { roomId, jwt }) → join_success

4. 게임 대기
   └── 참여자 목록 확인 (최대 10명, 최소 2명)

5. 게임 시작 (방장)
   └── emit('game_start')
       ├── 시민 → game_info: { role: 'citizen', answer: '치킨' }
       └── 라이어 → game_info: { role: 'liar', category: '음식' }

6. 채팅으로 추론
   └── emit('chat', { message }) ↔ on('chat_message', ...)

7. 게임 종료 후 방 나가기
   └── DELETE /room/quit?roomId=...
```

---

## API 문서

### REST API

기본 URL: `http://localhost:5001`

| Method   | Endpoint                | Body                   | 설명                             |
| -------- | ----------------------- | ---------------------- | -------------------------------- |
| `POST`   | `/room/nickname`        | `{ nickname }`         | 닉네임 등록 → JWT 발급           |
| `POST`   | `/room/create`          | — (Authorization 헤더) | 방 생성 → `{ roomId, jwtToken }` |
| `POST`   | `/room/join`            | `{ roomId, jwtToken }` | 방 참가 검증                     |
| `DELETE` | `/room/quit?roomId=...` | —                      | 방 나가기                        |

**인증**: `POST /room/nickname`으로 발급받은 JWT를 `Authorization: Bearer <token>` 헤더로 전달합니다.

> 게임 진행 중(`PLAYING` 상태)인 방에는 참가할 수 없습니다.

---

## WebSocket 이벤트

**URL**: `ws://localhost:5001/game`
**Transport**: `websocket`

### 클라이언트 → 서버

| 이벤트       | Payload           | 설명                      |
| ------------ | ----------------- | ------------------------- |
| `join`       | `{ roomId, jwt }` | 게임 방 소켓 입장         |
| `chat`       | `{ message }`     | 채팅 메시지 전송          |
| `game_start` | —                 | 게임 시작 (2명 이상 필요) |

### 서버 → 클라이언트

| 이벤트         | Payload                                                         | 설명                      |
| -------------- | --------------------------------------------------------------- | ------------------------- |
| `join_success` | `{ roomId, nickname, socketId, members, maxPlayers }`           | 입장 성공                 |
| `join_error`   | `{ message }`                                                   | 입장 실패                 |
| `user_joined`  | `{ socketId, nickname, members }`                               | 다른 유저 입장 알림       |
| `user_left`    | `{ socketId, nickname, members }`                               | 유저 퇴장 알림            |
| `chat_message` | `{ nickname, message, socketId, time }`                         | 채팅 수신 (time: UTC ISO) |
| `game_started` | `{ message }`                                                   | 게임 시작 알림            |
| `game_info`    | `{ role: 'citizen', answer }` 또는 `{ role: 'liar', category }` | 역할 배분                 |
| `game_error`   | `{ message }`                                                   | 게임 오류                 |

---

## Redis 데이터 설계

### 키 구조

| 키 패턴                 | 자료구조 | 설명                    |
| ----------------------- | -------- | ----------------------- |
| `room:{roomId}`         | Hash     | 방 메타데이터           |
| `room:{roomId}:members` | Set      | 현재 참여자 닉네임 목록 |

### `room:{roomId}` Hash 필드

| 필드           | 타입   | 설명                                 |
| -------------- | ------ | ------------------------------------ |
| `status`       | string | 방 상태 (`WAIT` / `PLAYING` / `END`) |
| `players`      | number | 현재 인원 (Set SCARD와 동기화)       |
| `maxPlayers`   | number | 최대 인원 (기본값: `10`)             |
| `created`      | number | 생성 시각 (Unix timestamp ms)        |
| `liarNickname` | string | 라이어 닉네임 (게임 시작 후 저장)    |
| `answer`       | string | 시민 정답 키워드 (게임 시작 후 저장) |
| `category`     | string | 카테고리 (게임 시작 후 저장)         |

### 방 상태 전이

```
WAIT ──(game_start)──► PLAYING ──(game_end)──► END
 │                                               │
 └── 참가·채팅 가능                              └── 라이어 공개, 재게임 가능
```

> `PLAYING` 상태의 방에는 새 유저가 입장할 수 없습니다 (HTTP 및 소켓 양쪽에서 차단).

### TTL 정책

| 시점                  | `room:{roomId}` TTL | `room:{roomId}:members` TTL |
| --------------------- | ------------------- | --------------------------- |
| 방 생성 (`WAIT`)      | **30분**            | members Set 생성 전         |
| 소켓 입장             | —                   | 방 hash TTL과 동기화        |
| 게임 시작 (`PLAYING`) | **1시간**           | **1시간**                   |
| 게임 종료 (`END`)     | **30분**            | **30분**                    |
| 인원 0명              | 즉시 삭제 (`DEL`)   | 즉시 삭제 (`DEL`)           |

### 동시성 제어 (Lua 스크립트)

소켓 입장 시 정원 초과를 방지하기 위해 `SCARD` 확인과 `SADD` 추가를 **하나의 원자적 연산**으로 처리합니다.

```lua
local count = redis.call('SCARD', KEYS[1])
if count >= tonumber(ARGV[1]) then return 0 end
redis.call('SADD', KEYS[1], ARGV[2])
return 1
```

- `KEYS[1]` — `room:{roomId}:members` (Set 키)
- `ARGV[1]` — `maxPlayers` (정원 상한)
- `ARGV[2]` — 입장할 닉네임
- 반환 `1` → 입장 성공 / `0` → 정원 초과

HTTP `POST /room/join`은 검증 전용으로 인원 카운트를 변경하지 않으며, 실제 인원 관리는 소켓 게이트웨이가 단독으로 담당합니다.

### 멤버 목록 동기화

프론트엔드는 서버가 내려주는 `members[]` 배열을 항상 신뢰합니다. 입장 및 퇴장 이벤트마다 `room:{roomId}:members` Set의 현재 스냅샷을 함께 전송하여 클라이언트 상태가 Redis와 항상 일치하도록 보장합니다.

---

## 카테고리 & 키워드

게임에서 사용되는 카테고리와 키워드 목록입니다.

| 카테고리 | 키워드 예시                                        |
| -------- | -------------------------------------------------- |
| 영화     | 어벤져스, 해리포터, 부산행, 기생충, 인터스텔라 ... |
| 직업     | 교사, 의사, 소방관, 개발자, 파일럿 ...             |
| 스포츠   | 축구, 야구, 농구, 탁구, 배드민턴 ...               |
| 음식     | 치킨, 피자, 떡볶이, 라면, 삼겹살 ...               |
| 사물     | 가위, 마우스, 스마트폰, 거울, 책상 ...             |
| 동물     | 강아지, 고양이, 호랑이, 펭귄, 기린 ...             |
| 연예인   | 아이유, 방탄소년단, 유재석, 손흥민 ...             |
| 게임     | 리그오브레전드, 오버워치, 마인크래프트 ...         |
| 나라     | 한국, 미국, 일본, 프랑스, 브라질 ...               |

---

## 주요 기능

- **실시간 멀티플레이** — Socket.IO WebSocket 기반 채팅 및 이벤트
- **JWT 인증** — 닉네임 기반 무계정 인증 흐름
- **동시성 제어** — Redis Lua 스크립트로 원자적 정원(maxPlayer) 체크
- **채팅 타임스탬프** — 서버 UTC 시간 → KST 24시간제 변환 표시
- **방 코드 복사** — 클립보드 API로 방 코드 한 번에 공유
- **라이어 공개 오버레이** — 게임 종료 시 드라마틱 애니메이션 공개
- **재게임** — 오버레이에서 바로 재시작 가능
- **반응형 디자인** — 모바일 우선
