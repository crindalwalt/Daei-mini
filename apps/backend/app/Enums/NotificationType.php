<?php

namespace App\Enums;

enum NotificationType: string
{
    case ActivityReminder = 'activity_reminder';
    case SharedActivityAssigned = 'shared_activity_assigned';
    case DailyReportComment = 'daily_report_comment';
    case GoalAchieved = 'goal_achieved';
    case HabitReminder = 'habit_reminder';
    case System = 'system';
}
