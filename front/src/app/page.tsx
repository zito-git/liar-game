"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface UserSession {
  nickname: string;
  Authorization: string;
}

const SESSION_KEY = "liar-game-user";

const rules = [
  {
    icon: "👥",
    title: "모이기",
    desc: "친구들과 방을 만들고 입장해요",
  },
  {
    icon: "🃏",
    title: "카드 받기",
    desc: "한 명만 라이어! 나머지는 같은 키워드를 받아요",
  },
  {
    icon: "🔍",
    title: "찾아내기",
    desc: "대화를 통해 라이어를 찾아내세요",
  },
];

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      setSession(JSON.parse(stored));
    }
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:3000/room/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });

      if (!res.ok) throw new Error("닉네임 생성에 실패했어요.");

      const data: UserSession = await res.json();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-pink-50 to-amber-100 relative overflow-hidden">
      {/* 배경 블롭 */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 sm:w-96 sm:h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute top-[-5%] right-[-5%] w-72 h-72 sm:w-80 sm:h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-10%] left-[30%] w-80 h-80 sm:w-96 sm:h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">

        {/* 히어로 섹션 */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="animate-float inline-block mb-4 sm:mb-6">
            <span className="text-5xl sm:text-6xl md:text-7xl select-none">🎭</span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600">
              라이어
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500">
              {" "}게임
            </span>
          </h1>
          <p className="mt-4 text-gray-500 text-base sm:text-lg md:text-xl max-w-xs sm:max-w-md mx-auto leading-relaxed">
            친구들과 함께 즐기는 라이어 찾기 게임 🕵️
          </p>
        </div>

        {/* 닉네임 폼 or 방 버튼 */}
        <div className="w-full max-w-xs sm:max-w-sm">
          {!mounted ? null : session ? (
            /* 세션 있음 → 방 버튼 */
            <div className="flex flex-col gap-4">
              <p className="text-center text-purple-600 font-semibold text-sm sm:text-base mb-1">
                👋 안녕하세요,{" "}
                <span className="font-black">{session.nickname}</span>님!
              </p>
              <Link
                href="/room/create"
                className="w-full py-4 px-8 bg-violet-600 text-white text-lg sm:text-xl font-bold rounded-2xl shadow-lg hover:bg-violet-700 hover:shadow-xl hover:scale-[1.03] transition-all duration-200 active:scale-95 text-center"
              >
                방 만들기
              </Link>
              <Link
                href="/room/join"
                className="w-full py-4 px-8 bg-white/80 backdrop-blur-sm text-violet-700 text-lg sm:text-xl font-bold rounded-2xl shadow-lg border border-violet-200 hover:bg-white hover:scale-[1.03] hover:shadow-xl transition-all duration-200 active:scale-95 text-center"
              >
                방 참가하기
              </Link>
            </div>
          ) : (
            /* 세션 없음 → 닉네임 입력 */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/80">
                <p className="text-gray-600 font-semibold text-sm mb-3 text-center">
                  게임을 시작하려면 닉네임을 입력하세요
                </p>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임 입력"
                  maxLength={12}
                  className="w-full px-4 py-3 rounded-xl border-2 border-purple-100 focus:border-purple-400 focus:outline-none text-gray-700 font-medium bg-white placeholder-gray-300 text-center text-lg transition-colors"
                />
                {error && (
                  <p className="text-rose-500 text-xs text-center mt-2">{error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !nickname.trim()}
                className="w-full py-4 px-8 bg-violet-600 text-white text-lg sm:text-xl font-bold rounded-2xl shadow-lg hover:bg-violet-700 hover:shadow-xl hover:scale-[1.03] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? "생성 중..." : "시작하기 🎮"}
              </button>
            </form>
          )}
        </div>

        {/* 게임 방법 카드 */}
        <div className="mt-12 sm:mt-16 w-full max-w-xs sm:max-w-xl lg:max-w-3xl">
          <p className="text-center text-gray-400 text-xs font-semibold uppercase tracking-widest mb-5">
            게임 방법
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {rules.map((rule) => (
              <div
                key={rule.title}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 text-center shadow-sm border border-white/80 hover:bg-white/80 hover:scale-[1.02] transition-all duration-200"
              >
                <div className="text-3xl mb-3 select-none">{rule.icon}</div>
                <h3 className="font-bold text-gray-700 mb-1 text-sm sm:text-base">
                  {rule.title}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
