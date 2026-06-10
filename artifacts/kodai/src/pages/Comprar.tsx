import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

type Step = "dados" | "pagamento" | "sucesso";

export default function Comprar() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("dados");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — personal data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — payment proof
  const [file, setFile] = useState<File | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  async function handleDados(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError) {
      setError(authError.message === "User already registered"
        ? "Este email já está registado. Tente fazer login."
        : authError.message);
      setLoading(false);
      return;
    }

    // Create enrollment
    const { data: enrollment, error: enrollErr } = await supabase
      .from("enrollments")
      .insert({
        user_id: authData.user?.id ?? null,
        full_name: fullName,
        phone,
        email,
        status: "pending",
      })
      .select()
      .single();

    if (enrollErr) {
      setError("Erro ao registar. Tente novamente.");
      setLoading(false);
      return;
    }

    setEnrollmentId(enrollment.id);
    setStep("pagamento");
    setLoading(false);
  }

  async function handlePagamento(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !enrollmentId) return;
    setError("");
    setLoading(true);

    const ext = file.name.split(".").pop();
    const path = `${enrollmentId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Erro ao enviar comprovante. Tente novamente.");
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(path);

    await supabase
      .from("enrollments")
      .update({ payment_proof_url: urlData.publicUrl })
      .eq("id", enrollmentId);

    setStep("sucesso");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center shadow mb-2">
          <span className="text-white font-black text-base tracking-widest">KODAI</span>
        </div>
      </div>

      {/* Step indicator */}
      {step !== "sucesso" && (
        <div className="flex items-center gap-2 mb-8">
          {(["dados", "pagamento"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${step === s ? "bg-green-700 text-white" : i < ["dados","pagamento"].indexOf(step) ? "bg-green-200 text-green-800" : "bg-gray-100 text-gray-400"}`}>
                {i + 1}
              </div>
              {i < 1 && <div className="w-10 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-sm">
        {/* STEP 1 — Personal data */}
        {step === "dados" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Os seus dados</h1>
            <p className="text-gray-500 text-sm mb-7">Preencha os seus dados para criar a conta.</p>
            <form onSubmit={handleDados} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Ex: João Manuel Silva"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de telefone</label>
                <input required value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: +244 9XX XXX XXX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="o.seu@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Criar senha</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition" />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all shadow-sm disabled:opacity-60">
                {loading ? "A processar..." : "Continuar"}
              </button>
            </form>
            <p className="mt-4 text-center text-gray-500 text-sm">
              Já tem conta?{" "}
              <span className="text-green-700 font-semibold cursor-pointer hover:underline" onClick={() => navigate("/login")}>
                Fazer login
              </span>
            </p>
          </>
        )}

        {/* STEP 2 — Payment proof */}
        {step === "pagamento" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Comprovante de pagamento</h1>
            <p className="text-gray-500 text-sm mb-2">Realize o pagamento e envie o comprovante aqui.</p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-800 text-sm font-medium mb-1">Dados para pagamento</p>
              <p className="text-green-700 text-sm">Contacte o administrador para obter os dados bancários.</p>
            </div>

            <form onSubmit={handlePagamento} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprovante (imagem ou PDF)
                </label>
                <div
                  className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
                    ${file ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-400 hover:bg-green-50/50"}`}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-green-700 font-medium text-sm">{file.name}</p>
                      <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="text-sm">Clique para selecionar o ficheiro</p>
                      <p className="text-xs">JPG, PNG ou PDF</p>
                    </div>
                  )}
                  <input id="file-input" type="file" accept="image/*,.pdf" className="hidden"
                    onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={!file || loading}
                className="w-full py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? "A enviar..." : "Enviar comprovante"}
              </button>
            </form>
          </>
        )}

        {/* STEP 3 — Success */}
        {step === "sucesso" && (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Comprovante enviado!</h1>
            <p className="text-gray-500 text-sm mb-2">
              O seu pedido foi recebido com sucesso. O administrador irá verificar o pagamento e libertar o acesso às aulas.
            </p>
            <p className="text-gray-400 text-xs mb-8">Será notificado por email quando o acesso for aprovado.</p>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all shadow-sm"
            >
              Ir para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
