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
import DailyAssessments from "@/pages/daily-assessments";
import ProgressCharts from "@/pages/progress-charts";
import Header from "@/components/header";
import Footer from "@/components/footer";

// Clinical Dashboard Components
import ClinicalLogin from "@/pages/clinical-login";
import ClinicalDashboard from "@/pages/clinical-dashboard";
import ClinicalPatients from "@/pages/clinical-patients";
import PatientDashboard from "@/pages/patient-dashboard";
import DemoAccess from "@/pages/demo-access";
import ClinicalAnalytics from "@/pages/clinical-analytics";
import ClinicalAlerts from "@/pages/clinical-alerts";
import PatientDetail from "@/pages/patient-detail";
import StudyEnrollment from "@/pages/study-enrollment";
import PatientEnrollment from "@/pages/patient-enrollment";
import StudyCohortOverview from "@/pages/study-cohort-overview";
import LongitudinalAnalytics from "@/pages/longitudinal-analytics";
import PredictiveModeling from "@/pages/predictive-modeling";
import ResearchDashboard from "@/pages/research-dashboard";
import StudyProtocolCompliance from "@/pages/study-protocol-compliance";
import ClinicalSettings from "@/pages/clinical-settings";
import ClinicalReports from "@/pages/clinical-reports";
import ClinicalLayout from "@/components/clinical-layout";

function ClinicalRoutes() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <ClinicalLogin />;
  }
  
  return (
    <ClinicalLayout>
      <Switch>
        <Route path="/dashboard" component={ClinicalDashboard} />
        <Route path="/patient-dashboard" component={PatientDashboard} />
        <Route path="/patient-enrollment" component={PatientEnrollment} />
        <Route path="/study/analytics" component={LongitudinalAnalytics} />
        <Route path="/study/predictions" component={PredictiveModeling} />
        <Route path="/study/enroll" component={StudyEnrollment} />
        <Route path="/study/cohorts" component={StudyCohortOverview} />
        <Route path="/study/compliance" component={StudyProtocolCompliance} />
        <Route path="/analytics" component={ClinicalAnalytics} />
        <Route path="/research" component={ResearchDashboard} />
        <Route path="/reports" component={ClinicalReports} />
        <Route path="/settings" component={ClinicalSettings} />
        <Route path="/alerts" component={ClinicalAlerts} />
        <Route path="/patients/:id" component={PatientDetail} />
        <Route path="/patients" component={ClinicalPatients} />
        <Route path="/" component={ClinicalDashboard} />
        <Route component={NotFound} />
      </Switch>
    </ClinicalLayout>
  );
}

function LegacyRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/overview" component={Overview} />
      <Route path="/assessments" component={DailyAssessments} />
      <Route path="/daily-assessments" component={DailyAssessments} />
      <Route path="/progress" component={ProgressCharts} />
      <Route path="/injury-selection" component={InjurySelection} />
      <Route path="/assessment-list/:code" component={AssessmentList} />
      <Route path="/demo" component={DemoAccess} />
      <Route path="/assessment/:id/video" component={VideoInstruction} />
      <Route path="/assessment/:id/video/:code" component={VideoInstruction} />
      <Route path="/assessment/:id/record" component={Recording} />
      <Route path="/assessment/:id/record/:code" component={Recording} />
      <Route path="/assessment-results/:code/:userAssessmentId" component={AssessmentResults} />
      <Route path="/wrist-results/:userCode/:userAssessmentId" component={WristResults} />
      <Route path="/joint-test" component={JointTest} />
      <Route path="/shared/:token" component={SharedAssessment} />
      <Route path="/thank-you" component={ThankYou} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/clinical/login" component={ClinicalLogin} />
      <Route path="/clinical" component={ClinicalRoutes} />
      <Route path="/clinical/:rest*" component={ClinicalRoutes} />
      <Route>
        <div className="min-h-screen bg-white">
          <Header />
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <LegacyRoutes />
          </main>
          <Footer />
        </div>
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
        <div style={{ 
          '--current-user': JSON.stringify(currentUser),
          '--update-user': updateUser,
          '--clear-user': clearUser
        } as any}>
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
