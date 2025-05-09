import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { AdherenceSummary } from '@/types/supabase';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  format, 
  parseISO, 
  subDays, 
  startOfWeek, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  isSameDay,
  startOfDay,
  endOfDay 
} from 'date-fns';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    async function fetchAdherenceData() {
      try {
        if (!user) return;

        const startOfWeek = startOfDay(subDays(new Date(), 7));
        const endOfWeek = endOfDay(new Date());

        const { data, error } = await supabase.rpc('get_adherence_summary', {
          user_id: user.id,
          start_date: startOfWeek.toISOString().split('T')[0],
          end_date: endOfWeek.toISOString().split('T')[0]
        });

        if (error) {
          console.error('Error fetching adherence data:', error);
          setAdherence({
            adherence_percentage: 0,
            missed_medications: [],
            day_data: []
          });
          return;
        }

        if (data && data.length > 0) {
          // Type casting to ensure the data matches our AdherenceSummary type
          const typedData: AdherenceSummary = {
            adherence_percentage: data[0].adherence_percentage,
            missed_medications: data[0].missed_medications as any as { id: string; name: string; missed_count: number }[],
            day_data: data[0].day_data as any as { day: string; adherence_percentage: number }[]
          };
          
          setAdherence(typedData);
        } else {
          setAdherence({
            adherence_percentage: 0,
            missed_medications: [],
            day_data: []
          });
        }
      } catch (error) {
        console.error('Error in fetchAdherenceData:', error);
        setAdherence({
          adherence_percentage: 0,
          missed_medications: [],
          day_data: []
        });
      } finally {
        setLoading(false);
      }
    }

    async function fetchPoints() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();
      if (!error && data) setPoints(data.points || 0);
    }

    fetchAdherenceData();
    fetchPoints();
  }, [user]);

  const getAdherenceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Add this helper for the heatmap
  function getHeatmapColor(percent: number | null) {
    if (percent === null) return 'bg-gray-200';
    if (percent >= 90) return 'bg-green-400';
    if (percent >= 75) return 'bg-yellow-300';
    if (percent > 0) return 'bg-red-400';
    return 'bg-gray-200';
  }

  return (
    <Layout>
      <MedicalQuoteBanner />
      <h1 className="text-3xl font-extrabold text-blue-900 mb-8 tracking-tight">Dashboard</h1>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : adherence ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Reward Points & Badge */}
          <Card className="shadow-xl rounded-2xl border-0 bg-gradient-to-br from-blue-50 to-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <span>Reward Points</span>
                <span role="img" aria-label="trophy">🏆</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-extrabold text-center mb-2 text-blue-600 drop-shadow-lg">{points}</div>
              <div className="text-center mt-2">
                {points >= 100 ? (
                  <span className="inline-block bg-yellow-300 text-yellow-900 px-4 py-2 rounded-full font-bold shadow">🏅 Gold Adherence Badge!</span>
                ) : points >= 50 ? (
                  <span className="inline-block bg-gray-300 text-gray-900 px-4 py-2 rounded-full font-bold shadow">🥈 Silver Adherence Badge!</span>
                ) : points >= 20 ? (
                  <span className="inline-block bg-orange-200 text-orange-900 px-4 py-2 rounded-full font-bold shadow">🥉 Bronze Adherence Badge!</span>
                ) : (
                  <span className="text-blue-700">Log more doses to earn badges!</span>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Weekly Adherence Summary */}
          <Card className="shadow-xl rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-blue-800">Weekly Adherence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-center mb-4 flex justify-center">
                <span className={getAdherenceColor(adherence.adherence_percentage)}>
                  {adherence.adherence_percentage}%
                </span>
              </div>
              <div className="text-sm text-gray-500 text-center">
                Taking medications as prescribed
              </div>
            </CardContent>
          </Card>
          {/* Missed Medications */}
          <Card className="shadow-xl rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-blue-800">Missed Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {adherence.missed_medications && adherence.missed_medications.length > 0 ? (
                <ul className="space-y-3">
                  {adherence.missed_medications.map((med) => (
                    <li key={med.id} className="flex justify-between items-center">
                      <span className="text-gray-800 font-medium">{med.name}</span>
                      <span className="text-red-500 font-semibold">
                        Missed {med.missed_count} {med.missed_count === 1 ? 'dose' : 'doses'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500">No missed medications this week</p>
              )}
            </CardContent>
          </Card>
          {/* Weekly Adherence Chart */}
          <Card className="col-span-1 md:col-span-2 shadow-xl rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-blue-800">Weekly Adherence Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {adherence.day_data && adherence.day_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={adherence.day_data.map(day => ({
                      date: day.day,
                      adherence: day.adherence_percentage,
                      formattedDate: format(parseISO(day.day), 'MMM d')
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="formattedDate" 
                      padding={{ left: 20, right: 20 }} 
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Adherence']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="adherence"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Adherence %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Adherence Calendar Heatmap */}
          <Card className="col-span-1 md:col-span-2 shadow-xl rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="text-blue-800">Adherence Calendar Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              {adherence.day_data && adherence.day_data.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 gap-1 w-max mx-auto">
                    {/* Render day names */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="text-xs text-gray-500 text-center mb-1">{d}</div>
                    ))}
                    {/* Render days of current month */}
                    {(() => {
                      const today = new Date();
                      const start = startOfMonth(today);
                      const end = endOfMonth(today);
                      const days: JSX.Element[] = [];
                      let day = start;
                      // Fill initial empty days
                      for (let i = 0; i < start.getDay(); i++) {
                        days.push(<div key={`empty-start-${i}`}></div>);
                      }
                      while (day <= end) {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const found = adherence.day_data.find((d) => d.day.startsWith(dayStr));
                        const percent = found ? found.adherence_percentage : null;
                        days.push(
                          <div
                            key={dayStr}
                            className={`w-7 h-7 rounded ${getHeatmapColor(percent)} flex items-center justify-center text-xs text-white shadow`}
                            title={`${format(day, 'MMM d')}: ${percent !== null ? percent + '%' : 'No data'}`}
                          >
                            {day.getDate()}
                          </div>
                        );
                        day = addDays(day, 1);
                      }
                      return days;
                    })()}
                  </div>
                  <div className="flex justify-center mt-2 gap-4 text-xs text-gray-500">
                    <span><span className="inline-block w-4 h-4 bg-green-400 rounded mr-1"></span>90%+</span>
                    <span><span className="inline-block w-4 h-4 bg-yellow-300 rounded mr-1"></span>75-89%</span>
                    <span><span className="inline-block w-4 h-4 bg-red-400 rounded mr-1"></span>1-74%</span>
                    <span><span className="inline-block w-4 h-4 bg-gray-200 rounded mr-1"></span>No data</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500">No data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center p-10">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No data available</h3>
          <p className="text-gray-500">Start by adding medications to your regimen</p>
        </div>
      )}
    </Layout>
  );
}
