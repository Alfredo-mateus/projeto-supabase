import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase, type Enrollment, type Lesson } from "@/lib/supabase";

type Tab = "enrollments" | "lessons";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("enrollments");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // New lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonSaving, setLessonSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (profile && profile.role !== "admin") { navigate("/aulas"); return; }
    if (profile?.role === "admin") loadData();
  }, [user, profile, authLoading]);

  async function loadData() {
    setLoading(true);
    const [{ data: enrs }, { data: ls }] = await Promise.all([
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("lessons").select("*").order("order_index", { ascending: true }),
    ]);
    setEnrollments((enrs as Enrollment[]) ?? []);
    setLessons((ls as Lesson[]) ?? []);
    setLoading(false);
  }

  async function updateEnrollment(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("enrollments").update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      approved_by: user!.id,
    }).eq("id", id);
    if (!error) {
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    }
  }

  async function viewProof(filePath: string) {
    // Generate a signed URL valid for 60 seconds
    const { data } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(filePath, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    setLessonSaving(true);
    const maxOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order_index)) + 1 : 0;
    const { data } = await supabase.from("lessons").insert({
      title: lessonTitle,
      description: lessonDesc || null,
      video_url: lessonUrl || null,
      order_index: maxOrder,
    }).select().single();
    if (data) setLessons(prev => [...prev, data as Lesson]);
    setLessonTitle(""); setLessonDesc(""); setLessonUrl("");
    setShowLessonForm(false);
    setLessonSaving(false);
  }

  async function deleteLesson(id: string) {
    if (!confirm("Tens a certeza que queres eliminar esta aula?")) return;
    await supabase.from("lessons").delete().eq("id", id);
    setLessons(prev => prev.filter(l => l.id !== id));
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? ""}`}>{labels[status] ?? status}</span>;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center">
            <span className="text-white font-black text-xs">K</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">KODAI</span>
            <span className="ml-2 text-xs text-gray-400 font-medium uppercase tracking-wide">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/aulas")} className="text-sm text-green-700 hover:underline">Ver Aulas</button>
          <button onClick={async () => { await signOut(); navigate("/"); }} className="text-sm text-gray-500 hover:text-gray-800">Sair</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel de Administração</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total inscritos", value: enrollments.length, color: "text-gray-900" },
            { label: "Pendentes", value: enrollments.filter(e => e.status === "pending").length, color: "text-yellow-600" },
            { label: "Aprovados", value: enrollments.filter(e => e.status === "approved").length, color: "text-green-700" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
          {(["enrollments", "lessons"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
              {t === "enrollments" ? "Inscrições" : "Aulas"}
            </button>
          ))}
        </div>

        {/* Enrollments tab */}
        {tab === "enrollments" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {enrollments.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">Nenhuma inscrição ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Nome", "Email", "Telefone", "Estado", "Data", "Comprovante", "Ações"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e, i) => (
                      <tr key={e.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.full_name}</td>
                        <td className="px-4 py-3 text-gray-600">{e.email}</td>
                        <td className="px-4 py-3 text-gray-600">{e.phone}</td>
                        <td className="px-4 py-3">{statusBadge(e.status)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.created_at).toLocaleDateString("pt-PT")}</td>
                        <td className="px-4 py-3">
                          {e.payment_proof_url ? (
                            <button
                              onClick={() => viewProof(e.payment_proof_url!)}
                              className="text-green-700 text-xs font-medium hover:underline">
                              Ver
                            </button>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {e.status === "pending" && (
                            <div className="flex gap-2">
                              <button onClick={() => updateEnrollment(e.id, "approved")}
                                className="px-3 py-1 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-800 transition">
                                Aprovar
                              </button>
                              <button onClick={() => updateEnrollment(e.id, "rejected")}
                                className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition">
                                Rejeitar
                              </button>
                            </div>
                          )}
                          {e.status !== "pending" && (
                            <button onClick={() => updateEnrollment(e.id, "pending")}
                              className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-200 transition">
                              Repor
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Lessons tab */}
        {tab === "lessons" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowLessonForm(true)}
                className="px-5 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition shadow-sm">
                + Adicionar aula
              </button>
            </div>

            {showLessonForm && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-4">
                <h3 className="font-semibold text-gray-900 mb-4">Nova aula de programação</h3>
                <form onSubmit={addLesson} className="space-y-3">
                  <input required value={lessonTitle} onChange={e => setLessonTitle(e.target.value)}
                    placeholder="Título da aula (ex: Introdução ao JavaScript no celular)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition" />
                  <textarea value={lessonDesc} onChange={e => setLessonDesc(e.target.value)}
                    placeholder="Descrição (opcional)" rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition resize-none" />
                  <input value={lessonUrl} onChange={e => setLessonUrl(e.target.value)}
                    placeholder="URL do vídeo (YouTube: https://youtube.com/watch?v=... ou link direto)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition" />
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={lessonSaving}
                      className="px-6 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition disabled:opacity-60">
                      {lessonSaving ? "A guardar..." : "Guardar"}
                    </button>
                    <button type="button" onClick={() => setShowLessonForm(false)}
                      className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {lessons.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                <span className="text-4xl mb-3 block">📱</span>
                <p className="text-gray-400 text-sm">Nenhuma aula ainda. Adicione a primeira aula de programação!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lessons.map((l, i) => (
                  <div key={l.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4 shadow-sm">
                    <span className="w-7 h-7 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{l.title}</p>
                      {l.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{l.description}</p>}
                      {l.video_url && (
                        <a href={l.video_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-600 mt-0.5 truncate block hover:underline">
                          {l.video_url}
                        </a>
                      )}
                    </div>
                    <button onClick={() => deleteLesson(l.id)}
                      className="text-red-400 hover:text-red-600 transition flex-shrink-0 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
