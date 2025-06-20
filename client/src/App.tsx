import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import InjurySelection from "@/pages/injury-selection";
import AssessmentList from "@/pages/assessment-list";
import VideoInstruction from "@/pages/video-instruction";
import Recording from "@/pages/recording";
import ThankYou from "@/pages/thank-you";
import AssessmentResults from "@/pages/assessment-results";
import WristResults from "@/pages/wrist-results";
import JointTest from "@/pages/joint-test";
import SharedAssessment from "@/pages/shared-assessment";
import Overview from "@/pages/overview";
import Header from "@/components/header";
import Footer from "@/components/footer";

// Clinical Dashboard Components
import ClinicalLogin from "@/pages/clinical-login";
import ClinicalDashboard from "@/pages/clinical-dashboard";
import ClinicalPatients from "@/pages/clinical-patients";
import ClinicalLayout from "@/components/clinical-layout";

function ClinicalRoutes() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <ClinicalLogin />;
  }
  
  return (
    <ClinicalLayout>
      <Switch>
        <Route path="/clinical/dashboard" component={ClinicalDashboard} />
        <Route path="/clinical/patients" component={ClinicalPatients} />
        <Route path="/clinical/analytics" component={() => <div>Analytics Page (Coming Soon)</div>} />
        <Route path="/clinical/alerts" component={() => <div>Alerts Page (Coming Soon)</div>} />
        <Route path="/clinical/cohorts" component={() => <div>Cohorts Page (Coming Soon)</div>} />
        <Route path="/clinical/reports" component={() => <div>Reports Page (Coming Soon)</div>} />
        <Route path="/clinical/settings" component={() => <div>Settings Page (Coming Soon)</div>} />
        <Route component={() => <ClinicalDashboard />} />
      </Switch>
    </ClinicalLayout>
  );
}

function LegacyRoutes() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/overview" component={Overview} />
          <Route path="/injury-selection" component={InjurySelection} />
          <Route path="/assessments" component={AssessmentList} />
          <Route path="/assessment-list/:code" component={AssessmentList} />
          <Route path="/assessment/:id/video" component={VideoInstruction} />
          <Route path="/assessment/:id/record" component={Recording} />
          <Route path="/assessment-results/:code/:userAssessmentId" component={AssessmentResults} />
          <Route path="/wrist-results/:userCode/:userAssessmentId" component={WristResults} />
          <Route path="/joint-test" component={JointTest} />
          <Route path="/shared/:token" component={SharedAssessment} />
          <Route path="/thank-you" component={ThankYou} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/clinical" nest>
        <ClinicalRoutes />
      </Route>
      <Route path="/clinical/login" component={ClinicalLogin} />
      <Route>
        <LegacyRoutes />
      </Route>
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
        <div className="min-h-screen bg-white">
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
