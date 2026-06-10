import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Comprar from "@/pages/Comprar";
import Aulas from "@/pages/Aulas";
import Admin from "@/pages/Admin";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-black text-gray-200 mb-3">404</h1>
      <p className="text-gray-500 text-sm">Página não encontrada.</p>
      <a href="/" className="mt-4 text-green-700 text-sm font-medium hover:underline">Voltar ao início</a>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/comprar" component={Comprar} />
      <Route path="/aulas" component={Aulas} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
