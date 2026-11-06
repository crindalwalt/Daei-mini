<?php

namespace App\Enums;

enum ActivityStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Missed = 'missed';
}
