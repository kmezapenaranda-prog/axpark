"""
detector_api.py — Conexión del detector de placas con el backend de AxPark.

- Registra cada placa con la hora real en que se vio (detectedAt).
- Cola offline: si no hay internet o el servidor falla, la placa se guarda en disco
  (JSONL) y se reintenta sola cada pocos segundos. Sobrevive a reinicios del PC.
- Latido: avisa cada minuto que el detector sigue vivo, para que el panel lo muestre
  "En línea".

La clave (DETECTOR_API_KEY) se crea en el panel: Admin → negocio → Detectores de placas.
El backend deduce de ella a qué parqueadero pertenece: aquí no se envía tenantId.
"""

from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timedelta

import requests

# El backend rechaza detecciones de más de 24 h; se descartan un poco antes para no insistir.
MAX_QUEUE_AGE = timedelta(hours=23, minutes=30)

# Resultados posibles de register():
#   ok        → entrada registrada
#   duplicate → la placa ya estaba adentro (409)
#   queued    → sin conexión / servidor caído: guardada para reintentar
#   rejected  → el backend la rechazó (400): no se reintenta
#   auth      → clave inválida o revocada (401/403): revisar DETECTOR_API_KEY
STATUSES = ("ok", "duplicate", "queued", "rejected", "auth")


def _now_iso() -> str:
    """Hora local con zona horaria, p. ej. 2026-11-08T14:05:09-05:00."""
    return datetime.now().astimezone().isoformat(timespec="seconds")


class DetectorApi:
    def __init__(self, entry_url: str, key: str, queue_file: str,
                 heartbeat_url: str | None = None,
                 retry_every: float = 15.0, heartbeat_every: float = 60.0):
        self.entry_url = entry_url
        self.key = key
        self.queue_file = queue_file
        self.heartbeat_url = heartbeat_url or self._default_heartbeat_url(entry_url)
        self.retry_every = retry_every
        self.heartbeat_every = heartbeat_every

        self._lock = threading.Lock()
        self._queue: list[dict] = self._load_queue()
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._background, daemon=True)
        self._auth_warned = False

        if not key:
            print("[warn] DETECTOR_API_KEY no está definida: créala en el panel "
                  "(Admin → negocio → Detectores de placas) y ponla en el .env de este PC.")
        elif not key.startswith("axp_"):
            print("[warn] DETECTOR_API_KEY no parece una clave de detector (deben empezar por 'axp_'). "
                  "Las claves compartidas antiguas ya no funcionan: crea una en el panel.")
        if self._queue:
            print(f"[cola] {len(self._queue)} placa(s) pendientes de enviar desde la última vez.")

    @staticmethod
    def _default_heartbeat_url(entry_url: str) -> str:
        base = entry_url.rsplit("/parking/entry", 1)[0]
        return f"{base}/detectors/heartbeat"

    # ------------------------------------------------------------------ #
    # API pública
    # ------------------------------------------------------------------ #

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=5)
        if self._queue:
            print(f"[cola] Quedan {len(self._queue)} placa(s) pendientes; se enviarán al volver a arrancar.")

    @property
    def pending(self) -> int:
        with self._lock:
            return len(self._queue)

    def register(self, plate: str) -> str:
        """Envía una placa. Si no hay conexión la deja en cola y devuelve 'queued'."""
        item = {"plate": plate, "detectedAt": _now_iso()}
        status = self._send(item)
        if status == "network":
            with self._lock:
                self._queue.append(item)
                self._save_queue()
            return "queued"
        return status

    # ------------------------------------------------------------------ #
    # HTTP
    # ------------------------------------------------------------------ #

    def _headers(self) -> dict:
        return {"x-detector-key": self.key}

    def _send(self, item: dict) -> str:
        """Devuelve ok | duplicate | rejected | auth | network."""
        try:
            r = requests.post(self.entry_url, json=item, headers=self._headers(), timeout=5)
        except requests.RequestException:
            return "network"
        if r.status_code in (200, 201):
            return "ok"
        if r.status_code == 409:
            return "duplicate"
        if r.status_code in (401, 403):
            if not self._auth_warned:
                print("[error] El backend rechazó la clave del detector (401/403). "
                      "¿Fue revocada? Crea una nueva en el panel y actualiza DETECTOR_API_KEY.")
                self._auth_warned = True
            return "auth"
        if r.status_code == 429 or r.status_code >= 500:
            return "network"  # problema temporal del servidor: reintentar luego
        try:
            msg = r.json().get("message")
        except ValueError:
            msg = r.text[:120]
        print(f"[api] Placa {item['plate']} rechazada ({r.status_code}): {msg}")
        return "rejected"

    def _heartbeat(self) -> None:
        try:
            requests.post(self.heartbeat_url, headers=self._headers(), timeout=5)
        except requests.RequestException:
            pass  # sin conexión: el panel lo mostrará "Sin señal"

    # ------------------------------------------------------------------ #
    # Cola offline (JSONL en disco)
    # ------------------------------------------------------------------ #

    def _load_queue(self) -> list[dict]:
        if not os.path.exists(self.queue_file):
            return []
        items = []
        with open(self.queue_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        items.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass  # línea dañada (p. ej. corte de luz a mitad de escritura)
        return items

    def _save_queue(self) -> None:
        """Escritura atómica: primero a un temporal y luego se reemplaza el archivo."""
        tmp = self.queue_file + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            for item in self._queue:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
        os.replace(tmp, self.queue_file)

    def _flush(self) -> None:
        with self._lock:
            pending = list(self._queue)
        if not pending:
            return
        done: list[dict] = []
        for item in pending:
            detected = datetime.fromisoformat(item["detectedAt"])
            if datetime.now().astimezone() - detected > MAX_QUEUE_AGE:
                print(f"[cola] Placa {item['plate']} descartada: lleva más de 23 h sin poder enviarse "
                      f"(vista {item['detectedAt']}). Regístrala a mano si sigue adentro.")
                done.append(item)
                continue
            status = self._send(item)
            if status in ("network", "auth"):
                break  # sigue sin conexión (o clave mala): no tiene sentido seguir intentando ahora
            done.append(item)
            print(f"[cola] Placa {item['plate']} enviada ({status}), vista {item['detectedAt']}.")
        if done:
            with self._lock:
                self._queue = [i for i in self._queue if i not in done]
                self._save_queue()

    def _background(self) -> None:
        last_beat = 0.0
        while not self._stop.is_set():
            self._flush()
            if time.monotonic() - last_beat >= self.heartbeat_every:
                self._heartbeat()
                last_beat = time.monotonic()
            self._stop.wait(self.retry_every)
