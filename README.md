# AI-Powered Event Registration & Similarity Checker

A modern web application built with **Next.js**, **Firebase**, and **Transformers.js** that helps organizers host events and automatically prevent identical or highly-similar projects from being registered.

## 🚀 Key Features

*   **Custom Event Creation:** Organizers can spin up new events, toggle public/private visibility, and construct custom registration forms with text, date, or dropdown fields.
*   **In-Browser AI Similarity Check:** An embedded machine learning model (`all-MiniLM-L6-v2` via `@xenova/transformers`) runs completely client-side. It analyzes project titles and abstracts to ensure uniqueness.
*   **Duplicate Prevention Gate:** When organizers toggle "Enable Abstract Similarity Check," the platform blocks any registration whose abstract has a semantic similarity score `≥ 60%` compared to previously approved projects.
*   **Real-time Database & Auth:** Built securely with Firebase Authentication and Firestore to manage users, events, and participant data.
*   **Beautiful UI:** Glassmorphism, deep dark themes, and rich interactive components powered by Tailwind CSS v4.

## 🛠 Tech Stack

*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
*   **Backend & DB:** [Firebase](https://firebase.google.com/) (Firestore, Auth)
*   **Local AI:** [@xenova/transformers](https://www.npmjs.com/package/@xenova/transformers)

---

## 💻 Getting Started

### 1. Clone the repository and install dependencies
```bash
npm install
```

### 2. Configure Firebase Environment Variables
Create a `.env.local` file in the root directory and add your Firebase configurations:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your_measurement_id"
```
*(Make sure `.env.local` is listed in your `.gitignore` so you don't leak your keys when pushing to GitHub).*

### 3. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🧠 How the Similarity Check Works

The application uses **Transformers.js** to pull the lightweight `all-MiniLM-L6-v2` NLP model directly into the browser's memory without needing expensive backend GPUs:
1. Calculates multi-dimensional vector embeddings for the title and abstract text.
2. Performs a *Cosine Similarity* mathematical check against existing abstracts tied to the event.
3. Automatically blocks duplicate scopes if the calculated overlap breaches the `0.6` (60%) combined similarity threshold.

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new). Make sure to define your **Environment Variables** in the Vercel dashboard prior to building.
