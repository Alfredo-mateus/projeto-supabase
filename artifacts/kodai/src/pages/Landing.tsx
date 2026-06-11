import { useLocation } from "wouter";

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start py-10 px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-green-700 flex items-center justify-center shadow-lg mb-3">
          <span className="text-white font-black text-2xl tracking-widest">KODAI</span>
        </div>
        <p className="text-gray-500 text-sm font-medium tracking-wider uppercase">Curso de Programação Mobile</p>
      </div>

      {/* Video Player */}
      <div className="w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-xl mb-8 aspect-video flex items-center justify-center relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm mb-4 cursor-pointer hover:bg-white/20 transition-all duration-200">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="text-white/70 text-sm">Vídeo de apresentação em breve</p>
        </div>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-gray-900/80 pointer-events-none" />
      </div>

      {/* Headline */}
      <div className="text-center mb-8 max-w-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
          Aprende a programar usando apenas o teu <span className="text-green-700">telemóvel</span>
        </h1>
        <p className="text-gray-500 text-base">
          Com o KODAI aprendes programação do zero, no teu ritmo, sem precisar de computador — só com o celular na mão.
        </p>
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

      {/* Footer */}
      <p className="mt-12 text-xs text-gray-400">&copy; {new Date().getFullYear()} KODAI. Todos os direitos reservados.</p>
    </div>
  );
}
