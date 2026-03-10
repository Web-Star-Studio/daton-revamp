"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type OrganizationUnitsFiltersProps = {
  searchValue: string;
  statusFilter: "all" | "active" | "archived";
  kindFilter: "all" | "headquarters" | "branch";
};

export function OrganizationUnitsFilters({
  searchValue,
  statusFilter,
  kindFilter,
}: OrganizationUnitsFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchValue);
  const [statusInput, setStatusInput] = useState(statusFilter);
  const [kindInput, setKindInput] = useState(kindFilter);
  const deferredSearchInput = useDeferredValue(searchInput);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  useEffect(() => {
    setStatusInput(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    setKindInput(kindFilter);
  }, [kindFilter]);

  useEffect(() => {
    const normalizedSearch = deferredSearchInput.trim();
    const currentSearch = searchParams.get("q") ?? "";
    const currentStatus = searchParams.get("status") ?? "all";
    const currentKind = searchParams.get("kind") ?? "all";

    if (
      currentSearch === normalizedSearch &&
      currentStatus === statusInput &&
      currentKind === kindInput &&
      searchParams.get("tab") === "units"
    ) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("tab", "units");
    nextSearchParams.delete("branch");

    if (normalizedSearch) {
      nextSearchParams.set("q", normalizedSearch);
    } else {
      nextSearchParams.delete("q");
    }

    if (statusInput !== "all") {
      nextSearchParams.set("status", statusInput);
    } else {
      nextSearchParams.delete("status");
    }

    if (kindInput !== "all") {
      nextSearchParams.set("kind", kindInput);
    } else {
      nextSearchParams.delete("kind");
    }

    startTransition(() => {
      router.replace(`${pathname}?${nextSearchParams.toString()}`);
    });
  }, [deferredSearchInput, kindInput, pathname, router, searchParams, statusInput]);

  return (
    <div className="collaborators-panel__filters organization-units-filters">
      <label className="collaborators-field collaborators-field--search">
        <span>Buscar</span>
        <input
          onChange={(event) => setSearchInput(event.currentTarget.value)}
          placeholder="Nome, código, CNPJ ou tipo de unidade"
          type="search"
          value={searchInput}
        />
      </label>
      <label className="collaborators-field collaborators-field--compact">
        <span>Tipo</span>
        <select
          onChange={(event) =>
            setKindInput(
              event.currentTarget.value as OrganizationUnitsFiltersProps["kindFilter"],
            )
          }
          value={kindInput}
        >
          <option value="all">Todas</option>
          <option value="headquarters">Sede</option>
          <option value="branch">Filiais</option>
        </select>
      </label>
      <label className="collaborators-field collaborators-field--compact">
        <span>Status</span>
        <select
          onChange={(event) =>
            setStatusInput(
              event.currentTarget.value as OrganizationUnitsFiltersProps["statusFilter"],
            )
          }
          value={statusInput}
        >
          <option value="all">Todos</option>
          <option value="active">Ativas</option>
          <option value="archived">Arquivadas</option>
        </select>
      </label>
    </div>
  );
}
