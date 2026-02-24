"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserSession {
  nickname: string;
  Authorization: string;
}

const SESSION_KEY = "liar-game-user";

export default function JoinRoom() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      router.replace("/");
      return;
    }
    setSession(JSON.parse(stored));
  }, [router]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId.trim() || !session) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3000/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomId.trim(),
          jwtToken: session.Authorization,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "방 참가에 실패했어요.");
      }
      router.push(`/room/${roomId.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했어요.");
      setLoading(false);
    }
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-pink-50 to-amber-100 relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute top-[-5%] right-[-5%] w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-10%] left-[30%] w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/80">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4 animate-float inline-block">🚪</div>
            <h1 className="text-2xl font-black text-gray-800">방 참가하기</h1>
            <p className="text-sm text-gray-500 mt-2">참가할 방 ID를 입력하세요</p>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="방 ID 입력"
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-100 focus:border-purple-400 focus:outline-none text-gray-700 font-medium bg-white placeholder-gray-300 text-center transition-colors"
            />
            {error && (
              <p className="text-rose-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !roomId.trim()}
              className="w-full py-4 bg-violet-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:bg-violet-700 hover:shadow-xl hover:scale-[1.03] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "참가 중..." : "방 입장하기 🚀"}
            </button>
          </form>

          <Link
            href="/"
            className="block text-center text-gray-400 text-sm mt-5 hover:text-gray-600 transition-colors"
          >
            ← 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
