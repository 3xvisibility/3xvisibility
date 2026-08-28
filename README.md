# 3X VISIBILITY 

Build a full SaaS web application called "Page Generator Platform".

The platform allows users to automatically generate multiple web pages using CSV data and publish them directly to their websites such as WordPress and Shopify through API integrations.

The application must include the following system architecture and features.

Frontend Create a modern SaaS dashboard using React or Next.js with a clean UI. Use a sidebar dashboard layout with pages for Dashboard, Campaigns, Templates, Websites, Billing, and Settings.

Authentication Implement secure user authentication with signup, login, logout, and password reset. Each user must have their own account and data. Use Supabase authentication.

Database Use Supabase PostgreSQL as the main database.

Create database tables for: users
campaigns
templates
websites
generated_pages
subscriptions

Dashboard The main dashboard should display user statistics such as: Total campaigns Total generated pages Connected websites Recent campaigns

Campaign System Users must be able to create a campaign for generating pages.

Campaign creation should include: Campaign name Select template Upload CSV file Choose connected website Generate pages button

CSV Processing Allow users to upload CSV files containing page data such as keywords, titles, locations, etc.

Example CSV: course,city Python Training,Toronto Python Training,Ottawa

The system should parse the CSV and prepare rows for page generation.

Template System Allow users to select or define a template page layout.

Templates should support dynamic variables such as:

{course} {city} {keyword} {title}

Example template content:

{course} in {city}

Learn {course} in {city} with expert instructors.

During page generation the system replaces variables with CSV data.

Field Mapping Provide a UI where users can map CSV columns to template variables.

Example: CSV column "city" → template variable {city}

Page Generation Engine For each row in the CSV file, generate a page by replacing variables in the template.

Automatically generate: page title page content page slug

Store generated pages in the database.

Website Integration Allow users to connect external websites.

WordPress Integration Allow users to connect WordPress sites using the WordPress REST API.

User inputs: WordPress site URL Username Application password

The system should publish generated pages directly to WordPress using the API.

Shopify Integration Allow users to connect Shopify stores using the Shopify Admin API.

The system should generate and publish pages to Shopify.

Generated Pages Manager Users should see a list of generated pages including: page title slug campaign website status

Admin System Include an admin panel where the platform owner can: view users view campaigns monitor usage manage subscriptions

Subscription System Implement SaaS subscription plans.

Example plans: Starter Plan 100 pages per month

Pro Plan 2000 pages per month

Agency Plan 10000 pages per month

Track usage per user and restrict page generation based on their plan.

Billing Prepare integration structure for Stripe payments for subscriptions.

Design Use a clean SaaS UI with responsive design. Include loading states, notifications, and success/error messages.

Deployment The application must be deployable on standard hosting with environment variables for Supabase keys and API integrations.

Build the project with modular architecture so it can scale later with new integrations and AI content generation features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://xxxvisibilty.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/845afe78-e102-45e9-89ea-f9d0560eb3a5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
