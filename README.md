# 💰 Controle Financeiro

> Um sistema de gestão financeira focado no controle inteligente de renda e isolamento seguro de dados.

A aplicação permite registrar entradas e saídas, classificar gastos e analisar a saúde financeira através da regra 50/30/20. Desenhada com uma arquitetura modular, conta com controle de acesso por perfil e segurança aplicada diretamente na camada do banco de dados.

## 🚀 Tecnologias Utilizadas

* **Frontend:** React + Vite
* **Estilização:** CSS Puro (Foco em performance e controle absoluto de UI)
* **Ícones:** Lucide React
* **BaaS & Autenticação:** Supabase
* **Banco de Dados:** PostgreSQL
* **Segurança:** Row Level Security (RLS)

---

## ✨ Funcionalidades

* **Autenticação Unificada:** Fluxo de login e cadastro integrado ao Supabase Auth.
* **Controle de Acesso (RBAC):** Roteamento inteligente e protegido separando perfis (Admin vs. User).
* **Gestão de Transações:** Cadastro de receitas e despesas com suporte nativo a itens recorrentes (fixos mensais).
* **Dashboard Analítico:** Resumo financeiro em tempo real e diagnóstico inteligente baseado nas metas 50/30/20.
* **Multi-tenant Seguro:** Isolamento estrito de dados por usuário via RLS no PostgreSQL.

---

## 📂 Arquitetura do Projeto

O projeto adota uma estrutura modular para facilitar a escalabilidade e manutenção:

```text
src/
├── admin/       # Páginas e componentes exclusivos do painel administrativo
├── user/        # Área do usuário comum (Dashboard de finanças)
├── shared/      # Componentes globais (Cards, Buttons), rotas públicas e Hooks
└── lib/         # Configurações de clientes externos e serviços (ex: Supabase)

🔐 Segurança e RLS (Aplicação Obrigatória)
A segurança desta aplicação não depende do frontend. O isolamento de dados entre usuários é garantido diretamente no banco de dados do Supabase.

Passos para configuração inicial:

Abra o SQL Editor do seu painel Supabase.

Execute o script base localizado em supabase/security_policies.sql.

Para categorias personalizadas por usuário, execute também o script supabase/create_transaction_categories_table.sql.

O que este script faz:

Habilita a política de Row Level Security (RLS) nas tabelas transactions e profiles.

Restringe operações de SELECT, INSERT, UPDATE e DELETE na tabela transactions estritamente ao próprio auth.uid().

Protege a tabela profiles, permitindo leitura e alteração apenas para o dono do perfil.

Camada de Proteção no Código:

O frontend não confia em metadados injetados (user_metadata.role) para a autorização crítica de Admin.

O serviço de transações filtra as requisições pelo usuário autenticado em todas as operações CRUD.

O fluxo de login e cadastro utiliza mensagens genéricas de erro e aplica cooldown local para mitigar tentativas de força bruta.

⚙️ Como Executar Localmente
1. Clonar e Instalar

git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
cd seu-repositorio
npm install

2. Configurar Variáveis de Ambiente
Crie um arquivo .env.local na raiz do projeto com as suas credenciais públicas:

VITE_SUPABASE_URL=[https://sua-url.supabase.co](https://sua-url.supabase.co)
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

3. Iniciar o Servidor
npm run dev


🗺️ Roadmap (Próximas Atualizações)
[ ] Categorias Customizadas: Permitir a criação e edição de categorias de gastos com cores personalizadas.

[ ] Módulo de Metas: Área dedicada para definir objetivos de economia (reserva de emergência, viagens) com barra de progresso.

[ ] Gerenciamento de Parcelamentos: Distribuição automática de compras parceladas nos meses seguintes do extrato.

[ ] Dark Mode: Implementação nativa utilizando variáveis :root no CSS global.