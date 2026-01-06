const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function bootstrapEmailTemplate({ title, heading, lines, cta }) {
  const bootstrapCdn = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
  const itemsHtml = (lines || []).map(l => `<p class="mb-1">${l}</p>`).join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="${bootstrapCdn}" rel="stylesheet">
      <title>${title}</title>
    </head>
    <body class="bg-light">
      <div class="container py-4">
        <div class="row justify-content-center">
          <div class="col-md-8">
            <div class="card shadow-sm">
              <div class="card-body">
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

  // Debit email to sender
  const debitHtml = bootstrapEmailTemplate({
    title: 'Debit Alert - UserPay',
    heading: 'Debit Notification',
    lines: [
      `Dear ${fromUser.username},`,
      `You sent <strong>₦${amount}</strong> to <strong>${toUser.username}</strong>.`,
      `Transaction ID: <code>${transaction._id}</code>`,
      `Previous balance: <strong>₦${(Number(fromBalance) + Number(amount)).toLocaleString()}</strong>`,
      `New balance: <strong>₦${Number(fromBalance).toLocaleString()}</strong>`
    ]
  });

  // Credit email to recipient
  const creditHtml = bootstrapEmailTemplate({
    title: 'Credit Alert - UserPay',
    heading: 'Credit Notification',
    lines: [
      `Dear ${toUser.username},`,
      `You received <strong>₦${amount}</strong> from <strong>${fromUser.username}</strong>.`,
      `Transaction ID: <code>${transaction._id}</code>`,
      `Previous balance: <strong>₦${(Number(toBalance) - Number(amount)).toLocaleString()}</strong>`,
      `New balance: <strong>₦${Number(toBalance).toLocaleString()}</strong>`
    ]
  });

  const sendDebit = sendMail({ to: fromUser.email, subject: 'UserPay - Debit Alert', html: debitHtml });
  const sendCredit = sendMail({ to: toUser.email, subject: 'UserPay - Credit Alert', html: creditHtml });

  return Promise.allSettled([sendDebit, sendCredit]);
}

module.exports = { sendMail, sendTransferEmails };
