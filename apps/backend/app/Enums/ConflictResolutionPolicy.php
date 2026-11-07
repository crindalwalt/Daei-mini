<?php

namespace App\Enums;

enum ConflictResolutionPolicy: string
{
    case ClientWins = 'client_wins';
    case ServerWins = 'server_wins';
    case LatestWins = 'latest_wins';
    case Manual = 'manual';
}
