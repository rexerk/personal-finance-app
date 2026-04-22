# Personal Finance & Budget Management System

A full-stack web application for tracking income, expenses, and monthly budgets.
Built with Angular, Node.js/Express, and MongoDB.

## Tech Stack
- **Frontend:** Angular 21 (Angular CLI)
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas + Mongoose

## Project Setup

### 1. Clone the repo
```bash
git clone https://github.com/rexerk/personal-finance-app.git
```

### 2. Install backend dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```bash
MONGO_URI=your_mongodb_connection_string
PORT=3000
```

### 4. Run the backend server
```bash
node server.js
```

### 5. Install and run the frontend
```bash
cd finance-app
npm install
ng serve
```
Then navigate to `http://localhost:4200/`. The app will automatically reload on file changes.

## Database Setup
Run the seed script to populate sample data:
```bash
node seed.js
```

## Default Test Users
```bash
email: john@example.com  password: password123
email: jane@example.com  password: password123
```
`
## Building for Production
```bash
ng build
```
Build artifacts will be stored in the `dist/` directory.

## Running Unit Tests
```bash
ng test
```
Uses [Vitest](https://vitest.dev/) as the test runner.

## Running End-to-End Tests
```bash
ng e2e
```

## Code Scaffolding
To generate a new Angular component:
```bash
ng generate component component-name
```
For a full list of available schematics:
```bash
ng generate --help
```

## Additional Resources
- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
