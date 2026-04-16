import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Landing from "./pages/Landing";
import Assessment from "./pages/Assessment";
import Report from "./pages/Report";
import Dashboard from "./pages/Dashboard";
import Scorecard from "./pages/Scorecard";
import NotFound from "./pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/assess/:code" component={Assessment} />
          <Route path="/scorecard/:id" component={Scorecard} />
          <Route path="/report/:id" component={Report} />
          <Route path="/admin" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
