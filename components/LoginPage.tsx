
import React, { useState } from 'react';
import { User, Role } from '../types';
import { adminLogin, repLogin } from '../api';
import { KeyIcon, UserIcon, LockClosedIcon } from './icons';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [role, setRole] = useState<Role>(Role.Admin);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let loginResult;
      if (role === Role.Admin) {
        if (!passcode) {
            setError("Admin passcode is required.");
            setIsLoading(false);
            return;
        }
        loginResult = await adminLogin(passcode);
      } else {
        loginResult = await repLogin(username, password);
      }
      localStorage.setItem('authToken', loginResult.token);
      onLogin(loginResult.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (newRole: Role) => {
      setRole(newRole);
      setError('');
      setUsername('');
      setPassword('');
      setPasscode('');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="w-full max-w-sm p-8 space-y-6 bg-base-100 rounded-lg shadow-md">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-content-100">
                Portal Access
            </h2>
            <p className="mt-2 text-sm text-content-300">
                Please sign in to continue
            </p>
        </div>
        <div className="flex p-1 bg-base-300 rounded-lg">
          <button
            onClick={() => handleRoleChange(Role.Admin)}
            className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${
              role === Role.Admin ? 'bg-base-100 text-content-100 shadow' : 'text-content-300 hover:bg-base-200'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleRoleChange(Role.Rep)}
            className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${
              role === Role.Rep ? 'bg-base-100 text-content-100 shadow' : 'text-content-300 hover:bg-base-200'
            }`}
          >
            Rep
          </button>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            {role === Role.Admin ? (
                <div className="relative">
                    <KeyIcon className="absolute w-5 h-5 text-content-300 left-3 top-3.5" />
                    <label htmlFor="passcode" className="sr-only">Admin Passcode</label>
                    <input id="passcode" name="passcode" type="password" required
                        className="relative block w-full px-4 py-3 pl-10 text-content-100 placeholder-content-300 bg-base-200 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm"
                        placeholder="Admin Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>
            ) : (
                <>
                    <div className="relative">
                        <UserIcon className="absolute w-5 h-5 text-content-300 left-3 top-3.5" />
                        <label htmlFor="username" className="sr-only">Username</label>
                        <input id="username" name="username" type="text" required
                            className="relative block w-full px-4 py-3 pl-10 text-content-100 placeholder-content-300 bg-base-200 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm"
                            placeholder="Rep Username" value={username} onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                        />
                    </div>
                    <div className="relative">
                        <LockClosedIcon className="absolute w-5 h-5 text-content-300 left-3 top-3.5" />
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input id="password" name="password" type="password" required
                            className="relative block w-full px-4 py-3 pl-10 text-content-100 placeholder-content-300 bg-base-200 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm"
                            placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>
                </>
            )}
          </div>
          
          {error && <p className="text-xs font-medium text-center text-red-500">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex justify-center w-full px-4 py-3 mt-4 text-base font-semibold text-base-100 bg-accent border border-transparent rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;