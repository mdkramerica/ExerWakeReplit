import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import InjurySelection from "@/pages/injury-selection";
import AssessmentList from "@/pages/assessment-list";
import VideoInstruction from "@/pages/video-instruction";
import Recording from "@/pages/recording";
import ThankYou from "@/pages/thank-you";
import AssessmentResults from "@/pages/assessment-results";
import Header from "@/components/header";
import Footer from "@/components/footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/injury-selection" component={InjurySelection} />
      <Route path="/assessments" component={AssessmentList} />
      <Route path="/assessment/:id/video" component={VideoInstruction} />
      <Route path="/assessment/:id/record" component={Recording} />
      <Route path="/results/:userAssessmentId" component={AssessmentResults} />
      <Route path="/thank-you" component={ThankYou} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Load user from sessionStorage if available
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const updateUser = (user: any) => {
    setCurrentUser(user);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  };

  const clearUser = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-medical-light">
          <Header />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div style={{ 
              '--current-user': JSON.stringify(currentUser),
              '--update-user': updateUser,
              '--clear-user': clearUser
            } as any}>
              <Router />
            </div>
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
