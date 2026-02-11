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

async function testRateLimiting(token) {
  console.log('\n=== Testing Rate Limiting ===');
  // Test balance endpoint (rate limited to 10 per 15 min)
  for (let i = 1; i <= 12; i++) {
    const res = await axios.get(`${BASE}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } }).catch(e=>({ error: e.response ? e.response.data : e.message }));
    console.log(`Balance request ${i}:`, res.data ? 'Success' : res.error.message);
    await sleep(100); // small delay
  }
}

async function testOTPAttempts(token, user) {
  console.log('\n=== Testing OTP Attempts Limiting ===');
  // First, initiate a transfer to get a pending transaction
  const transfer = await axios.post(`${BASE}/wallet/transfer`, { toUsername: 'nonexistent', amount: 100 }, { headers: { Authorization: `Bearer ${token}` } }).catch(e=>({ error: e.response ? e.response.data : e.message }));
  console.log('Transfer init:', transfer.data ? 'Success' : transfer.error.message);

  if (transfer.data && transfer.data.transactionId) {
    const transactionId = transfer.data.transactionId;

    // Try wrong OTP 5 times
    for (let i = 1; i <= 6; i++) {
      const confirm = await axios.post(`${BASE}/wallet/transfer/confirm`, { transactionId, otp: '000000' }, { headers: { Authorization: `Bearer ${token}` } }).catch(e=>({ error: e.response ? e.response.data : e.message }));
      console.log(`OTP attempt ${i}:`, confirm.error ? confirm.error.message : 'Success');
      await sleep(100);
    }

    // Check if user is locked
    const userAfter = await User.findById(user._id);
    console.log('User locked until:', userAfter.otpLockUntil);
  }
}

async function run(){
  await connectDB();

  const pass = 'Pass123!';
  const email = `security_test_${Date.now()}@example.com`;

  await registerAndVerify(email, pass);
  const token = await login(email, pass);
  const user = await User.findOne({ email });

  await testRateLimiting(token);
  await testOTPAttempts(token, user);

  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(1); });
