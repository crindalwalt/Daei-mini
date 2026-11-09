<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Notifications\ResetPasswordOtpNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * @var string
     */
    protected $table = 'users';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'role' => UserRole::class,
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $user): void {
            if (blank($user->uuid)) {
                $user->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Send the one-time password reset code to the user.
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPasswordOtpNotification((string) $token));
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class)
            ->withPivot(['assigned_by', 'assigned_at'])
            ->withTimestamps();
    }

    public function createdGroups(): HasMany
    {
        return $this->hasMany(Group::class, 'created_by');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function activityReminders(): HasMany
    {
        return $this->hasMany(ActivityReminder::class);
    }

    public function sharedTimetables(): HasMany
    {
        return $this->hasMany(SharedTimetable::class, 'created_by');
    }

    public function sharedTimetableAssignments(): HasMany
    {
        return $this->hasMany(SharedTimetableAssignment::class);
    }

    public function sharedActivityCompletions(): HasMany
    {
        return $this->hasMany(SharedActivityCompletion::class);
    }

    public function habits(): HasMany
    {
        return $this->hasMany(Habit::class);
    }

    public function habitRecords(): HasMany
    {
        return $this->hasMany(HabitRecord::class);
    }

    public function goals(): HasMany
    {
        return $this->hasMany(Goal::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }

    public function dailyReportComments(): HasMany
    {
        return $this->hasMany(DailyReportComment::class, 'author_id');
    }

    public function activityComments(): HasMany
    {
        return $this->hasMany(ActivityComment::class, 'author_id');
    }

    public function libraryResources(): HasMany
    {
        return $this->hasMany(LibraryResource::class, 'uploaded_by');
    }

    public function libraryResourcePermissions(): HasMany
    {
        return $this->hasMany(LibraryResourcePermission::class);
    }

    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class);
    }

    public function exerciseRecords(): HasMany
    {
        return $this->hasMany(ExerciseRecord::class);
    }

    public function prayerPreference(): HasOne
    {
        return $this->hasOne(UserPrayerPreference::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(UserDocument::class);
    }

    public function inboxNotifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function healthRecords(): HasMany
    {
        return $this->hasMany(HealthRecord::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    public function syncOperations(): HasMany
    {
        return $this->hasMany(SyncOperation::class);
    }

    public function syncConflicts(): HasMany
    {
        return $this->hasMany(SyncConflict::class);
    }
}
