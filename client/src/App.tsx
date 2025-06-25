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
import PatientDailyDashboard from "@/pages/patient-daily-dashboard";
import PatientAccess from "@/pages/patient-access";
import AssessmentHistory from "@/pages/assessment-history";
import DashAssessmentPage from "@/pages/dash-assessment-page";
import DashResults from "@/pages/dash-results";
import ClinicalLayout from "@/components/clinical-layout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <ClinicalLogin />;
  }
  
  return <>{children}</>;
}

function LegacyRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/overview" component={Overview} />
      <Route path="/assessments" component={DailyAssessments} />
      <Route path="/daily-assessments" component={DailyAssessments} />
      <Route path="/progress" component={ProgressCharts} />
      <Route path="/progress-charts" component={ProgressCharts} />
      <Route path="/injury-selection" component={InjurySelection} />
      <Route path="/assessment-list/:code" component={() => <AssessmentList />} />
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
      <Route path="/clinical/dashboard" component={() => <ProtectedRoute><ClinicalLayout><ClinicalDashboard /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/patient-dashboard" component={() => <ProtectedRoute><ClinicalLayout><PatientDashboard /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/patient-enrollment" component={() => <ProtectedRoute><ClinicalLayout><PatientEnrollment /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/study/analytics" component={() => <ProtectedRoute><ClinicalLayout><LongitudinalAnalytics /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/study/predictions" component={() => <ProtectedRoute><ClinicalLayout><PredictiveModeling /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/study/enroll" component={() => <ProtectedRoute><ClinicalLayout><StudyEnrollment /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/study/cohorts" component={() => <ProtectedRoute><ClinicalLayout><StudyCohortOverview /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/study/compliance" component={() => <ProtectedRoute><ClinicalLayout><StudyProtocolCompliance /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/analytics" component={() => <ProtectedRoute><ClinicalLayout><ClinicalAnalytics /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/research" component={() => <ProtectedRoute><ClinicalLayout><ResearchDashboard /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/reports" component={() => <ProtectedRoute><ClinicalLayout><ClinicalReports /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/settings" component={() => <ProtectedRoute><ClinicalLayout><ClinicalSettings /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/alerts" component={() => <ProtectedRoute><ClinicalLayout><ClinicalAlerts /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/patients/:id" component={() => <ProtectedRoute><ClinicalLayout><PatientDetail /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical/patients" component={() => <ProtectedRoute><ClinicalLayout><ClinicalPatients /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/clinical" component={() => <ProtectedRoute><ClinicalLayout><ClinicalDashboard /></ClinicalLayout></ProtectedRoute>} />
      <Route path="/patient/:code/dashboard" component={() => <PatientDailyDashboard />} />
      <Route path="/patient/:code/dash-assessment" component={() => <DashAssessmentPage />} />
      <Route path="/patient/:code" component={() => <PatientDailyDashboard />} />
      <Route path="/assessment-list/:userCode" component={() => <PatientDailyDashboard />} />
      <Route path="/assessment-history/:userCode" component={() => <AssessmentHistory />} />
      <Route path="/patient" component={() => <PatientAccess />} />
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
