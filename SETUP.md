# ⚡ Quick Start — MockTest Arena

## 1. Install dependencies
```bash
# From project root
npm run install:all
```

## 2. Configure database
```bash
cp backend/.env.example backend/.env
# Edit backend/.env:
#   DB_HOST=localhost
#   DB_PORT=3306
#   DB_USER=root
#   DB_PASSWORD=yourpassword
#   DB_NAME=mocktest_db
```

## 3. Run migrations + seed
```bash
npm run migrate    # Creates all MySQL tables
npm run seed       # Adds categories, exams, tests, questions
```

## 4. Start development servers

**Terminal 1 — Backend (API)**
```bash
npm run backend
# → http://localhost:5000
```

**Terminal 2 — Frontend (React)**
```bash
npm run frontend
# → http://localhost:3000
```

## 5. Open the app
Visit → **http://localhost:3000**

---

## Import custom questions

### Via UI
Go to `/admin/upload-questions` and upload a CSV or JSON file.

### CSV format
```
subject,topic,text,option_a,option_b,option_c,option_d,correct_option,difficulty
General Intelligence,Analogy,Book : ? :: Painting : Gallery,Library,Store,Shop,Museum,A,easy
```

### JSON format
```json
[{
  "subject": "Quantitative Aptitude",
  "topic": "Percentage",
  "text": "What is 20% of 500?",
  "correct_option": "C",
  "difficulty": "easy",
  "choices": [
    {"label":"A","text":"80"},
    {"label":"B","text":"90"},
    {"label":"C","text":"100"},
    {"label":"D","text":"110"}
  ]
}]
```

---

## Production build
```bash
cd frontend && npm run build
# Then in backend/.env: NODE_ENV=production
npm run backend   # serves React + API on port 5000
```
