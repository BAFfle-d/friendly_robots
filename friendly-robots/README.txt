FRIENDLY ROBOTS! WEBSITE

OPEN THE WEBSITE
1. Extract this ZIP into a folder.
2. Open index.html in Chrome, Edge, Firefox, or Safari.
No installation or build is needed to open the finished website.

WHAT IS INCLUDED
index.html - the finished homepage, with its illustration, styles, and scripts embedded.
assets/robotown.jpg - the current RoboTown illustration as a separate image file.
styles.css - editable page styling.
catalog.js - the nine books, cover links, descriptions, and overlapping categories.
app.js - book previews, RoboTown discoveries, category filters, hidden stars, and display controls.
friend.js - "Make a robot friend": the robot parts, crayons, wake-up, flight home, and printable coloring page.
page.html - editable page structure.
build.cjs - optional tool for rebuilding index.html after editing the source files.

INTERNET CONNECTION
Book covers load from Amazon and the Fredoka/Nunito fonts load from Google Fonts.
These need an internet connection. The page has built-in fallback fonts.
The RoboTown illustration and all interactive code are included in this ZIP.
Amazon book links and the original WordPress site also require internet access.

PUBLISHING
Upload the contents of this folder to a static website host, with index.html at the root.
This package contains no login credentials and does not require a database or server application.

ROBOT FRIENDS
Each visitor's robot friend is remembered only in their own browser (localStorage).
Nothing is sent anywhere. Clearing site data, or a private window, starts with a fresh robot.

EDITING (OPTIONAL)
Edit page.html, styles.css, catalog.js, app.js, or friend.js.
With Node.js installed, run: node build.cjs
This rebuilds index.html from those files and the RoboTown illustration.
The included build command checks the site's links, categories, and required content.
