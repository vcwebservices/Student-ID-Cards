import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Student } from '../../types';
import { RTOS } from '../../lib/rtoConfig';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  Building2, 
  CalendarDays,
  TrendingUp,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfDay, startOfMonth, parseISO } from 'date-fns';

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({
    totalCards: 0,
    activeStudents: 0,
    issuedToday: 0,
    issuedThisMonth: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setStudents(data);

        // Calculate stats
        const now = new Date();
        const startOfToday = startOfDay(now).getTime();
        const startOfThisMonth = startOfMonth(now).getTime();

        const totalCards = data.length;
        const issuedToday = data.filter(s => s.createdAt >= startOfToday).length;
        const issuedThisMonth = data.filter(s => s.createdAt >= startOfThisMonth).length;
        // As a mock, assume all are active
        const activeStudents = totalCards;

        setStats({
          totalCards,
          activeStudents,
          issuedToday,
          issuedThisMonth
        });

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  // Chart Data: Cards by College
  const cardsByCollege = RTOS.map(rto => {
    // If the primary color is white, use a beautiful dark navy color (#113f67) for dashboard charts so it doesn't blend into the white background
    const chartFillColor = rto.primaryColor.toLowerCase() === '#ffffff' ? '#113f67' : rto.primaryColor;
    return {
      name: rto.shortName,
      value: students.filter(s => s.rtoId === rto.id).length,
      fill: chartFillColor
    };
  }).filter(c => c.value > 0);

  // Chart Data: Recent Activity (last 7 days maybe? Let's just group by month for simplicity if we want cards per month)
  const cardsPerMonth = students.reduce((acc, student) => {
    const month = format(new Date(student.createdAt), 'MMM yyyy');
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthChartData = Object.entries(cardsPerMonth)
    .map(([month, count]) => ({ month, count }))
    .reverse()
    .slice(0, 6) // last 6 months
    .reverse();

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">System-wide statistics and college summaries.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Cards Issued" value={stats.totalCards.toString()} icon={<CreditCard className="w-5 h-5 text-blue-600" />} />
        <StatCard title="Active Students" value={stats.activeStudents.toString()} icon={<Users className="w-5 h-5 text-emerald-600" />} />
        <StatCard title="Total Colleges" value={RTOS.length.toString()} icon={<Building2 className="w-5 h-5 text-purple-600" />} />
        <StatCard title="Cards Issued Today" value={stats.issuedToday.toString()} icon={<Clock className="w-5 h-5 text-amber-600" />} />
        <StatCard title="Issued This Month" value={stats.issuedThisMonth.toString()} icon={<CalendarDays className="w-5 h-5 text-indigo-600" />} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Cards Issued By College</h2>
          <div className="flex justify-center h-[300px]">
            {cardsByCollege.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cardsByCollege}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {cardsByCollege.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex items-center text-gray-400">No data available</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {cardsByCollege.map(c => (
              <div key={c.name} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.fill }}></div>
                {c.name} ({c.value})
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Issuance Trend</h2>
          <div className="h-[300px]">
             {monthChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
             )}
          </div>
        </div>
      </div>

      {/* College List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Colleges Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {RTOS.map(rto => {
            const collegeStudents = students.filter(s => s.rtoId === rto.id);
            const totalIssued = collegeStudents.length;
            const lastIssued = collegeStudents.length > 0 ? new Date(collegeStudents[0].createdAt).toLocaleDateString() : 'Never';

            return (
              <Link 
                key={rto.id} 
                to={`/admin/college/${rto.id}`}
                className="block bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-10 bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100 shadow-sm shrink-0 overflow-hidden">
                      {rto.logoUrl ? (
                        <img
                          src={rto.logoUrl}
                          alt={`${rto.shortName} Logo`}
                          className="w-full h-full object-contain mix-blend-multiply"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div 
                          className="w-full h-full rounded-md flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: rto.primaryColor }}
                        >
                          {rto.shortName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">{rto.shortName}</h3>
                      <p className="text-xs text-gray-500 truncate max-w-[150px]">{rto.name}</p>
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors opacity-50" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Cards</p>
                    <p className="font-semibold text-gray-900">{totalIssued}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Last Issued</p>
                    <p className="font-medium text-gray-700 text-sm">{lastIssued}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
