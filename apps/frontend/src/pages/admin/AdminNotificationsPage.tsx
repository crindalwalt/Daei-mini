import { NotificationCenter } from '../../components/shared/NotificationCenter'
import { adminNotifications } from '../../lib/mockData'

export function AdminNotificationsPage() {
  return (
    <NotificationCenter
      eyebrow="Account"
      title="Notifications"
      description="Report submissions, pending accounts and group milestones that need your attention."
      initialNotifications={adminNotifications}
    />
  )
}
