const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function bootstrapEmailTemplate({ title, heading, lines, cta, type = 'default' }) {
  const bootstrapCdn = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
  const itemsHtml = (lines || []).map(l => `<p class="mb-1">${l}</p>`).join('');

  // Type-specific styling
  let gradientBg = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)';
  let cardBg = 'rgba(255, 255, 255, 0.9)';
  let icon = '';
  let iconColor = '#6c757d';

  if (type === 'debit') {
    gradientBg = 'linear-gradient(135deg, #ffe6e6 0%, #ffcccc 100%)';
    cardBg = 'rgba(255, 255, 255, 0.95)';
    icon = '💸'; // Debit icon
    iconColor = '#dc3545';
  } else if (type === 'credit') {
    gradientBg = 'linear-gradient(135deg, #e6ffe6 0%, #ccffcc 100%)';
    cardBg = 'rgba(255, 255, 255, 0.95)';
    icon = '💰'; // Credit icon
    iconColor = '#28a745';
  }

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="${bootstrapCdn}" rel="stylesheet">
      <title>${title}</title>
      <style>
        body {
          background: ${gradientBg};
          animation: fadeIn 1s ease-in;
        }
        .card {
          background: ${cardBg};
          backdrop-filter: blur(10px);
          border: none;
          animation: slideIn 0.8s ease-out;
        }
        .icon {
          font-size: 3rem;
          color: ${iconColor};
          animation: bounce 1.5s infinite;
        }
        .card-title {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }
        .card-body p {
          animation: fadeInUp 0.6s ease-out 0.5s both;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      </style>
    </head>
    <body>
      <div class="container py-4">
        <div class="row justify-content-center">
          <div class="col-md-8">
            <div class="card shadow-lg">
              <div class="card-body text-center">
                <div class="icon mb-3">${icon}</div>
                <h4 class="card-title mb-3">${heading}</h4>
                <div class="mb-3">${itemsHtml}</div>
                ${cta ? `<div class="mt-3">${cta}</div>` : ''}
                <hr />
                <small class="text-muted">This is an automated message from UserPay.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

async function sendMail({ from = process.env.EMAIL_USER, to, subject, html }) {
  const mailOptions = { from, to, subject, html };
  return transporter.sendMail(mailOptions);
}

async function sendTransferEmails({ transaction, fromUser, toUser, fromBalance, toBalance }) {
  const amount = transaction.amount;
  const transactionDate = new Date(transaction.createdAt).toLocaleString();

  // Debit email to sender
  const debitHtml = bootstrapEmailTemplate({
    title: 'Debit Alert - UserPay',
    heading: 'Funds Sent Successfully',
    lines: [
      `Dear ${fromUser.username},`,
      `Thank you for using UserPay! Your account has been debited for a transfer.`,
      `<strong>Transaction Details:</strong><br>`,
      `<strong>Amount Sent:</strong> ₦${amount.toLocaleString()}<br>`,
      `<strong>Recipient:</strong> ${toUser.username}<br>`,
      `<strong>Transaction ID:</strong> ${transaction._id}<br>`,
      `<strong>Date & Time:</strong> ${transactionDate}<br>`,
      `<strong>Previous Balance:</strong> ₦${(Number(fromBalance) + Number(amount)).toLocaleString()}<br>`,
      `<strong>New Balance:</strong> ₦${Number(fromBalance).toLocaleString()}<br>`,
      `If you did not authorize this transaction, please contact our support team immediately at support@userpay.com.`,
      `We appreciate your trust in UserPay for your financial needs.`
    ]
  });

  // Credit email to recipient
  const creditHtml = bootstrapEmailTemplate({
    title: 'Credit Alert - UserPay',
    heading: 'Funds Received!',
    lines: [
      `Dear ${toUser.username},`,
      `Great news! You've received funds in your UserPay account.`,
      `<strong>Transaction Details:</strong><br>`,
      `<strong>Amount Received:</strong> ₦${amount.toLocaleString()}<br>`,
      `<strong>Sender:</strong> ${fromUser.username}<br>`,
      `<strong>Transaction ID:</strong> ${transaction._id}<br>`,
      `<strong>Date & Time:</strong> ${transactionDate}<br>`,
      `<strong>Previous Balance:</strong> ₦${(Number(toBalance) - Number(amount)).toLocaleString()}<br>`,
      `<strong>New Balance:</strong> ₦${Number(toBalance).toLocaleString()}<br>`,
      `Enjoy your funds and continue using UserPay for seamless transactions!`,
      `If you have any questions, feel free to reach out to our support team.`
    ],
    type: 'credit'
  });

  const sendDebit = sendMail({ to: fromUser.email, subject: 'UserPay - Debit Alert', html: debitHtml });
  const sendCredit = sendMail({ to: toUser.email, subject: 'UserPay - Credit Alert', html: creditHtml });

  return Promise.allSettled([sendDebit, sendCredit]);
}

async function sendLoginEmail({ user }) {
  const loginTime = new Date().toLocaleString();

  const html = bootstrapEmailTemplate({
    title: 'Login Notification - UserPay',
    heading: 'Successful Login',
    lines: [
      `Dear ${user.username},`,
      `We noticed a successful login to your UserPay account.`,
      `<strong>Login Details:</strong><br>`,
      `<strong>Username:</strong> ${user.username}<br>`,
      `<strong>Email:</strong> ${user.email}<br>`,
      `<strong>Login Time:</strong> ${loginTime}<br>`,
      `If this was you, you can safely ignore this email.`,
      `If this was not you, please secure your account immediately by changing your password and contacting support at support@userpay.com.`,
      `Stay safe and enjoy using UserPay!`
    ]
  });

  return sendMail({ to: user.email, subject: 'UserPay - Login Notification', html });
}

async function sendTopupEmail({ transaction, user, newBalance }) {
  const amount = transaction.amount;
  const transactionDate = new Date(transaction.createdAt).toLocaleString();
  const previousBalance = Number(newBalance) - Number(amount);

  const html = bootstrapEmailTemplate({
    title: 'Top-up Alert - UserPay',
    heading: 'Funds Added to Your Account',
    lines: [
      `Dear ${user.username},`,
      `Great news! Your UserPay account has been topped up successfully.`,
      `<strong>Transaction Details:</strong><br>`,
      `<strong>Amount Added:</strong> ₦${amount.toLocaleString()}<br>`,
      `<strong>Transaction ID:</strong> ${transaction._id}<br>`,
      `<strong>Date & Time:</strong> ${transactionDate}<br>`,
      `<strong>Previous Balance:</strong> ₦${previousBalance.toLocaleString()}<br>`,
      `<strong>New Balance:</strong> ₦${Number(newBalance).toLocaleString()}<br>`,
      `Your funds are now available for use. If you have any questions, feel free to contact our support team.`,
      `Thank you for choosing UserPay!`
    ],
    type: 'credit'
  });

  return sendMail({ to: user.email, subject: 'UserPay - Top-up Confirmation', html });
}

async function sendOTP({ user, otp }) {
  const html = bootstrapEmailTemplate({
    title: 'OTP Verification - UserPay',
    heading: 'Your One-Time Password',
    lines: [
      `Dear ${user.username},`,
      `You have requested to transfer funds from your UserPay account.`,
      `For security purposes, please use the following One-Time Password (OTP) to confirm the transaction:`,
      `<strong style="font-size: 24px; color: #007bff;">${otp}</strong>`,
      `This OTP is valid for 10 minutes. Do not share this code with anyone.`,
      `If you did not request this transfer, please ignore this email or contact our support team immediately.`,
      `Thank you for using UserPay!`
    ]
  });

  return sendMail({ to: user.email, subject: 'UserPay - OTP for Transfer Confirmation', html });
}

async function sendVerificationEmail({ user, verificationToken }) {
  const verificationUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;

  const html = bootstrapEmailTemplate({
    title: 'Verify Your UserPay Account',
    heading: 'Welcome to UserPay!',
    lines: [
      `Dear ${user.username},`,
      `Thank you for registering with UserPay. Please verify your email address to activate your account.`,
      `Click the button below to verify your account:`
    ],
    cta: `<a href="${verificationUrl}" class="btn btn-primary">Verify Account</a>`
  });

  return sendMail({ to: user.email, subject: 'Verify your UserPay account', html });
}

module.exports = { sendMail, sendTransferEmails, sendLoginEmail, sendTopupEmail, sendOTP, sendVerificationEmail };
