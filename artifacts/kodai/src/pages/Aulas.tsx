import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase, type Lesson, type Enrollment, type LessonProgress } from "@/lib/supabase";

export default function Aulas() {
  const [, navigate] = useLocation();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Re-upload proof for rejected students
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadLoading, setReuploadLoading] = useState(false);
  const [reuploadDone, setReuploadDone] = useState(false);
  const [reuploadError, setReuploadError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    load();
  }, [user, profile, authLoading]);

  const load = useCallback(async () => {
    if (!user) return;
    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setEnrollment(enr as Enrollment | null);

      if (enr?.status !== "approved") {
        setLoading(false);
        return;
      }
    }

    const [{ data: ls }, { data: prog }] = await Promise.all([
      supabase.from("lessons").select("*").order("order_index", { ascending: true }),
      supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", user.id),
    ]);

    const lessonList = (ls as Lesson[]) ?? [];
    const progressMap: Record<string, boolean> = {};
    ((prog ?? []) as LessonProgress[]).forEach(p => {
      progressMap[p.lesson_id] = p.completed;
    });

    setLessons(lessonList);
    setProgress(progressMap);
    if (lessonList.length > 0) setSelectedLesson(lessonList[0]);
    setLoading(false);
  }, [user, profile]);

  async function toggleComplete(lessonId: string) {
    if (!user || togglingId) return;
    setTogglingId(lessonId);
    const next = !(progress[lessonId] ?? false);

    if (next) {
      await supabase.from("lesson_progress").upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        watched_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
    } else {
      await supabase.from("lesson_progress")
        .update({ completed: false })
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
    }
    setProgress(prev => ({ ...prev, [lessonId]: next }));
    setTogglingId(null);
  }

  async function handleReupload(e: React.FormEvent) {
    e.preventDefault();
    if (!reuploadFile || !enrollment) return;
    setReuploadError("");
    setReuploadLoading(true);

    const ext = reuploadFile.name.split(".").pop();
    const filePath = `${enrollment.id}_retry_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(filePath, reuploadFile, { upsert: true });

    if (uploadError) {
      setReuploadError("Erro ao enviar. Tente novamente.");
      setReuploadLoading(false);
      return;
    }

    await supabase.from("enrollments")
      .update({ payment_proof_url: filePath, status: "pending" })
      .eq("id", enrollment.id);

    setEnrollment(prev => prev ? { ...prev, status: "pending", payment_proof_url: filePath } : prev);
    setReuploadDone(true);
    setReuploadLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const isAdmin = profile?.role === "admin";
  const completedCount = Object.values(progress).filter(Boolean).length;

  function selectLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setSidebarOpen(false);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">A carregar...</p>
        </div>
      </div>
    );
  }

  // ── STATUS: PENDING ─────────────────────────────────────────────
  if (enrollment?.status === "pending") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Aguardando aprovação</h1>
        <p className="text-gray-500 text-sm text-center max-w-xs mb-2">
          O seu pagamento está a ser verificado. Assim que for aprovado terá acesso imediato às aulas.
        </p>
        <p className="text-gray-400 text-xs mb-8 text-center max-w-xs">
          Prazo: até 24 horas. Guarde o seu email e senha para entrar quando aprovado.
        </p>
        <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">Sair</button>
      </div>
    );
  }

  // ── STATUS: REJECTED ─────────────────────────────────────────────
  if (enrollment?.status === "rejected") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Comprovante rejeitado</h1>
                <p className="text-gray-500 text-sm text-center max-w-xs mb-3">
            O seu comprovante foi rejeitado. Envie um novo comprovante de pagamento válido.
          </p>
          {enrollment.rejection_reason && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 max-w-xs text-left">
              <p className="text-red-700 text-xs font-semibold mb-0.5">Motivo indicado pelo admin:</p>
              <p className="text-red-600 text-xs">{enrollment.rejection_reason}</p>
            </div>
          )}

        {reuploadDone ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-center max-w-xs">
            <p className="text-green-700 font-semibold text-sm">✅ Novo comprovante enviado!</p>
            <p className="text-green-600 text-xs mt-1">Aguarde a aprovação do administrador.</p>
          </div>
        ) : (
          <form onSubmit={handleReupload} className="w-full max-w-xs space-y-3">
            <div
              className={`w-full border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition
                ${reuploadFile ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-400"}`}
              onClick={() => document.getElementById("reupload-input")?.click()}
            >
              {reuploadFile ? (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-700 text-xs font-medium">{reuploadFile.name}</p>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Clique para escolher o ficheiro
                  <p className="text-xs mt-0.5">JPG, PNG ou PDF</p>
                </div>
              )}
              <input id="reupload-input" type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => setReuploadFile(e.target.files?.[0] ?? null)} />
            </div>

            {reuploadError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{reuploadError}</p>}

            <button type="submit" disabled={!reuploadFile || reuploadLoading}
              className="w-full py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition disabled:opacity-60">
              {reuploadLoading ? "A enviar..." : "Reenviar comprovante"}
            </button>
          </form>
        )}

        <button onClick={handleSignOut} className="mt-6 text-sm text-gray-400 hover:text-gray-600">Sair</button>
      </div>
    );
  }

  // ── NO ENROLLMENT (not admin) ────────────────────────────────────
  if (!enrollment && !isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <span className="text-3xl">📱</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Ainda não tens acesso</h1>
        <p className="text-gray-500 text-sm text-center max-w-xs mb-6">
          Adquire o curso KODAI para começares a aprender a programar com o teu telemóvel.
        </p>
        <button onClick={() => navigate("/comprar")}
          className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition">
          Comprar curso
        </button>
      </div>
    );
  }

  // ── MAIN LESSONS AREA ───────────────────────────────────────────
  const currentIndex = lessons.findIndex(l => l.id === selectedLesson?.id);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Menu de aulas"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="bg-gray-950 rounded-xl overflow-hidden h-8 w-20 flex items-center justify-center">
            <img src="/kodai-logo-original.png" alt="KODAI" className="w-full h-auto object-cover object-center scale-150" />
          </div>

          {lessons.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-green-50 rounded-lg px-3 py-1.5">
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0}%` }}
                />
              </div>
              <span className="text-xs text-green-700 font-medium whitespace-nowrap">{completedCount}/{lessons.length} concluídas</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button onClick={() => navigate("/admin")}
              className="text-sm text-green-700 font-medium hover:underline hidden sm:block">
              Admin
            </button>
          )}
          <button onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-800 transition">
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-10 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed sm:static top-0 left-0 h-full z-20 sm:z-auto
          w-72 bg-white border-r border-gray-100 overflow-y-auto flex-shrink-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full sm:translate-x-0"}
          sm:block sm:h-[calc(100vh-57px)]
        `} style={{ paddingTop: sidebarOpen ? "57px" : undefined }}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">📱 Programação com Celular</h2>
            <p className="text-xs text-gray-400 mt-0.5">{lessons.length} aula{lessons.length !== 1 ? "s" : ""}</p>
            {lessons.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((completedCount / lessons.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{Math.round((completedCount / lessons.length) * 100)}%</span>
              </div>
            )}
          </div>

          {lessons.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              Nenhuma aula disponível ainda.<br />
              <span className="text-xs">Em breve novos conteúdos!</span>
            </div>
          ) : (
            <ul className="py-2">
              {lessons.map((lesson, idx) => (
                <li key={lesson.id}>
                  <button
                    onClick={() => selectLesson(lesson)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition
                      ${selectedLesson?.id === lesson.id ? "bg-green-50 border-r-2 border-green-700" : ""}`}
                  >
                    <span className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                      ${progress[lesson.id] ? "bg-green-600 text-white" : selectedLesson?.id === lesson.id ? "bg-green-700 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {progress[lesson.id] ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug
                        ${progress[lesson.id] ? "text-green-700" : selectedLesson?.id === lesson.id ? "text-green-800" : "text-gray-800"}`}>
                        {lesson.title}
                      </p>
                      {lesson.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{lesson.description}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {selectedLesson ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug flex-1">
                  {selectedLesson.title}
                </h1>
                {!isAdmin && (
                  <button
                    onClick={() => toggleComplete(selectedLesson.id)}
                    disabled={!!togglingId}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border
                      ${progress[selectedLesson.id]
                        ? "bg-green-700 text-white border-green-700 hover:bg-green-800"
                        : "bg-white text-gray-600 border-gray-200 hover:border-green-500 hover:text-green-700"
                      } disabled:opacity-50`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={progress[selectedLesson.id] ? 2.5 : 2}
                        d={progress[selectedLesson.id] ? "M5 13l4 4L19 7" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                    </svg>
                    {progress[selectedLesson.id] ? "Concluída" : "Marcar concluída"}
                  </button>
                )}
              </div>

              {/* Video */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video mb-5 flex items-center justify-center">
                {selectedLesson.video_url ? (
                  (() => {
                    const url = selectedLesson.video_url;
                    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
                    if (ytMatch) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      );
                    }
                    return <video src={url} controls className="w-full h-full" />;
                  })()
                ) : (
                  <div className="flex flex-col items-center text-white/50">
                    <span className="text-5xl mb-3">📱</span>
                    <p className="text-sm">Vídeo em breve</p>
                  </div>
                )}
              </div>

              {selectedLesson.description && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2">Sobre esta aula</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedLesson.description}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                {currentIndex > 0 && (
                  <button
                    onClick={() => selectLesson(lessons[currentIndex - 1])}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-green-400 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </button>
                )}
                {currentIndex < lessons.length - 1 && (
                  <button
                    onClick={() => selectLesson(lessons[currentIndex + 1])}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-medium hover:bg-green-800 transition ml-auto">
                    Próxima aula
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 pt-20">
              <span className="text-5xl mb-3">📱</span>
              <p className="text-sm">Selecione uma aula para começar.</p>
              <button
                className="mt-4 sm:hidden px-4 py-2 bg-green-700 text-white text-sm rounded-xl"
                onClick={() => setSidebarOpen(true)}
              >
                Ver aulas
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
