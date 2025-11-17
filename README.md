<<<<<<< HEAD
# FullStack Express Application

A full-stack web application with user authentication, dashboard, and account management features.

## Features
- User Registration with OTP verification
- User Login/Logout
- Password Reset with OTP
- Dashboard with account management
- CRUD operations for accounts
- Responsive design

## Technologies Used

### Backend
- Node.js
- Express.js
- MySQL
- bcrypt (password hashing)
- jsonwebtoken (JWT authentication)
- nodemailer (sending OTP emails)
- multer (file uploads)

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- DataTables
- Toastify-JS

## Prerequisites

- Node.js (v14 or higher)
- MySQL database
- npm or yarn package manager

## Setup Instructions

1. Clone the repository
   ```bash
   git clone https://github.com/badboygamingph/express-vercel-deployment.git
   cd fullstack
   ```

2. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Set up the MySQL database:
   - Create a new database named `account`
   - The application will automatically create the required tables on first run

4. Configure environment variables:
   - Copy the `.env.example` file to `.env` in the backend directory
   - Update the values in `.env` with your database credentials and other settings

5. Run the application:
   ```bash
   npm start
   ```

6. Access the application at `http://localhost:5000`

## Project Structure
```
.
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── sql/
│   ├── utils/
│   ├── app.js
│   ├── db.js
│   ├── package.json
│   └── vercel.json
└── frontend/
    ├── css/
    ├── js/
    ├── templates/
    ├── dashboard.html
    └── index.html
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/forgot-password` - Request password reset
- `POST /api/reset-password` - Reset password

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/password` - Change password

### Account Management
- `GET /api/accounts` - Get all accounts for user
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

## Deployment

This application can be deployed to platforms like Vercel, Heroku, or any Node.js hosting service.

## Contributing
Feel free to fork this repository and submit pull requests.

## License
This project is licensed under the MIT License.
=======
# express-vercel-deployment
>>>>>>> eca536cca4876908a895aea669561bdce96ba5b1
