# Zen / Firefox — make Cats & Rats show up

Installing from a zip **does** put the add-on on `about:addons`.  
It does **not** always pin the toolbar button or jump into Zen’s History sidebar menu.

## 1. Confirm it is enabled

1. Open `about:addons` (or **Add-ons and themes**)
2. Find **Cats & Rats**
3. Must be **Enabled** (toggle on)
4. Open the extension → **Permissions**
5. Turn **on** access for all sites / `<all_urls>` if offered  
   (without this, scan cannot read page images)

## 2. Toolbar (extensions menu)

Zen/Firefox often **hide** new add-ons until you pin them:

1. Right‑click empty toolbar → **Customize Toolbar…**
2. Find **Cats & Rats** → drag onto the toolbar  
   **or**
3. Click the puzzle / extensions control → find **Cats & Rats** → **pin** (pin icon)

After pin, the cat icon opens the popup.

## 3. Sidebar

Zen’s **History ▼** list is mostly **built‑ins** (Bookmarks, History, Synced Tabs).  
Extension sidebars are separate:

1. **View → Sidebar → Cats & Rats**  
   (wording may be **View → Toolbars / Panels** depending on Zen build)
2. Or open the sidebar panel switcher and scroll for **Cats & Rats** (not under History)

If your Zen build does not list extension sidebars, use the **toolbar popup** — same UI.

## 4. Re-install 1.0.1 (recommended)

```text
about:addons → Cats & Rats → Remove
```

Then either:

- **Install Add-on From File** →  
  `C:\Users\trent\cats-and-rats\dist\cats-and-rats-firefox.zip`
- or **about:debugging** → Load Temporary Add-on →  
  `C:\Users\trent\cats-and-rats\src\manifest.json`

Version **1.0.1** sets `default_area: "navbar"` so the button prefers the toolbar.

## 5. Not for Chrome Web Store zip on Zen

Use the **firefox** zip on Zen/Firefox.  
Use the **chrome** zip only on Chrome/Edge/Brave.
