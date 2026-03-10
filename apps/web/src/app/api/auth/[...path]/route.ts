import { NextResponse } from "next/server";

const notFound = () =>
  NextResponse.json(
    {
      message: "Rota de autenticação não encontrada.",
    },
    { status: 404 },
  );

export const GET = notFound;
export const POST = notFound;
export const PATCH = notFound;
export const PUT = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
