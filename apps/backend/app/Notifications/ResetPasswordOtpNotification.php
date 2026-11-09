<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordOtpNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $code,
    ) {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $expiresInMinutes = (int) config('auth.passwords.users.expire', 60);
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $resetUrl = $frontendUrl.'/reset-password?'.http_build_query([
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)
            ->subject('Your password reset code')
            ->greeting('Hello '.$notifiable->name.'!')
            ->line('You requested to reset the password for your account.')
            ->line('Your one-time password reset code is:')
            ->line('**'.$this->code.'**')
            ->line("This code expires in {$expiresInMinutes} minutes.")
            ->action('Enter your code', $resetUrl)
            ->line('If you did not request a password reset, no further action is required.');
    }
}
