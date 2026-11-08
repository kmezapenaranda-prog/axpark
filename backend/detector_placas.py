"""
detector_placas.py — Detección de vehículos + placas colombianas para Parking IA
Pipeline: YOLOv8n (vehículos) → bbox +20% → zona amarilla/contornos → enderezar → fast-plate-ocr → validación placa

Dependencias: pip install -r requirements.txt
"""

import cv2
import numpy as np
from fast_plate_ocr import LicensePlateRecognizer
import re
import os
import json
import time
import argparse
import threading
import requests
from datetime import datetime
from urllib.parse import quote
from ultralytics import YOLO
from detector_api import DetectorApi

try:
    import torch
    GPU_AVAILABLE = torch.cuda.is_available()
except ImportError:
    GPU_AVAILABLE = False

def _load_dotenv(path: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")) -> None:
    """Carga variables de .env sin pisar las que ya existen en el entorno."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

print(f"[info] Dispositivo:{'GPU (CUDA)' if GPU_AVAILABLE else 'CPU'}")

DEFAULT_VIDEO = os.environ.get("DETECTOR_DEFAULT_VIDEO", "carro1.mp4")

# Clases YOLO COCO → etiqueta interna
VEHICLE_MAP = {
    "car":        "carro",
    "truck":      "carro",
    "motorcycle": "moto",
    "bus":        "taxi",
}

# Formatos de placa colombiana:
#   Carro/camión/taxi:  ABC123  (3 letras + 3 dígitos)
#   Moto:               ABC12D  (3 letras + 2 dígitos + 1 letra)
_PLATE_RE = {
    "carro": re.compile(r"^[A-Z]{3}\d{3}$"),
    "moto":  re.compile(r"^[A-Z]{3}\d{2}[A-Z]$"),
}


def _plate_type(cleaned: str) -> str | None:
    """Retorna 'carro' o 'moto' si el texto es placa colombiana válida, else None."""
    for ptype, pattern in _PLATE_RE.items():
        if pattern.match(cleaned):
            return ptype
    return None

PARKING_API = os.environ.get("PARKING_API_URL", "http://localhost:3000/parking/entry")
# Clave de ESTE detector, creada en el panel (Admin → negocio → Detectores de placas).
# El backend deduce el parqueadero de la clave: ya no se envía tenantId.
DETECTOR_API_KEY = os.environ.get("DETECTOR_API_KEY", "")
# Placas pendientes cuando no hay internet (se reintentan solas). Ver detector_api.py.
QUEUE_FILE = os.environ.get("DETECTOR_QUEUE_FILE",
                            os.path.join(os.path.dirname(os.path.abspath(__file__)), "cola_detector.jsonl"))
# Sin ventana (para un PC sin pantalla o como servicio). También: --headless
HEADLESS_DEFAULT = os.environ.get("DETECTOR_HEADLESS", "").lower() in ("1", "true", "si", "sí")

# Colores de bbox según resultado del POST (BGR)
POST_COLORS = {
    "ok":        (0, 220, 0),    # verde  — registrado con éxito
    "duplicate": (255, 100, 0),  # azul   — ya está adentro (409)
    "error":     (0, 0, 220),    # rojo   — fallo de red / 5xx
    "test":      (0, 220, 255),  # amarillo — leída en modo prueba (--sin-api)
    "queued":    (0, 140, 255),  # naranja — sin conexión, guardada en cola para reintentar
    "rejected":  (0, 0, 220),    # rojo   — el backend la rechazó (400)
    "auth":      (0, 0, 220),    # rojo   — clave del detector inválida o revocada
}

# Colores neutros mientras no hay POST (por tipo de vehículo)
VEHICLE_COLORS = {
    "carro": (180, 180, 180),
    "moto":  (180, 180, 180),
    "taxi":  (180, 180, 180),
}


class LatestFrameReader:
    """Lee un stream RTSP en un hilo aparte y guarda solo el frame más reciente.
    Sin esto, como el OCR es lento, los frames se acumulan y la imagen va con segundos de retraso."""

    def __init__(self, url: str):
        # threads;1 evita el crash de FFmpeg "Assertion fctx->async_lock failed" al decodificar H.264
        os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|threads;1")
        self._url = url
        self._frame = None
        self._fps = 0.0
        self._ok = False
        self._stop = False
        self._lock = threading.Lock()
        self._opened = threading.Event()
        # El VideoCapture se crea, se lee y se libera dentro del mismo hilo.
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        self._opened.wait(timeout=35)

    def _loop(self) -> None:
        cap = cv2.VideoCapture(self._url, cv2.CAP_FFMPEG)
        self._ok = cap.isOpened()
        self._fps = cap.get(cv2.CAP_PROP_FPS) if self._ok else 0.0
        self._opened.set()
        while self._ok and not self._stop:
            ret, frame = cap.read()
            if not ret:
                self._ok = False
                break
            with self._lock:
                self._frame = frame
        cap.release()

    def isOpened(self) -> bool:
        return self._ok

    def get(self, prop):
        return self._fps if prop == cv2.CAP_PROP_FPS else 0

    def read(self):
        # Espera hasta 10 s al primer frame
        for _ in range(200):
            with self._lock:
                if self._frame is not None:
                    frame, self._frame = self._frame, None
                    return True, frame
            if not self._ok:
                return False, None
            time.sleep(0.05)
        return False, None

    def release(self) -> None:
        self._stop = True
        self._thread.join(timeout=5)


def tapo_url(ip: str, stream: int = 1) -> str:
    """rtsp://usuario:clave@IP:554/stream1 — usa la 'Cuenta de la cámara' creada en la app Tapo."""
    user = os.environ.get("TAPO_USER", "")
    pwd = os.environ.get("TAPO_PASS", "")
    if not user or not pwd:
        raise SystemExit("[error] Define TAPO_USER y TAPO_PASS (cuenta de cámara de la app Tapo) en .env o en el entorno.")
    return f"rtsp://{quote(user, safe='')}:{quote(pwd, safe='')}@{ip}:554/stream{stream}"


def _validate_plate(text: str) -> tuple[bool, str]:
    cleaned = re.sub(r"[^A-Z0-9]", "", text.upper())
    return _plate_type(cleaned) is not None, cleaned


def _expand_bbox(x1: int, y1: int, x2: int, y2: int,
                 frame_h: int, frame_w: int, pct: float = 0.20) -> tuple[int, int, int, int]:
    """Amplía el bbox un % hacia cada lado sin salirse del frame."""
    dw = int((x2 - x1) * pct)
    dh = int((y2 - y1) * pct)
    return (
        max(0, x1 - dw),
        max(0, y1 - dh),
        min(frame_w, x2 + dw),
        min(frame_h, y2 + dh),
    )


def _sharpness(gray: np.ndarray) -> float:
    """Varianza del Laplaciano — a menor valor, más borrosa la imagen (motion blur)."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


# Confusiones típicas del OCR según la posición en la placa colombiana (ABC123 / ABC12D)
_TO_LETTER = str.maketrans({"0": "O", "1": "I", "2": "Z", "4": "A", "5": "S", "6": "G", "8": "B"})
_TO_DIGIT = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2",
                           "A": "4", "S": "5", "G": "6", "T": "7", "B": "8"})


def _fix_plate(text: str) -> str:
    """Corrige letras/dígitos según la posición: 3 primeras son letras, 4ª y 5ª son dígitos."""
    t = re.sub(r"[^A-Z0-9]", "", text.upper())
    if len(t) != 6:
        return t
    return t[:3].translate(_TO_LETTER) + t[3:5].translate(_TO_DIGIT) + t[5]


def _order_corners(pts: np.ndarray) -> np.ndarray:
    s = pts.sum(1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)],
                     pts[np.argmax(s)], pts[np.argmax(d)]], dtype="float32")


def _warp_rect(img: np.ndarray, rect) -> np.ndarray | None:
    """Recorta y endereza un rectángulo rotado (cv2.minAreaRect) con un margen pequeño."""
    (cx, cy), (w, h), ang = rect
    if w < h:  # que el lado largo quede horizontal
        w, h, ang = h, w, ang + 90
    w, h = w * 1.08, h * 1.12
    if w < 30 or h < 12:
        return None
    box = _order_corners(cv2.boxPoints(((cx, cy), (w, h), ang)).astype("float32"))
    W, H = int(round(w)), int(round(h))
    M = cv2.getPerspectiveTransform(box, np.array([[0, 0], [W, 0], [W, H], [0, H]], dtype="float32"))
    return cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def _find_plate_candidates(roi: np.ndarray) -> list[np.ndarray]:
    """Recortes candidatos a placa dentro del ROI de un vehículo, ya enderezados.
    1) Zonas amarillas (placas colombianas de carro, moto y taxi).
    2) Respaldo: rectángulos con muchos bordes (otras placas)."""
    crops: list[np.ndarray] = []
    roi_area = roi.shape[0] * roi.shape[1]

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (15, 70, 90), (40, 255, 255))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 7)))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:4]:
        area = cv2.contourArea(cnt)
        if area < 600 or area > roi_area * 0.25:
            continue
        rect = cv2.minAreaRect(cnt)
        w, h = rect[1]
        if min(w, h) == 0 or not 1.2 < max(w, h) / min(w, h) < 5.5:
            continue
        crop = _warp_rect(roi, rect)
        if crop is not None:
            crops.append(crop)

    gray = cv2.GaussianBlur(cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    seen: list[tuple[int, int]] = []
    for lo in (80, 140):
        edges = cv2.Canny(gray, lo, lo * 2)
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (17, 5)))
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if h == 0 or not (1.5 < w / h < 5.5 and 800 < w * h < 60000):
                continue
            if any(abs(sx - x) < 20 and abs(sy - y) < 20 for sx, sy in seen):
                continue
            seen.append((x, y))
            crop = _warp_rect(roi, cv2.minAreaRect(cnt))
            if crop is not None:
                crops.append(crop)

    return crops[:12]


class PlateDetector:
    def __init__(self, output_dir: str = "detecciones", save: bool = True,
                 vehicle_conf: float = 0.5, min_sharpness: float = 60.0,
                 send_api: bool = True, continuous: bool = False, headless: bool = False):
        self.send_api = send_api
        self.continuous = continuous
        self.headless = headless
        self.api: DetectorApi | None = None
        if send_api:
            self.api = DetectorApi(PARKING_API, DETECTOR_API_KEY, QUEUE_FILE)
            self.api.start()
        print("[init] Cargando YOLOv8n (primera vez descarga ~6 MB)...")
        self.yolo = YOLO("yolov8n.pt")
        self.vehicle_conf = vehicle_conf
        self.min_sharpness = min_sharpness

        print("[init] Cargando OCR de placas (primera vez descarga ~2 MB)...")
        self.ocr = LicensePlateRecognizer("cct-xs-v2-global-model")

        self.output_dir = output_dir
        self.save = save
        self.session_log: list[dict] = []
        self._last_seen: dict[str, datetime] = {}   # placa → última vez registrada
        self._plate_status: dict[str, str] = {}     # placa → "ok" | "duplicate" | "error"

        if save:
            os.makedirs(output_dir, exist_ok=True)

        print("[init] Listo.\n")

    # ------------------------------------------------------------------ #
    # HTTP: registrar entrada en el backend
    # ------------------------------------------------------------------ #

    def _post_entry(self, plate: str) -> str:
        """POST /parking/entry. Retorna ok | duplicate | queued | rejected | auth (o 'test' sin API)."""
        if not self.api:
            return "test"
        return self.api.register(plate)

    # ------------------------------------------------------------------ #
    # YOLO: detectar vehículos
    # ------------------------------------------------------------------ #

    def _detect_vehicles(self, frame: np.ndarray) -> list[dict]:
        """Retorna lista de vehículos detectados con bbox expandido 20%."""
        h, w = frame.shape[:2]
        vehicles = []

        yolo_results = self.yolo(frame, conf=self.vehicle_conf, verbose=False)
        for r in yolo_results:
            for box in r.boxes:
                cls_name = self.yolo.names[int(box.cls)]
                if cls_name not in VEHICLE_MAP:
                    continue
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                ex1, ey1, ex2, ey2 = _expand_bbox(x1, y1, x2, y2, h, w, pct=0.20)
                vehicles.append({
                    "type":       VEHICLE_MAP[cls_name],
                    "yolo_class": cls_name,
                    "yolo_conf":  round(float(box.conf), 3),
                    "bbox_orig":  [x1, y1, x2, y2],
                    "bbox_exp":   [ex1, ey1, ex2, ey2],
                })

        return vehicles

    # ------------------------------------------------------------------ #
    # OCR dentro del ROI de cada vehículo
    # ------------------------------------------------------------------ #

    def _read_plate_from_roi(self, roi: np.ndarray) -> tuple[str, float] | None:
        """Extrae la placa colombiana válida más confiable del ROI. Retorna (placa, conf) o None."""
        # Descartar solo el 25% superior (techo / manubrio); en motos la placa queda alta.
        roi = roi[roi.shape[0] // 4 :, :]

        crops = []
        for crop in _find_plate_candidates(roi):
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            if _sharpness(gray) < self.min_sharpness:
                continue  # candidato borroso (motion blur) — no vale la pena leerlo
            crops.append(crop)
        if not crops:
            return None

        best: tuple[str, float] | None = None
        for pred in self.ocr.run(crops, return_confidence=True):
            plate = _fix_plate(pred.plate)
            if _plate_type(plate) is None:
                continue
            conf = float(np.min(pred.char_probs[: len(plate)]))
            if conf < 0.5:
                continue
            if best is None or conf > best[1]:
                best = (plate, round(conf, 3))
        return best

    # ------------------------------------------------------------------ #
    # Detección completa de un frame
    # ------------------------------------------------------------------ #

    def detect(self, frame: np.ndarray) -> list[dict]:
        """Pipeline completo: YOLO → ROI +20% → OCR placa. Retorna lista de dicts."""
        results = []
        for vehicle in self._detect_vehicles(frame):
            ex1, ey1, ex2, ey2 = vehicle["bbox_exp"]
            roi = frame[ey1:ey2, ex1:ex2]
            if roi.size == 0:
                continue

            plate_result = self._read_plate_from_roi(roi)
            entry = {
                "vehicle_type": vehicle["type"],
                "yolo_class":   vehicle["yolo_class"],
                "yolo_conf":    vehicle["yolo_conf"],
                "bbox":         vehicle["bbox_orig"],
                "bbox_expanded": vehicle["bbox_exp"],
                "plate":        None,
                "plate_conf":   None,
                "timestamp":    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            if plate_result:
                entry["plate"], entry["plate_conf"] = plate_result
            results.append(entry)

        return results

    # ------------------------------------------------------------------ #
    # Dibujo
    # ------------------------------------------------------------------ #

    def _draw(self, frame: np.ndarray, results: list[dict]) -> np.ndarray:
        for r in results:
            x1, y1, x2, y2 = r["bbox"]
            ex1, ey1, ex2, ey2 = r["bbox_expanded"]

            # Color según último POST; gris neutro si aún no se ha enviado
            plate = r.get("plate")
            status = self._plate_status.get(plate) if plate else None
            color = POST_COLORS.get(status, VEHICLE_COLORS.get(r["vehicle_type"], (180, 180, 180)))

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.rectangle(frame, (ex1, ey1), (ex2, ey2), color, 1)

            vtype = r["vehicle_type"].upper()
            if plate:
                status_tag = {"ok": "OK", "duplicate": "YA DENTRO", "error": "ERR",
                              "test": "LEIDA", "queued": "EN COLA", "rejected": "RECHAZADA",
                              "auth": "CLAVE INVALIDA"}.get(status, "")
                label = f"{vtype}  {plate}  {status_tag}"
            else:
                label = f"{vtype}  {r['yolo_conf']:.0%}  [sin placa]"

            # Fondo oscuro para legibilidad
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.62, 2)
            cv2.rectangle(frame, (x1, y1 - th - 12), (x1 + tw + 4, y1 - 2), (0, 0, 0), -1)
            cv2.putText(frame, label, (x1 + 2, y1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.62, color, 2)

        return frame

    def _log(self, results: list[dict]) -> list[dict]:
        """Registra cada placa nueva del frame (uno por uno) y retorna las que sí se procesaron."""
        now = datetime.now()
        logged: list[dict] = []
        for r in results:
            if not r["plate"]:
                continue
            plate = r["plate"]
            last = self._last_seen.get(plate)
            if last and (now - last).total_seconds() < 30:
                continue  # cooldown: misma placa ignorada por 30 s
            self._last_seen[plate] = now

            # El patrón de placa es más confiable que la clase YOLO para determinar el tipo.
            # ABC123 → carro, ABC12D → moto (mismo criterio que el backend)
            ptype = _plate_type(plate)
            if ptype:
                r["vehicle_type"] = ptype

            status = self._post_entry(plate)
            self._plate_status[plate] = status
            r["post_status"] = status
            self.session_log.append(r)
            logged.append(r)

            status_label = {"ok": "REGISTRADO", "duplicate": "YA ADENTRO", "error": "ERROR API",
                            "test": "LEIDA (sin API)", "queued": "SIN CONEXION - EN COLA",
                            "rejected": "RECHAZADA", "auth": "CLAVE INVALIDA"}
            print(f"  {r['vehicle_type'].upper():5}  {plate}  "
                  f"conf={r['plate_conf']:.0%}  [{status_label[status]}]  {r['timestamp']}")
        return logged

    # ------------------------------------------------------------------ #
    # Modos de entrada
    # ------------------------------------------------------------------ #

    def process_image(self, path: str) -> list[dict]:
        frame = cv2.imread(path)
        if frame is None:
            print(f"[error] No se pudo leer: {path}")
            return []

        print(f"[imagen] Procesando {path}")
        results = self.detect(frame)
        annotated = self._draw(frame.copy(), results)

        if results:
            self._log(results)
        else:
            print("  No se detectaron vehículos.")

        if self.save and results:
            out = os.path.join(self.output_dir, f"det_{os.path.basename(path)}")
            cv2.imwrite(out, annotated)
            print(f"[guardado] {out}")

        if not self.headless:
            cv2.imshow("Parking IA — Detector", annotated)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        return results

    def _open_source(self, source, is_stream: bool):
        if is_stream:
            print("[stream] Conectando a la cámara...")
            return LatestFrameReader(source)
        return cv2.VideoCapture(source)

    def _reconnect(self, source) -> "LatestFrameReader":
        """Reintenta la cámara con espera creciente (5 s → 60 s) hasta que vuelva o se pulse Ctrl+C.
        Un corte de luz o un reinicio de la cámara no debe dejar el parqueadero sin detector."""
        wait = 5
        while True:
            print(f"[stream] Sin imagen de la cámara. Reintentando en {wait} s... (Ctrl+C para salir)")
            time.sleep(wait)
            cap = LatestFrameReader(source)
            if cap.isOpened():
                print("[stream] Cámara reconectada.")
                return cap
            cap.release()
            wait = min(wait * 2, 60)

    def process_video(self, source=DEFAULT_VIDEO) -> None:
        is_stream = isinstance(source, str) and source.lower().startswith(("rtsp://", "http://", "https://"))
        # En cámara en vivo y continuo (o sin ventana), el detector debe aguantar cortes y reconectarse.
        keep_alive = is_stream and (self.continuous or self.headless)
        cap = self._open_source(source, is_stream)
        if not cap.isOpened():
            safe = re.sub(r"//[^@/]+@", "//***@", str(source))
            print(f"[error] No se pudo abrir: {safe}")
            if is_stream:
                print("        Revisa IP, usuario/clave de la 'Cuenta de la cámara' y que la Tapo tenga RTSP activo.")
            if not keep_alive:
                return
            cap.release()
            cap = self._reconnect(source)

        if isinstance(source, int):
            label = "cámara"
        elif is_stream:
            label = "cámara IP"
        else:
            label = os.path.basename(str(source))
        fps_src = cap.get(cv2.CAP_PROP_FPS) or 30
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) if not is_stream else 0
        salir = "Ctrl+C para salir" if self.headless else "presiona Q para salir"
        print(f"[video] {label}  {fps_src:.0f} fps  {total or 'en vivo'} frames — {salir}")
        if self.headless:
            print("[headless] Sin ventana: las placas se muestran solo en esta consola.")

        frame_n = 0
        # En stream el lector ya descarta frames viejos: se procesa cada frame que llega.
        process_every = 1 if is_stream else max(1, int(fps_src / 6))  # ~6 inferencias/seg
        last_results: list[dict] = []
        device_label = "GPU" if GPU_AVAILABLE else "CPU"

        # FPS en pantalla
        fps_display = 0.0
        fps_t0 = time.perf_counter()
        fps_count = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    if keep_alive:
                        cap.release()
                        cap = self._reconnect(source)
                        continue
                    break
                frame_n += 1
                fps_count += 1

                logged: list[dict] = []
                if frame_n % process_every == 0:
                    last_results = self.detect(frame)
                    if last_results:
                        logged = self._log(last_results)

                if not self.headless:
                    # Actualizar FPS cada 0.5 s
                    elapsed = time.perf_counter() - fps_t0
                    if elapsed >= 0.5:
                        fps_display = fps_count / elapsed
                        fps_count = 0
                        fps_t0 = time.perf_counter()

                    display = self._draw(frame.copy(), last_results)

                    # HUD: FPS + dispositivo + placas en cola
                    pend = f"  |  cola {self.api.pending}" if self.api and self.api.pending else ""
                    hud = (f"FPS {fps_display:5.1f}  [{device_label}]  "
                           f"frame {frame_n}/{total}{pend}  |  Q salir")
                    cv2.rectangle(display, (0, 0), (len(hud) * 9 + 8, 36), (0, 0, 0), -1)
                    cv2.putText(display, hud, (6, 24),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 1)

                    # Leyenda de colores
                    leyenda = [("LEIDA (prueba)", POST_COLORS["test"])] if not self.send_api else [
                        ("REGISTRADO", POST_COLORS["ok"]),
                        ("YA ADENTRO", POST_COLORS["duplicate"]),
                        ("EN COLA (sin internet)", POST_COLORS["queued"]),
                        ("ERROR", POST_COLORS["error"])]
                    for i, (txt, col) in enumerate(leyenda):
                        y = 60 + i * 22
                        cv2.rectangle(display, (6, y - 13), (18, y + 3), col, -1)
                        cv2.putText(display, txt, (24, y), cv2.FONT_HERSHEY_SIMPLEX, 0.52, col, 1)

                    cv2.imshow("Parking IA — Detector", display)

                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break

                # Ya se registraron todos los carros presentes en este frame (uno por uno);
                # cerrar de una vez para no seguir procesando frames de más.
                if logged and not self.continuous:
                    plates = ", ".join(r["plate"] for r in logged)
                    print(f"[cierre] {len(logged)} placa(s) registrada(s) en este frame ({plates}) — cerrando video.")
                    break
        except KeyboardInterrupt:
            print("\n[salida] Detenido con Ctrl+C.")
        finally:
            cap.release()
            if not self.headless:
                cv2.destroyAllWindows()
            self._save_log()

    def _save_log(self) -> None:
        if self.api:
            self.api.stop()
        count = len(self.session_log)
        print(f"\n[resumen] {count} detección(es) con placa en esta sesión.")
        if not self.save or not self.session_log:
            return
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = os.path.join(self.output_dir, f"log_{ts}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.session_log, f, ensure_ascii=False, indent=2)
        print(f"[guardado] Log → {path}")


# ------------------------------------------------------------------ #
# CLI
# ------------------------------------------------------------------ #

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detector de vehículos + placas colombianas — Parking IA",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Ejemplos:
  python detector_placas.py                        # usa {DEFAULT_VIDEO}
  python detector_placas.py --video otra.mp4
  python detector_placas.py --imagen foto.jpg
  python detector_placas.py --camara --camara-id 0
  python detector_placas.py --tapo 192.168.20.31 --sin-api   # prueba con cámara Tapo
  python detector_placas.py --tapo 192.168.20.31 --headless  # producción: sin ventana, 24/7
        """,
    )
    src = parser.add_mutually_exclusive_group()
    src.add_argument("--imagen",    metavar="RUTA", help="Procesar imagen estática")
    src.add_argument("--video",     metavar="RUTA", help="Procesar archivo de video")
    src.add_argument("--camara",    action="store_true", help="Usar webcam")
    src.add_argument("--tapo",      metavar="IP",
                     help="Cámara Tapo por RTSP (usa TAPO_USER y TAPO_PASS del entorno/.env)")
    src.add_argument("--rtsp",      metavar="URL", help="Cualquier URL RTSP completa")
    parser.add_argument("--stream",     type=int, choices=(1, 2), default=1,
                        help="Tapo: 1 = alta resolución (mejor para placas), 2 = baja (default: 1)")
    parser.add_argument("--sin-api",    action="store_true",
                        help="Solo leer placas, sin registrar entradas en el backend")
    parser.add_argument("--continuo",   action="store_true",
                        help="No cerrar el video al detectar la primera placa")
    parser.add_argument("--camara-id",  type=int, default=0, metavar="N")
    parser.add_argument("--conf",       type=float, default=0.5,
                        help="Confianza mínima YOLO (default: 0.5)")
    parser.add_argument("--nitidez",    type=float, default=60.0, metavar="N",
                        help="Umbral mínimo de nitidez (varianza Laplaciano) para intentar OCR "
                             "en un candidato a placa; súbelo si aceptas lecturas borrosas, "
                             "bájalo si descarta placas válidas (default: 60.0)")
    parser.add_argument("--salida",     default="detecciones", metavar="DIR")
    parser.add_argument("--no-guardar", action="store_true")
    parser.add_argument("--headless",   action="store_true", default=HEADLESS_DEFAULT,
                        help="Sin ventana (PC sin pantalla o servicio). Con cámara en vivo se "
                             "reconecta sola si se cae. También: DETECTOR_HEADLESS=1")
    args = parser.parse_args()

    detector = PlateDetector(
        output_dir=args.salida,
        save=not args.no_guardar,
        vehicle_conf=args.conf,
        min_sharpness=args.nitidez,
        send_api=not args.sin_api,
        continuous=args.continuo or bool(args.tapo or args.rtsp),
        headless=args.headless,
    )

    if args.tapo:
        detector.process_video(source=tapo_url(args.tapo, args.stream))
    elif args.rtsp:
        detector.process_video(source=args.rtsp)
    elif args.imagen:
        detector.process_image(args.imagen)
    elif args.video:
        detector.process_video(source=args.video)
    elif args.camara:
        detector.process_video(source=args.camara_id)
    else:
        detector.process_video(source=DEFAULT_VIDEO)


if __name__ == "__main__":
    main()