"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Client, CreateClientDto, UpdateClientDto } from "@/lib/api";
import { useClients, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { invalidateAfter } from "@/lib/query-invalidation";
import { useAuth } from "@/components/auth-provider";
import { Dialog } from "@/components/ui/dialog";
import { NoticeBox } from "@/components/ui/notice-box";
import { describeSubmitError, errorNotice, isUnconfirmed, type SubmitNotice } from "@/lib/submit-error";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { Plus, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

export default function ClientesPage() {
  const { session } = useAuth();
  const tenantId = session!.user.tenantId!;
  const queryClient = useQueryClient();
  const clientsQuery = useClients(tenantId);
  const updateClientMutation = useUpdateClient(tenantId);
  const deleteClientMutation = useDeleteClient(tenantId);
  const clients = clientsQuery.data ?? [];
  const loading = clientsQuery.isLoading;
  const error = clientsQuery.isError ? "No se pudo conectar con el servidor." : null;

  // Search and filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const editSaving = updateClientMutation.isPending;

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const deleting = deleteClientMutation.isPending;
  const [deleteError, setDeleteError] = useState<SubmitNotice | null>(null);

  const filteredClients = clients.filter((c) => {
    const matchesSearch = !search ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.document.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleCreateSubmit(_data: CreateClientDto | UpdateClientDto) {
    setCreateOpen(false);
  }

  async function handleEditSubmit(data: UpdateClientDto) {
    if (!editTarget) return;
    if (!data.fullName || !data.document || !data.phone) {
      throw errorNotice("Nombre, documento y teléfono son obligatorios.");
    }
    try {
      await updateClientMutation.mutateAsync({ id: editTarget.id, data });
      setEditTarget(null);
    } catch (err: unknown) {
      throw err;
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteClientMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(describeSubmitError(err));
      if (isUnconfirmed(err)) invalidateAfter(queryClient, "deleteClient", tenantId);
    }
  }

  function openEdit(client: Client) {
    setEditTarget(client);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Clientes</h1>
          <p className="text-sm text-text-secondary">Gestiona los clientes registrados en el sistema</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 cursor-pointer bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center gap-3 bg-danger-dim border border-destructive/30 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <ClientFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Table */}
      <ClientTable
        clients={filteredClients}
        loading={loading}
        onEdit={openEdit}
        onDelete={(c) => { setDeleteError(null); setDeleteTarget(c); }}
      />

      {/* Edit modal */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!editSaving && !v) setEditTarget(null); }}>
        {editTarget && (
          <ClientForm
            mode="edit"
            initialData={{
              fullName: editTarget.fullName,
              document: editTarget.document,
              phone: editTarget.phone ?? "",
              email: editTarget.email ?? "",
              address: editTarget.address ?? "",
              status: editTarget.status,
              id: editTarget.id,
            }}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditTarget(null)}
            loading={editSaving}
          />
        )}
      </Dialog>

      {/* Delete confirmation drawer */}
      <Sheet open={!!deleteTarget} onClose={() => { if (!deleting) setDeleteTarget(null); }}>
        {deleteTarget && (
          <>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border-soft">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-dim border border-destructive/30">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">¿Desactivar este cliente?</h2>
                <p className="text-xs mt-0.5 text-text-muted">Sus datos se conservan, no se borra nada</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-4 p-3 rounded-xl bg-danger-dim border border-destructive/15">
                <p className="text-sm text-white font-medium mb-1">{deleteTarget.fullName}</p>
                <p className="text-xs text-text-secondary">Doc: {deleteTarget.document}</p>
                <p className="text-xs mt-2 text-destructive">
                  También se desactivarán sus vehículos y mensualidades. Dejarán de aparecer en los listados, pero la información queda guardada.
                </p>
              </div>
              <NoticeBox notice={deleteError} />
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-border-soft">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50 bg-page-input border border-border-medium text-text-secondary">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 text-white bg-destructive">
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Desactivando...</>
                ) : "Sí, desactivar"}
              </button>
            </div>
          </>
        )}
      </Sheet>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
        <ClientForm
          mode="create"
          onSubmit={handleCreateSubmit}
          onCancel={() => setCreateOpen(false)}
          loading={false}
        />
      </Dialog>
    </div>
  );
}
