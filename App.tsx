
import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import RepDashboard from './components/RepDashboard';
import { User, Role, WorkRecord } from './types';
import * as api from './api';
import { formatSeconds, parseHHMMSS } from './utils/time';

const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [activeCandidates, setActiveCandidates] = useState<User[]>([]);
  const [allCandidates, setAllCandidates] = useState<User[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppData = useCallback(async (user: User) => {
    try {
      if (user.role === Role.Admin) {
        const [activeCandidatesData, allCandidatesData, recordsData] = await Promise.all([
          api.fetchActiveCandidates(),
          api.fetchAllCandidates(),
          api.fetchWorkRecords(),
        ]);
        setActiveCandidates(activeCandidatesData);
        setAllCandidates(allCandidatesData);
        setWorkRecords(recordsData);
      } else {
        const recordsData = await api.fetchWorkRecords({ employeeId: user.id });
        setWorkRecords(recordsData);
        setActiveCandidates([]);
        setAllCandidates([]);
      }
    } catch (error) {
      console.error("Failed to fetch app data", error);
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
          handleLogout();
      }
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const { user } = await api.getSession();
          setLoggedInUser(user);
        } catch (error) {
          console.error("Session check failed", error);
          localStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (loggedInUser) {
      fetchAppData(loggedInUser);
    }
  }, [loggedInUser, fetchAppData]);

  const handleLogin = (user: User) => {
    setLoggedInUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setLoggedInUser(null);
    setActiveCandidates([]);
    setAllCandidates([]);
    setWorkRecords([]);
  };
  
  const handleUpdateCandidateStatus = async (candidateId: string, status: string) => {
    try {
      await api.updateCandidateStatus(candidateId, status);
      if (loggedInUser) {
        await fetchAppData(loggedInUser);
      }
    } catch(error) {
      console.error(error);
    }
  };

  const handleUpdateCandidateDetails = async (candidateId: string, details: { alias?: string; username?: string; password?: string }) => {
    try {
      await api.updateCandidateDetails(candidateId, details);
      if (loggedInUser) {
        await fetchAppData(loggedInUser); // Refresh candidate list
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRevokeCandidateAccess = async (candidateId: string) => {
    if (window.confirm('Are you sure you want to revoke access for this candidate? They will no longer be able to log in.')) {
      await api.revokeCandidateAccess(candidateId);
      if (loggedInUser) {
        await fetchAppData(loggedInUser);
      }
    }
  };

  const handleSaveWorkRecord = async (record: Omit<WorkRecord, 'id'> & { id?: string }): Promise<string> => {
    try {
      // Handling explicit edits from the table
      if (record.id) {
        await api.updateWorkRecord(record.id, record);
        if (loggedInUser) await fetchAppData(loggedInUser);
        return 'updated';
      }

      // Handling new submissions, which might be merges
      const existingRecord = workRecords.find(
        r => r.employeeId === record.employeeId && r.date === record.date
      );
      
      if (existingRecord) {
        const newMoesTotal = (existingRecord.moes_total || 0) + record.moes_total;
        
        // MERGE case: Add new values to the existing record
        const mergedRecord = {
          talkTime: formatSeconds(parseHHMMSS(existingRecord.talkTime) + parseHHMMSS(record.talkTime)),
          waitTime: formatSeconds(parseHHMMSS(existingRecord.waitTime) + parseHHMMSS(record.waitTime)),
          breakMinutes: existingRecord.breakMinutes + record.breakMinutes,
          meetingMinutes: existingRecord.meetingMinutes + record.meetingMinutes,
          setsAdded: existingRecord.setsAdded + record.setsAdded,
          ratePerHour: Number(record.ratePerHour) || existingRecord.ratePerHour, // Use new rate, fallback to old
          moes_total: newMoesTotal,
          training: newMoesTotal === 0, // Re-evaluate training status based on reps bonus
        };
        await api.updateWorkRecord(existingRecord.id, mergedRecord);
        if (loggedInUser) await fetchAppData(loggedInUser);
        return 'merged';
      } else {
        // CREATE case: No existing record found for this day
        await api.createWorkRecord(record as Omit<WorkRecord, 'id'>);
        if (loggedInUser) await fetchAppData(loggedInUser);
        return 'created';
      }
    } catch (error) {
      console.error("Failed to save work record:", error);
      let errorMessage = "An unknown error occurred while saving the record.";
      if (error instanceof Error) {
        if (error.message.includes('violates foreign key constraint') && error.message.includes('employeeId')) {
          errorMessage = "The selected employee may have been deleted. The list has been refreshed. Please try again.";
          if (loggedInUser) {
            await fetchAppData(loggedInUser);
          }
        } else {
          errorMessage = error.message;
        }
      }
      console.error(`Failed to save record: ${errorMessage}`);
      throw error;
    }
  };


  const handleDeleteWorkRecord = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this work record?')) {
      await api.deleteWorkRecord(recordId);
      if (loggedInUser) {
        await fetchAppData(loggedInUser);
      }
    }
  };

  const handleGeneratePaymentBatch = async (recordIds: string[], batchId: string) => {
    try {
        await api.generatePaymentBatch(recordIds, batchId);
        if (loggedInUser) {
            await fetchAppData(loggedInUser);
        }
    } catch (error) {
        console.error("Failed to generate payment batch", error);
        throw error; // Re-throw so the calling component knows about the failure.
    }
  };
  
  const handleMarkBatchAsPaid = async (batchId: string) => {
    if (window.confirm(`Are you sure you want to mark batch ${batchId} as paid?`)) {
        try {
            await api.markBatchAsPaid(batchId);
            if (loggedInUser) {
                await fetchAppData(loggedInUser);
            }
        } catch (error) {
            console.error("Failed to mark batch as paid", error);
        }
    }
  };
  
  const handleRevertPaymentBatch = async (batchId: string) => {
    try {
        await api.revertPaymentBatch(batchId);
        if (loggedInUser) {
            await fetchAppData(loggedInUser);
        }
    } catch (error) {
        console.error("Failed to revert payment batch", error);
    }
  };


  const handleCreateCandidate = async (name: string) => {
    try {
      await api.createCandidate(name);
      if (loggedInUser) {
        await fetchAppData(loggedInUser);
      }
    } catch (error) {
        console.error("Failed to create candidate", error);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this rep and all their work records? This action cannot be undone.')) {
        try {
            await api.deleteCandidate(candidateId);
            if (loggedInUser) {
                await fetchAppData(loggedInUser);
            }
        } catch (error) {
            console.error("Failed to delete candidate", error);
        }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading Portal...
      </div>
    );
  }

  if (!loggedInUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      {loggedInUser.role === Role.Admin ? (
        <AdminDashboard
          adminUser={loggedInUser}
          activeCandidates={activeCandidates}
          allCandidates={allCandidates}
          workRecords={workRecords}
          onLogout={handleLogout}
          onUpdateCandidateDetails={handleUpdateCandidateDetails}
          onRevokeCandidateAccess={handleRevokeCandidateAccess}
          onSaveWorkRecord={handleSaveWorkRecord}
          onDeleteWorkRecord={handleDeleteWorkRecord}
          onGeneratePaymentBatch={handleGeneratePaymentBatch}
          onMarkBatchAsPaid={handleMarkBatchAsPaid}
          onRevertPaymentBatch={handleRevertPaymentBatch}
          onCreateCandidate={handleCreateCandidate}
          onDeleteCandidate={handleDeleteCandidate}
          onUpdateCandidateStatus={handleUpdateCandidateStatus}
        />
      ) : (
        <RepDashboard
          repUser={loggedInUser}
          allWorkRecords={workRecords}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;
