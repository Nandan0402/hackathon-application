# AI Hiring Platform - Backend & API Engine

An AI-powered vocational trade hiring platform built with **Node.js**, **Express.js**, **Firebase/Firestore**, and **Google Gemini AI**. Features automated trade skill assessments, anti-hallucination candidate matching, dynamic Skill Passports, and complete hiring workflow automation.

---

## 🚀 Key Features

1. **Authentication & RBAC**: Firebase Auth with role-based access control (`WORKER`, `EMPLOYER`, `ADMIN`).
2. **Worker Management**: Full profile management with auto-computed skill tiers.
3. **AI Skill Assessment (Google Gemini)**: Practical trade question generation and multi-dimensional candidate evaluation (Electrician trade focus).
4. **Dynamic Skill Passport (`GET /api/workers/:id/skill-passport`)**: Verified skills, AI assessment metrics, strengths, improvement areas, and work history.
5. **Employer & Job Management**: Job creation, lifecycle statuses (`active`, `draft`, `filled`), and visibility rules.
6. **AI Candidate Matching**: 5-factor scoring model with Google Gemini contextual reasoning.
7. **Application & Hiring Workflow**: Full lifecycle (`APPLIED` → `SHORTLISTED` → `HIRED` → `EMPLOYED` → `FILLED` → Work History generation).
8. **Admin Analytics Dashboard**: Real-time platform metrics and administrative cross-resource management.

---

## 🛠️ Tech Stack

* **Runtime**: Node.js (v22+)
* **Framework**: Express.js
* **Database & Auth**: Firebase Admin SDK & Firestore
* **AI Engine**: Google Gemini API (`@google/generative-ai`)
* **Security**: CORS, dotenv, strict RBAC middleware

---

## 📂 Project Structure

```
Hackathon/
├── README.md
├── .gitignore
└── backend/
    ├── server.js                          # Express app entrypoint & middleware pipeline
    ├── package.json                       # Dependencies & startup scripts
    ├── .env.example                       # Environment variables template
    ├── config/
    │   ├── firebase.js                    # Firebase Admin SDK & Firestore operations
    │   └── gemini.js                      # Google Gemini AI client configuration
    ├── routes/                            # Modular API routing layer (/api/*)
    ├── controllers/                       # HTTP request handlers
    ├── services/                          # Core business & AI assessment logic
    ├── middleware/                        # Auth verification & RBAC
    ├── utils/                             # Structured loggers & API response wrappers
    └── test_all.js                        # Master automated test suite (9 Subsystems)
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
# Server starts at http://localhost:5000
```

### 4. Run Automated Test Suite
```bash
npm test
```
