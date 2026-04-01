# Access Control

## Who Can Access What

QAcademy has three roles, and each one can see and do different things:

### Student
- Can access their own dashboard, courses, quizzes, results, profile, and messages
- Can only see their own data — quiz attempts, subscriptions, learning history
- Cannot see other students' information, even if they try
- Can access MyTeacher classes they have joined

### Admin
- Can see and manage everything on the platform
- Can view all users, subscriptions, payments, announcements, quizzes, and content
- Can grant or revoke subscriptions, activate or deactivate accounts, and handle support messages
- Has access to both MyNMC Licensure admin pages and general platform management

### Teacher
- Can only access MyTeacher — they do not see the NMC Licensure admin area
- Can manage their own classes, questions, quizzes, and results
- Cannot see other teachers' data
- Cannot access student accounts outside of their own classes

## How a Student Gets Course Access

Access to a specific course depends on subscriptions:

1. Every product contains a list of courses it unlocks
2. When a student buys that product, they get a subscription
3. As long as that subscription is ACTIVE and has not expired, the student can access those courses
4. If the subscription expires or is revoked, access stops

When a student tries to open a course page, the system checks all their active subscriptions. If any subscription covers that course, the student gets in. If none do, they see an upgrade prompt directing them to buy a plan.

## What Happens When a Subscription Expires

When a student's subscription runs out:

- They can still log in to the platform
- They can still see their dashboard
- They can still view their quiz history and past results
- They **cannot** start new quizzes on courses that are no longer covered
- They **cannot** access course pages for expired courses
- They see a prompt to renew or upgrade their subscription

The student does not lose their history. All their past attempts, scores, and progress are preserved. They just cannot take new quizzes until they resubscribe.

## What the Trial Gives Access To

When a student registers without paying, they get a trial subscription automatically. This trial:

- Covers a limited set of courses (not the full list available to paid subscribers)
- Gives enough access to explore the platform, try a few quizzes, and see how things work
- Has a set duration (determined by the trial product's configuration)
- Is meant as a taster — students are expected to upgrade to a paid plan for full access

Each programme has its own trial product, so the trial courses are relevant to the student's specific nursing programme.

## Row Level Security — How Data Is Protected

Every table in the database has rules that control who can read or write to it. These rules are enforced at the database level, not just in the website code. This means even if someone tried to access the database directly (bypassing the website), the rules would still apply.

Here is how it works in practice:

- **A student can only see their own rows.** If Student A queries the attempts table, they only get back their own attempts. Student B's data is invisible to them, even if they know Student B's ID.
- **A teacher can only see their own classes, quizzes, and students.** Teacher X cannot see Teacher Y's classes or question bank.
- **An admin can see everything.** This is intentional — admins need full visibility to manage the platform.
- **The payment worker uses a special server key** that bypasses all these rules. This is also intentional and safe — the payment worker runs on a secure server (not in anyone's browser) and needs unrestricted access to create accounts, activate subscriptions, and update payment records.

These rules exist as a safety net. Even if there were a bug in the website code, the database itself would prevent data leaks between users.
