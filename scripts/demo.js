const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function registerAndVerify(email, password){
  // register
  const reg = await axios.post(`${BASE}/auth/register`, { email, password }).catch(e=>({ error: e.response ? e.response.data : e.message }));
  console.log('REGISTER:', reg.data || reg.error);
  // find user and verify
  await sleep(300); // wait a bit for DB
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found after register');
  if (user.verificationToken) {
    const verify = await axios.get(`${BASE}/auth/verify/${user.verificationToken}`).catch(e=>({ error: e.response ? e.response.data : e.message }));
    console.log('VERIFY:', verify.data || verify.error);
  }
  return user;
}

async function login(email, password){
  const res = await axios.post(`${BASE}/auth/login`, { email, password }).catch(e=>({ error: e.response ? e.response.data : e.message }));
  console.log('LOGIN:', res.data || res.error);
  if (res.data && res.data.token) return res.data.token;
  throw new Error('Login failed');
}

async function run(){
  await connectDB();

  const pass = 'Pass123!';
  const senderEmail = `demo_sender_${Date.now()}@example.com`;
  const recipientEmail = `demo_recipient_${Date.now()}@example.com`;

  await registerAndVerify(senderEmail, pass);
  await registerAndVerify(recipientEmail, pass);

  const sender = await User.findOne({ email: senderEmail });
  const recipient = await User.findOne({ email: recipientEmail });

  const token = await login(senderEmail, pass);

  // Top-up sender via API
  const topup = await axios.post(`${BASE}/wallet/topup`, { amount: 10000 }, { headers: { Authorization: `Bearer ${token}` } }).catch(e=>({ error: e.response ? e.response.data : e.message }));
  console.log('TOPUP:', topup.data || topup.error);

  // Reload sender
  await sleep(200);
  const senderAfterTopup = await User.findById(sender._id);
  console.log('Sender balance after topup:', senderAfterTopup.balance);

  // Transfer to recipient
  const transfer = await axios.post(`${BASE}/wallet/transfer`, { toUsername: recipient.username, amount: 2500 }, { headers: { Authorization: `Bearer ${token}` } }).catch(e=>({ error: e.response ? e.response.data : e.message }));
  console.log('TRANSFER:', transfer.data || transfer.error);

  // Fetch transactions
  const txs = await axios.get(`${BASE}/wallet/transactions`, { headers: { Authorization: `Bearer ${token}` } }).catch(e=>({ error: e.response ? e.response.data : e.message }));
  console.log('TRANSACTIONS:', txs.data || txs.error);

  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(1); });
