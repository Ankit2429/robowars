import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

import { SessionProvider } from "@/context/SessionContext";
import { LoginGate } from "@/components/LoginGate";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import Builder from "@/pages/builder";
import Play from "@/pages/play";
import Battle from "@/pages/battle";
import Leaderboard from "@/pages/leaderboard";
import Admin from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/builder" component={Builder} />
      <Route path="/play" component={Play} />
      <Route path="/battle/:roomId" component={Battle} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <LoginGate>
              <Layout>
                <Router />
              </Layout>
            </LoginGate>
          </WouterRouter>
        </SessionProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
