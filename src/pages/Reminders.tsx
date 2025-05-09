import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Medication } from '@/types/supabase';
import { format, addDays, isToday, isTomorrow, isFuture, isWithinInterval, addHours } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

type ScheduledDose = {
  medication: Medication;
  doseNumber: number;
  scheduledTime: Date;
  isToday: boolean;
  isTomorrow: boolean;
  isUpcoming: boolean;
  isDue: boolean;
};

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

export default function Reminders() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [scheduledDoses, setScheduledDoses] = useState<ScheduledDose[]>([]);
  const [todaysDoses, setTodaysDoses] = useState<ScheduledDose[]>([]);
  const [tomorrowsDoses, setTomorrowsDoses] = useState<ScheduledDose[]>([]);
  const [upcomingDoses, setUpcomingDoses] = useState<ScheduledDose[]>([]);
  const [dueDoses, setDueDoses] = useState<ScheduledDose[]>([]);
  const [justTaken, setJustTaken] = useState<{ [key: string]: boolean }>({});
  const [doseLogs, setDoseLogs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchMedications();
      fetchDoseLogs();
    }
  }, [user]);

  useEffect(() => {
    if (medications.length > 0) {
      generateScheduledDoses();
    }
  }, [medications]);

  async function fetchMedications() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .lte('start_date', addDays(new Date(), 7).toISOString().split('T')[0])
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        setMedications(data);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDoseLogs() {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfRange = addDays(new Date(), 7);
      endOfRange.setHours(23, 59, 59, 999);
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*')
        .gte('scheduled_time', startOfDay.toISOString())
        .lte('scheduled_time', endOfRange.toISOString());
      if (error) throw error;
      if (data) setDoseLogs(data);
    } catch (error) {
      console.error('Error fetching dose logs:', error);
    }
  }

  function generateScheduledDoses() {
    const now = new Date();
    const doses: ScheduledDose[] = [];
    
    // Generate scheduled doses for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = addDays(new Date(), dayOffset);
      currentDate.setHours(0, 0, 0, 0);
      
      medications.forEach(medication => {
        const startDate = new Date(medication.start_date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = medication.end_date 
          ? new Date(medication.end_date) 
          : addDays(new Date(), 365); // Far in the future if no end date
        
        endDate.setHours(23, 59, 59, 999);
        
        // Check if the current date is within the medication's date range
        if (currentDate >= startDate && currentDate <= endDate) {
          const frequency = medication.frequency_per_day;
          
          // Simple scheduling: divide the day into equal parts
          for (let i = 0; i < frequency; i++) {
            const hour = 8 + (i * (16 / frequency)); // Start at 8 AM, end by 8 PM
            const scheduledTime = new Date(currentDate);
            scheduledTime.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
            
            // Check if this dose has been logged already (match scheduled_time)
            const doseLog = doseLogs.find(log =>
              log.medication_id === medication.id &&
              log.scheduled_time.slice(0, 16) === scheduledTime.toISOString().slice(0, 16)
            );
            if (!doseLog) {
              // Only include doses that are not already logged
              if (scheduledTime > now || isWithinInterval(now, {
                start: scheduledTime,
                end: addHours(scheduledTime, 4)
              })) {
                doses.push({
                  medication,
                  doseNumber: i + 1,
                  scheduledTime,
                  isToday: isToday(scheduledTime),
                  isTomorrow: isTomorrow(scheduledTime),
                  isUpcoming: !isToday(scheduledTime) && !isTomorrow(scheduledTime) && isFuture(scheduledTime),
                  isDue: isWithinInterval(now, {
                    start: scheduledTime,
                    end: addHours(scheduledTime, 4)
                  })
                });
              }
            }
          }
        }
      });
    }
    
    // Sort by scheduled time
    doses.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    
    setScheduledDoses(doses);
    setTodaysDoses(doses.filter(dose => dose.isToday));
    setTomorrowsDoses(doses.filter(dose => dose.isTomorrow));
    setUpcomingDoses(doses.filter(dose => dose.isUpcoming));
    setDueDoses(doses.filter(dose => dose.isDue));
  }

  async function handleMarkAsTaken(dose: ScheduledDose) {
    try {
      // Optimistically update UI
      setJustTaken((prev) => ({
        ...prev,
        [`${dose.medication.id}-${dose.doseNumber}-${dose.scheduledTime.toISOString()}`]: true,
      }));
      const now = new Date();
      const { error } = await supabase.rpc('log_dose', {
        medication_id: dose.medication.id,
        scheduled_time: dose.scheduledTime.toISOString(),
        actual_time: now.toISOString(),
      });
      if (error) throw error;
      toast({
        title: 'Medication Taken',
        description: 'Medication marked as taken successfully!',
      });
      fetchMedications();
      fetchDoseLogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not log dose',
        variant: 'destructive',
      });
    }
  }

  return (
    <Layout>
      <MedicalQuoteBanner />
      <h1 className="text-3xl font-extrabold text-blue-900 mb-8 tracking-tight text-center">Reminders</h1>
      <div className="mb-6">
        <p className="text-gray-600">Upcoming medication doses</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : scheduledDoses.length > 0 ? (
        <>
          {/* Due Doses - Always visible if there are any */}
          {dueDoses.length > 0 && (
            <Card className="border-yellow-400 bg-yellow-50 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                  Due Now
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dueDoses.map((dose, index) => {
                    const doseKey = `${dose.medication.id}-${dose.doseNumber}-${dose.scheduledTime.toISOString()}`;
                    const isJustTaken = justTaken[doseKey];
                    return (
                      <div
                        key={`due-${index}`}
                        className={`p-3 border rounded-lg shadow-sm ${
                          isJustTaken ? 'bg-green-100 border-green-400' : 'bg-white border-yellow-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{dose.medication.name}</h3>
                            <p className="text-sm text-gray-600">{dose.medication.dose}</p>
                            <div className="flex items-center mt-1 text-xs text-yellow-700">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>Due at {format(dose.scheduledTime, 'h:mm a')}</span>
                            </div>
                          </div>
                          {isJustTaken ? (
                            <span className="ml-4 px-3 py-1 bg-green-600 text-white rounded">
                              Medication Taken
                            </span>
                          ) : (
                            <button
                              className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              onClick={() => handleMarkAsTaken(dose)}
                            >
                              Mark as Taken
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabbed reminders */}
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">Today ({todaysDoses.length})</TabsTrigger>
              <TabsTrigger value="tomorrow">Tomorrow ({tomorrowsDoses.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcomingDoses.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="today">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {todaysDoses.length > 0 ? (
                    <div className="space-y-4">
                      {todaysDoses.map((dose, index) => (
                        <div 
                          key={`today-${index}`}
                          className="p-3 bg-white border rounded-lg shadow-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{dose.medication.name}</h3>
                              <p className="text-sm text-gray-600">{dose.medication.dose}</p>
                              <div className="flex items-center mt-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{format(dose.scheduledTime, 'h:mm a')}</span>
                              </div>
                            </div>
                            <div className={`px-2 py-1 text-xs rounded-full ${
                              dose.isDue ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {dose.isDue ? 'Due Now' : 'Upcoming'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No medications scheduled for today</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tomorrow">
              <Card>
                <CardHeader>
                  <CardTitle>Tomorrow's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {tomorrowsDoses.length > 0 ? (
                    <div className="space-y-4">
                      {tomorrowsDoses.map((dose, index) => (
                        <div 
                          key={`tomorrow-${index}`}
                          className="p-3 bg-white border rounded-lg shadow-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{dose.medication.name}</h3>
                              <p className="text-sm text-gray-600">{dose.medication.dose}</p>
                              <div className="flex items-center mt-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{format(dose.scheduledTime, 'h:mm a')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No medications scheduled for tomorrow</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="upcoming">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingDoses.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingDoses.map((dose, index) => (
                        <div 
                          key={`upcoming-${index}`}
                          className="p-3 bg-white border rounded-lg shadow-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{dose.medication.name}</h3>
                              <p className="text-sm text-gray-600">{dose.medication.dose}</p>
                              <div className="flex items-center mt-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>
                                  {format(dose.scheduledTime, 'MMM dd')} at {format(dose.scheduledTime, 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No upcoming medications scheduled</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No medications scheduled</p>
        </div>
      )}
    </Layout>
  );
}
