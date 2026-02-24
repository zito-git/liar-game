"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface UserSession {
  nickname: string;
  Authorization: string;
}

interface ChatMessage {
  type: "system" | "chat";
  nickname?: string;
  text: string;
  time?: string;
}

function toKSTTime(time?: string): string {
  const date = time ? new Date(time) : new Date();
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

interface GameInfo {
  role: "liar" | "citizen";
  category?: string;
  answer?: string;
}

interface RevealData {
  liarNickname: string;
  answer: string;
  category: string;
}

const SESSION_KEY = "liar-game-user";

export default function GameRoom() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [session, setSession] = useState<UserSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState<number>(0);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      router.replace("/");
      return;
    }
    const userSession: UserSession = JSON.parse(stored);
    setSession(userSession);

    const addMsg = (type: "system" | "chat", text: string, nickname?: string, time?: string) => {
      setMessages((prev) => [...prev, { type, text, nickname, time }]);
    };

    const socket = io("http://localhost:80/game", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { roomId, jwt: userSession.Authorization });
    });

    socket.on("join_success", (data) => {
      setConnected(true);
      setUsers(data.members ?? [userSession.nickname]);
      if (data.maxPlayers) setMaxPlayers(data.maxPlayers);
      addMsg("system", `✅ 방 입장 성공 (${data.roomId})`);
    });

    socket.on("join_error", (data) => {
      addMsg("system", `❌ 입장 실패: ${data.message}`);
      setTimeout(() => router.replace("/"), 2000);
    });

    socket.on("user_joined", (data) => {
      setUsers(data.members ?? ((prev: string[]) => [...prev, data.nickname]));
      addMsg("system", `👋 ${data.nickname}님이 입장했어요`);
    });

    socket.on("user_left", (data) => {
      setUsers(data.members ?? ((prev: string[]) => prev.filter((n: string) => n !== data.nickname)));
      addMsg("system", `🚶 ${data.nickname}님이 퇴장했어요`);
    });

    socket.on("chat_message", (data) => {
      addMsg("chat", data.message, data.nickname, toKSTTime(data.time));
    });

    socket.on("game_started", () => {
      setGameStarted(true);
      addMsg("system", "🎮 게임이 시작되었습니다!");
    });

    socket.on("game_info", (data: GameInfo) => {
      setGameInfo(data);
    });

    socket.on("game_ended", (data: RevealData) => {
      setRevealData(data);
      addMsg("system", `🏁 게임 종료 — 라이어: ${data.liarNickname}`);
    });

    socket.on("game_error", (data) => {
      addMsg("system", `⚠️ ${data.message}`);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      addMsg("system", "서버 연결이 끊어졌어요");
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, router]);

  // 채팅 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socketRef.current || !connected) return;
    socketRef.current.emit("chat", { message: input.trim() });
    setInput("");
  }

  function handleGameStart() {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("game_start");
  }

  function handleGameEnd() {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("game_end");
  }

  function handleCopy() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRestart() {
    setRevealData(null);
    setGameStarted(false);
    setGameInfo(null);
  }

  async function handleQuit() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    const auth = stored ? JSON.parse(stored).Authorization : "";
    try {
      await fetch(`http://localhost:3000/room/quit?roomId=${roomId}`, {
        method: "DELETE",
        headers: { Authorization: auth },
      });
    } catch {
      // 실패해도 나가기
    }
    socketRef.current?.disconnect();
    router.push("/");
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-pink-50 to-amber-100 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute bottom-[-10%] right-[-5%] w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      {/* 라이어 공개 오버레이 */}
      {revealData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="animate-reveal-card bg-white rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-1 animate-bounce select-none">🕵️</div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-5">
              라이어 공개
            </p>
            <div className="animate-reveal-name">
              <p className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 mb-4 leading-tight">
                {revealData.liarNickname}
              </p>
              <div className="bg-gray-50 rounded-2xl px-5 py-3 text-sm text-gray-500 space-y-1">
                <p>카테고리 <span className="font-bold text-gray-800">{revealData.category}</span></p>
                <p>정답 <span className="font-bold text-gray-800">{revealData.answer}</span></p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleRestart}
                className="w-full py-3 bg-violet-600 text-white font-bold rounded-2xl shadow hover:bg-violet-700 hover:scale-[1.02] transition-all active:scale-95"
              >
                🎮 다시 시작
              </button>
              <button
                onClick={() => setRevealData(null)}
                className="w-full py-3 bg-white text-gray-400 font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 hover:scale-[1.02] transition-all active:scale-95 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto px-4 py-4 sm:py-6">

        {/* 헤더 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-3 mb-3 shadow border border-white/80 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-gray-800">🎭 라이어 게임</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px] text-gray-400 font-mono truncate max-w-[140px] sm:max-w-xs">
                {roomId}
              </p>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-200 active:scale-95
                  bg-purple-100 text-purple-500 hover:bg-purple-200"
              >
                {copied ? "✓ 복사됨" : "복사"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-400" : "bg-gray-300"
              }`}
            />
            <span className="text-sm font-semibold text-gray-600">{session.nickname}</span>
            <button
              onClick={handleQuit}
              className="ml-1 px-2.5 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 hover:scale-[1.02] transition-all active:scale-95"
            >
              나가기
            </button>
          </div>
        </div>

        {/* 참여자 리스트 */}
        {users.length > 0 && (
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-2.5 mb-3 shadow border border-white/80 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex-shrink-0">
                참여자 {users.length}{maxPlayers > 0 ? `/${maxPlayers}` : ""}명
              </span>
              {users.map((name) => (
                <span
                  key={name}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    name === session.nickname
                      ? "bg-violet-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200 shadow-sm"
                  }`}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 역할 박스 */}
        {gameInfo && (
          <div
            className={`rounded-2xl px-5 py-3 mb-3 text-center shadow border flex-shrink-0 ${
              gameInfo.role === "liar"
                ? "bg-rose-50 border-rose-200"
                : "bg-emerald-50 border-emerald-200"
            }`}
          >
            {gameInfo.role === "liar" ? (
              <p className="font-black text-rose-600 text-sm sm:text-base">
                🕵️ 당신은 라이어 &nbsp;·&nbsp; 카테고리:{" "}
                <span className="underline">{gameInfo.category}</span>
              </p>
            ) : (
              <p className="font-black text-emerald-600 text-sm sm:text-base">
                😊 당신은 시민 &nbsp;·&nbsp; 정답:{" "}
                <span className="underline">{gameInfo.answer}</span>
              </p>
            )}
          </div>
        )}

        {/* 채팅 */}
        <div
          ref={chatRef}
          className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-3 overflow-y-auto shadow border border-white/80 min-h-0"
        >
          {messages.length === 0 && (
            <p className="text-gray-300 text-sm text-center mt-8">
              연결을 기다리는 중...
            </p>
          )}
          {messages.map((msg, i) =>
            msg.type === "system" ? (
              <p key={i} className="text-gray-400 text-xs text-center py-1.5">
                {msg.text}
              </p>
            ) : (
              <div
                key={i}
                className={`mb-2 flex flex-col ${
                  msg.nickname === session.nickname ? "items-end" : "items-start"
                }`}
              >
                {msg.nickname !== session.nickname && (
                  <span className="text-xs font-semibold text-purple-500 mb-0.5 px-1">
                    {msg.nickname}
                  </span>
                )}
                <div
                  className={`flex items-end gap-1 ${
                    msg.nickname === session.nickname ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <span
                    className={`inline-block px-3 py-2 rounded-2xl text-sm font-medium max-w-[78%] break-words ${
                      msg.nickname === session.nickname
                        ? "bg-violet-600 text-white rounded-tr-sm"
                        : "bg-white text-gray-700 shadow-sm rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </span>
                  {msg.time && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{msg.time}</span>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* 입력 + 버튼 */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지 입력..."
              disabled={!connected}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-purple-100 focus:border-purple-400 focus:outline-none text-gray-700 bg-white/80 placeholder-gray-300 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !connected}
              className="px-5 py-3 bg-violet-600 text-white font-bold rounded-xl shadow hover:bg-violet-700 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              전송
            </button>
          </form>

          <div className="flex gap-2">
            <button
              onClick={handleGameStart}
              disabled={!connected || gameStarted}
              className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl shadow hover:bg-orange-600 hover:scale-[1.02] hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {gameStarted ? "🎮 게임 진행 중" : "🎮 게임 시작"}
            </button>
            {gameStarted && (
              <button
                onClick={handleGameEnd}
                disabled={!connected}
                className="flex-1 py-3 bg-slate-600 text-white font-bold rounded-xl shadow hover:bg-slate-700 hover:scale-[1.02] hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                🏁 게임 종료
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
