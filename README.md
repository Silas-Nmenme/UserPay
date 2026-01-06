# UserPay

Environment variables (required):

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for signing JWTs
- `BASE_URL` - Public base URL for links in emails (e.g. https://example.com)
- `EMAIL_USER` - Email address used to send notifications (Gmail recommended as app password)
- `EMAIL_PASS` - Password or app-password for `EMAIL_USER`

Optional:

- `SYSTEM_USER_ID` - ObjectId of an existing user to act as the system/source for top-ups. If not set, a `system` user will be auto-created.

Setup & run:

1. Install dependencies:

```bash
npm install
```

2. Add a `.env` file with the variables above.

3. Start the server:

```bash
node index.js
```

Notes:

- For full ACID transactions you should run MongoDB as a replica set (even a single-node replica set). Locally: start `mongod --replSet rs0` and run `rs.initiate()` in the mongo shell.
- Install `express-validator` (used by the wallet routes):

```bash
npm install express-validator
```

The project includes endpoints for user registration/login (`/auth`), and wallet operations (`/wallet`) including `topup`, `transfer`, and transaction history.
# UserPay
