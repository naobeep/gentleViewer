import React from 'react';

export const IpcTestButton: React.FC = () => {
  const run = async () => {
    try {
      const res = await (window as any).electronAPI.ipcTestPing({ from: 'renderer' });
      console.log('ping result', res);
    } catch (e) {
      console.error(e);
    }
  };

  return <button onClick={run}>IPC Ping</button>;
};