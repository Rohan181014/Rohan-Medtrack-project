import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Check, BarChart3, Clock, FileText, Plus } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1E293B] mb-4">MedTrack</h1>
          <p className="text-lg text-[#64748B] max-w-3xl mx-auto">
            Your personal medication adherence tracker
          </p>
          <div className="mt-8">
            {user ? (
              <Button 
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-6 text-lg"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button 
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-6 text-lg"
                onClick={() => navigate('/login')}
              >
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="bg-white shadow-md border-[#E2E8F0] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-[#3B82F6]">
                <Calendar className="w-5 h-5 mr-2" />
                Track Your Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#1E293B]">
                Easily log your daily medications and keep track of your adherence. Get reminders for upcoming doses.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-md border-[#E2E8F0] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-[#3B82F6]">
                <BarChart3 className="w-5 h-5 mr-2" />
                View Adherence Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#1E293B]">
                Get detailed reports on your medication adherence over time. Identify patterns and improve your health routine.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-md border-[#E2E8F0] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-[#3B82F6]">
                <Clock className="w-5 h-5 mr-2" />
                Never Miss a Dose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#1E293B]">
                Set up your medication regimen and receive timely reminders. Improve your medication adherence and health outcomes.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="bg-white shadow-md border-[#E2E8F0] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-[#3B82F6]">
                <Plus className="w-5 h-5 mr-2" />
                Set Up Your Regimen
              </CardTitle>
              <CardDescription>Easily manage your medications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                <span>Add medications with dosage and frequency</span>
              </p>
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                <span>Organize medications by custom categories</span>
              </p>
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                <span>Set start and end dates for each medication</span>
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-md border-[#E2E8F0] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-[#3B82F6]">
                <FileText className="w-5 h-5 mr-2" />
                Export Your Data
              </CardTitle>
              <CardDescription>Take control of your health information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                <span>Generate adherence reports with just a click</span>
              </p>
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                <span>Download logs as CSV for your health providers</span>
              </p>
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                <span>View personal adherence statistics</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow-md border border-[#E2E8F0] max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-[#0EA5E9] mb-4">Get Started Today</h2>
          <p className="mb-6 text-[#64748B]">
            Join MedTrack and start keeping track of your medications with ease. Improve your health by maintaining better medication adherence.
          </p>
          {user ? (
            <Button 
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>
          ) : (
            <Button 
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
              onClick={() => navigate('/login')}
            >
              Sign In / Sign Up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
