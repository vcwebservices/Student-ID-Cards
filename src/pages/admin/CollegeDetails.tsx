import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Student } from '../../types';
import { RTOS } from '../../lib/rtoConfig';
import { 
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  RefreshCw,
  Ban,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';

type SortField = 'studentNumber' | 'firstName' | 'email' | 'campus' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export function CollegeDetails() {
  const { rtoId } = useParams<{ rtoId: string }>();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const rto = RTOS.find(r => r.id === rtoId);

  useEffect(() => {
    async function fetchStudents() {
      if (!rtoId) return;
      try {
        const q = query(
          collection(db, 'students'),
          where('rtoId', '==', rtoId)
          // We apply order by in memory to avoid needing compound indexes immediately
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        // Sort initial data by created at desc
        data.sort((a, b) => b.createdAt - a.createdAt);
        setStudents(data);
      } catch (error) {
        console.error("Error fetching college students:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [rtoId]);

  // Derived state: Filtered and Sorted students
  const processedStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchesSearch = 
          (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
        
        let matchesDate = true;
        if (dateRange.start) {
          matchesDate = matchesDate && s.createdAt >= new Date(dateRange.start).getTime();
        }
        if (dateRange.end) {
          // Add 1 day to end date to include the whole day
          const endDateTime = new Date(dateRange.end).getTime() + 86400000;
          matchesDate = matchesDate && s.createdAt < endDateTime;
        }

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        
        if (sortField === 'firstName') {
          valA = a.firstName + ' ' + a.lastName;
          valB = b.firstName + ' ' + b.lastName;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [students, searchTerm, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const exportToCSV = () => {
    if (processedStudents.length === 0) return;
    
    const headers = ['Student ID', 'First Name', 'Last Name', 'Email', 'Course', 'Issue Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...processedStudents.map(s => [
        s.studentNumber,
        `"${s.firstName}"`,
        `"${s.lastName}"`,
        s.email || '',
        `"${s.campus}"`, // using campus as proxy for course if needed
        format(new Date(s.createdAt), 'yyyy-MM-dd'),
        s.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${rto?.shortName}_Cards_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeactivate = async (studentId: string) => {
    // In a real app we might soft-delete or update status to 'Expired/Deactivated'
    // Here we'll just optimistically update the UI to show 'Deactivated'
    if (confirm("Are you sure you want to deactivate this card?")) {
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: 'Deactivated' } : s));
      setMenuOpenId(null);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (!rto) {
    return <div>College not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-24 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 border border-gray-200 shadow-sm shrink-0 overflow-hidden">
            {rto.logoUrl ? (
              <img
                src={rto.logoUrl}
                alt={`${rto.shortName} Logo`}
                className="w-full h-full object-contain mix-blend-multiply"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-full h-full rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: rto.primaryColor }}
              >
                {rto.shortName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{rto.name}</h1>
            <p className="text-gray-500">Manage issued cards and students</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, ID, or email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="border border-gray-300 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              className="border border-gray-300 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            <Filter className="w-4 h-4" />
            Status:
          </div>
          <select 
            className="border border-gray-300 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Full Time Student">Active</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
           <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="font-semibold text-gray-600 py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('studentNumber')}>
                    <div className="flex items-center gap-2">Student ID <SortIcon field="studentNumber" /></div>
                  </th>
                  <th className="font-semibold text-gray-600 py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('firstName')}>
                    <div className="flex items-center gap-2">Student Name <SortIcon field="firstName" /></div>
                  </th>
                  <th className="font-semibold text-gray-600 py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('email')}>
                    <div className="flex items-center gap-2">Email <SortIcon field="email" /></div>
                  </th>
                  <th className="font-semibold text-gray-600 py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('campus')}>
                    <div className="flex items-center gap-2">Course / Campus <SortIcon field="campus" /></div>
                  </th>
                  <th className="font-semibold text-gray-600 py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-2">Issue Date <SortIcon field="createdAt" /></div>
                  </th>
                  <th className="font-semibold text-gray-600 py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                     <div className="flex items-center gap-2">Status <SortIcon field="status" /></div>
                  </th>
                  <th className="font-semibold text-gray-600 py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedStudents.length > 0 ? (
                  processedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="py-3 px-4 font-mono text-gray-900">{student.studentNumber}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{student.email || <span className="text-gray-300 italic">Not provided</span>}</td>
                      <td className="py-3 px-4 text-gray-500 truncate max-w-[150px]">{student.campus}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {format(new Date(student.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          student.status === 'Deactivated' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {student.status === 'Deactivated' ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 relative text-center">
                        <button 
                          onClick={() => setMenuOpenId(menuOpenId === student.id ? null : student.id!)}
                          className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {menuOpenId === student.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)}></div>
                            <div className="absolute right-8 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                              <Link 
                                to={`/pass/${student.id}`}
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4" /> View Live Card
                              </Link>
                              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                                <Download className="w-4 h-4" /> Download .pkpass
                              </button>
                              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                                <RefreshCw className="w-4 h-4" /> Reissue Card
                              </button>
                              {student.status !== 'Deactivated' && (
                                <button 
                                  onClick={() => handleDeactivate(student.id!)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left border-t border-gray-100"
                                >
                                  <Ban className="w-4 h-4" /> Deactivate
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-gray-300" />
                        <p>No cards found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
