import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function PatientLogin() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit access code",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/patient/login', { code });
      const data = await res.json();
      // Store complete user data for use in dashboard
      localStorage.setItem('patientData', JSON.stringify(data));
      setLocation('/patient/dashboard');
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid access code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Hand Assessment Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your 6-digit access code
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="code" className="sr-only">
              Access Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              maxLength={6}
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md text-center text-2xl tracking-widest focus:outline-none focus:ring-primary focus:border-primary focus:z-10"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Logging in...' : 'Access Portal'}
            </Button>
          </div>
        </form>
        <div className="text-center">
          <a
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Admin Login →
          </a>
        </div>
      </div>
    </div>
  );
}