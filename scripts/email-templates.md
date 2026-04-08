# TimeTap Email Templates for Supabase

Copy each HTML block into **Supabase Dashboard → Authentication → Email Templates**.

---

## 1. Confirm Signup

**Subject:** `Welcome to TimeTap — Confirm your email`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090B;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090B;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#18181B;border:1px solid #27272A;border-radius:12px;overflow:hidden;">

<!-- Logo -->
<tr><td style="padding:32px 32px 0 32px;text-align:center;">
  <span style="font-size:26px;font-weight:800;letter-spacing:-0.5px;font-family:Arial,Helvetica,sans-serif;">
    <span style="color:#FAFAFA;">Time</span><span style="color:#6366F1;">Tap</span>
  </span>
</td></tr>

<!-- Gradient line -->
<tr><td style="padding:16px 32px 0 32px;">
  <div style="height:1px;background:linear-gradient(90deg,transparent,#6366F1,transparent);"></div>
</td></tr>

<!-- Content -->
<tr><td style="padding:28px 32px 0 32px;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#FAFAFA;font-family:Arial,Helvetica,sans-serif;">Confirm your email</h1>
</td></tr>

<tr><td style="padding:16px 32px 0 32px;">
  <p style="margin:0;font-size:15px;line-height:1.6;color:#A1A1AA;font-family:Arial,Helvetica,sans-serif;">
    Thanks for signing up for TimeTap. Tap the button below to verify your email address and activate your account.
  </p>
</td></tr>

<!-- CTA Button -->
<tr><td style="padding:28px 32px 0 32px;text-align:center;">
  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#4F46E5;color:#ffffff;font-size:16px;font-weight:600;font-family:Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 36px;border-radius:8px;mso-padding-alt:0;">
    Confirm Email Address
  </a>
</td></tr>

<tr><td style="padding:24px 32px 0 32px;">
  <p style="margin:0;font-size:13px;line-height:1.5;color:#52525B;font-family:Arial,Helvetica,sans-serif;">
    Or copy this link into your browser:<br/>
    <a href="{{ .ConfirmationURL }}" style="color:#818CF8;word-break:break-all;text-decoration:none;">{{ .ConfirmationURL }}</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 32px 32px 32px;">
  <div style="height:1px;background-color:#27272A;margin-bottom:20px;"></div>
  <p style="margin:0;font-size:12px;line-height:1.5;color:#71717A;font-family:Arial,Helvetica,sans-serif;text-align:center;">
    &copy; 2026 TimeTap. All rights reserved.<br/>
    If you didn&rsquo;t create an account, you can safely ignore this email.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 2. Invite User

**Subject:** `You've been invited to TimeTap`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090B;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090B;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#18181B;border:1px solid #27272A;border-radius:12px;overflow:hidden;">

<!-- Logo -->
<tr><td style="padding:32px 32px 0 32px;text-align:center;">
  <span style="font-size:26px;font-weight:800;letter-spacing:-0.5px;font-family:Arial,Helvetica,sans-serif;">
    <span style="color:#FAFAFA;">Time</span><span style="color:#6366F1;">Tap</span>
  </span>
</td></tr>

<!-- Gradient line -->
<tr><td style="padding:16px 32px 0 32px;">
  <div style="height:1px;background:linear-gradient(90deg,transparent,#6366F1,transparent);"></div>
</td></tr>

<!-- Content -->
<tr><td style="padding:28px 32px 0 32px;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#FAFAFA;font-family:Arial,Helvetica,sans-serif;">You&rsquo;re invited</h1>
</td></tr>

<tr><td style="padding:16px 32px 0 32px;">
  <p style="margin:0;font-size:15px;line-height:1.6;color:#A1A1AA;font-family:Arial,Helvetica,sans-serif;">
    You&rsquo;ve been invited to join your team on TimeTap &mdash; the all-in-one platform for time tracking, scheduling, and payroll. Tap below to set up your account.
  </p>
</td></tr>

<!-- CTA Button -->
<tr><td style="padding:28px 32px 0 32px;text-align:center;">
  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#4F46E5;color:#ffffff;font-size:16px;font-weight:600;font-family:Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 36px;border-radius:8px;mso-padding-alt:0;">
    Accept Invitation
  </a>
</td></tr>

<tr><td style="padding:24px 32px 0 32px;">
  <p style="margin:0;font-size:13px;line-height:1.5;color:#52525B;font-family:Arial,Helvetica,sans-serif;">
    Or copy this link into your browser:<br/>
    <a href="{{ .ConfirmationURL }}" style="color:#818CF8;word-break:break-all;text-decoration:none;">{{ .ConfirmationURL }}</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 32px 32px 32px;">
  <div style="height:1px;background-color:#27272A;margin-bottom:20px;"></div>
  <p style="margin:0;font-size:12px;line-height:1.5;color:#71717A;font-family:Arial,Helvetica,sans-serif;text-align:center;">
    &copy; 2026 TimeTap. All rights reserved.<br/>
    If you weren&rsquo;t expecting this invitation, you can safely ignore this email.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 3. Reset Password

**Subject:** `Reset your TimeTap password`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090B;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090B;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#18181B;border:1px solid #27272A;border-radius:12px;overflow:hidden;">

<!-- Logo -->
<tr><td style="padding:32px 32px 0 32px;text-align:center;">
  <span style="font-size:26px;font-weight:800;letter-spacing:-0.5px;font-family:Arial,Helvetica,sans-serif;">
    <span style="color:#FAFAFA;">Time</span><span style="color:#6366F1;">Tap</span>
  </span>
</td></tr>

<!-- Gradient line -->
<tr><td style="padding:16px 32px 0 32px;">
  <div style="height:1px;background:linear-gradient(90deg,transparent,#6366F1,transparent);"></div>
</td></tr>

<!-- Content -->
<tr><td style="padding:28px 32px 0 32px;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#FAFAFA;font-family:Arial,Helvetica,sans-serif;">Reset your password</h1>
</td></tr>

<tr><td style="padding:16px 32px 0 32px;">
  <p style="margin:0;font-size:15px;line-height:1.6;color:#A1A1AA;font-family:Arial,Helvetica,sans-serif;">
    We received a request to reset the password for your TimeTap account. Tap the button below to choose a new password. This link expires in 1 hour.
  </p>
</td></tr>

<!-- CTA Button -->
<tr><td style="padding:28px 32px 0 32px;text-align:center;">
  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#4F46E5;color:#ffffff;font-size:16px;font-weight:600;font-family:Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 36px;border-radius:8px;mso-padding-alt:0;">
    Reset Password
  </a>
</td></tr>

<tr><td style="padding:24px 32px 0 32px;">
  <p style="margin:0;font-size:13px;line-height:1.5;color:#52525B;font-family:Arial,Helvetica,sans-serif;">
    Or copy this link into your browser:<br/>
    <a href="{{ .ConfirmationURL }}" style="color:#818CF8;word-break:break-all;text-decoration:none;">{{ .ConfirmationURL }}</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 32px 32px 32px;">
  <div style="height:1px;background-color:#27272A;margin-bottom:20px;"></div>
  <p style="margin:0;font-size:12px;line-height:1.5;color:#71717A;font-family:Arial,Helvetica,sans-serif;text-align:center;">
    &copy; 2026 TimeTap. All rights reserved.<br/>
    If you didn&rsquo;t request a password reset, you can safely ignore this email. Your password will not change.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 4. Magic Link

**Subject:** `Your TimeTap sign-in link`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090B;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090B;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#18181B;border:1px solid #27272A;border-radius:12px;overflow:hidden;">

<!-- Logo -->
<tr><td style="padding:32px 32px 0 32px;text-align:center;">
  <span style="font-size:26px;font-weight:800;letter-spacing:-0.5px;font-family:Arial,Helvetica,sans-serif;">
    <span style="color:#FAFAFA;">Time</span><span style="color:#6366F1;">Tap</span>
  </span>
</td></tr>

<!-- Gradient line -->
<tr><td style="padding:16px 32px 0 32px;">
  <div style="height:1px;background:linear-gradient(90deg,transparent,#6366F1,transparent);"></div>
</td></tr>

<!-- Content -->
<tr><td style="padding:28px 32px 0 32px;">
  <h1 style="margin:0;font-size:22px;font-weight:700;color:#FAFAFA;font-family:Arial,Helvetica,sans-serif;">Sign in to TimeTap</h1>
</td></tr>

<tr><td style="padding:16px 32px 0 32px;">
  <p style="margin:0;font-size:15px;line-height:1.6;color:#A1A1AA;font-family:Arial,Helvetica,sans-serif;">
    Tap the button below to securely sign in to your TimeTap account. No password needed &mdash; this link expires in 10 minutes.
  </p>
</td></tr>

<!-- CTA Button -->
<tr><td style="padding:28px 32px 0 32px;text-align:center;">
  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#4F46E5;color:#ffffff;font-size:16px;font-weight:600;font-family:Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 36px;border-radius:8px;mso-padding-alt:0;">
    Sign In to TimeTap
  </a>
</td></tr>

<tr><td style="padding:24px 32px 0 32px;">
  <p style="margin:0;font-size:13px;line-height:1.5;color:#52525B;font-family:Arial,Helvetica,sans-serif;">
    Or copy this link into your browser:<br/>
    <a href="{{ .ConfirmationURL }}" style="color:#818CF8;word-break:break-all;text-decoration:none;">{{ .ConfirmationURL }}</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 32px 32px 32px;">
  <div style="height:1px;background-color:#27272A;margin-bottom:20px;"></div>
  <p style="margin:0;font-size:12px;line-height:1.5;color:#71717A;font-family:Arial,Helvetica,sans-serif;text-align:center;">
    &copy; 2026 TimeTap. All rights reserved.<br/>
    If you didn&rsquo;t request this sign-in link, you can safely ignore this email.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## Setup Instructions

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. For each template type (Confirm signup, Invite user, Magic Link, Reset Password):
   - Set the **Subject** as specified above
   - Paste the HTML into the **Body** field
   - Click **Save**
3. Go to **Authentication → URL Configuration**:
   - Set **Site URL** to `https://timetap.live`
   - Add `https://timetap.live/auth/callback` to **Redirect URLs**
