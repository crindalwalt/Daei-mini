<?php

namespace App\Enums;

enum SyncEntityType: string
{
    case Habit = 'habit';
    case HabitRecord = 'habit_record';
    case Goal = 'goal';
    case SharedActivityCompletion = 'shared_activity_completion';
    case JournalEntries = 'journal_entries';
    case DailyReports = 'daily_reports';
    case ExerciseRecords = 'exercise_records';
    case HealthRecords = 'health_records';
}
