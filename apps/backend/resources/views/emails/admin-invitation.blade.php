<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <tr>
                        <td style="background:#106030;padding:24px 32px;">
                            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">{{ config('app.name') }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h1 style="margin:0 0 12px;font-size:22px;">Assalamu alaikum, {{ $name }}!</h1>
                            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
                                @if ($invitedBy)
                                    {{ $invitedBy }} has invited you to join the {{ config('app.name') }} programme.
                                @else
                                    An administrator has invited you to join the {{ config('app.name') }} programme.
                                @endif
                                Use the one-time code below to set your password and activate your account.
                            </p>

                            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;">
                                <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#166534;">Your invitation code</p>
                                <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#14532d;">{{ $code }}</p>
                            </div>

                            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
                                This code expires in {{ $expiresInMinutes }} minutes. Enter it together with your email address
                                (<strong>{{ $email }}</strong>) to choose a password.
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                                <tr>
                                    <td style="border-radius:10px;background:#106030;">
                                        <a href="{{ $resetUrl }}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
                                            Accept invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                                If you were not expecting this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
