<?php

namespace App\Enums;

enum LibraryVisibility: string
{
    case Private = 'private';
    case Assigned = 'assigned';
    case Public = 'public';
}
