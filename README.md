# LeetShaastra Backend

This is the backend for a Leetcode-like platform, providing a robust set of features for user authentication, problem management, code execution, contests, and more.

## Features

- **Authentication:**
  - User registration and login (local and Google OAuth)
  - Email verification and password recovery
  - JWT-based session management with refresh tokens
  - Secure password hashing
  - Rate limiting on authentication routes

- **Problem Management:**
  - CRUD operations for problems (Admin only)
  - Fetching problems with details and test cases
  - Tracking solved problems for each user

- **Code Execution:**
  - Execute code in various languages using Judge0
  - Submissions are recorded and linked to problems and users

- **Playlists:**
  - **Admin Playlists:** Admins can create, update, and manage public or private playlists of problems.
  - **User Playlists:** Users can create their own personal playlists.
  - **Enrolled Playlists:** Users can clone admin-created playlists to their own profile to track progress.

- **Contests:**
  - Create and manage programming contests.
  - Users can participate, submit solutions, and be ranked on a leaderboard.

- **Submissions:**
  - View all personal submissions.
  - Filter submissions by problem.

- **User Sessions:**
  - View and manage active login sessions.

- **Health Check:**
  - Endpoint to monitor the health of the application.

## Upcoming Features

- **Discussion Forum:**
  - A full-featured discussion forum for each problem, allowing users to post, comment, and upvote.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) (for local database) or a [Neon](https://neon.tech/) account

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/Leetcode_Backend.git
    cd Leetcode_Backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the necessary environment variables. You can use `.env.example` as a template.
    ```
    PORT=8080
    DATABASE_URL=
    JWT_SECRET=
    BASE_URL=http://localhost:8080
    GOOGLE_CLIENT_ID=
    CORS_ORIGIN=http://localhost:5173

    JUDGE0_API_URL=
    JUDGE0_API_KEY=

    ACCESS_TOKEN_SECRET=
    ACCESS_TOKEN_EXPIRY=3d 
    REFRESH_TOKEN_SECRET=
    REFRESH_TOKEN_EXPIRY=30d

    REDIS_PASS=
    REDIS_HOST=
    REDIS_PORT=

    MAILTRAP_HOST=
    MAILTRAP_PORT=
    MAILTRAP_USER=
    MAILTRAP_PASS=
    MAILTRAP_SENDERMAIL=

    FORGOT_PASSWORD_REDIRECT_URL=
    ```

## Configure Prisma with PostgreSQL

You can use a local PostgreSQL instance with Docker or a managed service like Neon.

### Option 1: Local PostgreSQL with Docker

1.  **Start a PostgreSQL container:**
    ```bash
    docker run --name leetcode-db -e POSTGRES_USER=myuser -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres
    ```

2.  **Configure `DATABASE_URL` in `.env`:**
    ```
    DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/postgres"
    ```

### Option 2: Using Neon

1.  Create a new project on [Neon](https://neon.tech/) and get the connection string.
2.  **Configure `DATABASE_URL` in `.env`:**
    ```
    DATABASE_URL="your-neon-connection-string"
    ```

### Prisma Commands Flow

1.  **Generate Prisma Client:**
    This command generates the Prisma Client based on your schema. It's good to run this after any changes to `prisma/schema.prisma`.
    ```bash
    npx prisma generate
    ```

2.  **Push Prisma Schema to DB:**
    This command updates the database schema to match your `prisma/schema.prisma` file. It's a quick way to sync your schema without creating migration files.
    ```bash
    npx prisma db push
    ```

3.  **Create Migration (Optional):**
    For production environments, it's recommended to use migrations to track schema changes over time.
    ```bash
    npx prisma migrate dev --name init
    ```

## Running the Application

Once the setup is complete, you can start the development server:

```bash
npm run dev
```

The server will start on the port specified in your environment variables, or a default port.

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a pull request.
