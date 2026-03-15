/** MilestoneTimeline - 项目里程碑时间轴视图 */
import { Card, Empty, Tag, Timeline, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { IProjectMilestone } from '../types';
import { milestoneStatusConfig } from '../types';

interface MilestoneTimelineProps {
  milestones: IProjectMilestone[];
}

const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ milestones }) => {
  const { t } = useTranslation();

  // 按时间排序里程碑
  const sortedMilestones = useMemo(() => {
    return [...milestones]
      .filter(m => m.plannedDate || m.actualDate)
      .sort((a, b) => {
        const dateA = a.actualDate || a.plannedDate || '';
        const dateB = b.actualDate || b.plannedDate || '';
        return dayjs(dateA).unix() - dayjs(dateB).unix();
      });
  }, [milestones]);

  // 获取时间轴颜色
  const getTimelineColor = (status: string): string => {
    const colors: Record<string, string> = {
      AtRisk: 'orange',
      Completed: 'green',
      Delayed: 'red',
      OnTrack: 'green',
      Pending: 'gray'
    };
    return colors[status] || 'gray';
  };

  if (sortedMilestones.length === 0) {
    return (
      <Card
        className="card-wrapper"
        size="small"
      >
        <Empty
          description={t('page.mdr.pipelineManagement.milestone.noMilestones')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="card-wrapper"
      size="small"
      title={
        <div className="flex items-center gap-8px">
          <div className="i-mdi-timeline-clock-outline text-blue-500" />
          <span>{t('page.mdr.pipelineManagement.milestone.timelineTitle')}</span>
        </div>
      }
    >
      <Timeline
        items={sortedMilestones.map(milestone => ({
          children: (
            <div className="flex flex-col gap-4px">
              <div className="flex items-center gap-8px">
                <span className="font-medium">{milestone.name}</span>
                <Tag
                  className="m-0"
                  color={milestoneStatusConfig[milestone.status].color}
                >
                  {t(`page.mdr.pipelineManagement.milestone.status.${milestone.status}`)}
                </Tag>
                <Tag
                  className="m-0"
                  color={milestone.level === 'Study' ? 'orange' : 'purple'}
                >
                  {milestone.level}
                </Tag>
              </div>
              <div className="flex items-center gap-16px text-12px text-gray-500">
                <span>
                  <span className="text-gray-400">{t('page.mdr.pipelineManagement.milestone.cols.plannedDate')}:</span>{' '}
                  {milestone.plannedDate || '-'}
                </span>
                {milestone.actualDate && (
                  <span>
                    <span className="text-gray-400">{t('page.mdr.pipelineManagement.milestone.cols.actualDate')}:</span>{' '}
                    <span className="text-green-600">{milestone.actualDate}</span>
                  </span>
                )}
                {milestone.assignee && (
                  <span>
                    <span className="text-gray-400">{t('page.mdr.pipelineManagement.milestone.cols.assignee')}:</span>{' '}
                    {milestone.assignee}
                  </span>
                )}
              </div>
              {milestone.comment && (
                <Tooltip title={milestone.comment}>
                  <div className="max-w-400px truncate text-12px text-gray-400">{milestone.comment}</div>
                </Tooltip>
              )}
            </div>
          ),
          color: getTimelineColor(milestone.status)
        }))}
      />
    </Card>
  );
};

export default MilestoneTimeline;
