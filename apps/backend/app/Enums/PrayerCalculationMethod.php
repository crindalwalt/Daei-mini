<?php

namespace App\Enums;

enum PrayerCalculationMethod: string
{
    case MuslimWorldLeague = 'muslim_world_league';
    case Egyptian = 'egyptian';
    case Karachi = 'karachi';
    case UmmAlQura = 'umm_al_qura';
    case Dubai = 'dubai';
    case MoonsightingCommittee = 'moonsighting_committee';
    case NorthAmerica = 'north_america';
    case Kuwait = 'kuwait';
    case Qatar = 'qatar';
    case Singapore = 'singapore';
    case Tehran = 'tehran';
    case Turkey = 'turkey';
    case Other = 'other';
}
