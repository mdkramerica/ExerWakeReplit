import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Route, Router, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';

// Pages
import PatientLogin from './pages/patient/Login';
import PatientDashboard from './pages/patient/Dashboard';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route path="/" component={PatientLogin} />
          <Route path="/patient/dashboard" component={PatientDashboard} />
          <Route path="/admin" component={AdminLogin} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
        </Switch>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;