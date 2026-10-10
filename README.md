# Spin Doodle

A draw-and-guess game where the drawing board keeps spinning. This folder contains the game page and a small server that connects players over ordinary HTTPS, so no direct browser-to-browser link is needed.

## Files

- `server.js` serves the game page and relays messages between players in the same room.
- `public/index.html` is the game.
- `package.json` lists the one dependency (`ws`).

## Put it online for free on Render

1. Create a free GitHub account if you don't have one, then create a new repository (it can be private).
2. On the repository page, choose "uploading an existing file" and drag in `server.js`, `package.json`, `README.md` and the `public` folder. Commit.
3. Create a free account at render.com and choose **New → Web Service**. Connect your GitHub account and pick the repository.
4. Use these settings:
   - Region: Singapore, if it's offered
   - Build command: `npm install`
   - Start command: `node server.js`
   - Instance type: Free
5. Press **Deploy**. When it finishes, Render shows your address, like `https://spin-doodle-abcd.onrender.com`.

## Playing

1. Open your address, type your name and press **Create a new room instead**.
2. Press **Copy invite link** and send it to your friends.

On the free plan the server sleeps after 15 minutes with nobody connected. The first person to open the page after that waits about a minute while it wakes up. It stays awake while anyone is playing.

## Run it on your own computer

```
npm install
node server.js
```

Then open http://localhost:3000.
