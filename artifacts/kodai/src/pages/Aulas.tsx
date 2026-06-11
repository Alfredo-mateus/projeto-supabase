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
    const current = progress[lessonId] ?? false;
    const next = !current;

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

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const completedCount = Object.values(progress).filter(Boolean).length;
  const isAdmin = profile?.role === "admin";

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-green-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">A carregar...</p>
        </div>
      </div>
    );
  }

  if (enrollment?.status === "pending") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Aguardando aprovação</h1>
        <p className="text-gray-500 text-sm text-center max-w-xs mb-6">
          O seu pagamento está a ser verificado. Assim que for aprovado terá acesso imediato às aulas de programação.
        </p>
        <p className="text-gray-400 text-xs mb-6 text-center max-w-xs">
          Prazo de verificação: até 24 horas. Guarde o seu email e senha para entrar quando aprovado.
        </p>
        <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">Sair</button>
      </div>
    );
  }

  if (enrollment?.status === "rejected") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pagamento rejeitado</h1>
        <p className="text-gray-500 text-sm text-center max-w-xs mb-6">
          O seu comprovante foi rejeitado. Por favor contacte o administrador para mais informações.
        </p>
        <button onClick={() => navigate("/comprar")}
          className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition mb-3">
          Tentar novamente
        </button>
        <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">Sair</button>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gray-950 rounded-xl overflow-hidden h-9 w-24 flex items-center justify-center">
            <img src="/kodai-logo-original.png" alt="KODAI" className="w-full h-auto object-cover object-center scale-150" />
          </div>
          {lessons.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-green-50 rounded-lg px-3 py-1.5">
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((completedCount / lessons.length) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-green-700 font-medium">{completedCount}/{lessons.length} concluídas</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <button onClick={() => navigate("/admin")}
              className="text-sm text-green-700 font-medium hover:underline">
              Painel Admin
            </button>
          )}
          <button onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-800 transition">
            Sair
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-100 overflow-y-auto flex-shrink-0">
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
                    onClick={() => setSelectedLesson(lesson)}
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
                      <p className={`text-sm font-medium ${progress[lesson.id] ? "text-green-700" : selectedLesson?.id === lesson.id ? "text-green-800" : "text-gray-800"}`}>
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

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6">
          {selectedLesson ? (
            <div className="max-w-3xl">
              <div className="flex items-start justify-between mb-4 gap-4">
                <h1 className="text-xl font-bold text-gray-900 leading-snug">{selectedLesson.title}</h1>
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
                    {progress[selectedLesson.id] ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Concluída
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Marcar concluída
                      </>
                    )}
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
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2">Sobre esta aula</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedLesson.description}</p>
                </div>
              )}

              {/* Navigation between lessons */}
              <div className="flex gap-3 mt-5">
                {lessons.findIndex(l => l.id === selectedLesson.id) > 0 && (
                  <button
                    onClick={() => setSelectedLesson(lessons[lessons.findIndex(l => l.id === selectedLesson.id) - 1])}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-green-400 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </button>
                )}
                {lessons.findIndex(l => l.id === selectedLesson.id) < lessons.length - 1 && (
                  <button
                    onClick={() => setSelectedLesson(lessons[lessons.findIndex(l => l.id === selectedLesson.id) + 1])}
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
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-5xl mb-3">📱</span>
              <p className="text-sm">Selecione uma aula para começar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
