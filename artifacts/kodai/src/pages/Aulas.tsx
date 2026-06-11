import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { supabase, type Lesson, type Enrollment } from "@/lib/supabase";

export default function Aulas() {
  const [, navigate] = useLocation();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    async function load() {
      const isAdmin = profile?.role === "admin";

      // Check enrollment status (admins bypass this)
      if (!isAdmin) {
        const { data: enr } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        setEnrollment(enr as Enrollment | null);

        if (enr?.status !== "approved") {
          setLoading(false);
          return;
        }
      }

      // Load lessons (admin always loads, approved students load)
      const { data: ls } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index", { ascending: true });
      const lessonList = (ls as Lesson[]) ?? [];
      setLessons(lessonList);
      if (lessonList.length > 0) setSelectedLesson(lessonList[0]);
      setLoading(false);
    }

    load();
  }, [user, profile, authLoading]);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

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

  // Pending approval
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
        <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">
          Sair
        </button>
      </div>
    );
  }

  // Rejected
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

  // No enrollment (and not admin)
  if (!enrollment && profile?.role !== "admin") {
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
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-gray-950 rounded-xl overflow-hidden h-9 w-24 flex items-center justify-center">
            <img src="/kodai-logo-original.png" alt="KODAI" className="w-full h-auto object-cover object-center scale-150" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {profile?.role === "admin" && (
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
        {/* Sidebar — lesson list */}
        <aside className="w-72 bg-white border-r border-gray-100 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">📱 Programação com Celular</h2>
            <p className="text-xs text-gray-400 mt-0.5">{lessons.length} aula{lessons.length !== 1 ? "s" : ""}</p>
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
                      ${selectedLesson?.id === lesson.id ? "bg-green-700 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${selectedLesson?.id === lesson.id ? "text-green-800" : "text-gray-800"}`}>
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
        <main className="flex-1 overflow-y-auto p-6">
          {selectedLesson ? (
            <div className="max-w-3xl">
              <h1 className="text-xl font-bold text-gray-900 mb-4">{selectedLesson.title}</h1>
              {/* Video */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video mb-5 flex items-center justify-center">
                {selectedLesson.video_url ? (
                  (() => {
                    const url = selectedLesson.video_url;
                    if (url.includes("youtube.com") || url.includes("youtu.be")) {
                      const videoId = url.includes("youtu.be")
                        ? url.split("youtu.be/")[1]?.split("?")[0]
                        : url.split("v=")[1]?.split("&")[0];
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
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
