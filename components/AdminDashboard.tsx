
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Role, WorkRecord } from '../types';
import { parseHHMMSS, formatSeconds, calculatePayment, calculateRepsValue } from '../utils/time';
import { TrashIcon, EditIcon, PlusIcon, LogoutIcon, UserIcon, KeyIcon, BanIcon, TagIcon, CurrencyDollarIcon, UsersIcon, CalendarIcon, CheckCircleIcon } from './icons';
import TimeInput from './TimeInput';
import MultiSelect from './MultiSelect';
import * as api from '../api';

// Modal Component
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-modal="true" role="dialog">
      <div className="relative w-full max-w-2xl p-6 bg-base-100 rounded-lg shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-base-300">
          <h3 className="text-xl font-semibold text-content-100">{title}</h3>
          <button onClick={onClose} className="p-1 text-content-300 rounded-full hover:bg-base-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

const statusOptions = ['probation', 'training', 'working', 'terminated', 'resigned'];
const statusColorMap: { [key: string]: string } = {
  working: 'bg-green-100 text-green-800',
  probation: 'bg-yellow-100 text-yellow-800',
  training: 'bg-blue-100 text-blue-800',
  terminated: 'bg-red-100 text-red-800',
  resigned: 'bg-gray-200 text-gray-800',
  default: 'bg-gray-200 text-gray-800',
};

const paymentStatusColorMap: { [key: string]: string } = {
  unpaid: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

interface AdminDashboardProps {
  adminUser: User;
  activeCandidates: User[];
  allCandidates: User[];
  workRecords: WorkRecord[];
  onLogout: () => void;
  onUpdateCandidateDetails: (candidateId: string, details: { alias?: string; username?: string; password?: string }) => void;
  onRevokeCandidateAccess: (candidateId: string) => void;
  onSaveWorkRecord: (record: Omit<WorkRecord, 'id'> & { id?: string }) => Promise<string>;
  onDeleteWorkRecord: (recordId: string) => void;
  onGeneratePaymentBatch: (recordIds: string[], batchId: string) => Promise<void>;
  onMarkBatchAsPaid: (batchId: string) => Promise<void>;
  onRevertPaymentBatch: (batchId: string) => Promise<void>;
  onCreateCandidate: (name: string) => Promise<void>;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  onUpdateCandidateStatus: (candidateId: string, status: string) => Promise<void>;
}

type FormWorkRecord = Omit<WorkRecord, 'id' | 'ratePerHour' | 'setsAdded' | 'moes_total' | 'training' | 'payment_status' | 'payment_batch_id'> & {
    id?: string;
    ratePerHour: number | '';
    setsAdded: number | '';
    isTraining?: boolean;
};

const emptyRecord: FormWorkRecord = {
  employeeId: '',
  date: new Date().toISOString().split('T')[0],
  talkTime: '00:00:00',
  waitTime: '00:00:00',
  ratePerHour: '',
  setsAdded: '',
  breakMinutes: 0,
  meetingMinutes: 0,
  morning_meetings: 0,
  isTraining: false,
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser, activeCandidates, allCandidates, workRecords, onLogout, onUpdateCandidateDetails, onRevokeCandidateAccess, onSaveWorkRecord, onDeleteWorkRecord, onGeneratePaymentBatch, onMarkBatchAsPaid, onRevertPaymentBatch, onCreateCandidate, onDeleteCandidate, onUpdateCandidateStatus
}) => {
  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [newCandidateName, setNewCandidateName] = useState('');

  const [currentRecord, setCurrentRecord] = useState<FormWorkRecord>(emptyRecord);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const [successMessage, setSuccessMessage] = useState('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  
  // State for new performance form
  const [isWorkRecordFormOpen, setIsWorkRecordFormOpen] = useState(false);
  const [isPerformanceFormOpen, setIsPerformanceFormOpen] = useState(true);
  const [performanceAgents, setPerformanceAgents] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState({
      fullName: '',
      breaks: '',
      zoom_meetings: '',
      rate_per_hour: '',
      zoom_Scheduled: ''
  });
  
  useEffect(() => {
    const fetchAgents = async () => {
        try {
            const names = await api.fetchAgentNamesFromPerformanceSync();
            setPerformanceAgents(names);
        } catch (error) {
            console.error("Failed to fetch performance agents", error);
        }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    if (currentRecord.employeeId && allCandidates.length > 0 && !allCandidates.some(c => c.id === currentRecord.employeeId)) {
      setCurrentRecord(prev => ({
        ...prev,
        employeeId: '',
      }));
    }
  }, [allCandidates, currentRecord.employeeId]);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAliasChange = (candidateId: string, value: string) => {
    setAliases(prev => ({ ...prev, [candidateId]: value }));
  };

  const handleUsernameChange = (candidateId: string, value: string) => {
    setUsernames(prev => ({ ...prev, [candidateId]: value }));
  };

  const handlePasswordChange = (candidateId: string, value: string) => {
    setPasswords(prev => ({ ...prev, [candidateId]: value }));
  };

  const handleUpdateCandidateDetails = (candidateId: string) => {
    const alias = aliases[candidateId];
    const username = usernames[candidateId];
    const password = passwords[candidateId];
    
    const detailsToUpdate: { alias?: string; username?: string; password?: string } = {};

    if (alias !== undefined) detailsToUpdate.alias = alias;
    if (username !== undefined) detailsToUpdate.username = username;
    if (password !== undefined) detailsToUpdate.password = password;

    if (Object.keys(detailsToUpdate).length === 0) {
      return;
    }
    
    onUpdateCandidateDetails(candidateId, detailsToUpdate);

    setAliases(prev => { const newState = { ...prev }; delete newState[candidateId]; return newState; });
    setUsernames(prev => { const newState = { ...prev }; delete newState[candidateId]; return newState; });
    setPasswords(prev => { const newState = { ...prev }; delete newState[candidateId]; return newState; });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentRecord(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTimeChange = (name: 'talkTime' | 'waitTime', value: string) => {
    setCurrentRecord(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickSelectChange = (field: 'breakMinutes' | 'meetingMinutes' | 'morning_meetings', value: number) => {
    setCurrentRecord(prev => ({ ...prev, [field]: value }));
  };

  const activeSeconds = useMemo(() => parseHHMMSS(currentRecord.talkTime) + parseHHMMSS(currentRecord.waitTime), [currentRecord.talkTime, currentRecord.waitTime]);
  
  const repsValuePreview = useMemo(() => {
    return calculateRepsValue(
      activeSeconds,
      Number(currentRecord.setsAdded) || 0,
      currentRecord.breakMinutes,
      currentRecord.meetingMinutes,
      currentRecord.morning_meetings,
      currentRecord.isTraining
    );
  }, [ activeSeconds, currentRecord.setsAdded, currentRecord.breakMinutes, currentRecord.meetingMinutes, currentRecord.morning_meetings, currentRecord.isTraining ]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord.employeeId) {
        console.error('Please select an employee.');
        return;
    }
    if (parseHHMMSS(currentRecord.talkTime) === 0 && parseHHMMSS(currentRecord.waitTime) === 0) {
        if (!window.confirm("Active time is 0. Are you sure you want to submit this record?")) {
            return;
        }
    }
    
    // Auto-detect training if reps is 0, or if the toggle was explicitly checked
    const isTrainingActive = currentRecord.isTraining || repsValuePreview === 0;

    const recordToSave = {
      ...currentRecord,
      ratePerHour: Number(currentRecord.ratePerHour) || 0,
      setsAdded: Number(currentRecord.setsAdded) || 0,
      moes_total: repsValuePreview,
      training: isTrainingActive,
      payment_status: 'unpaid',
      payment_batch_id: null
    };

    // Remove UI-only internal field
    const { isTraining, ...finalPayload } = recordToSave as any;

    try {
      const result = await onSaveWorkRecord(finalPayload);
      
      let message = 'Record added!'; // Default for 'created'
      if (result === 'updated') {
        message = 'Record updated!';
      } else if (result === 'merged') {
        message = 'Existing record found. Hours and sets have been added to it.';
      }
      
      showSuccessMessage(message);
      resetForm();
    } catch (error) {
      console.error("Save failed, form not reset to preserve data.");
    }
  };

  const resetForm = () => {
    setCurrentRecord(emptyRecord);
    setEditingRecordId(null);
  };
  
  const handleEditRecord = (record: WorkRecord) => {
    setEditingRecordId(record.id);
    setCurrentRecord({
        ...record,
        ratePerHour: record.ratePerHour,
        setsAdded: record.setsAdded,
        isTraining: record.training // Use the persisted training field
    });
    setIsWorkRecordFormOpen(true);
    document.getElementById('data-entry-form')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handlePerformanceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPerformanceData(prev => ({...prev, [name]: value}));
  };
  
  const handlePerformanceUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!performanceData.fullName) {
          console.error("Please select an agent.");
          return;
      }
      try {
          await api.updateAgentPerformance(performanceData.fullName, {
              breaks: Number(performanceData.breaks) || 0,
              zoom_meetings: Number(performanceData.zoom_meetings) || 0,
              rate_per_hour: Number(performanceData.rate_per_hour) || 0,
              zoom_Scheduled: Number(performanceData.zoom_Scheduled) || 0,
          });
          showSuccessMessage(`Performance data for ${performanceData.fullName} updated!`);
          setPerformanceData({ fullName: '', breaks: '', zoom_meetings: '', rate_per_hour: '', zoom_Scheduled: '' });
      } catch (error) {
          console.error("Failed to update agent performance", error);
      }
  };

  const handleCreateCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCandidateName.trim()) {
        await onCreateCandidate(newCandidateName.trim());
        setNewCandidateName('');
        showSuccessMessage('New rep added successfully!');
    }
  };

  const handleDateRangeFilter = (filter: 'daily' | 'weekly' | 'bi-weekly' | 'monthly') => {
    const today = new Date();
    let start = new Date(today);
    const end = today.toISOString().split('T')[0];
    const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];

    switch (filter) {
      case 'daily':
        setStartDate(end);
        setEndDate(end);
        break;
      case 'weekly':
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday is the first day
        start.setDate(diff);
        setStartDate(toYYYYMMDD(start));
        setEndDate(end);
        break;
      case 'bi-weekly':
        start.setDate(today.getDate() - 13);
        setStartDate(toYYYYMMDD(start));
        setEndDate(end);
        break;
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(toYYYYMMDD(start));
        setEndDate(end);
        break;
    }
    setActiveFilter(filter);
  };
  
  const handleManualDateChange = (setter: (date: string) => void, value: string) => {
    setter(value);
    setActiveFilter(null);
  };
  
  const totalPaymentPreview = useMemo(() => calculatePayment(
    activeSeconds,
    currentRecord.meetingMinutes,
    currentRecord.breakMinutes,
    currentRecord.morning_meetings,
    Number(currentRecord.ratePerHour) || 0,
    Number(currentRecord.setsAdded) || 0
  ), [activeSeconds, currentRecord.meetingMinutes, currentRecord.breakMinutes, currentRecord.morning_meetings, currentRecord.ratePerHour, currentRecord.setsAdded]);

  const grandTotalPreview = useMemo(() => {
    return totalPaymentPreview + repsValuePreview;
  }, [totalPaymentPreview, repsValuePreview]);

  const filteredRecords = useMemo(() => {
    return workRecords.filter(record => {
      if (startDate && record.date < startDate) return false;
      if (endDate && record.date > endDate) return false;
      if (selectedEmployees.length > 0 && !selectedEmployees.includes(record.employeeId)) return false;
      return true;
    }).sort((a, b) => {
        const statusOrder: { [key: string]: number } = { unpaid: 1, pending: 2, paid: 3 };
        const statusA = statusOrder[a.payment_status.toLowerCase()] || 4;
        const statusB = statusOrder[b.payment_status.toLowerCase()] || 4;
        if (statusA !== statusB) {
            return statusA - statusB;
        }
        return b.date.localeCompare(a.date);
    });
  }, [workRecords, startDate, endDate, selectedEmployees]);

  const unpaidStats = useMemo(() => {
      // "Unpaid" summary includes both 'unpaid' and 'pending' records because they are money not yet fully paid to reps.
      const unpaid = filteredRecords.filter(r => r.payment_status.toLowerCase() !== 'paid');
      
      const totalAmount = unpaid.reduce((sum, record) => {
          const active = parseHHMMSS(record.talkTime) + parseHHMMSS(record.waitTime);
          const base = calculatePayment(active, record.meetingMinutes, record.breakMinutes, record.morning_meetings, record.ratePerHour, record.setsAdded);
          const bonus = record.moes_total || 0;
          return sum + base + bonus;
      }, 0);

      const totalReps = unpaid.reduce((sum, record) => sum + (record.moes_total || 0), 0);

      return { totalAmount, totalReps };
  }, [filteredRecords]);

  const paymentBatches = useMemo(() => {
      const batches: { [key: string]: { records: WorkRecord[], status: string } } = workRecords.reduce((acc, record) => {
          if (!record.payment_batch_id) return acc;
          if (!acc[record.payment_batch_id]) {
              acc[record.payment_batch_id] = { records: [], status: record.payment_status };
          }
          acc[record.payment_batch_id].records.push(record);
          return acc;
      }, {} as { [key: string]: { records: WorkRecord[], status: string } });

      return Object.entries(batches).map(([batchId, data]) => {
          const totalAmount = data.records.reduce((sum, rec) => {
              const active = parseHHMMSS(rec.talkTime) + parseHHMMSS(rec.waitTime);
              const base = calculatePayment(active, rec.meetingMinutes, rec.breakMinutes, rec.morning_meetings, rec.ratePerHour, rec.setsAdded);
              const bonus = rec.moes_total || 0;
              return sum + base + bonus;
          }, 0);

          const employeeIds = new Set(data.records.map(r => r.employeeId));
          const dates = data.records.map(r => new Date(r.date).getTime());
          const minDate = new Date(Math.min(...dates)).toLocaleDateString();
          const maxDate = new Date(Math.max(...dates)).toLocaleDateString();

          return {
              id: batchId,
              status: data.status,
              totalAmount,
              employeeCount: employeeIds.size,
              dateRange: minDate === maxDate ? minDate : `${minDate} - ${maxDate}`,
          };
      }).sort((a, b) => b.id.localeCompare(a.id)); // Sort by most recent batch ID
  }, [workRecords]);


  const getCandidateName = useCallback((employeeId: string) => {
    const candidate = allCandidates.find(r => r.id === employeeId);
    return candidate?.alias || candidate?.name || 'Unknown';
  }, [allCandidates]);

  const availableCandidates = useMemo(() => {
    const employeesWithRecordOnDate = new Set(
      workRecords
        .filter(record => record.date === currentRecord.date)
        .map(record => record.employeeId)
    );
    return activeCandidates.filter(candidate => {
      const isCurrentlyEditingThisCandidate = editingRecordId && candidate.id === currentRecord.employeeId;
      return !employeesWithRecordOnDate.has(candidate.id) || isCurrentlyEditingThisCandidate;
    });
  }, [activeCandidates, workRecords, currentRecord.date, editingRecordId, currentRecord.employeeId]);
  
  const employeeOptions = useMemo(() => allCandidates.map(c => ({ value: c.id, label: c.alias || c.name })), [allCandidates]);

  const handleGenerateBatch = async () => {
    const unpaidRecords = filteredRecords.filter(r => r.payment_status.toLowerCase() === 'unpaid');
    
    if (unpaidRecords.length === 0) {
        return;
    }
    
    setIsGeneratingBatch(true);
    try {
        const recordIds = unpaidRecords.map(r => r.id);
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
        const batchId = `BATCH-${timestamp}`;
        
        await onGeneratePaymentBatch(recordIds, batchId);
        showSuccessMessage(`Payment batch ${batchId} created successfully!`);

    } catch (error) {
        console.error(error);
    } finally {
        setIsGeneratingBatch(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-base-100 border-b border-base-300">
        <h1 className="text-2xl font-bold text-content-100">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsRepModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-content-100 bg-base-300/50 rounded-lg hover:bg-base-300">Manage Reps</button>
          <span className="hidden sm:inline text-content-300">Welcome, {adminUser.name}!</span>
          <button onClick={onLogout} className="flex items-center px-3 py-2 text-sm font-medium text-red-600 transition-colors border border-red-300 rounded-lg hover:bg-red-500 hover:text-white">
            <LogoutIcon className="w-5 h-5 mr-1" />
            <span>Logout</span>
          </button>
        </div>
      </header>
      
      {successMessage && (
        <div className="sticky top-20 z-10 p-4 m-4 text-sm font-semibold text-green-800 bg-green-100 rounded-lg shadow-lg" role="alert">
          {successMessage}
        </div>
      )}

      <main className="p-4 sm:p-6 lg:p-8 space-y-8">
        
        <section className="p-6 bg-base-100 rounded-xl shadow-md">
           <button onClick={() => setIsPerformanceFormOpen(!isPerformanceFormOpen)} className="flex items-center justify-between w-full mb-2 group">
              <h2 className="text-xl font-bold text-content-100">Update Agent Performance</h2>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 transition-transform duration-300 text-content-300 group-hover:text-content-100 ${isPerformanceFormOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isPerformanceFormOpen && (
              <form onSubmit={handlePerformanceUpdate} className="grid grid-cols-1 gap-6 pt-4 border-t border-base-300 sm:grid-cols-2 lg:grid-cols-5">
                 <div className="col-span-1 sm:col-span-1 lg:col-span-1"><label className="block mb-1 text-sm font-semibold text-content-200">Agent</label><select name="fullName" value={performanceData.fullName} onChange={handlePerformanceFormChange} required className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"><option value="">Select Agent</option>{performanceAgents.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
                 <div><label className="block mb-1 text-sm font-semibold text-content-200">Breaks (min)</label><input type="number" name="breaks" placeholder="e.g., 30" value={performanceData.breaks} onChange={handlePerformanceFormChange} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                 <div><label className="block mb-1 text-sm font-semibold text-content-200">Zoom Meetings (min)</label><input type="number" name="zoom_meetings" placeholder="e.g., 60" value={performanceData.zoom_meetings} onChange={handlePerformanceFormChange} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                 <div><label className="block mb-1 text-sm font-semibold text-content-200">Rate Per Hour ($)</label><input type="number" step="0.01" name="rate_per_hour" placeholder="e.g., 15.50" value={performanceData.rate_per_hour} onChange={handlePerformanceFormChange} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                 {/* Corrected the onChange handler for the 'Zoom Scheduled' performance input from 'handlePerformanceData' to 'handlePerformanceFormChange' */}
                 <div><label className="block mb-1 text-sm font-semibold text-content-200">Zoom Scheduled</label><input type="number" name="zoom_Scheduled" placeholder="Count" value={performanceData.zoom_Scheduled} onChange={handlePerformanceFormChange} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                 <div className="flex items-end lg:col-span-5">
                   <button type="submit" className="w-full px-6 py-3 font-semibold text-base-100 bg-accent rounded-lg sm:w-auto hover:bg-opacity-90">Update Performance</button>
                 </div>
              </form>
            )}
        </section>

        <section id="data-entry-form" className="p-6 bg-base-100 rounded-xl shadow-md">
            <button onClick={() => setIsWorkRecordFormOpen(!isWorkRecordFormOpen)} className="flex items-center justify-between w-full mb-2 group">
              <h2 className="text-xl font-bold text-content-100">{editingRecordId ? 'Edit Work Record' : 'Add New Work Record'}</h2>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 transition-transform duration-300 text-content-300 group-hover:text-content-100 ${isWorkRecordFormOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isWorkRecordFormOpen && (
              <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-6 pt-4 border-t border-base-300 sm:grid-cols-2 lg:grid-cols-4">
                <div className="col-span-1 sm:col-span-1"><label className="block mb-1 text-sm font-semibold text-content-200">Employee</label><select name="employeeId" value={currentRecord.employeeId} onChange={handleFormChange} required className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"><option value="">Select a Rep</option>{availableCandidates.map(rep => <option key={rep.id} value={rep.id}>{rep.alias || rep.name}</option>)}</select></div>
                <div className="col-span-1 sm:col-span-1"><label className="block mb-1 text-sm font-semibold text-content-200">Work Date</label><input type="date" name="date" value={currentRecord.date} onChange={handleFormChange} required className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                
                <TimeInput label="Talk Time (H:M:S)" value={currentRecord.talkTime} onChange={(value) => handleTimeChange('talkTime', value)} required />
                <TimeInput label="Wait Time (H:M:S)" value={currentRecord.waitTime} onChange={(value) => handleTimeChange('waitTime', value)} />

                <div className="p-3 text-center bg-base-200 rounded-md">
                  <label className="block text-sm font-semibold text-content-300">Active Hours</label>
                  <p className="text-2xl font-bold text-content-100">{formatSeconds(activeSeconds)}</p>
                </div>

                <div className="relative">
                  <label className="block mb-1 text-sm font-semibold text-content-200">Rate Per Hour ($)</label>
                  <div className="flex space-x-2">
                    <input type="number" step="0.01" name="ratePerHour" placeholder="0" value={currentRecord.ratePerHour} onChange={handleFormChange} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/>
                    <button 
                      type="button" 
                      onClick={() => setCurrentRecord(prev => ({...prev, isTraining: !prev.isTraining}))}
                      className={`flex items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 border-2 ${currentRecord.isTraining ? 'bg-yellow-50 border-accent text-accent' : 'bg-base-300/30 border-transparent text-content-300 hover:border-base-400'}`}
                    >
                      {currentRecord.isTraining && <CheckCircleIcon className="w-4 h-4 mr-1 text-accent" />}
                      Training
                    </button>
                  </div>
                </div>

                <div><label className="block mb-1 text-sm font-semibold text-content-200">Sets Added Today</label><input type="number" name="setsAdded" placeholder="0" value={currentRecord.setsAdded} onChange={handleFormChange} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                
                <div className={`p-3 space-y-2 rounded-md transition-colors duration-300 ${currentRecord.isTraining ? 'bg-yellow-100 border border-yellow-200' : 'bg-green-100'}`}>
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <label className={`block text-xs font-semibold ${currentRecord.isTraining ? 'text-yellow-800/80' : 'text-green-800/80'}`}>Payment</label>
                        <p className={`text-lg font-bold ${currentRecord.isTraining ? 'text-yellow-900' : 'text-green-900'}`}>${totalPaymentPreview.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <label className={`block text-xs font-semibold ${currentRecord.isTraining ? 'text-yellow-800/80' : 'text-green-800/80'}`}>Reps</label>
                        <p className={`text-lg font-bold ${currentRecord.isTraining ? 'text-yellow-900' : 'text-green-900'}`}>${repsValuePreview.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className={`pt-2 text-center border-t ${currentRecord.isTraining ? 'border-yellow-200' : 'border-green-200'}`}>
                      <label className={`block text-sm font-semibold ${currentRecord.isTraining ? 'text-yellow-800/80' : 'text-green-800/80'}`}>Total</label>
                      <p className={`text-2xl font-bold ${currentRecord.isTraining ? 'text-yellow-900' : 'text-green-900'}`}>${grandTotalPreview.toFixed(2)}</p>
                    </div>
                </div>

                <div className="col-span-1 lg:col-span-1">
                  <label className="block mb-2 text-sm font-semibold text-content-200">Breaks</label>
                  <div className="flex space-x-2">{[0, 30, 45, 60].map(m => (<button type="button" key={`b-${m}`} onClick={() => handleQuickSelectChange('breakMinutes', m)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentRecord.breakMinutes === m ? 'bg-accent text-base-100' : 'bg-base-300/50 text-content-200 hover:bg-base-300'}`}>{m === 0 ? 'None' : m === 60 ? '1hr' : `${m}m`}</button>))}</div>
                </div>

                <div><label className="block mb-2 text-sm font-semibold text-content-200">Zoom Scheduled</label><div className="flex space-x-2">{[0, 30, 45, 60].map(m => (<button type="button" key={`m-${m}`} onClick={() => handleQuickSelectChange('meetingMinutes', m)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentRecord.meetingMinutes === m ? 'bg-accent text-base-100' : 'bg-base-300/50 text-content-200 hover:bg-base-300'}`}>{m === 0 ? 'None' : m === 60 ? '1hr' : `${m}m`}</button>))}</div></div>
                
                <div><label className="block mb-2 text-sm font-semibold text-content-200">Morning Meetings</label><div className="flex space-x-2">{[0, 30].map(m => (<button type="button" key={`mm-${m}`} onClick={() => handleQuickSelectChange('morning_meetings', m)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${currentRecord.morning_meetings === m ? 'bg-accent text-base-100' : 'bg-base-300/50 text-content-200 hover:bg-base-300'}`}>{m === 0 ? 'None' : '30m'}</button>))}</div></div>

                <div className="flex items-end space-x-4 sm:col-span-2 lg:col-span-1">
                  <button type="submit" className="w-full px-6 py-3 font-semibold text-base-100 bg-accent rounded-lg hover:bg-opacity-90">{editingRecordId ? 'Update Record' : 'Submit Record'}</button>
                  {editingRecordId && <button type="button" onClick={resetForm} className="w-full px-6 py-3 font-semibold text-content-200 bg-base-300 rounded-lg hover:bg-base-400">Cancel Edit</button>}
                </div>
              </form>
            )}
        </section>

        <section className="p-6 bg-base-100 rounded-xl shadow-md">
            <h2 className="mb-4 text-xl font-bold text-content-100">Work Records</h2>
            <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="block mb-1 text-sm font-semibold text-content-200">From:</label><input type="date" value={startDate} onChange={e => handleManualDateChange(setStartDate, e.target.value)} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                <div><label className="block mb-1 text-sm font-semibold text-content-200">To:</label><input type="date" value={endDate} onChange={e => handleManualDateChange(setEndDate, e.target.value)} className="w-full px-3 py-2 bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"/></div>
                <div className="lg:col-span-1"><label className="block mb-1 text-sm font-semibold text-content-200">Employees:</label><MultiSelect options={employeeOptions} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="All Employees" /></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-4 border-y border-base-300">
                <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-content-300">Unpaid Total (Base + Reps)</div>
                      <div className="text-2xl font-bold text-accent">${unpaidStats.totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="text-center border-l border-base-300 pl-8">
                      <div className="text-sm font-semibold text-content-300">Reps (Bonus) Total</div>
                      <div className="text-2xl font-bold text-content-100">${unpaidStats.totalReps.toFixed(2)}</div>
                    </div>
                </div>
                <button
                    onClick={handleGenerateBatch}
                    disabled={isGeneratingBatch}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isGeneratingBatch ? 'Generating...' : 'Generate Payment Batch'}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-base-200 text-content-300"><tr className="text-left">
                        <th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Employee</th><th className="px-4 py-3 font-semibold">Base Payment</th><th className="px-4 py-3 font-semibold">Reps</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Batch ID</th><th className="px-4 py-3 font-semibold">Actions</th>
                    </tr></thead>
                    <tbody>{filteredRecords.map((rec) => {
                       const active = parseHHMMSS(rec.talkTime) + parseHHMMSS(rec.waitTime);
                       const payment = calculatePayment(active, rec.meetingMinutes, rec.breakMinutes, rec.morning_meetings, rec.ratePerHour, rec.setsAdded);
                       const isLocked = rec.payment_status.toLowerCase() === 'paid';
                       return (<tr key={rec.id} className={`${isLocked ? 'bg-gray-50' : ''} ${rec.training ? 'bg-yellow-50/30' : ''}`}>
                            <td className="px-4 py-3">{rec.date}</td>
                            <td className="px-4 py-3 font-medium text-content-100">{getCandidateName(rec.employeeId)}</td>
                            <td className="px-4 py-3 font-semibold text-content-100">${payment.toFixed(2)}</td>
                            <td className="px-4 py-3 font-semibold text-content-100">${(rec.moes_total || 0).toFixed(2)}</td>
                            <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full capitalize ${paymentStatusColorMap[rec.payment_status.toLowerCase()] || ''}`}>{rec.payment_status}</span>
                                {rec.training && <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-bold text-yellow-800 bg-yellow-100 rounded-full uppercase">Training</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-content-300">{rec.payment_batch_id || 'N/A'}</td>
                            <td className="flex items-center px-4 py-3 space-x-3">
                                <button onClick={() => handleEditRecord(rec)} className="text-content-300 hover:text-accent disabled:text-gray-400 disabled:cursor-not-allowed" disabled={isLocked}><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => onDeleteWorkRecord(rec.id)} className="text-content-300 hover:text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={isLocked}><TrashIcon className="w-5 h-5" /></button>
                            </td>
                        </tr>)
                    })}</tbody>
                </table>
                 {filteredRecords.length === 0 && <p className="py-8 text-center text-content-300">No records found for the selected filters.</p>}
            </div>
        </section>

        <section className="p-6 bg-base-100 rounded-xl shadow-md">
            <h2 className="mb-4 text-xl font-bold text-content-100">Payment Batches</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-base-200 text-content-300">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Batch ID</th><th className="px-4 py-3 font-semibold">Date Range</th><th className="px-4 py-3 font-semibold">Total Amount (Inc Reps)</th><th className="px-4 py-3 font-semibold">Employee Count</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paymentBatches.map(batch => (
                            <tr key={batch.id}>
                                <td className="px-4 py-3 font-mono text-xs text-content-200">{batch.id}</td>
                                <td className="px-4 py-3">{batch.dateRange}</td>
                                <td className="px-4 py-3 font-semibold text-content-100">${batch.totalAmount.toFixed(2)}</td>
                                <td className="px-4 py-3">{batch.employeeCount}</td>
                                <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full capitalize ${paymentStatusColorMap[batch.status.toLowerCase()] || ''}`}>{batch.status}</span></td>
                                <td className="px-4 py-3">
                                    {batch.status.toLowerCase() === 'pending' && (
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => onMarkBatchAsPaid(batch.id)} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">
                                                Mark as Paid
                                            </button>
                                            <button onClick={() => onRevertPaymentBatch(batch.id)} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {paymentBatches.length === 0 && <p className="py-8 text-center text-content-300">No payment batches have been generated yet.</p>}
            </div>
        </section>
      </main>

      <Modal isOpen={isRepModalOpen} onClose={() => setIsRepModalOpen(false)} title="Manage Reps">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {allCandidates.map(candidate => (
            <div key={candidate.id} className="p-3 bg-base-200 rounded-lg">
              <div className="grid items-center grid-cols-1 gap-4 md:grid-cols-3">
                <div className="font-semibold text-content-100 md:col-span-1">
                  {candidate.alias ? (<>{candidate.alias}<span className="ml-2 text-sm font-normal text-content-300">({candidate.name})</span></>) : (candidate.name)}
                  <div className="text-xs font-normal text-content-300">(@{candidate.username || 'not set'})</div>
                </div>
                <div className="flex items-center justify-start gap-2 md:col-span-2">
                    <select value={candidate.status?.toLowerCase() || ''} onChange={(e) => onUpdateCandidateStatus(candidate.id, e.target.value)} className={`w-full max-w-[120px] text-xs font-semibold border-none rounded-md appearance-none capitalize ${statusColorMap[candidate.status?.toLowerCase() || 'default'] || statusColorMap.default}`}>
                       {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                   <button onClick={() => onRevokeCandidateAccess(candidate.id)} className="p-1.5 text-white bg-yellow-500 rounded-md hover:bg-yellow-600" title="Revoke Access (clears password)"><BanIcon className="w-4 h-4" /></button>
                  <button onClick={() => onDeleteCandidate(candidate.id)} className="p-1.5 text-white bg-red-600 rounded-md hover:bg-red-700" title="Delete Rep and all their records"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid items-center grid-cols-1 gap-3 mt-3 sm:grid-cols-3">
                <div className="relative flex items-center"><TagIcon className="absolute w-5 h-5 text-content-300 left-3" /><input type="text" placeholder="Set alias" value={aliases[candidate.id] ?? candidate.alias ?? ''} onChange={e => handleAliasChange(candidate.id, e.target.value)} className="w-full py-2 pl-10 pr-2 bg-base-100 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent" /></div>
                <div className="relative flex items-center"><UserIcon className="absolute w-5 h-5 text-content-300 left-3" /><input type="text" placeholder="Set username" value={usernames[candidate.id] ?? candidate.username ?? ''} onChange={e => handleUsernameChange(candidate.id, e.target.value)} className="w-full py-2 pl-10 pr-2 bg-base-100 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent" /></div>
                <div className="relative flex items-center"><KeyIcon className="absolute w-5 h-5 text-content-300 left-3" /><input type="password" placeholder="Set new password" value={passwords[candidate.id] || ''} onChange={e => handlePasswordChange(candidate.id, e.target.value)} className="w-full py-2 pl-10 pr-2 bg-base-100 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent" /></div>
                 <button onClick={() => handleUpdateCandidateDetails(candidate.id)} disabled={aliases[candidate.id] === undefined && usernames[candidate.id] === undefined && passwords[candidate.id] === undefined} className="w-full px-3 py-2 mt-1 text-sm font-semibold text-white bg-green-600 rounded-md sm:col-span-3 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Save Details</button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 mt-4 border-t border-base-300">
            <h4 className="mb-2 font-semibold text-content-100">Add New Rep</h4>
            <form onSubmit={handleCreateCandidateSubmit} className="flex items-center gap-2">
                <input type="text" placeholder="New Rep Name" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent" />
                <button type="submit" className="flex items-center justify-center px-4 py-2 font-semibold text-base-100 bg-accent rounded-lg whitespace-nowrap hover:bg-opacity-90 disabled:bg-opacity-50" disabled={!newCandidateName.trim()}><PlusIcon className="w-5 h-5 mr-1"/> Add</button>
            </form>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
