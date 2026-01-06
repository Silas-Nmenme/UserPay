const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({ hostname: 'localhost', port: 5000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => resolve({ status: res.statusCode, body: resp }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path, method: 'GET' }, res => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => resolve({ status: res.statusCode, body: resp }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const reg = await post('/auth/register', { email: 'test+copilot@example.com', password: 'Pass123!' });
    console.log('REGISTER', reg.status, reg.body);
  } catch (e) {
    console.error('REGISTER ERROR', e && e.message ? e.message : e);
  }

  try {
    const wallet = await get('/wallet');
    console.log('WALLET', wallet.status, wallet.body);
  } catch (e) {
    console.error('WALLET ERROR', e && e.message ? e.message : e);
  }
})();
