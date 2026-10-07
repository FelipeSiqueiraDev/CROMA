// Cria uma conta (ou troca a senha de uma que já existe) direto no banco, sem as regras do
// formulário: para testar a tela de entrada (a conta "admin", senha "admin", da prévia).
//
//   npx tsx scripts/dev/conta.mts <nome> <senha> [--email <e-mail>] [--jogador] [--visual]
//
// --visual: na cópia dos testes visuais (crona_visual, ver visual.mjs), e não no banco de verdade.
// Sem --email, o e-mail é <nome>@crona.local (para entrar, vale o nome). Sem --jogador, a conta é
// de mestre. O servidor que usa esse banco precisa estar parado: ele guarda tudo na memória e
// gravaria por cima.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opcao = (nome: string) => {
  const i = args.indexOf(nome);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const marcado = (nome: string) => {
  const i = args.indexOf(nome);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};
const visual = marcado('--visual');
const jogador = marcado('--jogador');
const emailDado = opcao('--email');
const [nome, senha] = args;
if (!nome || !senha) {
  console.log('uso: npx tsx scripts/dev/conta.mts <nome> <senha> [--email <e-mail>] [--jogador] [--visual]');
  process.exit(1);
}

// o banco do server/.env; sem ele, o db.json
const envPath = path.join(REPO, 'server', '.env');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
let url = /^CRONA_DB_URL=(.*)$/m.exec(env)?.[1]?.trim();
if (url && visual) {
  url = url.replace(/\/crona(\?|$)/, '/crona_visual$1');
  if (!url.includes('/crona_visual')) throw new Error('não consegui apontar para crona_visual');
}
if (visual && !url) throw new Error('--visual precisa do CRONA_DB_URL no server/.env');
if (url) process.env.CRONA_DB_URL = url;

const modulo = (p: string) => import(pathToFileURL(path.join(REPO, p)).href);
const { abrirBanco } = await modulo('server/src/banco/index.ts');
const { hashSenha } = await modulo('server/src/contas.ts');

const banco = await abrirBanco();
const db = await banco.carregar();
if (!db) throw new Error('o banco está vazio (suba o servidor uma vez antes)');
const contas = (db.contas ??= []);
const email = (emailDado ?? `${nome.toLowerCase().replace(/\s+/g, '.')}@crona.local`).trim().toLowerCase();
const papel = jogador ? 'jogador' : 'mestre';
const hash = await hashSenha(senha);
const existente = contas.find((c: { nome: string; email: string }) => c.nome.toLowerCase() === nome.toLowerCase() || c.email === email);
if (existente) {
  existente.senha = hash;
  existente.papel = papel;
  existente.sessoes = [];
  console.log(`Conta ${existente.nome} (${existente.email}): senha trocada, ${papel}.`);
} else {
  db.nextContaId ??= 1;
  contas.push({ id: db.nextContaId++, nome, email, senha: hash, papel, sessoes: [], criadaEm: Date.now() });
  console.log(`Conta nova: ${nome} (${email}), ${papel}.`);
}
await banco.salvar(db);
await banco.fechar();
console.log(`Gravada em ${url ? url.replace(/\/\/[^@]*@/, '//') : 'server/data/db.json'}.`);
