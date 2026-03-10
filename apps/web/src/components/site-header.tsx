import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brandmark" href="/">
        <span className="brandmark__wordmark">Daton</span>
      </Link>
      <nav aria-label="Principal" className="site-nav">
        <Link href="/#platform">Plataforma</Link>
        <Link href="/#workflow">Fluxo</Link>
        <Link href="/#modules">Módulos</Link>
        <Link href="/auth?mode=sign-in">Entrar</Link>
        <Link className="button" href="/auth?mode=sign-up">
          Criar organização
        </Link>
      </nav>
    </header>
  );
}
