import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loadSiteSettings, type SiteSettings } from "@/lib/supabase";

function youtubeEmbedId(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return yt ? yt[1] : null;
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
    loadSiteSettings().then(setSettings);
  }, []);

  const videoId = youtubeEmbedId(settings.landing_video_url ?? "");
  const price = settings.course_price ? parseInt(settings.course_price).toLocaleString("pt-PT") : null;
  const currency = settings.currency ?? "AOA";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start py-10 px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-gray-950 rounded-2xl shadow-lg overflow-hidden w-80">
          <img
            src="/kodai-logo-original.png"
            alt="KODAI — Programe pelo Celular"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      {/* Video Player */}
      <div className="w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-xl mb-8 aspect-video flex items-center justify-center relative">
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
              <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm mb-4">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-white/70 text-sm">Vídeo de apresentação</p>
              <p className="text-white/40 text-xs mt-1">(configurar no painel admin)</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-gray-900/80 pointer-events-none" />
          </>
        )}
      </div>

      {/* Headline */}
      <div className="text-center mb-8 max-w-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
          Aprende a programar usando apenas o teu <span className="text-green-700">telemóvel</span>
        </h1>
        <p className="text-gray-500 text-base">
          Com o KODAI aprendes programação do zero, no teu ritmo, sem precisar de computador — só com o celular na mão.
        </p>
        {price && (
          <div className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-2">
            <span className="text-green-800 font-bold text-xl">{price} {currency}</span>
            <span className="text-green-600 text-sm">acesso vitalício</span>
          </div>
        )}
      </div>

      {/* Feature highlights */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-lg">
        {[
          { icon: "📱", text: "100% no celular" },
          { icon: "🚀", text: "Do zero ao avançado" },
          { icon: "🎯", text: "Aulas práticas" },
        ].map(f => (
          <div key={f.text} className="flex-1 flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3">
            <span className="text-xl">{f.icon}</span>
            <span className="text-green-800 text-sm font-medium">{f.text}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <button
          onClick={() => navigate("/login")}
          className="flex-1 px-8 py-4 border-2 border-green-700 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-all duration-200 text-base"
        >
          Fazer Login
        </button>
        <button
          onClick={() => navigate("/comprar")}
          className="flex-1 px-8 py-4 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 active:bg-green-900 transition-all duration-200 shadow-md shadow-green-200 text-base"
        >
          Comprar Curso
        </button>
      </div>

      <p className="mt-12 text-xs text-gray-400">&copy; {new Date().getFullYear()} KODAI. Todos os direitos reservados.</p>
    </div>
  );
}
