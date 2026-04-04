import { Alert, Descriptions, Modal, Spin, Tag } from 'antd'
import { usePushUpstream } from '@/service/hooks/useStudySpec'

interface Props {
  open: boolean
  specId: number
  parentLabel: string
  onClose: () => void
  onSuccess: (result: { added_datasets: string[]; modified_datasets: string[]; deleted_datasets: string[] }) => void
}

export function PushUpstreamModal({ open, specId, parentLabel, onClose, onSuccess }: Props) {
  const { mutate: push, isPending, data, reset } = usePushUpstream()

  const handleConfirm = () => {
    push(specId, {
      onSuccess: (res: any) => {
        const result = res?.data ?? res
        onSuccess(result)
      },
    })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Extract result data - handle both wrapped and unwrapped response shapes
  const result = (data as any)?.data ?? data

  return (
    <Modal
      open={open}
      title={`Push Changes to ${parentLabel}`}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Compute Diff"
      okButtonProps={{ loading: isPending }}
      width={560}
    >
      {!result ? (
        <Spin spinning={isPending}>
          <Alert
            type="info"
            showIcon
            message={`This will compute the diff of your local changes versus the ${parentLabel} and prepare for PR submission.`}
            style={{ marginBottom: 16 }}
          />
          <p>Click <strong>Compute Diff</strong> to see what will be pushed.</p>
        </Spin>
      ) : (
        <>
          {result.status === 'no_changes' ? (
            <Alert type="warning" showIcon message="No overrides found — nothing to push upstream." />
          ) : (
            <>
              <Alert
                type="success"
                showIcon
                message="Diff computed. Ready for PR submission."
                style={{ marginBottom: 16 }}
              />
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Added domains">
                  {result.added_datasets?.length > 0
                    ? result.added_datasets.map((d: string) => <Tag key={d} color="success">{d}</Tag>)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Modified domains">
                  {result.modified_datasets?.length > 0
                    ? result.modified_datasets.map((d: string) => <Tag key={d} color="warning">{d}</Tag>)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Excluded domains">
                  {result.deleted_datasets?.length > 0
                    ? result.deleted_datasets.map((d: string) => <Tag key={d} color="error">{d}</Tag>)
                    : '—'}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </>
      )}
    </Modal>
  )
}
