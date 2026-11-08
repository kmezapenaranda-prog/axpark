# Cache frontend con TanStack Query — piloto (Vehículos + Dashboard)

## Contexto

Todas las páginas de `parking-frontend` hacen fetch client-side vía `useEffect` +
`useState`, sin ningún tipo de cache: cada `apiFetch` en `lib/api.ts` fuerza
`cache: "no-store"`. Al navegar entre páginas que comparten datos (ej.
Dashboard y Vehículos ambos leen `vehicles` y `clients`), cada visita repite el
fetch completo aunque los datos no hayan cambiado.

Este spec cubre un piloto: introducir TanStack Query como capa de cache
client-side, migrando dos páginas representativas (`app/vehiculos/page.tsx` y
`app/page.tsx`) para validar el patrón antes de extenderlo al resto de la app
(clientes, mensualidades, tarifas, reportes, usuarios, parking, admin).

## Objetivo

- Evitar refetch innecesario de datos que no cambiaron entre navegaciones.
- Compartir cache entre páginas que leen el mismo recurso (vehicles, clients).
- Mantener invalidación correcta tras mutaciones (crear/editar/eliminar
  vehículo, crear cliente).
- Dejar una estructura (query key factory + mapa de invalidación) que escale
  sin refactor cuando se migren las 7 páginas restantes.

## Fuera de alcance

- Migrar páginas distintas a Vehículos y Dashboard.
- Cache en backend (Redis, `Cache-Control` headers).
- Cambiar `cache: "no-store"` en `lib/api.ts` (TanStack Query controla
  refetch a nivel de aplicación; el flag de fetch es irrelevante para este
  cambio).

## Arquitectura

### 1. Setup

- `lib/query-client.ts`: exporta una factory/instancia de `QueryClient` con
  defaults razonables (`staleTime` base, `retry` acorde al comportamiento ya
  manejado por `ApiError`/`apiFetch`, que no debe reintentar timeouts de forma
  agresiva).
- `components/query-provider.tsx`: client component que envuelve
  `QueryClientProvider`. Incluye `ReactQueryDevtools`, cargado solo cuando
  `process.env.NODE_ENV === "development"` para no afectar el bundle de
  producción.
- Se monta en `app/layout.tsx`, entre `ThemeProvider` y `AuthProvider` (no
  depende de auth, y auth no depende de queries).

### 2. Query key factory — `lib/query-keys.ts`

```ts
export const queryKeys = {
  vehicles: (tenantId: number) => ["vehicles", tenantId] as const,
  clients: (tenantId: number) => ["clients", tenantId] as const,
  activeVehicles: (tenantId: number) => ["activeVehicles", tenantId] as const,
  memberships: (tenantId: number) => ["memberships", tenantId] as const,
  expiringMemberships: (tenantId: number) => ["expiringMemberships", tenantId] as const,
};
```

Cubre solo los recursos que tocan las dos páginas del piloto. Recursos
adicionales (settings, entries, reports) se agregan a este mismo objeto
cuando se migren las páginas correspondientes — no se crean por adelantado.

### 3. Mapa central de invalidación — `lib/query-invalidation.ts`

Tabla que declara, por mutación, qué query keys invalidar tras éxito:

| Mutación | Invalida |
|---|---|
| `createVehicle` | `vehicles` |
| `updateVehicle` | `vehicles` |
| `deleteVehicle` | `vehicles` |
| `createClient` | `clients`, `vehicles` (la respuesta de vehículo embebe el cliente asignado) |

Los hooks de mutación (punto 4) consultan esta tabla en su `onSuccess` en vez
de hardcodear `invalidateQueries` repetido en cada hook.

### 4. Hooks por recurso

- `hooks/use-vehicles.ts`:
  - `useVehicles(tenantId)` — `useQuery`, `queryKey: queryKeys.vehicles(tenantId)`,
    `queryFn: () => getVehicles(tenantId)`, `staleTime: 30_000`.
  - `useCreateVehicle()`, `useUpdateVehicle()`, `useDeleteVehicle()` —
    `useMutation` envolviendo `createVehicle`/`updateVehicle`/`deleteVehicle`
    de `lib/api.ts`, invalidando según el mapa del punto 3 en `onSuccess`.
- `hooks/use-clients.ts`:
  - `useClients(tenantId)` — análogo a `useVehicles`.
  - `useCreateClient()` — análogo, invalida `clients` y `vehicles`.
- `hooks/use-parking.ts` (solo query, sin mutación en este piloto):
  - `useActiveVehicles(tenantId)`.
- `hooks/use-memberships.ts` (solo query):
  - `useMemberships(tenantId)`, `useExpiringMemberships(tenantId)`.

Todos usan `staleTime: 30_000` salvo que se indique lo contrario — es el
valor por defecto para datos tipo CRUD que cambian por acción del usuario, no
en tiempo real.

### 5. Migración — Dashboard (`app/page.tsx`)

Solo lectura. Reemplaza el `useEffect` + `Promise.all` manual por 5 llamadas
a los hooks de query (`useVehicles`, `useClients`, `useActiveVehicles`,
`useMemberships`, `useExpiringMemberships`), combinando sus `isLoading`/`data`
en el objeto `metrics` que ya consume el JSX. Si el usuario ya visitó
Vehículos o Clientes antes, esas dos cards muestran dato cacheado al
instante.

### 6. Migración — Vehículos (`app/vehiculos/page.tsx`, `AddVehicleModal`,
`VehicleWizardModal`)

Reemplaza `load()`/`useCallback`/`useEffect` manual por `useVehicles(tenantId)`
+ `useClients(tenantId)`. Las mutaciones (`handleDelete`, alta desde
`AddVehicleModal`, edición/asignación desde `VehicleWizardModal`) pasan a usar
los hooks de mutación del punto 4; dejan de llamar `load()` a mano — la
invalidación del mapa central dispara el refetch.

### 7. Errores y loading

`useQuery` expone `{ data, isLoading, error }`. `error` sigue siendo del tipo
`ApiError` (mismo que hoy lanza `apiFetch`/`ensureOk`), así que
`describeSubmitError()` y `NoticeBox` se reutilizan sin cambios. No se toca
la forma en que se muestran errores, solo el origen del estado.

### 8. Referencia de `staleTime` (para migraciones futuras, no parte de este
piloto)

- Catálogos/config (settings, tarifas): minutos.
- CRUD normal (vehicles, clients, memberships): ~30s.
- Tiempo real (parking activo, entries): ~5-10s o `refetchInterval`.

## Testing

- Verificación manual: navegar Dashboard → Vehículos → Dashboard, confirmar
  que la segunda visita a Dashboard no dispara requests de red para
  `vehicles`/`clients` (dentro de la ventana de `staleTime`).
- Verificación manual: crear/editar/eliminar vehículo, crear cliente desde el
  wizard, confirmar que la tabla se actualiza sin refresh manual y sin
  llamada explícita a un `load()`.
- No hay suite de tests automatizados en el proyecto (`npm run lint` es la
  única verificación de CI); la verificación de este cambio es manual +
  `npm run lint` + `npm run build`.
