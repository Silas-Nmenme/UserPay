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
  const googleFonts = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
  const itemsHtml = (lines || []).map(l => `<p class="mb-2" style="line-height: 1.6;">${l}</p>`).join('');

  // Type-specific styling with enhanced fintech themes
  let gradientBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Modern blue-purple gradient
  let cardBg = 'rgba(255, 255, 255, 0.95)';
  let icon = '📧'; // Default email icon
  let iconColor = '#007bff';
  let accentColor = '#007bff';
  let secondaryIcon = '';

  if (type === 'debit') {
    gradientBg = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'; // Soft red-pink for debit
    cardBg = 'rgba(255, 255, 255, 0.98)';
    icon = '💳'; // Credit card icon for debit
    secondaryIcon = '⬇️'; // Down arrow
    iconColor = '#dc3545';
    accentColor = '#dc3545';
  } else if (type === 'credit') {
    gradientBg = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'; // Soft green-blue for credit
    cardBg = 'rgba(255, 255, 255, 0.98)';
    icon = '💰'; // Money icon
    secondaryIcon = '⬆️'; // Up arrow
    iconColor = '#28a745';
    accentColor = '#28a745';
  } else if (type === 'security') {
    gradientBg = 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'; // Warm orange for security
    cardBg = 'rgba(255, 255, 255, 0.98)';
    icon = '🛡️'; // Shield icon
    iconColor = '#ffc107';
    accentColor = '#ffc107';
  }

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="${bootstrapCdn}" rel="stylesheet">
      <link href="${googleFonts}" rel="stylesheet">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background: ${gradientBg};
          background-size: 400% 400%;
          animation: gradientShift 8s ease infinite, fadeIn 1s ease-in;
          margin: 0;
          padding: 0;
        }
        .card {
          background: ${cardBg};
          backdrop-filter: blur(15px);
          border: none;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          animation: slideIn 0.8s ease-out, pulse 2s infinite 1s;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, ${accentColor}, ${iconColor});
          animation: shimmer 3s ease-in-out infinite;
        }
        .icon-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 20px;
        }
        .icon {
          font-size: 4rem;
          color: ${iconColor};
          animation: bounce 1.5s infinite, scale 2s ease-in-out infinite alternate;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }
        .secondary-icon {
          font-size: 2rem;
          margin-left: 10px;
          animation: rotate 4s linear infinite;
        }
        .card-title {
          color: #333;
          font-weight: 700;
          animation: fadeInUp 0.6s ease-out 0.3s both;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card-body p {
          animation: fadeInUp 0.6s ease-out 0.5s both;
          color: #555;
        }
        .badge-amount {
          background: linear-gradient(45deg, ${accentColor}, ${iconColor});
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          animation: glow 2s ease-in-out infinite alternate;
          display: inline-block;
          margin: 10px 0;
        }
        .btn-primary {
          background: linear-gradient(45deg, ${accentColor}, ${iconColor});
          border: none;
          border-radius: 25px;
          padding: 12px 30px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          animation: btnPulse 1.5s infinite;
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        .footer {
          background: rgba(0,0,0,0.05);
          padding: 15px;
          border-radius: 0 0 15px 15px;
          text-align: center;
          animation: fadeIn 1s ease-in 1s both;
        }
        .footer img {
          width: 30px;
          height: 30px;
          margin-right: 10px;
          animation: rotate 5s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-30px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-15px); }
          60% { transform: translateY(-7px); }
        }
        @keyframes scale {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(${accentColor.slice(1)}, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(${accentColor.slice(1)}, 0); }
          100% { box-shadow: 0 0 0 0 rgba(${accentColor.slice(1)}, 0); }
        }
        @keyframes glow {
          from { box-shadow: 0 0 10px ${accentColor}; }
          to { box-shadow: 0 0 20px ${accentColor}, 0 0 30px ${accentColor}; }
        }
        @keyframes btnPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      </style>
    </head>
    <body>
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <div class="card shadow-lg">
              <div class="card-body text-center p-4">
                <div class="icon-container">
                  <div class="icon">${icon}</div>
                  ${secondaryIcon ? `<div class="secondary-icon">${secondaryIcon}</div>` : ''}
                </div>
                <h3 class="card-title mb-4">${heading}</h3>
                <div class="mb-4">${itemsHtml}</div>
                ${cta ? `<div class="mt-4">${cta}</div>` : ''}
              </div>
              <div class="footer">
                <small class="text-muted">
                  <span style="font-weight: 600; color: ${accentColor};">UserPay</span> - Secure & Seamless Transactions
                  <br />
                  <span style="font-size: 0.8rem;">This is an automated message. Please do not reply.</span>
                </small>
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

async function sendCryptoTopupEmail({ transaction, user, cryptoType, newBalance }) {
  const amount = transaction.amount;
  const transactionDate = new Date(transaction.createdAt).toLocaleString();
  const previousBalance = Number(newBalance) - Number(amount);

  const html = bootstrapEmailTemplate({
    title: 'Crypto Top-up Alert - UserPay',
    heading: 'Crypto Funds Added to Your Account',
    lines: [
      `Dear ${user.username},`,
      `Great news! Your UserPay crypto account has been topped up successfully.`,
      `<strong>Transaction Details:</strong><br>`,
      `<strong>Crypto Type:</strong> ${cryptoType}<br>`,
      `<strong>Amount Added:</strong> ${amount.toLocaleString()} ${cryptoType}<br>`,
      `<strong>Transaction ID:</strong> ${transaction._id}<br>`,
      `<strong>Date & Time:</strong> ${transactionDate}<br>`,
      `<strong>Previous Balance:</strong> ${previousBalance.toLocaleString()} ${cryptoType}<br>`,
      `<strong>New Balance:</strong> ${Number(newBalance).toLocaleString()} ${cryptoType}<br>`,
      `Your crypto funds are now available for use. If you have any questions, feel free to contact our support team.`,
      `Thank you for choosing UserPay!`
    ],
    type: 'credit'
  });

  return sendMail({ to: user.email, subject: 'UserPay - Crypto Top-up Confirmation', html });
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

async function sendCryptoTransferEmails({ transaction, fromUser, toUser, cryptoType, fromBalance, toBalance }) {
  const amount = transaction.amount;
  const transactionDate = new Date(transaction.createdAt).toLocaleString();

  // Debit email to sender
  const debitHtml = bootstrapEmailTemplate({
    title: 'Crypto Debit Alert - UserPay',
    heading: 'Crypto Sent Successfully',
    lines: [
      `Dear ${fromUser.username},`,
      `Thank you for using UserPay! Your crypto account has been debited for a transfer.`,
      `<strong>Transaction Details:</strong><br>`,
      `<strong>Crypto Type:</strong> ${cryptoType}<br>`,
      `<strong>Amount Sent:</strong> ${amount.toLocaleString()} ${cryptoType}<br>`,
      `<strong>Recipient Address:</strong> ${transaction.toAddress}<br>`,
      `<strong>Transaction ID:</strong> ${transaction._id}<br>`,
      `<strong>Date & Time:</strong> ${transactionDate}<br>`,
      `<strong>Previous Balance:</strong> ${(Number(fromBalance) + Number(amount)).toLocaleString()} ${cryptoType}<br>`,
      `<strong>New Balance:</strong> ${Number(fromBalance).toLocaleString()} ${cryptoType}<br>`,
      `If you did not authorize this transaction, please contact our support team immediately at support@userpay.com.`,
      `We appreciate your trust in UserPay for your financial needs.`
    ],
    type: 'debit'
  });

  const promises = [sendMail({ to: fromUser.email, subject: 'UserPay - Crypto Debit Alert', html: debitHtml })];

  // Credit email to recipient if internal transfer
  if (toUser) {
    const creditHtml = bootstrapEmailTemplate({
      title: 'Crypto Credit Alert - UserPay',
      heading: 'Crypto Funds Received!',
      lines: [
        `Dear ${toUser.username},`,
        `Great news! You've received crypto funds in your UserPay account.`,
        `<strong>Transaction Details:</strong><br>`,
        `<strong>Crypto Type:</strong> ${cryptoType}<br>`,
        `<strong>Amount Received:</strong> ${amount.toLocaleString()} ${cryptoType}<br>`,
        `<strong>Sender:</strong> ${fromUser.username}<br>`,
        `<strong>Transaction ID:</strong> ${transaction._id}<br>`,
        `<strong>Date & Time:</strong> ${transactionDate}<br>`,
        `<strong>Previous Balance:</strong> ${(Number(toBalance) - Number(amount)).toLocaleString()} ${cryptoType}<br>`,
        `<strong>New Balance:</strong> ${Number(toBalance).toLocaleString()} ${cryptoType}<br>`,
        `Enjoy your funds and continue using UserPay for seamless transactions!`,
        `If you have any questions, feel free to reach out to our support team.`
      ],
      type: 'credit'
    });

    promises.push(sendMail({ to: toUser.email, subject: 'UserPay - Crypto Credit Alert', html: creditHtml }));
  }

  return Promise.allSettled(promises);
}

module.exports = { sendMail, sendTransferEmails, sendLoginEmail, sendTopupEmail, sendCryptoTopupEmail, sendOTP, sendVerificationEmail, sendCryptoTransferEmails };
