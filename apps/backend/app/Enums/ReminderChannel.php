<?php

namespace App\Enums;

enum ReminderChannel: string
{
    case Local = 'local';
    case Push = 'push';
    case Email = 'email';
}
