import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase, type Enrollment, type Lesson, loadSiteSettings, type SiteSettings } from "@/lib/supabase";

type Tab = "enrollments" | "lessons" | "settings";
type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("enrollments");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonSaving, setLessonSaving] = useState(false);

  // Rejection modal
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectSaving, setRejectSaving] = useState(false);

    // Lesson edit
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Settings form
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const settingsForm = useRef<SiteSettings>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (profile && profile.role !== "admin") { navigate("/aulas"); return; }
    if (profile?.role === "admin") loadData();
  }, [user, profile, authLoading]);

  async function loadData() {
    setLoading(true);
    const [{ data: enrs }, { data: ls }, s] = await Promise.all([
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("lessons").select("*").order("order_index", { ascending: true }),
      loadSiteSettings(),
    ]);
    setEnrollments((enrs as Enrollment[]) ?? []);
    setLessons((ls as Lesson[]) ?? []);
    setSettings(s);
    settingsForm.current = { ...s };
    setLoading(false);
  }

  async function updateEnrollment(id: string, status: "approved" | "rejected" | "pending") {
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
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(filePath, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
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

  function startEdit(lesson: Lesson) {
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditDesc(lesson.description ?? "");
    setEditUrl(lesson.video_url ?? "");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLesson) return;
    setEditSaving(true);
    const { data } = await supabase.from("lessons").update({
      title: editTitle,
      description: editDesc || null,
      video_url: editUrl || null,
    }).eq("id", editingLesson.id).select().single();
    if (data) setLessons(prev => prev.map(l => l.id === editingLesson.id ? data as Lesson : l));
    setEditingLesson(null);
    setEditSaving(false);
  }

  async function deleteLesson(id: string) {
    if (!confirm("Tens a certeza que queres eliminar esta aula?")) return;
    await supabase.from("lessons").delete().eq("id", id);
    setLessons(prev => prev.filter(l => l.id !== id));
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    const entries = Object.entries(settingsForm.current);
    await Promise.all(entries.map(([key, value]) =>
      supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() })
    ));
    setSettings({ ...settingsForm.current });
    setSettingsSaving(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  const filteredEnrollments = filterStatus === "all"
    ? enrollments
    : enrollments.filter(e => e.status === filterStatus);

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
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-gray-950 rounded-xl overflow-hidden h-9 w-24 flex items-center justify-center">
            <img src="/kodai-logo-original.png" alt="KODAI" className="w-full h-auto object-cover object-center scale-150" />
          </div>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/aulas")} className="text-sm text-green-700 hover:underline">Ver Aulas</button>
          <button onClick={async () => { await signOut(); navigate("/"); }} className="text-sm text-gray-500 hover:text-gray-800">Sair</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel de Administração</h1>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total inscritos", value: enrollments.length, color: "text-gray-900" },
            { label: "Pendentes", value: enrollments.filter(e => e.status === "pending").length, color: "text-yellow-600" },
            { label: "Aprovados", value: enrollments.filter(e => e.status === "approved").length, color: "text-green-700" },
            { label: "Aulas", value: lessons.length, color: "text-blue-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
          {([
            { key: "enrollments", label: "Inscrições" },
            { key: "lessons", label: "Aulas" },
            { key: "settings", label: "Configurações" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== INSCRIÇÕES TAB ===== */}
        {tab === "enrollments" && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {([
                { key: "all", label: "Todos", count: enrollments.length },
                { key: "pending", label: "Pendentes", count: enrollments.filter(e => e.status === "pending").length },
                { key: "approved", label: "Aprovados", count: enrollments.filter(e => e.status === "approved").length },
                { key: "rejected", label: "Rejeitados", count: enrollments.filter(e => e.status === "rejected").length },
              ] as { key: FilterStatus; label: string; count: number }[]).map(f => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                    ${filterStatus === f.key ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
                  {f.label}
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${filterStatus === f.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {f.count}
                  </span>
                </button>
              ))}
              <button onClick={loadData} className="ml-auto px-4 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:border-green-400 bg-white transition flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {filteredEnrollments.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">
                  {filterStatus === "all" ? "Nenhuma inscrição ainda." : `Nenhuma inscrição ${filterStatus === "pending" ? "pendente" : filterStatus === "approved" ? "aprovada" : "rejeitada"}.`}
                </div>
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
                      {filteredEnrollments.map((e, i) => (
                        <tr key={e.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{e.full_name}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{e.email}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{e.phone}</td>
                          <td className="px-4 py-3">{statusBadge(e.status)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.created_at).toLocaleDateString("pt-PT")}</td>
                          <td className="px-4 py-3">
                            {e.payment_proof_url ? (
                              <button onClick={() => viewProof(e.payment_proof_url!)}
                                className="text-green-700 text-xs font-medium hover:underline flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
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
                                <button onClick={() => { setRejectingId(e.id); setRejectionReason(""); }}
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
          </div>
        )}

        {/* ===== AULAS TAB ===== */}
        {tab === "lessons" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowLessonForm(true); setEditingLesson(null); }}
                className="px-5 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition shadow-sm">
                + Adicionar aula
              </button>
            </div>

            {/* Add form */}
            {showLessonForm && (
              <div className="bg-white border border-green-200 rounded-2xl p-6 shadow-sm mb-4">
                <h3 className="font-semibold text-gray-900 mb-4">Nova aula de programação</h3>
                <form onSubmit={addLesson} className="space-y-3">
                  <input required value={lessonTitle} onChange={e => setLessonTitle(e.target.value)}
                    placeholder="Título da aula (ex: Introdução ao JavaScript no celular)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition" />
                  <textarea value={lessonDesc} onChange={e => setLessonDesc(e.target.value)}
                    placeholder="Descrição (opcional)" rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition resize-none" />
                  <input value={lessonUrl} onChange={e => setLessonUrl(e.target.value)}
                    placeholder="URL do vídeo YouTube (ex: https://youtube.com/watch?v=...)"
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

            {/* Edit form */}
            {editingLesson && (
              <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm mb-4">
                <h3 className="font-semibold text-gray-900 mb-4">Editar aula</h3>
                <form onSubmit={saveEdit} className="space-y-3">
                  <input required value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    placeholder="Título da aula"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                    placeholder="Descrição (opcional)" rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" />
                  <input value={editUrl} onChange={e => setEditUrl(e.target.value)}
                    placeholder="URL do vídeo YouTube"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={editSaving}
                      className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-60">
                      {editSaving ? "A guardar..." : "Actualizar"}
                    </button>
                    <button type="button" onClick={() => setEditingLesson(null)}
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
                  <div key={l.id} className={`bg-white rounded-xl border px-5 py-4 flex items-center gap-4 shadow-sm transition
                    ${editingLesson?.id === l.id ? "border-blue-300" : "border-gray-100"}`}>
                    <span className="w-7 h-7 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{l.title}</p>
                      {l.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{l.description}</p>}
                      {l.video_url ? (
                        <p className="text-xs text-green-600 mt-0.5 truncate">🎬 {l.video_url}</p>
                      ) : (
                        <p className="text-xs text-gray-300 mt-0.5">Sem vídeo</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(l)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button onClick={() => deleteLesson(l.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-medium rounded-lg hover:bg-red-100 transition flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== CONFIGURAÇÕES TAB ===== */}
        {tab === "settings" && (
          <form onSubmit={saveSettings} className="space-y-6">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Vídeo da Página Inicial</h3>
              <p className="text-gray-400 text-xs mb-4">URL do YouTube que aparece na landing page como apresentação do curso.</p>
              <input
                defaultValue={settings.landing_video_url ?? ""}
                onChange={e => { settingsForm.current.landing_video_url = e.target.value; }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
              />
              {settings.landing_video_url && (
                <p className="text-green-600 text-xs mt-2">✅ Vídeo configurado: {settings.landing_video_url}</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Preço do Curso</h3>
              <p className="text-gray-400 text-xs mb-4">Preço mostrado na página inicial.</p>
              <div className="flex gap-3">
                <input
                  defaultValue={settings.course_price ?? "15000"}
                  onChange={e => { settingsForm.current.course_price = e.target.value; }}
                  placeholder="15000"
                  type="number"
                  min="0"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
                />
                <select
                  defaultValue={settings.currency ?? "AOA"}
                  onChange={e => { settingsForm.current.currency = e.target.value; }}
                  className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition bg-white"
                >
                  <option value="AOA">AOA (Kwanza)</option>
                  <option value="USD">USD (Dólar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Dados de Pagamento</h3>
              <p className="text-gray-400 text-xs mb-4">Informações bancárias mostradas aos alunos no passo de pagamento.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                  <input
                    defaultValue={settings.payment_bank ?? ""}
                    onChange={e => { settingsForm.current.payment_bank = e.target.value; }}
                    placeholder="Ex: BAI — Banco Angolano de Investimentos"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">IBAN / Número de Conta</label>
                  <input
                    defaultValue={settings.payment_iban ?? ""}
                    onChange={e => { settingsForm.current.payment_iban = e.target.value; }}
                    placeholder="Ex: AO06 0040 0000 0000 0000 0000 0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Beneficiário</label>
                  <input
                    defaultValue={settings.payment_name ?? ""}
                    onChange={e => { settingsForm.current.payment_name = e.target.value; }}
                    placeholder="Ex: João Silva"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Referência</label>
                  <input
                    defaultValue={settings.payment_reference ?? ""}
                    onChange={e => { settingsForm.current.payment_reference = e.target.value; }}
                    placeholder="Ex: KODAI-PROG"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" disabled={settingsSaving}
                className="px-8 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition shadow-sm disabled:opacity-60">
                {settingsSaving ? "A guardar..." : "Guardar configurações"}
              </button>
              {settingsSaved && (
                <span className="text-green-700 text-sm font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Configurações guardadas!
                </span>
              )}
            </div>
          </form>
        )}
      </div>

        {/* ── REJECTION MODAL ── */}
        {rejectingId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Rejeitar inscrição</h3>
              <p className="text-gray-500 text-sm mb-4">
                Indica o motivo da rejeição. O aluno receberá este motivo por email.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Ex: Comprovante ilegível, valor incorreto, transferência não identificada…"
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                  className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectSaving}
                  className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-60"
                >
                  {rejectSaving ? "A rejeitar…" : "Confirmar rejeição"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
