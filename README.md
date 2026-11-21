# SalonBook – Blush & Bloom (Backend)

## Project Name and Description

**SalonBook – Blush & Bloom** is the backend API for a salon appointment booking web application. It handles user authentication, salon services, categories, appointment bookings, user management, and secure online payments.

The backend provides REST APIs for the frontend and uses MongoDB to store application data.

## Live Deployment Links

- **Live Website (Frontend):** https://salonbook-client-six-zeta.vercel.app/
- **Live Backend API:** https://salonbook-server-ydpb.onrender.com

## Important Features

### Authentication and Authorization
- User authentication using Better Auth.
- Email and password authentication.
- Google and GitHub social authentication.
- Role-based access control for customers and admins.
- Protected API routes.
- Secure user session handling.
- Admin-only access to administrative operations.

### Service and Category Management
- Retrieve available salon services.
- Add, update, and manage salon services.
- Activate or deactivate services.
- Create, update, and delete service categories.
- Retrieve service and category information.

### Appointment Management
- Create customer appointments.
- Retrieve customer-specific appointments.
- Prevent duplicate active bookings for the same date and time.
- Allow customers to cancel their own pending appointments.
- Allow admins to confirm or cancel appointments.
- Validate appointment ownership and user roles.

### User and Profile Management
- Retrieve user information.
- Update profile information.
- Support profile image uploads and removal.
- Allow admins to view and manage users.
- Block and unblock users.

### Payment and Transaction Management
- Integrate Stripe Checkout for online payments.
- Create secure Stripe Checkout sessions.
- Verify Stripe webhook signatures.
- Update appointment payment status after successful payment.
- Store payment transaction records.
- Prevent duplicate transaction records.
- Provide admin access to transaction information.

## Technology Stack

- **Runtime Environment:** Node.js
- **Backend Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB Atlas
- **Authentication:** Better Auth
- **Payment Gateway:** Stripe
- **Development Tool:** tsx
- **API Architecture:** REST API

## Installation Instructions

### 1. Clone the Server Repository

```bash
git clone https://github.com/Kashpia-Tasnova/salonbook-server.git
```

### 2. Navigate to the Project Directory

```bash
cd salonbook-server
```

### 3. Install Dependencies

```bash
npm install
```

## How to Run the Project Locally

### 1. Configure Environment Variables

Create a `.env` file in the root directory of the backend project.

Add the following environment variable names:

```env
PORT=
MONGODB_URI=
DB_NAME=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
CLIENT_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=
```

Provide the appropriate values for your local configuration. Do not commit `.env` files or actual secret values to GitHub.

### 2. Start the Development Server

```bash
npm run dev
```

The backend server runs on the port configured in your environment variables. For the default local setup, the server uses port `5000`.

### 3. Build the Project

```bash
npm run build
```

### 4. Start the Production Server

```bash
npm start
```

## Required Environment Variables

| Variable Name | Description |
|---|---|
| `PORT` | Backend server port |
| `MONGODB_URI` | MongoDB connection string |
| `DB_NAME` | MongoDB database name |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth |
| `BETTER_AUTH_URL` | Backend authentication URL |
| `CLIENT_URL` | Frontend application URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `ADMIN_EMAIL` | Initial admin email address |
| `ADMIN_PASSWORD` | Initial admin password |
| `ADMIN_NAME` | Initial admin display name |

**Note:** Environment variable names are documented here without their actual values. Keep all credentials and secret keys private.

## Client and Server Repository Links

- **Client Repository:** https://github.com/Kashpia-Tasnova/salonbook-client
- **Server Repository:** https://github.com/Kashpia-Tasnova/salonbook-server

## Author

**SalonBook – Blush & Bloom**