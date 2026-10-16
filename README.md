# Lode Hexosa Administration Employee Attendance Management System

A web-based employee attendance management system developed for **Lode Hexosa Administration** to help manage employee records, track daily attendance, monitor check-in and check-out times, and generate attendance reports.

## Overview

The Lode Hexosa Administration Employee Attendance Management System is designed to simplify employee attendance tracking and reduce the need for manual attendance records. It provides a centralized interface for managing employees, recording attendance, reviewing attendance history, and monitoring attendance statistics.

The system uses a React frontend, a Node.js and Express backend, and a MySQL database.

## Features

### Employee Management
- Add and manage employee records.
- Search and filter employees.
- View individual employee profiles and attendance history.

### Attendance Management
- Record employee check-in and check-out times.
- View daily attendance records.
- Update existing attendance records with a reason.
- Delete attendance records when authorized.
- Maintain an audit trail of attendance changes.

### Dashboard
- View attendance statistics and summary cards.
- Monitor attendance information through dashboard charts.
- Access employee and attendance information from one interface.

### Reports
- Generate daily, weekly, and monthly attendance reports.
- Search and filter attendance records.
- Export attendance data to CSV.

### Authentication and Access Control
- Sign in and sign out securely.
- Support Administrator and HR Staff roles.
- Restrict certain attendance management actions according to user permissions.
- Record attendance changes in an audit log.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development server and build tool |
| Node.js | Backend JavaScript runtime |
| Express.js | Backend API |
| MySQL | Relational database |
| Git and GitHub | Version control and source code hosting |

## Project Structure

```text
Attendance system/
├── backend/
│   ├── middleware/
│   ├── migrations/
│   ├── routes/
│   ├── .gitignore
│   ├── auth_config.js
│   ├── db.js
│   ├── init_db.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

*Note: The `.env` file is local configuration and must not be committed to GitHub.*

## Requirements

Before running the project, install:

- [Node.js](https://nodejs.org/) and npm
- [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/) (recommended)

## Installation and Setup

### 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/demme-dev/lode-hexosa-attendance-system.git
cd lode-hexosa-attendance-system
```

### 2. Set Up the MySQL Database

Start MySQL and create the project database if it does not already exist:

```sql
CREATE DATABASE lode_hexosa_attendance;
```

The application requires its database tables to be initialized before use. Check the existing database initialization script at `backend/init_db.js` and follow the project's database setup procedure.

If you already have employee, user, and attendance records, back up the database before running any initialization or migration commands. Do not recreate or reset the database unnecessarily.

### 3. Configure the Backend

Open a terminal in the project directory:

```bash
cd backend
npm install
```

Create or configure the local `backend/.env` file with the database connection settings and other environment variables required by the backend code.

Use `backend/db.js`, `backend/server.js`, and `backend/auth_config.js` to identify the exact required variable names and configuration. Do not copy real passwords, secret keys, or other credentials into this README or commit them to GitHub.

### 4. Start the Backend Server

From the `backend` directory, run:

```bash
node server.js
```

The backend is expected to run at:

```text
http://localhost:5000
```

Keep the backend terminal open.

### 5. Install and Start the Frontend

Open a second terminal from the project root and run:

```bash
cd frontend
npm install
npm run dev
```

Vite will display the local development URL. In the current setup, it is expected to be:

```text
http://localhost:5173/
```

Open the URL in your browser to access the application.

### 6. Sign In

Use an authorized account configured for the application. Available permissions depend on the assigned user role.

For security, do not publish default passwords or real user credentials in the repository.

## Security Notes

- Keep `.env` and `.auth-secret` files private.
- Never commit database passwords, access tokens, or secret keys.
- Do not upload database backups containing employee or attendance information.
- Restrict database and application access to authorized users.
- Back up the database before making schema changes or applying migrations.
- Use appropriate access controls and secure configuration when deploying the application.

## Future Improvements

Potential future enhancements include:

- Attendance summaries and analytics.
- Improved reporting and filtering.
- Notifications for attendance-related events.
- Additional deployment and backup automation.
- Further usability and security improvements.

## Contributing

Contributions, bug reports, and suggestions are welcome. Please test changes carefully and avoid using real employee data in development or testing environments.

## License

No license has been specified for this repository yet. All rights are reserved by default unless a license is added.

## Author

**Demelash Nigusie**

Computer Science Student | Web Developer

GitHub: [@demme-dev](https://github.com/demme-dev)

## Repository

[https://github.com/demme-dev/lode-hexosa-attendance-system](https://github.com/demme-dev/lode-hexosa-attendance-system)
