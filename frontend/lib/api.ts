const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Misma key que usa AuthProvider para guardar la sesión.
const SESSION_STORAGE_KEY = "parki_session";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? ((JSON.parse(raw) as { accessToken?: string }).accessToken ?? null) : null;
  } catch {
    return null;
  }
}

/** Sesión vencida o inválida: se limpia y se manda al login. */
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // sin acceso a localStorage: igual redirigimos
  }
  if (window.location.pathname !== "/login") window.location.assign("/login");
}

// ── HTTP client centralizado ────────────────────────────────────────────────
// Render (plan free) arranca dormido: el primer request puede tardar en
// despertar. Por eso subimos el timeout a 60s con AbortController y tipamos
// los errores para distinguir:
//   - conflict  → 409, el registro ya existe (mostrar como aviso, no como fallo)
//   - timeout   → la solicitud tardó demasiado (la operación pudo completarse)
//   - network   → no se pudo conectar (la operación pudo completarse)
//   - http      → otro error real del backend
export type ApiErrorKind = "http" | "conflict" | "timeout" | "network";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }

  /** El registro ya existe (409). El backend envía el mensaje a mostrar. */
  get isConflict(): boolean {
    return this.kind === "conflict";
  }

  /**
   * Error de red o timeout: NO podemos afirmar que la operación falló,
   * el servidor pudo haberla completado igual.
   */
  get isUnconfirmed(): boolean {
    return this.kind === "timeout" || this.kind === "network";
  }
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * fetch() envuelto con timeout por AbortController. Traduce fallos de red y
 * timeouts a ApiError tipado. No interpreta el status de la respuesta: de eso
 * se encarga ensureOk().
 */
async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controller.signal });
    // Un 401 en el login son credenciales malas; en cualquier otra ruta, sesión vencida.
    if (res.status === 401 && path !== "/auth/login") handleUnauthorized();
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        "La solicitud tardó demasiado. El servidor puede estar despertando; inténtalo de nuevo en unos segundos.",
        "timeout",
      );
    }
    throw new ApiError("No se pudo conectar con el servidor.", "network");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lanza ApiError si la respuesta no es ok, extrayendo el mensaje del backend.
 * Nest suele mandar `message` como string o como array de validaciones.
 */
async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  const raw = (body as { message?: unknown } | null)?.message;
  const message = Array.isArray(raw)
    ? raw.join(", ")
    : typeof raw === "string" && raw.length > 0
      ? raw
      : fallback;
  if (res.status === 409) throw new ApiError(message, "conflict", 409);
  throw new ApiError(message, "http", res.status);
}

/**
 * Descarga un desprendible PDF (`receiptUrl` viene relativo del backend).
 * Se pide con fetch para poder enviar el token; un enlace directo no lo lleva.
 */
export async function downloadReceipt(receiptUrl: string, filename = "recibo.pdf"): Promise<void> {
  const res = await apiFetch(receiptUrl);
  await ensureOk(res, "No se pudo descargar el recibo");
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: "platform_admin" | "business_admin" | "operator";
  tenantId: number | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await ensureOk(res, "Credenciales inválidas");
  return res.json();
}

// ── Tenants (negocios) ───────────────────────────────────────────────────────
export interface Tenant {
  id: number;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CreateTenantDto {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: "active" | "inactive";
}

export type UpdateTenantDto = Partial<CreateTenantDto>;

export async function listTenants(): Promise<Tenant[]> {
  const res = await apiFetch(`/tenants`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar negocios");
  return res.json();
}

export async function getTenant(id: number): Promise<Tenant> {
  const res = await apiFetch(`/tenants/${id}`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar el negocio");
  return res.json();
}

export async function createTenant(data: CreateTenantDto): Promise<Tenant> {
  const res = await apiFetch(`/tenants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al crear el negocio");
  return res.json();
}

export async function updateTenant(id: number, data: UpdateTenantDto): Promise<Tenant> {
  const res = await apiFetch(`/tenants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al actualizar el negocio");
  return res.json();
}

export async function deactivateTenant(id: number): Promise<void> {
  const res = await apiFetch(`/tenants/${id}`, { method: "DELETE" });
  await ensureOk(res, "Error al desactivar el negocio");
}

// ── Users (usuarios de plataforma / negocio) ────────────────────────────────
export interface AppUser {
  id: number;
  tenantId: number | null;
  email: string;
  fullName: string;
  role: "platform_admin" | "business_admin" | "operator";
  status: "active" | "inactive";
  createdAt: string;
}

export interface CreateUserDto {
  tenantId?: number;
  email: string;
  password: string;
  fullName: string;
  role: "platform_admin" | "business_admin" | "operator";
  status?: "active" | "inactive";
}

export interface UpdateUserDto {
  fullName?: string;
  role?: "platform_admin" | "business_admin" | "operator";
  status?: "active" | "inactive";
}

export async function listUsers(tenantId?: number): Promise<AppUser[]> {
  const qs = tenantId !== undefined ? `?tenantId=${tenantId}` : "";
  const res = await apiFetch(`/users${qs}`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar usuarios");
  return res.json();
}

export async function createUser(data: CreateUserDto): Promise<AppUser> {
  const res = await apiFetch(`/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al crear usuario");
  return res.json();
}

export async function updateUser(id: number, data: UpdateUserDto): Promise<AppUser> {
  const res = await apiFetch(`/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al actualizar usuario");
  return res.json();
}

export async function deactivateUser(id: number): Promise<void> {
  const res = await apiFetch(`/users/${id}`, { method: "DELETE" });
  await ensureOk(res, "Error al desactivar usuario");
}

/** Un administrador le pone una contraseña nueva a un usuario que gestiona. */
export async function resetUserPassword(id: number, password: string): Promise<void> {
  const res = await apiFetch(`/users/${id}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  await ensureOk(res, "Error al restablecer la contraseña");
}

// ── Settings (tarifas, por negocio) ─────────────────────────────────────────
export interface AppSettings {
  id: number;
  tenantId: number;
  fraccionCarro: number;
  horaCarro: number;
  medioDiaCarro: number;
  diaCarro: number;
  mensualidadCarro: number;
  fraccionMoto: number;
  horaMoto: number;
  medioDiaMoto: number;
  diaMoto: number;
  mensualidadMoto: number;
}

export async function getSettings(tenantId: number): Promise<AppSettings | null> {
  const res = await apiFetch(`/settings?tenantId=${tenantId}`, { cache: "no-store" });
  // Un negocio nuevo aún no tiene tarifas configuradas: eso no es un error,
  // simplemente no hay configuración todavía.
  if (res.status === 404) return null;
  await ensureOk(res, "Error al cargar configuración");
  const data = await res.json().catch(() => null);
  return data ?? null;
}

export async function updateSettings(
  tenantId: number,
  data: Partial<AppSettings>,
): Promise<AppSettings> {
  const res = await apiFetch(`/settings?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al guardar configuración");
  return res.json();
}

// ── Clients ────────────────────────────────────────────────────────────────
export interface Client {
  id: number;
  tenantId: number;
  fullName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  status: "active" | "inactive" | "blocked";
  createdAt: string;
}

export interface CreateClientDto {
  tenantId: number;
  fullName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
}

export async function getClients(tenantId: number): Promise<Client[]> {
  const res = await apiFetch(`/clients?tenantId=${tenantId}`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar clientes");
  return res.json();
}

export interface UpdateClientDto {
  fullName?: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: "active" | "inactive" | "blocked";
}

export async function updateClient(
  id: number,
  data: UpdateClientDto,
  tenantId: number,
): Promise<Client> {
  const res = await apiFetch(`/clients/${id}?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al actualizar cliente");
  return res.json();
}

export async function createClient(data: CreateClientDto): Promise<Client> {
  const res = await apiFetch(`/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al crear cliente");
  return res.json();
}

export async function deleteClient(id: number, tenantId: number): Promise<void> {
  const res = await apiFetch(`/clients/${id}?tenantId=${tenantId}`, { method: "DELETE" });
  await ensureOk(res, "Error al eliminar cliente");
}

// ── Vehicles ───────────────────────────────────────────────────────────────
export interface Vehicle {
  id: number;
  tenantId: number;
  clientId: number;
  plate: string;
  type: "car" | "moto" | "truck";
  brand: string;
  color: string;
  status: "active" | "inactive";
  createdAt: string;
  client?: {
    id: number;
    fullName: string;
    document: string;
    phone: string;
  };
  membership?: {
    id: number;
    status: "active" | "expired" | "cancelled";
    endDate: string;
  };
}

export interface CreateVehicleDto {
  tenantId: number;
  clientId?: number;
  plate: string;
  type: "car" | "moto" | "truck";
  brand?: string;
  color?: string;
}

export async function getVehicles(tenantId: number): Promise<Vehicle[]> {
  const res = await apiFetch(`/vehicles?tenantId=${tenantId}`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar vehículos");
  return res.json();
}

export async function createVehicle(data: CreateVehicleDto): Promise<Vehicle> {
  const res = await apiFetch(`/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al crear vehículo");
  return res.json();
}

export async function assignVehicleClient(
  vehicleId: number,
  clientId: number,
  tenantId: number,
): Promise<Vehicle> {
  const res = await apiFetch(`/vehicles/${vehicleId}?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId }),
  });
  await ensureOk(res, "Error al asignar cliente");
  return res.json();
}

export async function updateVehicle(
  id: number,
  data: { clientId?: number; brand?: string; color?: string },
  tenantId: number,
): Promise<Vehicle> {
  const res = await apiFetch(`/vehicles/${id}?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al actualizar vehículo");
  return res.json();
}

export async function deleteVehicle(id: number, tenantId: number): Promise<void> {
  const res = await apiFetch(`/vehicles/${id}?tenantId=${tenantId}`, { method: "DELETE" });
  await ensureOk(res, "Error al eliminar vehículo");
}

// ── Parking ────────────────────────────────────────────────────────────────
export interface ActiveVehicle {
  id: number;
  plate: string;
  vehicleType: string;
  entryTime: string;
  currentMinutes: number;
  duration: string;
  estimatedCost: number;
  excessiveTimeAlert: boolean;
}

export async function getActiveVehicles(tenantId: number): Promise<ActiveVehicle[]> {
  const res = await apiFetch(`/parking/active?tenantId=${tenantId}`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar parking activo");
  return res.json();
}

export async function registerVehicleEntry(
  tenantId: number,
  plate: string,
  vehicleType: "car" | "moto",
): Promise<{
  id: number;
  plate: string;
  entryTime: string;
  vehicleType: string;
  action: "GRANTED" | "ALERT" | "VISITOR";
}> {
  const res = await apiFetch(`/parking/entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, plate, vehicleType }),
  });
  await ensureOk(res, "Error al registrar entrada");
  return res.json();
}

export async function exitVehicle(
  tenantId: number,
  plate: string,
): Promise<{
  plate: string;
  duration: string;
  totalMinutes: number;
  amountToPay: number;
  receiptUrl: string;
}> {
  const res = await apiFetch(`/parking/exit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, plate }),
  });
  await ensureOk(res, "Error al registrar salida");
  return res.json();
}

// ── Entries (historial de ingresos/salidas) ─────────────────────────────────
export interface Entry {
  id: number;
  plate: string;
  entryTime: string;
  exitTime: string | null;
  amountPaid: number | null;
  vehicleType: string | null;
}

export async function getEntries(tenantId: number): Promise<Entry[]> {
  const res = await apiFetch(`/parking/entries?tenantId=${tenantId}`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar historial");
  return res.json();
}

// ── Memberships ────────────────────────────────────────────────────────────
export interface Membership {
  id: number;
  tenantId: number;
  vehicleId: number;
  clientId: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
  price: string;
  autoRenew: boolean;
  company: string | null;
  createdAt: string;
  paidAt: string | null;
  /** Positivo = días vencida, negativo = días para vencer. Calculado por el backend contra la fecha de hoy. */
  daysOverdue: number;
  vehicle?: {
    id: number;
    plate: string;
    type: "car" | "moto" | "truck";
    brand: string;
    color: string;
  };
  client?: {
    id: number;
    fullName: string;
    document: string;
    phone: string;
    email: string;
  };
}

export interface CreateMembershipDto {
  tenantId: number;
  vehicleId: number;
  clientId: number;
  startDate: string;
  endDate: string;
  price: number;
  autoRenew?: boolean;
  company?: string;
}

export async function getMemberships(tenantId: number): Promise<Membership[]> {
  const res = await apiFetch(`/memberships?tenantId=${tenantId}`, { cache: "no-store" });
  await ensureOk(res, "Error al cargar mensualidades");
  return res.json();
}

export async function createMembership(
  data: CreateMembershipDto,
): Promise<Membership & { receiptUrl: string }> {
  const res = await apiFetch(`/memberships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Error al crear mensualidad");
  return res.json();
}

export async function getExpiringMemberships(tenantId: number): Promise<Membership[]> {
  const res = await apiFetch(`/memberships/expiring?tenantId=${tenantId}`, {
    cache: "no-store",
  });
  await ensureOk(res, "Error al cargar mensualidades por vencer");
  return res.json();
}

export async function renewMembership(
  id: number,
  tenantId: number,
): Promise<Membership & { receiptUrl: string }> {
  const res = await apiFetch(`/memberships/${id}/renew?tenantId=${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });
  await ensureOk(res, "Error al renovar mensualidad");
  return res.json();
}

export async function deleteMembership(id: number, tenantId: number): Promise<void> {
  const res = await apiFetch(`/memberships/${id}?tenantId=${tenantId}`, {
    method: "DELETE",
  });
  await ensureOk(res, "Error al eliminar mensualidad");
}

// ── Reports / Caja ─────────────────────────────────────────────────────────
export interface CajaCobroRow {
  placa: string;
  tipo: string;
  esMensualidad: boolean;
  horaEntrada: string;
  horaSalida: string;
  duracion: string;
  monto: number;
}

export interface CajaReport {
  fecha: string;
  totalCOP: number;
  totalVehiculos: number;
  visitantes: number;
  mensualidades: number;
  ingresosMensualidades: number;
  desglosePorHora: { hora: string; cantidad: number }[];
  cobros: CajaCobroRow[];
}

export async function getCajaReport(fecha: string, tenantId: number): Promise<CajaReport> {
  const res = await apiFetch(`/reports/caja?fecha=${fecha}&tenantId=${tenantId}`, {
    cache: "no-store",
  });
  await ensureOk(res, "Error al generar cierre de caja");
  return res.json();
}

export interface ReportSummary {
  ingresosHoy: number;
  ingresos7Dias: number;
  ingresos30Dias: number;
  clientes: number;
  vehiculos: number;
  mensualidadesActivas: number;
  mensualidadesVencidas: number;
  horasPico: { hora: string; cantidad: number }[];
  vehiculosFrecuentes: { plate: string; cantidad: number }[];
}

export async function getReportSummary(tenantId: number): Promise<ReportSummary> {
  const res = await apiFetch(`/reports/summary?tenantId=${tenantId}`, {
    cache: "no-store",
  });
  await ensureOk(res, "Error al cargar resumen de reportes");
  return res.json();
}

// ── Detectores de placas ─────────────────────────────────────────────────────
export interface Detector {
  id: number;
  tenantId: number;
  name: string;
  keyPrefix: string;
  status: "active" | "revoked";
  createdAt: string;
  lastSeenAt: string | null;
}

/** Al crear, la API devuelve la clave en claro. Es la única vez que se puede ver. */
export type CreatedDetector = Detector & { key: string };

export async function listDetectors(tenantId: number): Promise<Detector[]> {
  const res = await apiFetch(`/detectors?tenantId=${tenantId}`, { cache: "no-store" });
  await ensureOk(res, "Error al obtener los detectores");
  return res.json();
}

export async function createDetector(tenantId: number, name: string): Promise<CreatedDetector> {
  const res = await apiFetch(`/detectors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, name }),
  });
  await ensureOk(res, "Error al crear el detector");
  return res.json();
}

export async function revokeDetector(id: number, tenantId: number): Promise<void> {
  const res = await apiFetch(`/detectors/${id}?tenantId=${tenantId}`, { method: "DELETE" });
  await ensureOk(res, "Error al revocar el detector");
}
