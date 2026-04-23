# Secure Banking Application

A full-stack banking app with login and PIN validation.

## What It Does

- **User Authentication**: Login with username/password + 4-digit PIN
- **Bank Transfers**: Send money between accounts
- **Account Management**: View balance, transaction history, and account details

## Tech Stack

**Backend:** Node.js, Express.js, CORS  
**Frontend:** Vanilla JavaScript, HTML5, CSS3  
**Ports:** Backend (5001), Frontend (3000)

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5001` with auto-reload enabled.

#### 2. Frontend Setup
```bash
cd frontend
python3 -m http.server 3000
```
Frontend runs on `http://localhost:3000`
