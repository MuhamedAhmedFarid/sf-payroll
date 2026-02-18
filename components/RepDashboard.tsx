
import React, { useMemo, useState } from 'react';
import { User, WorkRecord } from '../types';
import { calculatePayment, formatSeconds, parseHHMMSS } from '../utils/time';
import { LogoutIcon, ClockIcon, ChartBarIcon, CurrencyDollarIcon, CalendarIcon, ChatBubbleLeftRightIcon, PauseIcon, CheckCircleIcon } from './icons';

interface RepDashboardProps {
  repUser: User;
  allWorkRecords: WorkRecord[];
  onLogout: () => void;
}

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
}> = ({ icon, title, value }) => (
  <div className="flex items-center p-4 bg-base-100 rounded-lg shadow-sm">
    <div className="mr-4 text-content-300">{icon}</div>
    <div>
      <p className="text-sm text-content-300">{title}</p>
      <p className={`text-2xl font-bold text-content-100`}>{value}</p>
    </div>
  </div>
);


const RepDashboard: React.FC<RepDashboardProps> = ({ repUser, allWorkRecords, onLogout }) => {
  type Period = 'daily' | 'weekly' | 'biweekly' | 'monthly';
  const [period, setPeriod] = useState<Period>('daily');
  // Use YYYY-MM-DD for state to avoid timezone issues
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { startDate, endDate, selectedPeriodString } = useMemo(() => {
    // Note: JS Date constructor handles YYYY-MM-DD correctly as local time
    const date = new Date(selectedDate);

    let start = new Date(date);
    let end = new Date(date);

    switch (period) {
        case 'daily':
            break;
        case 'weekly':
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust so Monday is the first day
            start.setDate(diff);
            end.setDate(diff + 6);
            break;
        case 'biweekly':
            end = new Date(date);
            start.setDate(date.getDate() - 13);
            break;
        case 'monthly':
            start = new Date(date.getFullYear(), date.getMonth(), 1);
            end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            break;
    }
    
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let periodString;
    if (period === 'daily') {
        periodString = formatDate(date);
    } else {
        periodString = `${formatDate(start)} - ${formatDate(end)}`;
    }
    
    const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];

    return {
        startDate: toYYYYMMDD(start),
        endDate: toYYYYMMDD(end),
        selectedPeriodString: periodString,
    };
}, [period, selectedDate]);


  const filteredRecords = useMemo(() => {
    return allWorkRecords
      .filter(record => record.employeeId === repUser.id)
      .filter(record => {
        // Direct string comparison for dates is reliable with YYYY-MM-DD format
        return record.date >= startDate && record.date <= endDate;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allWorkRecords, repUser.id, startDate, endDate]);

  const stats = useMemo(() => {
    // Calculate total payment for unpaid and pending records (Base ONLY, excluding Reps bonus)
    // As requested, we remove the bonus (moes_total / $2 extra per hour) from the total.
    const unpaidPayment = filteredRecords
      .filter(record => record.payment_status.toLowerCase() !== 'paid')
      .reduce((acc, record) => {
        const activeSeconds = parseHHMMSS(record.talkTime) + parseHHMMSS(record.waitTime);
        const basePay = calculatePayment(activeSeconds, record.meetingMinutes, record.breakMinutes, record.morning_meetings || 0, record.ratePerHour, record.setsAdded);
        return acc + basePay;
      }, 0);

    // Calculate total payment for paid records (Base ONLY, excluding Reps bonus)
    const paidPayment = filteredRecords
      .filter(record => record.payment_status.toLowerCase() === 'paid')
      .reduce((acc, record) => {
        const activeSeconds = parseHHMMSS(record.talkTime) + parseHHMMSS(record.waitTime);
        const basePay = calculatePayment(activeSeconds, record.meetingMinutes, record.breakMinutes, record.morning_meetings || 0, record.ratePerHour, record.setsAdded);
        return acc + basePay;
      }, 0);

    // Calculate other stats from all records in the period
    const otherStats = filteredRecords.reduce((acc, record) => {
        const activeSeconds = parseHHMMSS(record.talkTime) + parseHHMMSS(record.waitTime);
        acc.totalSeconds += activeSeconds;
        acc.totalTalkTimeSeconds += parseHHMMSS(record.talkTime);
        acc.totalWaitTimeSeconds += parseHHMMSS(record.waitTime);
        acc.totalSets += record.setsAdded;
        return acc;
    }, {
        totalSeconds: 0,
        totalSets: 0,
        totalTalkTimeSeconds: 0,
        totalWaitTimeSeconds: 0,
    });

    return {
      ...otherStats,
      totalUnpaid: unpaidPayment,
      totalPaid: paidPayment,
    };
  }, [filteredRecords]);
  
  const paymentStatusColorMap: { [key: string]: string } = {
    unpaid: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
  };

  return (
    <div className="min-h-screen bg-base-200">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-base-100 border-b border-base-300">
        <h1 className="text-2xl font-bold text-content-100">Rep Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="hidden sm:inline text-content-300">Welcome, {repUser.alias || repUser.name}!</span>
          <button onClick={onLogout} className="flex items-center px-3 py-2 text-sm font-medium text-red-600 transition-colors border border-red-300 rounded-lg hover:bg-red-500 hover:text-white">
            <LogoutIcon className="w-5 h-5 mr-1" />
            <span>Logout</span>
          </button>
        </div>
      </header>
      
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="p-6 mb-8 bg-base-100 rounded-lg shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-content-200">Period:</span>
              {(['daily', 'weekly', 'biweekly', 'monthly'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                    period === p ? 'bg-accent text-base-100' : 'bg-base-300/50 text-content-200 hover:bg-base-300'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative">
              <CalendarIcon className="absolute w-5 h-5 text-content-300 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 pl-10 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>
          <p className="mt-4 text-sm text-content-300">
            <span className="font-semibold text-content-200">Selected period:</span> {selectedPeriodString}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
                icon={<ClockIcon className="w-8 h-8" />}
                title="Total Active Hours"
                value={formatSeconds(stats.totalSeconds)}
            />
             <StatCard
                icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
                title="Total Talk Time"
                value={formatSeconds(stats.totalTalkTimeSeconds)}
            />
            <StatCard
                icon={<PauseIcon className="w-8 h-8" />}
                title="Total Wait Time"
                value={formatSeconds(stats.totalWaitTimeSeconds)}
            />
            <StatCard
                icon={<ChartBarIcon className="w-8 h-8" />}
                title="Total Sets"
                value={stats.totalSets.toString()}
            />
            <StatCard
                icon={<CurrencyDollarIcon className="w-8 h-8" />}
                title="Total Unpaid"
                value={`$${stats.totalUnpaid.toFixed(2)}`}
            />
            <StatCard
                icon={<CheckCircleIcon className="w-8 h-8" />}
                title="Total Paid"
                value={`$${stats.totalPaid.toFixed(2)}`}
            />
        </div>
        
        <div className="p-6 bg-base-100 rounded-lg shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-content-100">Details by Day</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-content-300 bg-base-200">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold">DATE</th>
                            <th scope="col" className="px-6 py-3 font-semibold">ACTIVE HOURS</th>
                            <th scope="col" className="px-6 py-3 font-semibold">TALK TIME</th>
                            <th scope="col" className="px-6 py-3 font-semibold">WAIT TIME</th>
                            <th scope="col" className="px-6 py-3 font-semibold">SETS</th>
                            <th scope="col" className="px-6 py-3 font-semibold">BREAKS</th>
                            <th scope="col" className="px-6 py-3 font-semibold">MEETINGS</th>
                            <th scope="col" className="px-6 py-3 font-semibold">MORNING MEETINGS</th>
                            <th scope="col" className="px-6 py-3 font-semibold">TOTAL PAYMENT</th>
                            <th scope="col" className="px-6 py-3 font-semibold">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map((rec, index) => {
                           const activeSeconds = parseHHMMSS(rec.talkTime) + parseHHMMSS(rec.waitTime);
                           // Daily payment display also updated to exclude moes_total (Reps bonus)
                           const totalDailyPayment = calculatePayment(activeSeconds, rec.meetingMinutes, rec.breakMinutes, rec.morning_meetings || 0, rec.ratePerHour, rec.setsAdded);
                           
                           return (
                             <tr key={rec.id} className={index % 2 === 0 ? 'bg-base-100' : 'bg-base-200'}>
                                <td className="px-6 py-4 font-medium text-content-100 whitespace-nowrap">{rec.date}</td>
                                <td className="px-6 py-4">{formatSeconds(activeSeconds)}</td>
                                <td className="px-6 py-4">{rec.talkTime}</td>
                                <td className="px-6 py-4">{rec.waitTime}</td>
                                <td className="px-6 py-4">{rec.setsAdded}</td>
                                <td className="px-6 py-4">{rec.breakMinutes} min</td>
                                <td className="px-6 py-4">{rec.meetingMinutes} min</td>
                                <td className="px-6 py-4">{rec.morning_meetings || 0} min</td>
                                <td className="px-6 py-4 font-semibold text-content-100">${totalDailyPayment.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center capitalize px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColorMap[rec.payment_status.toLowerCase()] || ''}`}>
                                    {rec.payment_status}
                                  </span>
                                </td>
                            </tr>
                           )
                        })}
                    </tbody>
                </table>
                {filteredRecords.length === 0 && <p className="py-8 text-center text-content-300">No records found for the selected period.</p>}
            </div>
        </div>
      </main>
    </div>
  );
};

export default RepDashboard;
