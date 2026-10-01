# Canyon Property Services: Leaf Cleanup Website

A simple one-page site advertising fall leaf cleanup in Boulder, Louisville and Lafayette, with a booking form that puts requests **directly on your Google Calendar**.

```
index.html           the page
css/styles.css       styling
js/config.js         ← your settings (booking URL, phone, email)
js/main.js           day picker, form, falling leaves
images/              Colorado fall artwork (Flatirons + aspens), favicon
apps-script/Code.gs  ← the Google Calendar booking backend
```

No build step and no server. It's plain HTML/CSS/JS.

---

## How booking works

1. A client picks an **open day** and an **arrival window** (Morning 8–11, Midday 11–2, Afternoon 2–5). Windows already on your calendar are greyed out automatically.
2. They enter their address, town, property size, the services they want, and their contact info.
3. When they hit **Book my cleanup**:
   - a 🍂 event appears on your Google Calendar at that time, with the address as the location and all the details in the description
   - you get an email alert
   - the client gets a confirmation email (replies come to you)
4. If two people try to grab the same slot at once, the second one is told to pick another time.

---

## 1. Connect the booking form to Google Calendar (about 10 minutes)

1. Sign in to the Google account whose calendar you want bookings on.
2. Go to **https://script.google.com** → **New project**. Name it "Canyon Bookings".
3. Delete the sample code, paste in everything from `apps-script/Code.gs`, and click **Save** 💾.
4. *(Optional)* Edit the settings at the top: `CALENDAR_ID`, `OWNER_EMAIL`, time windows, `JOBS_PER_WINDOW`, and work days.
5. In the function dropdown at the top, choose **`testSetup`** → **Run**. Google will ask for permission to use your Calendar and send email. Click **Allow**. (If you see "Google hasn't verified this app", click **Advanced → Go to Canyon Bookings**. It's your own script.)
6. Click **Deploy → New deployment** → gear icon ⚙️ → **Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
7. Open `js/config.js` and paste it in:
   ```js
   BOOKING_ENDPOINT: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
   Add your `PHONE` and `EMAIL` there too, so they show on the site.
8. Done. Submit a test booking and check your calendar.

> **Changed `Code.gs` later?** Go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. That keeps the same URL.

**Blocking off time:** To make a day or window unavailable (vacation, a big job), add an event to your calendar with a title that starts with 🍂, like `🍂 Booked`. If you'd rather have *any* event block bookings, set `BOOKING_TAG = ''` in `Code.gs`.

---

## 2. Put the site online (free) with GitHub Pages

1. On GitHub, open this repo → **Settings → Pages**.
2. Under *Source* choose **Deploy from a branch**, pick your branch and the `/ (root)` folder, then **Save**.
3. After about a minute your site is live at `https://<your-username>.github.io/<repo-name>/`.
4. To use your own domain (like `canyonpropertyservices.com`), add it under **Custom domain** on the same page.

Netlify or Cloudflare Pages also work. Just drag the folder in.

---

## Customizing

- **Text, services and FAQ:** edit `index.html` directly. Review the service list (gutters, final mow, etc.) and keep only what you actually offer.
- **Colors:** the variables at the top of `css/styles.css`.
- **Photos:** the artwork in `images/` is illustrated, so there are no licensing worries. To use your own photos, add them to `images/` and change `hero.svg` / `aspens.svg` in `css/styles.css` to your filenames (e.g. `url("../images/my-yard.jpg")`). Before-and-after shots of your own jobs work great here.
- **Preview mode:** until `BOOKING_ENDPOINT` is set, the form shows a yellow notice and nothing is sent, so you can try it safely.

## Try it locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
