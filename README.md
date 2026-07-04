# TaskFlow

TaskFlow is a full-stack project and task management system designed to manage users, projects, tasks, task assignments, and project progress from a single platform.

## Features

* Admin authentication
* User management
* Create, view, edit, activate, and deactivate users
* Project management
* Task creation and assignment
* Role-based login
* User profile management
* Change password functionality
* Forgot password and OTP verification
* Email notifications using Brevo SMTP
* JWT authentication
* Responsive admin and user dashboards

## Tech Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Axios
* React Hot Toast
* Lucide React

### Backend

* NestJS
* Prisma ORM
* PostgreSQL
* JWT Authentication
* Bcrypt
* Nodemailer
* Brevo SMTP

## Project Structure

```text
Task-Flow/
├── taskflow-frontend/
├── taskflow-backend/
├── .gitignore
└── README.md
```

## Installation

Clone the repository:

```bash
git clone https://github.com/abhi2807jhariya/taskflow.git
```

Open the project folder:

```bash
cd Task-Flow
```

## Frontend Setup

```bash
cd taskflow-frontend
npm install
npm run dev
```

Frontend will run on:

```text
http://localhost:3000
```

Create a `.env.local` file inside the frontend folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Backend Setup

```bash
cd taskflow-backend
npm install
```

Create a `.env` file inside the backend folder:

```env
DATABASE_URL="your_postgresql_database_url"
JWT_SECRET="your_jwt_secret"

BREVO_SMTP_HOST="smtp-relay.brevo.com"
BREVO_SMTP_PORT="587"
BREVO_SMTP_USER="your_brevo_smtp_user"
BREVO_SMTP_PASSWORD="your_brevo_smtp_password"
```

Run Prisma migration:

```bash
npx prisma migrate dev
```

Generate Prisma client:

```bash
npx prisma generate
```

Start the backend server:

```bash
npm run start:dev
```

Backend will run on:

```text
http://localhost:5000
```

## Important

Do not upload the following files and folders to GitHub:

```text
.env
.env.local
node_modules
.next
dist
uploads
```

Keep all database passwords, JWT secrets, and SMTP credentials private.

## Current Status

The following modules are currently available or under development:

* Authentication
* User management
* Project management
* Task management
* Task assignment
* Forgot password
* Email notifications
* Admin dashboard
* User dashboard

## Author

**Abhishek Jhariya**

## License

This project is created for learning and project management purposes.
