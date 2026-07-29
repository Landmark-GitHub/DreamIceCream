'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

type LogEntry = {
  id: string;
  timestamp: string;
  action: string | null;
  details: string | null;
  type: string | null;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch last 100 logs
    const logsQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
      setLogs(logsData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching logs from Firebase:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading logs...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-semibold text-gray-600">Timestamp</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Type</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium text-gray-900">{log.action}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium capitalize">
                          {log.type || 'System'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 text-sm">{log.details}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No activity logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
