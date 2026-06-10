# MockTest Arena — Node.js + React + MySQL

Converted from Django → **Node.js (Express) + React.js + MySQL**

---

## Project Structure

```
mocktest-app/
├── backend/                  ← Node.js + Express API
│   ├── src/
│   │   ├── server.js         ← Entry point
│   │   ├── db/
│   │   │   ├── connection.js ← MySQL pool
│   │   │   ├── migrate.js    ← Create all tables
│   │   │   └── seed.js       ← Sample data
│   │   └── routes/
│   │       ├── exams.js      ← Categories, exams, test listings
│   │       ├── quizzes.js    ← Start/take/submit test
│   │       ├── results.js    ← Score card
│   │       └── upload.js     ← CSV/JSON question import
│   ├── .env.example
│   └── package.json
│
└── frontend/                 ← React app
    ├── public/index.html
    ├── src/
    │   ├── App.js            ← All routes
    │   ├── index.js / index.css
    │   ├── hooks/useFetch.js
    │   ├── components/
    │   │   ├── layout/       ← Header + Footer
    │   │   └── exam/         ← StartTestLink
    │   └── pages/
    │       ├── HomePage.js
    │       ├── CategoryPage.js
    │       ├── ExamPage.js
    │       ├── TestListPage.js
    │       ├── TakeTestPage.js   ← Full test engine
    │       ├── ResultPage.js
    │       ├── UploadPage.js
    │       └── NotFoundPage.js
    └── package.json
```

---

## Step 1 — Prerequisites

- Node.js ≥ 18
- MySQL ≥ 8.0 running locally
- npm

---

## Step 2 — Database Setup

```bash
# Login to MySQL and create the DB user (or use root for dev)
mysql -u root -p
CREATE DATABASE mocktest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Step 3 — Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials

npm install

# Create all tables
node src/db/migrate.js

# Seed sample data (categories, exams, questions, tests)
node src/db/seed.js

# Start the API server
npm run dev        # development (nodemon)
# or
npm start          # production
```

API runs at: **http://localhost:5000**

---

## Step 4 — Frontend Setup

```bash
cd frontend
npm install
npm start
```

React app runs at: **http://localhost:3000**  
(Proxy forwards `/api/*` calls to backend automatically via `"proxy"` in package.json)

---

## Step 5 — Production Build

```bash
cd frontend
npm run build
# Then set NODE_ENV=production in backend .env
# The Express server will serve the React build
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/exams/home` | Home page data |
| GET | `/api/exams/category/:slug` | Category + exams |
| GET | `/api/exams/:cat/:exam` | Exam dashboard |
| GET | `/api/exams/:cat/:exam/tests?mode=mock` | Test list |
| POST | `/api/quiz/start/:testSlug` | Start/resume test |
| GET | `/api/quiz/attempt/:id` | Load attempt |
| POST | `/api/quiz/attempt/:id/save` | Save answer |
| POST | `/api/quiz/attempt/:id/mark` | Toggle mark |
| POST | `/api/quiz/attempt/:id/submit` | Submit + calc result |
| POST | `/api/quiz/attempt/:id/integrity` | Log integrity event |
| GET | `/api/results/:attemptId` | Get result |
| GET | `/api/upload/meta` | Upload form metadata |
| POST | `/api/upload/questions` | Upload CSV/JSON |

---

## Django → Node.js Mapping

| Django | Node.js / React |
|--------|-----------------|
| `models.py` | MySQL tables (`migrate.js`) |
| `views.py` | Express routes (`routes/*.js`) |
| `urls.py` | Express router + React Router |
| `templates/*.html` | React pages (`pages/*.js`) |
| `static/css/style.css` | `index.css` + component CSS modules |
| `static/js/test.js` | `TakeTestPage.js` (React state + hooks) |
| `manage.py seed_mock_data` | `node src/db/seed.js` |
| `manage.py import_questions` | `/api/upload/questions` endpoint |
| Django sessions | express-session |
| Django ORM queries | mysql2 pool queries |
