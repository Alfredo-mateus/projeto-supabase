import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function NovaSenha() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError("Erro ao actualizar a senha. O link pode ter expirado.");
    } else {
      setSuccess(true);
      await supabase.auth.signOut();
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
        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Senha actualizada!</h2>
            <p className="text-gray-500 text-sm mb-8">Já pode entrar com a sua nova senha.</p>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition shadow-sm"
            >
              Ir para o login
            </button>
          </div>
        ) : !ready ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">A verificar o link de recuperação...</p>
            <p className="text-gray-300 text-xs mt-2">Se demorar muito, o link pode ter expirado.</p>
            <button
              onClick={() => navigate("/redefinir-senha")}
              className="mt-6 text-green-700 text-sm font-medium hover:underline"
            >
              Pedir novo link
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Nova senha</h1>
            <p className="text-gray-500 text-sm mb-7">Escolha uma nova senha para a sua conta.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
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
                {loading ? "A actualizar..." : "Actualizar senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
