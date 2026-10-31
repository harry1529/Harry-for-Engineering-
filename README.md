# Mentor Harry for Engineering (Stage 1: public site)

## Folder structure

```
mentor-harry/
├── index.html            The page shell: navbar, hero, sections, PDF viewer
├── css/
│   └── style.css         All colours, fonts and layout (colours are at the top)
├── js/
│   ├── config.js         YOUR Supabase URL + public key go here
│   ├── sample-data.js    Demo content (used only until Supabase is connected)
│   ├── animations.js     Your smooth-scroll design (GSAP + Lenis)
│   └── app.js            Pages, search, bookmarks, theme, PDF viewer, forms
├── supabase/
│   └── schema.sql        Paste into Supabase SQL Editor (tables, security, bucket, sample data)
└── README.md
```

## Run locally
- Quick preview: double-click `index.html`.
- Better: install VS Code, add the "Live Server" extension, right-click `index.html` > "Open with Live Server".

## Connect Supabase
1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Copy Project URL and the public (anon / publishable) key into `js/config.js`.
3. Never put the service_role / secret key or database password anywhere in these files.
