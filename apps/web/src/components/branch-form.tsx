"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { formatCnpj, type UpdateBranchInput } from "@daton/contracts";
import { createBranch, updateBranch } from "@/lib/api";
import {
  type ServerBranch,
  type ServerOrganizationMember,
} from "@/lib/server-api";

type BranchFormProps = {
  branches: ServerBranch[];
  members: ServerOrganizationMember[];
  branch?: ServerBranch;
  onSuccess?: (branch: ServerBranch) => void;
};

export function BranchForm({
  branches,
  members,
  branch,
  onSuccess,
}: BranchFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableBranches = branches.filter(
    (candidate) => candidate.id !== branch?.id,
  );

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const payload = {
          name: String(formData.get("name") ?? ""),
          code: String(formData.get("code") ?? ""),
          legalIdentifier: String(formData.get("legalIdentifier") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          addressLine1: String(formData.get("addressLine1") ?? ""),
          addressLine2: String(formData.get("addressLine2") ?? ""),
          city: String(formData.get("city") ?? ""),
          stateOrProvince: String(formData.get("stateOrProvince") ?? ""),
          postalCode: String(formData.get("postalCode") ?? ""),
          country: String(formData.get("country") ?? ""),
          isHeadquarters: formData.get("isHeadquarters") === "on",
          parentBranchId: String(formData.get("parentBranchId") ?? "") || null,
          managerMemberId:
            String(formData.get("managerMemberId") ?? "") || null,
          ...(branch
            ? {
                status: (String(formData.get("status") ?? "") ||
                  "active") as UpdateBranchInput["status"],
              }
            : {}),
        } satisfies UpdateBranchInput;

        setError(null);
        setIsPending(true);

        startTransition(async () => {
          try {
            const saved = branch
              ? await updateBranch(branch.id, payload)
              : await createBranch(payload);

            router.refresh();

            if (onSuccess) {
              onSuccess(saved);
              return;
            }

            router.replace(`/app/branches/${saved.id}`);
          } catch (branchError) {
            setError(
              branchError instanceof Error
                ? branchError.message
                : "Não foi possível salvar a filial.",
            );
          } finally {
            setIsPending(false);
          }
        });
      }}
    >
      <div className="field">
        <label htmlFor="name">Nome da filial</label>
        <input
          defaultValue={branch?.name}
          id="name"
          name="name"
          required
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="code">Código da filial</label>
        <input
          defaultValue={branch?.code}
          id="code"
          name="code"
          required
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="legalIdentifier">CNPJ</label>
        <input
          defaultValue={formatCnpj(branch?.legalIdentifier ?? "")}
          id="legalIdentifier"
          inputMode="numeric"
          name="legalIdentifier"
          onInput={(event) => {
            event.currentTarget.value = formatCnpj(event.currentTarget.value);
          }}
          placeholder="00.000.000/0000-00"
          required
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="email">E-mail de contato</label>
        <input defaultValue={branch?.email ?? ""} id="email" name="email" type="email" />
      </div>
      <div className="field">
        <label htmlFor="phone">Telefone</label>
        <input defaultValue={branch?.phone ?? ""} id="phone" name="phone" type="text" />
      </div>
      <div className="field field--wide">
        <label htmlFor="addressLine1">Endereço, linha 1</label>
        <input
          defaultValue={branch?.addressLine1 ?? ""}
          id="addressLine1"
          name="addressLine1"
          type="text"
        />
      </div>
      <div className="field field--wide">
        <label htmlFor="addressLine2">Endereço, linha 2</label>
        <input
          defaultValue={branch?.addressLine2 ?? ""}
          id="addressLine2"
          name="addressLine2"
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="city">Cidade</label>
        <input defaultValue={branch?.city ?? ""} id="city" name="city" type="text" />
      </div>
      <div className="field">
        <label htmlFor="stateOrProvince">Estado ou província</label>
        <input
          defaultValue={branch?.stateOrProvince ?? ""}
          id="stateOrProvince"
          name="stateOrProvince"
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="postalCode">CEP</label>
        <input
          defaultValue={branch?.postalCode ?? ""}
          id="postalCode"
          name="postalCode"
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="country">País</label>
        <input defaultValue={branch?.country ?? ""} id="country" name="country" type="text" />
      </div>
      <div className="field">
        <label htmlFor="parentBranchId">Filial pai</label>
        <select
          defaultValue={branch?.parentBranchId ?? ""}
          id="parentBranchId"
          name="parentBranchId"
        >
          <option value="">Sem filial pai</option>
          {selectableBranches.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="managerMemberId">Membro gestor</label>
        <select
          defaultValue={branch?.managerMemberId ?? ""}
          id="managerMemberId"
          name="managerMemberId"
        >
          <option value="">Sem gestor vinculado</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName} • {member.email}
              {member.status === "inactive" ? " (inativo)" : ""}
            </option>
          ))}
        </select>
      </div>
      {branch ? (
        <div className="field">
          <label htmlFor="status">Status</label>
          <select defaultValue={branch.status} id="status" name="status">
            <option value="active">Ativa</option>
            <option value="archived">Arquivada</option>
          </select>
        </div>
      ) : null}
      <label className="checkbox">
        <input
          defaultChecked={branch?.isHeadquarters ?? false}
          id="isHeadquarters"
          name="isHeadquarters"
          type="checkbox"
        />
        <span>Marcar como matriz</span>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" disabled={isPending} type="submit">
        {isPending
          ? "Salvando filial"
          : branch
            ? "Salvar alterações da filial"
            : "Criar filial"}
      </button>
    </form>
  );
}
