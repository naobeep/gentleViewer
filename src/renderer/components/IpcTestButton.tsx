import React from 'react';

export const IpcTestButton: React.FC = () => {
  const run = async () => {
    try {
      const res = await (window as any).electronAPI.ipcTestPing?.({
        from: 'renderer-ui',
        ts: Date.now(),
      });
      console.log('ping result', res);
    } catch (e) {
      console.error('ping failed', e);
    }
  };

  return (
    <button onClick={run} style={{ padding: 8, borderRadius: 6 }}>
      IPC Ping
    </button>
  );
};
