# Pianoteq Remote

A mobile-first single-page web app for remotely controlling **Pianoteq 9 Stage** running headlessly on a Raspberry Pi. Ships as a **Docker container** with built-in nginx reverse proxy – no CORS headaches, one command to run.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

---

## Features

| Feature | Description |
|---|---|
| **Preset Browser** | Fetch, search, and load available presets with a single tap |
| **Sound Parameters** | Sliders for Volume, Dynamics, Velocity, Reverb, and Blooming Energy |
| **A/B Switch** | Quickly toggle between preset A and B |
| **MIDI Playback** | Play / Pause / Stop controls for MIDI file playback |
| **Status Bar** | Displays the currently loaded preset name |
| **Settings** | Connection mode selector (Docker proxy / direct IP), persisted in `localStorage` |

## Architecture

```
┌──────────────┐       ┌────────────────────────────────┐       ┌────────────┐
│  Smartphone  │──────▶│  Docker Container (nginx:alpine)│──────▶│  Pianoteq  │
│  Browser     │  :8080│  static files + /api proxy     │  :8081│  JSON-RPC   │
└──────────────┘       └────────────────────────────────┘       └────────────┘
```

- The browser loads the web app from nginx on port **8080**
- All API calls go to `/api` on the same origin (no CORS issues)
- nginx proxies `/api` → `http://<PIANOTEQ_HOST>:<PIANOTEQ_PORT>`

## Technology

- Pure **HTML + CSS + Vanilla JavaScript** – no build step required
- **Docker** + **nginx:alpine** for zero-config deployment
- Communication via **JSON-RPC 2.0** (HTTP POST)
- Dark theme with a warm gold accent (piano-inspired)
- CSS Grid & Flexbox, touch-optimized (≥ 44 px tap targets)
- Responsive: Smartphone → Tablet → Desktop

## File Structure

```
PianoteqWeb/
├── index.html            ← App shell with all sections
├── style.css             ← Mobile-first dark theme
├── app.js                ← API logic, state management, UI updates
├── Dockerfile            ← nginx:alpine image with static files + proxy
├── docker-compose.yml    ← One-command startup
├── nginx.conf.template   ← nginx config with env-var substitution
├── .dockerignore
└── readme.md
```

## Pianoteq starten (JSON-RPC Server)

Damit die Web-App mit Pianoteq kommunizieren kann, muss Pianoteq mit aktiviertem **JSON-RPC HTTP-Server** gestartet werden. Pianoteq bietet dafür die Kommandozeilenparameter `--headless` und `--serve`.

### Auf dem Desktop (mit GUI)

Pianoteq mit JSON-RPC-Server starten, während die grafische Oberfläche sichtbar bleibt:

```bash
# Linux
sudo ./Pianoteq9 --serve "0.0.0.0:8081" --headless
"./Pianoteq 9 Stage" --serve 0.0.0.0:8081

# macOS
open -a "Pianoteq 9 Stage" --args --serve 0.0.0.0:8081

# Windows (PowerShell)
& "C:\Program Files\Modartt\Pianoteq 9 Stage\Pianoteq 9 Stage.exe" --serve 0.0.0.0:8081
```

### Headless (ohne GUI, z. B. Raspberry Pi)

Für den Betrieb ohne Monitor/Desktop – ideal für einen Raspberry Pi:

```bash
"./Pianoteq 9 Stage" --headless --serve 0.0.0.0:8081
```

### Parameter-Erklärung

| Parameter | Beschreibung |
|---|---|
| `--headless` | Startet Pianoteq ohne grafische Oberfläche (kein X11/Wayland nötig) |
| `--serve <ip>:<port>` | Aktiviert den eingebauten JSON-RPC HTTP-Server auf der angegebenen Adresse und Port |
| `0.0.0.0` | Lauscht auf **allen** Netzwerk-Interfaces (erreichbar von anderen Geräten im Netzwerk) |
| `127.0.0.1` | Lauscht nur lokal (nur vom selben Rechner erreichbar) |
| `8081` | Port – muss mit `PIANOTEQ_PORT` in `docker-compose.yml` übereinstimmen |

### Autostart auf dem Raspberry Pi (systemd)

Um Pianoteq beim Booten automatisch zu starten, eine systemd-Unit anlegen:

```bash
sudo nano /etc/systemd/system/pianoteq.service
```

Inhalt:

```ini
[Unit]
Description=Pianoteq 9 Stage (headless JSON-RPC)
After=network.target sound.target

[Service]
Type=simple
User=pi
ExecStart=/home/pi/Pianoteq 9 Stage/arm/Pianoteq 9 Stage --headless --serve 0.0.0.0:8081
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pianoteq
sudo systemctl start pianoteq

# Status prüfen
sudo systemctl status pianoteq
```

### Verbindung testen

Prüfe ob der JSON-RPC-Server läuft, indem du von einem anderen Gerät im Netzwerk folgenden Befehl ausführst:

```bash
curl -X POST http://<PIANOTEQ_IP>:8081 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getListOfPresets","params":{},"id":1}'
```

Wenn alles funktioniert, erhältst du eine JSON-Antwort mit der Liste aller verfügbaren Presets.

---

## Quick Start (Docker)

### 1. Configure

Edit `docker-compose.yml` and set the IP/port of your Pianoteq instance:

```yaml
environment:
  - PIANOTEQ_HOST=192.168.1.100   # IP of the machine running Pianoteq
  - PIANOTEQ_PORT=8081            # Pianoteq JSON-RPC port
```

### 2. Build & Run

```bash
docker compose up -d --build
```

### 3. Open in Browser

Navigate to **http://\<docker-host\>:8080** on your phone or PC. That's it!

### Stop / Restart

```bash
docker compose down        # stop
docker compose up -d       # start again (no rebuild needed)
docker compose up -d --build  # rebuild after code changes
```

## Quick Start (without Docker)

If you prefer running without Docker, simply open `index.html` in a browser and switch to **Direct IP** mode in the settings. You will need to handle CORS yourself (e.g. by placing an nginx reverse proxy in front of Pianoteq).

## Connection Modes

| Mode | How it works |
|---|---|
| **Docker Proxy** (default) | App calls `/api` on the same origin. nginx proxies to Pianoteq. Zero CORS config. |
| **Direct IP** | App calls `http://<ip>:<port>` directly. Requires CORS headers or a separate proxy. |

Switch between modes in the in-app **Settings** panel (gear icon).

## JSON-RPC API

Pianoteq exposes a JSON-RPC 2.0 interface. All calls are sent as `POST` requests:

```json
{ "method": "getListOfPresets", "params": {}, "id": 1 }
```

### Methods Used

| Method | Purpose |
|---|---|
| `getListOfPresets()` | Retrieve all available presets |
| `loadPreset({ name })` | Load a preset |
| `setParameters({ list })` | Set sound parameters |
| `abSwitch()` | Toggle between preset A and B |
| `getInfo()` | Query current preset & status |
| `midiPlay()` | Start MIDI playback |
| `midiPause()` | Pause MIDI playback |
| `midiStop()` | Stop MIDI playback |

## Customizing Parameter IDs

The slider IDs in `app.js` (`PARAM_MAP`) may need to be adjusted to match the actual Pianoteq parameter names:

```js
const PARAM_MAP = {
  'param-volume':   'Volume',
  'param-dynamics': 'Dynamics',
  'param-velocity': 'Velocity Sensitivity',
  'param-reverb':   'Room Effect',
  'param-sustain':  'Blooming Energy'
};
```

You can discover the exact IDs by calling `getParameters()`.

## Running on a Raspberry Pi

1. Install Docker on the Pi: `curl -fsSL https://get.docker.com | sh`
2. Clone / copy this folder to the Pi
3. Adjust `PIANOTEQ_HOST` to `127.0.0.1` if Pianoteq runs on the same Pi
4. `docker compose up -d --build`
5. Access from any device on the network at `http://<pi-ip>:8080`

## License

Private project – not intended for redistribution.
