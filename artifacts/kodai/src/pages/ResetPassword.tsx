import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}nova-senha`.replace(/([^:])\/\//g, "$1/");

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (err) {
      setError("Erro ao enviar o email. Verifique o endereço e tente novamente.");
    } else {
      setSent(true);
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
        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Redefinir senha</h1>
            <p className="text-gray-500 text-sm mb-7">
              Introduza o seu email e enviaremos um link para redefinir a senha.
            </p>

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

              {error && (
                <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "A enviar..." : "Enviar link de recuperação"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email enviado!</h2>
            <p className="text-gray-500 text-sm mb-1">
              Enviámos um link de recuperação para:
            </p>
            <p className="text-green-700 font-semibold text-sm mb-6">{email}</p>
            <p className="text-gray-400 text-xs mb-8">
              Verifique também a pasta de spam. O link expira em 1 hora.
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <span
            className="text-gray-400 text-xs cursor-pointer hover:text-gray-600"
            onClick={() => navigate("/login")}
          >
            ← Voltar ao login
          </span>
        </div>
      </div>
    </div>
  );
}
