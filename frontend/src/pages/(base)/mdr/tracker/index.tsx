/** Tracker 看板 Tracker Dashboard - 追踪 MDR 对象的审批状态和版本历史 */
const TrackerDashboard = () => {
  const statusCards = [
    { color: 'bg-blue-500', count: 12, icon: 'i-mdi-clock-outline', title: '待审核' },
    { color: 'bg-orange-500', count: 5, icon: 'i-mdi-progress-check', title: '审核中' },
    { color: 'bg-green-500', count: 128, icon: 'i-mdi-check-circle', title: '已批准' },
    { color: 'bg-purple-500', count: 45, icon: 'i-mdi-lock', title: '已锁定' }
  ];

  const recentActivities = [
    { action: '提交了 SDTM DM 映射变更', time: '10分钟前', type: 'submit', user: '张三' },
    { action: '批准了 ADaM ADAE 标准', time: '30分钟前', type: 'approve', user: '李四' },
    { action: '发起了 TFL 表格审核请求', time: '1小时前', type: 'review', user: '王五' },
    { action: '更新了 VS 域映射规则', time: '2小时前', type: 'update', user: '赵六' }
  ];

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden">
      {/* 状态概览卡片 */}
      <div className="grid grid-cols-4 gap-16px lt-sm:grid-cols-2">
        {statusCards.map(card => (
          <ACard
            className="card-wrapper"
            key={card.title}
            variant="borderless"
          >
            <div className="flex items-center gap-12px">
              <div className={`${card.color} rounded-8px p-12px`}>
                <div className={`${card.icon} text-24px text-white`} />
              </div>
              <div>
                <div className="text-24px font-bold">{card.count}</div>
                <div className="text-gray-500">{card.title}</div>
              </div>
            </div>
          </ACard>
        ))}
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-3 flex-1-hidden gap-16px">
        {/* 审批队列 */}
        <ACard
          className="col-span-2 card-wrapper"
          title="审批队列"
          variant="borderless"
        >
          <ATable
            dataSource={[]}
            pagination={false}
            size="small"
            columns={[
              { dataIndex: 'name', key: 'name', title: '对象名称' },
              { dataIndex: 'type', key: 'type', title: '类型', width: 100 },
              { dataIndex: 'submitter', key: 'submitter', title: '提交人', width: 100 },
              { dataIndex: 'submitTime', key: 'submitTime', title: '提交时间', width: 160 },
              {
                key: 'operate',
                render: () => (
                  <AButton
                    size="small"
                    type="link"
                  >
                    审核
                  </AButton>
                ),
                title: '操作',
                width: 100
              }
            ]}
          />
        </ACard>

        {/* 最近活动 */}
        <ACard
          className="card-wrapper"
          title="最近活动"
          variant="borderless"
        >
          <div className="flex flex-col gap-12px">
            {recentActivities.map((activity, index) => (
              <div
                className="flex items-start gap-8px border-b border-gray-100 pb-12px last:border-0"
                key={index}
              >
                <div className="i-mdi-account-circle text-20px text-gray-400" />
                <div className="flex-1">
                  <div>
                    <span className="font-medium">{activity.user}</span>
                    <span className="ml-4px text-gray-500">{activity.action}</span>
                  </div>
                  <div className="mt-4px text-12px text-gray-400">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </ACard>
      </div>
    </div>
  );
};

export default TrackerDashboard;
