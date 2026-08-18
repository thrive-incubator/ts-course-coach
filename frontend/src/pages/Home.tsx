import { useState } from 'react';
import { checkHealth } from '../services/api';

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [response, setResponse] = useState<string>('');

  const handleCheck = async () => {
    setStatus('loading');
    try {
      const data = await checkHealth();
      setResponse(JSON.stringify(data, null, 2));
      setStatus('success');
    } catch (err) {
      setResponse(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          TS Course Coach
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Your project is ready.</p>

        <button
          onClick={handleCheck}
          disabled={status === 'loading'}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium
                     hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {status === 'loading' ? 'Checking...' : 'Test Backend Connection'}
        </button>

        {status === 'success' && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-green-700 dark:text-green-400 font-medium mb-2">Connected successfully</p>
            <pre className="text-xs text-green-600 dark:text-green-300 text-left overflow-auto">{response}</pre>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-400 font-medium mb-2">Connection failed</p>
            <pre className="text-xs text-red-600 dark:text-red-300 text-left overflow-auto">{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
