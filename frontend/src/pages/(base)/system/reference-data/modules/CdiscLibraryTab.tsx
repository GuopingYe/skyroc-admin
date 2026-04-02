import { useState } from 'react';

import { Space } from 'antd';

import ConfigSection from './ConfigSection';
import SyncControlSection from './SyncControlSection';
import SyncHistorySection from './SyncHistorySection';
import ScheduleSection from './ScheduleSection';

const CdiscLibraryTab: React.FC = () => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <ConfigSection />
      <SyncControlSection activeTaskId={activeTaskId} onSyncStart={setActiveTaskId} />
      <ScheduleSection />
      <SyncHistorySection onRetry={taskId => setActiveTaskId(taskId)} />
    </Space>
  );
};

export default CdiscLibraryTab;
