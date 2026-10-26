import { NextResponse } from 'next/server';

// O fluxo público atual não exige dados pessoais para disponibilizar convites.
// Mantemos rota antiga inativa, para não coletar nome/telefone sem necessidade.
export async function POST() {
  return NextResponse.json({
    error: 'O cadastro por telefone foi desativado. Escolha os grupos diretamente na página /entrar.',
  }, { status: 410 });
}
