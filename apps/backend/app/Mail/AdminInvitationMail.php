<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new invitation message for an administrator-created account.
     */
    public function __construct(
        public User $user,
        public string $code,
        public ?string $invitedBy = null,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You are invited to '.config('app.name'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return new Content(
            view: 'emails.admin-invitation',
            with: [
                'name' => $this->user->name,
                'email' => $this->user->email,
                'code' => $this->code,
                'invitedBy' => $this->invitedBy,
                'expiresInMinutes' => (int) config('auth.passwords.users.expire', 60),
                'resetUrl' => $frontendUrl.'/reset-password?'.http_build_query([
                    'email' => $this->user->email,
                ]),
            ],
        );
    }
}
