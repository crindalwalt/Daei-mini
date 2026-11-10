import { NotificationCenter } from '../../components/shared/NotificationCenter'
import { userNotifications } from '../../lib/mockData'

export function UserNotificationsPage() {
  return (
    <NotificationCenter
      eyebrow="Account"
      title="Notifications"
      description="Prayer reminders, habit streaks and feedback from your group administrators."
      initialNotifications={userNotifications}
    />
  )
}
