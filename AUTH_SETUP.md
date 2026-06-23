# Login, Register, and OAuth2 Setup

## 1. Install dependencies

From the `MockTest-Arena` folder:

```bash
npm run install:all
```

## 2. Configure backend environment

Create `backend/.env` if it does not exist:

```env
PORT=5000
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
SESSION_SECRET=change-this-secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mocktest_db

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 3. Create the users table

Run the migration after setting your database values:

```bash
npm run migrate
```

This creates the `users` table used by form registration, form login, Google OAuth2, and GitHub OAuth2.

## 4. Start the app

Use two terminals:

```bash
npm run backend
```

```bash
npm run frontend
```

Open:

- User login: `http://localhost:3000/user/login`
- User register: `http://localhost:3000/user/register`
- Admin login: `http://localhost:3000/admin/login`

## 5. Register or login with the form

Go to `http://localhost:3000/user/register`, enter name, email, and a password with at least 6 characters.

The backend stores only a bcrypt password hash, not the plain password.

## 6. Enable Google OAuth2

1. Open Google Cloud Console.
2. Create or choose a project.
3. Go to APIs & Services, then Credentials.
4. Create OAuth client ID for a Web application.
5. Add this authorized redirect URI:

```text
http://localhost:5000/api/auth/oauth/google/callback
```

6. Copy the client ID and secret into `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

7. Restart the backend.


## 7. Useful API routes

- `POST /api/auth/register`
- `POST /api/auth/user/login`
- `GET /api/auth/oauth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/login` for admin login
