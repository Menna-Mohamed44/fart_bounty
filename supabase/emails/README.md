# 📧 Fart Bounty Email Templates

This folder contains HTML templates for Supabase Auth emails.

## 📋 Available Templates

| Template | Purpose | Trigger |
|----------|---------|---------|
| `verify_email.html` | Email verification | User signs up |
| `reset_password.html` | Password reset | User requests password reset |
| `welcome.html` | Welcome email | User verifies email |

## 🚀 How to Use

### **Option 1: Supabase Dashboard (Recommended)**

1. **Go to Supabase Dashboard** → Authentication → Email Templates
2. **Select the template type** (Confirm signup, Reset password, etc.)
3. **Copy the HTML content** from the corresponding file
4. **Paste into the template editor**
5. **Customize if needed** and save

### **Option 2: Supabase CLI**

```bash
# Set email templates via CLI
supabase auth email templates set verify_email.html --template-path supabase/emails/verify_email.html
supabase auth email templates set reset_password.html --template-path supabase/emails/reset_password.html
supabase auth email templates set welcome.html --template-path supabase/emails/welcome.html
```

## 📧 Template Variables

Supabase automatically replaces these variables in your templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Verification/reset link | `https://yourapp.com/confirm?token=...` |
| `{{ .Email }}` | User's email address | `user@example.com` |
| `{{ .DisplayName }}` | User's display name | `John Doe` |
| `{{ .SiteURL }}` | Your app's URL | `https://yourapp.com` |

## 🎨 Design Features

### **Consistent Branding**
- ✅ Fart Bounty logo and colors
- ✅ Professional gradient backgrounds
- ✅ Responsive design for mobile

### **User Experience**
- ✅ Clear call-to-action buttons
- ✅ Security notices for verification emails
- ✅ Feature highlights for welcome emails
- ✅ Helpful tips and next steps

### **Security**
- ✅ Warning messages for unsolicited emails
- ✅ Expiration notices for reset links
- ✅ Clear branding to prevent phishing

## 🔧 Customization

### **Colors**
Update the CSS gradients to match your brand:
```css
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
```

### **Content**
- Add/remove features in the welcome email
- Customize messaging tone
- Include specific calls-to-action

### **Images**
- Add your logo or branding images
- Use responsive image techniques
- Ensure proper alt text

## 🧪 Testing

### **Test Email Templates**
1. **Create a test user** in your app
2. **Trigger email verification** (signup process)
3. **Check your email** for the formatted template
4. **Test on mobile devices** for responsive design

### **Common Issues**
- **Images not loading**: Use absolute URLs or embed as base64
- **Links not working**: Ensure `{{ .ConfirmationURL }}` is properly set
- **Mobile display**: Test responsive CSS on actual devices

## 📚 Supabase Email Documentation

For more advanced configuration:
- [Supabase Auth Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Custom SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Email Template Variables](https://supabase.com/docs/guides/auth/auth-email-variables)

---

**🎯 Result**: Professional, branded emails that enhance user experience and security!
