import { supabase } from './lib/supabaseClient';
import { User, WorkRecord, Role } from './types';

// --- AUTH ---
// Note: This is a client-side "token" for session management, not a secure JWT.
// The actual data access is controlled by Supabase's anon key and RLS policies.
const createClientSideToken = (user: User) => btoa(JSON.stringify(user));
const decodeClientSideToken = (token: string): User => JSON.parse(atob(token));

export const adminLogin = async (passcode: string): Promise<{ user: User, token: string }> => {
  // Hardcode the passcode check to ensure login works without database dependency.
  if (passcode !== 'SFADMIN123') {
    throw new Error('Invalid admin passcode.');
  }
  
  const user: User = {
    id: 'admin-user-id', // A static ID for the admin user
    username: 'admin',
    name: 'Admin',
    role: Role.Admin,
  };
  
  const token = createClientSideToken(user);
  return Promise.resolve({ user, token });
};

export const repLogin = async (username: string, password: string): Promise<{ user: User, token: string }> => {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('username', username)
    .eq('password', password) // WARNING: Storing and comparing plain text passwords is not secure.
    .not('password', 'is', null)
    .single();

  if (error || !data) {
    if (error) console.error('Supabase error:', error);
    throw new Error('Invalid rep credentials or access has been revoked.');
  }

  const user: User = {
    id: data.id,
    username: data.username || data.name, // Fallback to name if username is somehow null
    name: data.name,
    role: Role.Rep,
    alias: data.alias,
  };

  const token = createClientSideToken(user);
  return { user, token };
};

export const getSession = async (): Promise<{user: User}> => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error("No session found");
    }
    try {
        const user = decodeClientSideToken(token);
        return { user };
    } catch (e) {
        throw new Error("Invalid session token");
    }
};

// --- CANDIDATES (Users) ---
export const fetchActiveCandidates = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .in('status', ['probation', 'working', 'training', 'Probation', 'Working', 'Training'])
    .order('name');
    
  if (error) throw new Error(error.message);
  return data.map(candidate => ({ id: candidate.id, username: candidate.username || '', name: candidate.name, role: Role.Rep, status: candidate.status, alias: candidate.alias }));
};

export const fetchAllCandidates = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('name');
    
  if (error) throw new Error(error.message);
  return data.map(candidate => ({ id: candidate.id, username: candidate.username || '', name: candidate.name, role: Role.Rep, status: candidate.status, alias: candidate.alias }));
};


export const createCandidate = async (name: string): Promise<User> => {
    const username = name.toLowerCase().replace(/\s+/g, '');
    const { data, error } = await supabase
        .from('candidates')
        .insert({ name, username, status: 'probation' }) // Default new candidates to probation
        .select()
        .single();
    
    if (error) {
        if (error.code === '23505') { // Handle unique constraint violation for username
            throw new Error(`A user with username '${username}' already exists.`);
        }
        throw new Error(error.message);
    }

    return { id: data.id, name: data.name, username: data.username || '', role: Role.Rep };
};

export const updateCandidateDetails = async (candidateId: string, details: { username?: string; password?: string; alias?: string }): Promise<void> => {
  const updateData: { username?: string; password?: string; alias?: string } = {};
  if (details.username !== undefined) updateData.username = details.username;
  if (details.password !== undefined) updateData.password = details.password;
  if (details.alias !== undefined) updateData.alias = details.alias;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No details provided to update.");
  }

  const { error } = await supabase
    .from('candidates')
    .update(updateData)
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
};

export const updateCandidateStatus = async (candidateId: string, status: string): Promise<void> => {
  const { error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
};

export const revokeCandidateAccess = async (candidateId: string): Promise<void> => {
  const { error } = await supabase
    .from('candidates')
    .update({ password: null })
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
};

export const deleteCandidate = async (candidateId: string): Promise<void> => {
  // First, delete all associated work records to avoid foreign key violations.
  // This is safer than relying on CASCADE DELETE if it is not configured on the DB.
  const { error: recordsError } = await supabase
    .from('sf_work_records')
    .delete()
    .eq('employeeId', candidateId);

  if (recordsError) {
    throw new Error(`Failed to delete associated work records: ${recordsError.message}`);
  }

  // Then, delete the candidate themselves.
  const { error: candidateError } = await supabase
    .from('candidates')
    .delete()
    .eq('id', candidateId);

  if (candidateError) {
    throw new Error(`Failed to delete candidate: ${candidateError.message}`);
  }
};


// --- WORK RECORDS ---
export const fetchWorkRecords = async (filters: { employeeId?: string } = {}): Promise<WorkRecord[]> => {
  let query = supabase.from('sf_work_records').select('*');
  
  if (filters.employeeId) {
    query = query.eq('employeeId', filters.employeeId);
  }

  const { data, error } = await query;
  
  if (error) throw new Error(error.message);
  return data || [];
};

export const createWorkRecord = async (recordData: Omit<WorkRecord, 'id'>): Promise<WorkRecord> => {
  const { data, error } = await supabase
    .from('sf_work_records')
    .insert(recordData as any)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateWorkRecord = async (recordId: string, recordData: Partial<WorkRecord>): Promise<WorkRecord> => {
  // Supabase update doesn't like the 'id' field in the payload
  const updatePayload = { ...recordData };
  delete updatePayload.id;

  const { data, error } = await supabase
    .from('sf_work_records')
    .update(updatePayload)
    .eq('id', recordId)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  return data;
};

export const deleteWorkRecord = async (recordId: string): Promise<void> => {
  const { error } = await supabase.from('sf_work_records').delete().eq('id', recordId);
  if (error) throw new Error(error.message);
};

export const generatePaymentBatch = async (recordIds: string[], batchId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('sf_work_records')
    .update({ payment_status: 'pending', payment_batch_id: batchId })
    .in('id', recordIds)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    // This handles cases where the update is permitted but affects 0 rows (e.g., due to RLS).
    // This makes the silent failure visible to the user.
    throw new Error("No records were updated. This may be due to database permissions or the records may have been updated by someone else.");
  }
};

export const markBatchAsPaid = async (batchId: string): Promise<void> => {
  const { error } = await supabase
    .from('sf_work_records')
    .update({ payment_status: 'paid' })
    .eq('payment_batch_id', batchId);
  if (error) throw new Error(error.message);
};

export const revertPaymentBatch = async (batchId: string): Promise<void> => {
  const { error } = await supabase
    .from('sf_work_records')
    .update({ payment_status: 'unpaid', payment_batch_id: null })
    .eq('payment_batch_id', batchId)
    .eq('payment_status', 'pending');
  if (error) throw new Error(error.message);
};


// --- AGENT PERFORMANCE SYNC ---
// Fetches unique, sorted agent names from the performance sync table.
export const fetchAgentNamesFromPerformanceSync = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('agent_performance_sync')
    .select('full_name');
    
  if (error) throw new Error(error.message);
  if (!data) return [];
  
  // The typed Supabase client should ensure `data` is an array of objects
  // with a `full_name` property of type string.
  const names = (data
    .map((item) => item.full_name) as any[])
    // Use a type guard to filter for non-empty strings. Casting to any[] first
    // handles cases where Supabase type inference might be failing.
    .filter((name): name is string => typeof name === 'string' && name.length > 0);

  return [...new Set(names)].sort(); // Return unique, sorted names
};

export const updateAgentPerformance = async (fullName: string, performanceData: { breaks: number; zoom_meetings: number; rate_per_hour: number; zoom_Scheduled: number; }): Promise<void> => {
  const { error } = await supabase
    .from('agent_performance_sync')
    .update(performanceData)
    .eq('full_name', fullName);
  
  if (error) throw new Error(error.message);
};