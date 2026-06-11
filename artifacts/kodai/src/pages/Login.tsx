import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [, navigate] = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError, user } = await signIn(email, password);
    if (signInError || !user) {
      const msg = (signInError?.message ?? "").toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setError("Confirme o seu email antes de entrar. Verifique a caixa de entrada (e o spam).");
      } else {
        setError("Email ou senha incorretos. Tente novamente.");
      }
      setLoading(false);
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (prof?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/aulas");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div
        className="flex flex-col items-center mb-8 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <div className="bg-gray-950 rounded-2xl overflow-hidden w-44 shadow-md">
          <img src="/kodai-logo-original.png" alt="KODAI" className="w-full h-auto object-contain" />
        </div>
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Entrar</h1>
        <p className="text-gray-500 text-sm mb-7">Aceda às suas aulas com as suas credenciais.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="o.seu@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span>Senha</span>
              <span
                className="float-right text-xs text-green-700 font-normal cursor-pointer hover:underline"
                onClick={() => navigate("/redefinir-senha")}
              >
                Esqueci a senha
              </span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Ainda não tem conta?{" "}
            <span
              className="text-green-700 font-semibold cursor-pointer hover:underline"
              onClick={() => navigate("/comprar")}
            >
              Comprar o curso
            </span>
          </p>
        </div>
        <div className="mt-3 text-center">
          <span
            className="text-gray-400 text-xs cursor-pointer hover:text-gray-600"
            onClick={() => navigate("/")}
          >
            ← Voltar ao início
          </span>
        </div>
      </div>
    </div>
  );
}
