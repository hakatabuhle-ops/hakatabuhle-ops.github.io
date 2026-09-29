# Buhle Hakata — Personal Portfolio

A responsive portfolio and CV for Buhle Hakata. Visitors can see the public profile, skills, qualifications, experience, projects, and contact links. The owner can manage all portfolio content, add a downloadable CV, and share project links and attachments.

## Custom domain: HakataBuhle.com

The repository is prepared to use `HakataBuhle.com`, but a domain name must first be purchased from a domain registrar and connected to GitHub Pages before the website is available at that address.

1. Register `HakataBuhle.com` with a domain registrar.
2. In the repository's **Settings → Pages**, publish the site from the `main` branch and the `/ (root)` folder.
3. In your registrar's DNS settings, point the apex (`@`) to GitHub Pages by adding these A records:

   | Type | Host | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |

   Optionally add GitHub's IPv6 AAAA records (`2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, and `2606:50c0:8003::153`) if your registrar supports them. Remove conflicting parking or forwarding records for `@`.
4. Add a `www` CNAME record pointing to `hakatabuhle-ops.github.io` (the GitHub Pages host for this account).
5. Wait for DNS to propagate. In **Settings → Pages**, set the custom domain to `HakataBuhle.com` if it is not picked up from the repository's `CNAME` file, then enable **Enforce HTTPS** when GitHub Pages makes the option available.
6. If using Supabase sign-in, add `https://hakatabuhle.com/**` and `https://www.hakatabuhle.com/**` to Supabase **Authentication → URL Configuration** allowed redirect URLs.

Until the custom domain is registered and connected, the site's canonical and social-sharing URLs use `https://hakatabuhle-ops.github.io/`. After DNS is working and GitHub Pages accepts the custom domain, update the canonical and `og:url` values in `index.html` to `https://hakatabuhle.com/`. Registering a domain and changing DNS are account actions that must be completed by the domain owner.

## One-time Supabase setup

The site uses Supabase for public profile and project data, private owner sign-in, and public project attachments. The browser uses only the Supabase **project URL** and **publishable/anon key**. Never put a Supabase `service_role` or secret key in this site.

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In **Authentication → Users**, add Buhle's owner account. The UID configured for this site is `47a18a0e-0390-4cdd-ad17-6cff5c14ea2e`.
3. The schema, access rules, and public attachments bucket are defined in `supabase-setup.sql`. The owner ID in its security function must match the UID above. The SQL has already been run for the current Supabase project.
4. The project's URL and publishable key are configured in `config.js`. If changing Supabase projects, update those values using **Project Settings → API**:

   ```js
   window.PORTFOLIO_CONFIG = {
     supabaseUrl: "https://your-project-id.supabase.co",
     supabaseAnonKey: "your-publishable-or-anon-key",
     ownerUserId: "the-owner-user-uuid"
   };
   ```

   The URL and publishable/anon key are intended for browser use. Never use a `service_role` or secret key here.
5. In **Authentication → URL Configuration**, set the site URL to `https://hakatabuhle-ops.github.io` and add it to the allowed redirect URLs. For local testing, add `http://localhost:8000/**`.
6. The site is published at `https://hakatabuhle-ops.github.io/` using the public `hakatabuhle-ops.github.io` repository. Serve the site over HTTP rather than opening the HTML as a `file://` URL; Supabase sign-in requires a website origin.

## Run locally

With Python installed, run `python -m http.server 8000` from this directory and open `http://localhost:8000`. Stop the server with Ctrl+C. Without Supabase configured, you can choose **Manage portfolio (local)** to update your profile and save projects in the current browser.

## Manage the site

Choose **Owner login** in the header and sign in with the account created in Supabase. **Edit my profile** lets you change your study stage (for example, from first year to second year), qualification, university, location, biography, professional title, public contact email, social links, and PDF CV. **Add a project** supports a description, technology tags, achievements/features, repository link, live demo link, and attachments. Use the Skills & Qualifications and Experience sections to add categorized skills, certificates, education achievements, work, academic projects, volunteering, or leadership. Entries can be edited or removed. Published project attachments and the CV are public.

The **Print / Save CV** button opens the browser print dialog; choose “Save as PDF” to download a copy. Project and profile content is shared; the site code and `config.js` still need to be published when deploying or changing the site configuration.
