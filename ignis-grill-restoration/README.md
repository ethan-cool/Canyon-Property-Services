# Ignis Grill Restoration website

A five-page static site (Home, Services, About, FAQ, Contact) for a mobile grill cleaning and restoration business. Plain HTML/CSS/JS with no build step.

```
index.html  services.html  about.html  faq.html  contact.html
css/styles.css     colors and fonts (tokens at the top)
js/config.js       ← phone, email, city, service area, form endpoint
js/main.js         fills in contact info, mobile menu, quote form
images/logo.svg    logo and favicon
```

## 1. Fill in your details (2 minutes)

Open `js/config.js` and replace the placeholders:

```js
PHONE: '(303) 555-0142',
EMAIL: 'hello@yourdomain.com',
CITY: 'Boulder',
SERVICE_AREA: 'Boulder and the Denver metro',
```

That updates the header, footer, sticky mobile call button, FAQ and contact page on every page. Until a real phone number is set, "Call" buttons link to the contact page instead.

Also search the HTML files for `[city]`, `[phone]`, `[email]` and `[service area]` and replace them there too. The script fills them in for visitors, but search engines and visitors with JavaScript off see the HTML text.

## 2. Make the quote form send to you

The quickest option is [Formspree](https://formspree.io) (free tier available):

1. Create a form there and copy its URL (looks like `https://formspree.io/f/abcdwxyz`).
2. Paste it into `FORM_ENDPOINT` in `js/config.js`.

Requests then arrive in your inbox. Until you set this, submitting the form opens the visitor's email app with their request already written and addressed to `EMAIL`.

## 3. Review the copy

The text is written to be ready to go, but check these against how you actually run the business:

- **Response time:** "usually within one business day" (contact page, CTA band)
- **Cleaning times:** 1.5–2.5 hours for a deep clean, 3–4+ for restorations (FAQ)
- **Customer doesn't need to be home** and **before/after photos sent** (FAQ)
- **"Call or text"** on the contact page (remove "or text" if you don't take texts)
- **Parts replacement** under Full Restoration, and the three plan types (Annual, Seasonal, Quarterly)

No prices are listed anywhere; the site points everyone to a free quote.

## 4. Add your photos

- **Before/after (home page):** inside each `.ba-photo` div in `index.html`, replace `<span class="ph-note">Photo coming soon</span>` with `<img src="images/job1-before.jpg" alt="Grill grates before cleaning">` (and the matching after photo). Keep the `<span class="ba-tag">` label. Portrait-ish photos (4:5) fit best.
- **Team photo (about page):** replace the `.photo-ph` div with an `<img>`.

## 5. Put it online

Netlify, Cloudflare Pages or GitHub Pages all work. Upload/point them at this `ignis-grill-restoration` folder.

## Preview locally

```bash
cd ignis-grill-restoration && python3 -m http.server 8000
```

Then open http://localhost:8000.
