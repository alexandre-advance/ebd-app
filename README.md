# EBD Digital

Sistema de gestão para Escola Bíblica Dominical.

## Configuração do Ambiente

Este projeto utiliza o Supabase para backend e autenticação. As variáveis de ambiente devem ser configuradas para que a aplicação funcione corretamente.

### Variáveis de Ambiente Necessárias

As seguintes variáveis devem ser definidas em um arquivo `.env` na raiz do projeto ou nas configurações do seu provedor de hospedagem (Netlify, Vercel, Cloud Run, etc):

- `VITE_SUPABASE_URL`: A URL do seu projeto Supabase (encontrada em Settings > API).
- `VITE_SUPABASE_ANON_KEY`: A chave anônima (anon public) do seu projeto Supabase (encontrada em Settings > API).

### Configuração Local

1. Na raiz do projeto, crie um arquivo chamado `.env` (você pode se basear no `.env.example`).
2. Adicione as suas credenciais reais ao arquivo `.env`:

```env
VITE_SUPABASE_URL=https://ipjoswzdhfeovcdwlqbz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_6vFp6DRxuNHQzeXyRQ6f_w_cmjpIzF3
```

**Nota:** Nunca commite o arquivo `.env` no controle de versão. O arquivo `.gitignore` já está configurado para ignorá-lo.

### Configuração em Produção (Netlify, Vercel, etc.)

Adicione as variáveis de ambiente diretamente no painel administrativo do seu serviço de implantação:

1. Vá para as configurações do projeto (**Project Settings**).
2. Procure por **Environment Variables**.
3. Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com seus respectivos valores.
4. Realize um novo deploy para que as alterações entrem em vigor.

## Desenvolvimento

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Build de Produção

Para gerar os arquivos estáticos de produção:

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`.
