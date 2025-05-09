import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon, Calendar, AlertCircle } from 'lucide-react';
import { Medication, DoseLog } from '@/types/supabase';
import { format, parseISO, isWithinInterval, subHours, addHours } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type ScheduledDose = {
  medication: Medication;
  doseNumber: number;
  scheduledTime: Date;
  status: 'pending' | 'taken' | 'late' | 'missed';
}

const quotes = [
  "Medicine is a science of uncertainty and an art of probability. – William Osler",
  "The best doctor gives the least medicines. – Benjamin Franklin",
  "Wherever the art of Medicine is loved, there is also a love of Humanity. – Hippocrates",
  "The greatest wealth is health. – Virgil",
  "Take care of your body. It's the only place you have to live. – Jim Rohn",
  "An ounce of prevention is worth a pound of cure. – Benjamin Franklin",
  "Healing is a matter of time, but it is sometimes also a matter of opportunity. – Hippocrates"
];

function MedicalQuoteBanner() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % quotes.length);
        setFade(true);
      }, 500);
    }, 4500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [index]);

  return (
    <div className="w-full flex justify-center mb-6">
      <div className={`transition-opacity duration-500 text-lg md:text-xl font-semibold italic text-blue-700 bg-blue-50 px-6 py-3 rounded-xl shadow-md max-w-2xl text-center ${fade ? 'opacity-100' : 'opacity-0'}`}>{quotes[index]}</div>
    </div>
  );
}

export default function DoseLogging() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [scheduledDoses, setScheduledDoses] = useState<ScheduledDose[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<DoseLog[]>([]);
  const [justTaken, setJustTaken] = useState<{ [key: string]: boolean }>({});
  const [justMissed, setJustMissed] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (user) {
      fetchMedications();
      fetchTodaysLogs();
    }
  }, [user]);

  useEffect(() => {
    if (medications.length > 0) {
      generateScheduledDoses();
    }
  }, [medications, todaysLogs]);

  async function fetchMedications() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        setMedications(data);
      }
    } catch (error: any) {
      console.error('Error fetching medications:', error.message);
      toast({
        title: 'Error',
        description: 'Could not fetch medications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTodaysLogs() {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*, medication_id')
        .gte('timestamp_taken', startOfDay.toISOString())
        .lte('timestamp_taken', endOfDay.toISOString());

      if (error) {
        throw error;
      }

      if (data) {
        setTodaysLogs(data);
      }
    } catch (error: any) {
      console.error('Error fetching dose logs:', error.message);
      toast({
        title: 'Error',
        description: 'Could not fetch dose logs',
        variant: 'destructive',
      });
    }
  }

  function generateScheduledDoses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const doses: ScheduledDose[] = [];
    medications.forEach(medication => {
      const frequency = medication.frequency_per_day;
      for (let i = 0; i < frequency; i++) {
        const hour = 8 + (i * (16 / frequency));
        const scheduledTime = new Date(today);
        scheduledTime.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
        // Check if this dose has been logged already (match scheduled_time, not timestamp_taken)
        const doseLog = todaysLogs.find(log =>
          log.medication_id === medication.id &&
          log.scheduled_time.slice(0, 16) === scheduledTime.toISOString().slice(0, 16)
        );
        let status: 'pending' | 'taken' | 'late' | 'missed';
        if (doseLog) {
          status = 'taken';
        } else if (now > addHours(scheduledTime, 4)) {
          status = 'missed';
        } else if (now > scheduledTime) {
          status = 'late';
        } else {
          status = 'pending';
        }
        doses.push({
          medication,
          doseNumber: i + 1,
          scheduledTime,
          status
        });
      }
    });
    doses.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    setScheduledDoses(doses);
  }

  async function handleLogDose(dose: ScheduledDose) {
    try {
      setJustTaken((prev) => ({
        ...prev,
        [`${dose.medication.id}-${dose.doseNumber}-${dose.scheduledTime.toISOString()}`]: true,
      }));
      const now = new Date();
      const { data, error } = await supabase.rpc('log_dose', {
        medication_id: dose.medication.id,
        scheduled_time: dose.scheduledTime.toISOString(),
        actual_time: now.toISOString(),
        user_id: user.id,
      });
      if (error) {
        throw error;
      }
      toast({
        title: 'Medication Taken',
        description: 'Medication marked as taken successfully!',
      });
      fetchTodaysLogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Could not log dose: ' + error.message,
        variant: 'destructive',
      });
    }
  }

  async function handleMarkAsMissed(dose: ScheduledDose) {
    try {
      setJustMissed((prev) => ({
        ...prev,
        [`${dose.medication.id}-${dose.doseNumber}-${dose.scheduledTime.toISOString()}`]: true,
      }));
      const { error } = await supabase
        .from('dose_logs')
        .insert([{
          medication_id: dose.medication.id,
          scheduled_time: dose.scheduledTime.toISOString(),
          timestamp_taken: new Date().toISOString(),
          taken_on_time: false,
          reward_earned: false,
          missed: true,
          user_id: user.id,
        }]);
      if (error) throw error;
      toast({
        title: 'Dose Missed',
        description: 'Dose marked as missed.',
      });
      fetchTodaysLogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'taken':
        return <Badge className="bg-green-500">Taken</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">Due Now</Badge>;
      case 'missed':
        return <Badge className="bg-red-500">Missed</Badge>;
      default:
        return <Badge className="bg-blue-500">Upcoming</Badge>;
    }
  }

  function isLate(scheduledTime: Date) {
    const now = new Date();
    const fourHoursLater = addHours(scheduledTime, 4);
    return now > scheduledTime && now < fourHoursLater;
  }

  return (
    <Layout>
      <MedicalQuoteBanner />
      <h1 className="text-3xl font-extrabold text-blue-900 mb-8 tracking-tight text-center">Log Doses</h1>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : scheduledDoses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scheduledDoses.map((dose, index) => {
            const doseKey = `${dose.medication.id}-${dose.doseNumber}-${dose.scheduledTime.toISOString()}`;
            const isJustTaken = justTaken[doseKey];
            const isJustMissed = justMissed[doseKey];
            return (
              <Card
                key={`${dose.medication.id}-${dose.doseNumber}`}
                className={`shadow-xl rounded-2xl border-0 transition-transform hover:scale-[1.02] duration-200
                  ${(dose.status === 'taken' || isJustTaken) ? 'border-green-300 bg-green-50' : ''}
                  ${(dose.status === 'missed' || isJustMissed) ? 'border-red-300 bg-red-50' : ''}
                  ${dose.status === 'late' ? 'border-yellow-300 bg-yellow-50' : ''}
                `}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-blue-800">{dose.medication.name}</CardTitle>
                    {isJustTaken ? getStatusBadge('taken') : isJustMissed ? getStatusBadge('missed') : getStatusBadge(dose.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Scheduled: {format(dose.scheduledTime, 'h:mm a')}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{dose.medication.dose}</p>
                    {dose.status === 'late' && !isJustTaken && !isJustMissed && (
                      <div className="flex items-center text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Taking this dose late - still counts for adherence</span>
                      </div>
                    )}
                    {(dose.status !== 'taken' && dose.status !== 'missed' && !isJustTaken && !isJustMissed) && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          className="w-1/2"
                          onClick={() => handleLogDose(dose)}
                        >
                          <CheckIcon className="mr-2 h-4 w-4" />
                          Mark as Taken
                        </Button>
                        <Button
                          className="w-1/2"
                          variant="outline"
                          onClick={() => handleMarkAsMissed(dose)}
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Mark as Missed
                        </Button>
                      </div>
                    )}
                    {(dose.status === 'taken' || isJustTaken) && (
                      <div className="flex items-center justify-center text-green-700 font-medium mt-2">
                        <CheckIcon className="mr-2 h-5 w-5" />
                        Medication Taken
                        {isLate(dose.scheduledTime) ? " (Late)" : " (On time)"}
                      </div>
                    )}
                    {(dose.status === 'missed' || isJustMissed) && (
                      <div className="flex items-center justify-center text-red-700 font-medium mt-2">
                        <AlertCircle className="mr-2 h-5 w-5" />
                        Medication Missed
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No medications scheduled for today</p>
          <Button
            className="mt-4"
            onClick={() => window.location.pathname = '/regimen'}
          >
            Add Medications
          </Button>
        </div>
      )}
    </Layout>
  );
}
