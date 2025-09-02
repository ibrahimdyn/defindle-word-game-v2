import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import WordGame from "@/pages/word-game";
import MobileDemo from "@/pages/mobile-demo";
import MobileSimulator from "@/pages/mobile-simulator";
import TimedChallenge from "@/pages/timed-challenge";
import DailyChallenge from "@/pages/daily-challenge";
import WordStats from "@/pages/word-stats";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/word-game" component={WordGame} />
      <Route path="/daily-challenge" component={DailyChallenge} />
      <Route path="/timed-challenge" component={TimedChallenge} />
      <Route path="/mobile-demo" component={MobileDemo} />
      <Route path="/word-stats" component={WordStats} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
