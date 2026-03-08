import Link from "next/link";

import { getServerBranches, type ServerBranch } from "@/lib/server-api";

export default async function AppHomePage() {
  const branches = await getServerBranches();

  return (
    <section className="workspace-section workspace-section--fill">

      <article className="content-panel content-panel--fill">
        <div className="ruled-list--header">
          <span>Filial</span>
          <span>Código</span>
          <span>Status</span>
        </div>
        <ul className="ruled-list">
          {branches.map((branch: ServerBranch) => (
            <li key={branch.id}>
              <Link href={`/app/branches/${branch.id}`}>
                <span>{branch.name}</span>
                <span>{branch.code}</span>
                <span>{branch.status === "active" ? "Ativa" : "Arquivada"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
