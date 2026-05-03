"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      return;
    }
    router.push("/");
  };

  const handleDemoLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: "viewer@rehab-demo.com",
      password: "rehab-demo.com",
    });
    if (error) {
      setError("デモログインに失敗しました");
      return;
    }
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-700 mb-6 text-center">ログイン</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4 text-sm text-gray-900 bg-white"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-6 text-sm text-gray-900 bg-white"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition mb-3"
        >
          ログイン
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-2">または</span>
          </div>
        </div>

        <button
          onClick={handleDemoLogin}
          className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
        >
          🔍 デモとして体験する（閲覧のみ）
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          編集・削除機能は制限されています
        </p>
      </div>
    </div>
  );
}