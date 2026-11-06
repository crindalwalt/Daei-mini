<?php

namespace App\Enums;

enum ActivityType: string
{
    case Prayer = 'prayer';
    case Quran = 'quran';
    case Tafseer = 'tafseer';
    case Reading = 'reading';
    case Habit = 'habit';
    case Goal = 'goal';
    case Exercise = 'exercise';
    case Personal = 'personal';
    case Other = 'other';
}
