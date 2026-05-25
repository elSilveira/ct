# Roadmap Completo — App Web Clube das Terças

## 1. Objetivo do projeto

Criar um app web **Single Page Application**, mobile-first, para organizar as atividades do **Clube das Terças**, centralizando tudo que acontece no clube em torno de cada terça-feira.

O sistema deve permitir:

- Controle de presença no clube;
- Controle de convidados para janta e futebol;
- Campeonato de sinuca por duplas;
- Ranking automático;
- Lançamento e aprovação de resultados;
- Controle de bebidas por terça-feira;
- Relatórios mensais de consumo;
- Logs de auditoria;
- Cobranças individuais para membros;
- Cadastro de janteiros;
- Recados e notificações;
- Acesso por telefone cadastrado;
- Perfis de permissão para membro, administrador e contador.

---

## 2. Visão técnica geral

### 2.1 Tipo de aplicação

O projeto será uma aplicação web:

- SPA — Single Page Application;
- Mobile-first;
- Acessível via navegador;
- Publicada no GitHub Pages;
- Com backend separado para API e banco de dados.

### 2.2 Stack sugerida

#### Frontend

- React;
- Vite;
- TypeScript;
- React Router;
- Zustand ou Context API para estado global simples;
- Tailwind CSS;
- React Hook Form;
- Zod para validação.

#### Backend

Como o GitHub Pages não executa backend nem conecta diretamente ao MySQL, será necessário um backend separado.

Sugestão:

- Node.js;
- Express ou Fastify;
- TypeScript;
- Prisma ORM;
- MySQL;
- JWT simples ou sessão baseada em token;
- Deploy em Railway, Render, Fly.io ou VPS.

#### Banco de dados

- MySQL.

#### Hospedagem

```txt
Frontend SPA: GitHub Pages
Backend API: Railway / Render / VPS
Banco MySQL: Railway / PlanetScale / VPS / serviço gerenciado
```

---

## 3. Conceito central do sistema

Tudo no sistema deve ser organizado por **terça-feira**.

A entidade central do sistema será algo como:

```txt
ClubTuesday
```

Cada terça-feira poderá ter:

- Presenças;
- Convidados;
- Bebidas;
- Jogos de sinuca;
- Resultados;
- Janteiros;
- Recados;
- Cobranças relacionadas;
- Relatórios.

Isso evita dados soltos e facilita histórico, relatório e auditoria.

---

## 4. Perfis de usuário

### 4.1 Membro comum

Pode:

- Acessar o app pelo telefone cadastrado;
- Marcar presença;
- Marcar convidados;
- Ver cobranças próprias;
- Ver recados;
- Ver janteiros da semana;
- Ver ranking da sinuca;
- Editar telefone e data de aniversário, se permitido;
- Lançar resultado de sinuca apenas se fizer parte do jogo.

### 4.2 Jogador

É um membro comum que participa do campeonato de sinuca.

Pode:

- Ver seus jogos;
- Lançar resultado dos jogos em que participa;
- Acompanhar aprovação de resultados;
- Ver ranking.

### 4.3 Administrador

Pode:

- Cadastrar membros;
- Editar membros;
- Definir permissões;
- Cadastrar duplas;
- Cadastrar jogos;
- Lançar resultados oficiais;
- Aprovar resultados enviados por jogadores;
- Gerenciar bebidas;
- Ver e exportar relatórios;
- Ver logs de auditoria;
- Criar cobranças;
- Gerenciar janteiros;
- Criar recados e notificações.

### 4.4 Contador

Pode:

- Acessar área de bebidas;
- Ver logs;
- Gerar relatórios;
- Criar e gerenciar cobranças;
- Consultar consumo por membro;
- Consultar cobrança por membro;
- Marcar cobranças como pagas.

---

## 5. Módulos principais

## 5.1 Módulo de autenticação

### Objetivo

Permitir acesso somente a membros cadastrados pelos administradores.

### Regras

- O membro acessa usando o número de telefone.
- O telefone precisa existir no cadastro.
- O membro precisa estar ativo.
- O acesso só é liberado após validação.
- Caso o telefone não exista, exibir mensagem orientando a procurar um administrador.

### MVP

Para primeira versão, pode ser usado login simples por telefone, sem senha, caso o ambiente seja de uso interno.

### Versão mais segura

Adicionar código de confirmação por WhatsApp, SMS ou senha curta.

### Entregáveis

- Tela de login;
- Validação de telefone;
- Criação de sessão/token;
- Proteção de rotas;
- Logout.

### Critérios de aceite

- Usuário não cadastrado não acessa o sistema;
- Usuário inativo não acessa o sistema;
- Usuário cadastrado acessa corretamente;
- Permissões são aplicadas conforme o perfil.

---

## 5.2 Módulo de membros

### Objetivo

Permitir que administradores cadastrem e gerenciem os membros do clube.

### Dados do membro

- Nome;
- Telefone;
- Data de aniversário;
- Perfil;
- Status ativo/inativo;
- Indicação se participa da sinuca;
- Observações.

### Funcionalidades

- Criar membro;
- Editar membro;
- Inativar membro;
- Alterar perfil;
- Buscar membro;
- Listar membros ativos;
- Permitir que o próprio membro atualize telefone e aniversário, se autorizado.

### Critérios de aceite

- Apenas administradores podem cadastrar membros;
- Não pode haver dois membros ativos com o mesmo telefone;
- O telefone deve ser validado em formato aceitável;
- Membros inativos não aparecem em marcações comuns;
- Membros inativos não conseguem acessar o app.

---

## 5.3 Módulo de terças-feiras

### Objetivo

Criar a base semanal do sistema.

### Funcionalidades

- Gerar terças-feiras automaticamente;
- Selecionar terça atual;
- Ver histórico de terças;
- Encerrar uma terça;
- Arquivar uma terça antiga.

### Status possíveis

```txt
open
closed
archived
```

### Critérios de aceite

- Toda presença deve estar vinculada a uma terça;
- Toda bebida deve estar vinculada a uma terça;
- Todo jogo pode estar vinculado a uma terça;
- Toda escala de janteiros deve estar vinculada a uma terça;
- O app deve sempre destacar a próxima terça ou a terça atual.

---

## 5.4 Módulo de presença

### Objetivo

Permitir que cada membro marque sua participação na terça-feira.

### Opções

- Janta;
- Futebol;
- Janta + Futebol;
- Não vou ao clube.

### Convidados

O membro pode adicionar convidados para:

- Convidado Janta;
- Convidado Futebol.

Como pode haver mais de um convidado, a interface deve ter controle de `+` e `-`.

### Dados

- Terça-feira;
- Membro;
- Status de presença;
- Quantidade de convidados para janta;
- Quantidade de convidados para futebol;
- Data/hora da atualização.

### Critérios de aceite

- Cada membro só pode ter uma marcação por terça;
- O membro pode editar sua marcação enquanto a terça estiver aberta;
- Convidados não podem ter quantidade negativa;
- Administrador pode visualizar presença geral da terça;
- Administrador pode exportar lista de presença.

---

## 5.5 Módulo de campeonato de sinuca

### Objetivo

Controlar o campeonato de sinuca por duplas, com jogos e ranking automático.

### Formato dos jogos

```txt
Jogadores 1 | Jogadores 2 | Pontos Jogadores 1 | Pontos Jogadores 2
```

Exemplo:

```txt
Ledir & Samuel | Tille & Sonir | 2 | 0
Adilson & Elcio | João Pai & Peru | 2 | 1
Paulo B. & Alexandre | Eduardo & Gustavo | 2 | 0
```

### Cadastro de campeonato

Dados:

- Nome do campeonato;
- Data de início;
- Data de fim;
- Status.

Status:

```txt
draft
active
finished
cancelled
```

### Cadastro de duplas

Dados:

- Campeonato;
- Jogador 1;
- Jogador 2;
- Nome da dupla;
- Status ativo/inativo.

### Cadastro de jogos

Dados:

- Campeonato;
- Terça-feira;
- Dupla A;
- Dupla B;
- Pontos da dupla A;
- Pontos da dupla B;
- Status;
- Quem lançou;
- Quem aprovou;
- Data/hora.

Status dos jogos:

```txt
open
pending_approval
confirmed
rejected
cancelled
corrected
```

### Lançamento por administrador

- Resultado lançado por administrador entra como confirmado automaticamente.

### Lançamento por jogador

- Jogador só pode lançar resultado de jogo em que participa;
- Resultado fica pendente;
- Administrador precisa aprovar;
- Ranking só atualiza após aprovação.

### Ranking automático

O ranking deve calcular:

- Pontos totais;
- Jogos;
- Pontos pró;
- Pontos contra;
- Saldo;
- Vitórias, se necessário;
- Derrotas, se necessário.

Versão simples obrigatória:

```txt
Dupla | Pontos | Jogos
```

### Regra de pontuação

- Somar os pontos feitos pela dupla em jogos confirmados;
- Contar como jogo toda partida confirmada, inclusive quando a pontuação da dupla for 0;
- Jogos pendentes não entram no ranking.

### Critérios de aceite

- Ranking muda automaticamente após resultado confirmado;
- Resultado pendente não altera ranking;
- Jogador não consegue lançar resultado de jogo que não participou;
- Administrador consegue aprovar ou rejeitar resultado;
- Jogo rejeitado não entra no ranking;
- Pontuação 0 conta como jogo válido.

---

## 5.6 Módulo de bebidas

### Objetivo

Controlar o consumo de bebidas por membro, por terça-feira.

### Tipos de bebida

Como água e refrigerante têm o mesmo valor, serão agrupados.

Tipos:

```txt
Água/Refri
Cerveja
```

### Funcionalidades

- Adicionar bebida para membro;
- Remover bebida;
- Editar quantidade;
- Visualizar consumo por terça;
- Visualizar consumo por membro;
- Gerar relatório mensal;
- Registrar logs de auditoria.

### Permissões

Acesso irrestrito para:

- Administrador;
- Contador.

Membros comuns podem visualizar apenas o próprio consumo, se o clube permitir.

### Logs obrigatórios

Toda alteração deve gerar log:

- Bebida adicionada;
- Bebida removida;
- Quantidade alterada;
- Tipo alterado.

Cada log deve armazenar:

- Ação;
- Membro afetado;
- Tipo de bebida;
- Quantidade anterior;
- Quantidade nova;
- Quem fez a alteração;
- Data/hora da alteração;
- Terça-feira relacionada.

### Relatórios mensais

Relatório geral:

```txt
Maio/2026
Água/Refri: 84 unidades
Cerveja: 132 unidades
```

Relatório por membro:

```txt
Eduardo
Água/Refri: 4
Cerveja: 8
```

### Critérios de aceite

- Administrador consegue adicionar bebida;
- Contador consegue adicionar bebida;
- Toda remoção gera log;
- Toda edição gera log;
- Relatório mensal soma corretamente por tipo;
- Relatório por membro soma corretamente;
- Quantidade não pode ser negativa.

---

## 5.7 Módulo de cobranças

### Objetivo

Permitir que administradores e contadores criem cobranças para membros.

### Regras

- Cada cobrança pertence a um membro;
- O membro só vê as próprias cobranças;
- Administrador e contador veem todas;
- Cobranças podem ser marcadas como pagas;
- Cobranças podem ser canceladas.

### Tipos de cobrança

- Mensalidade;
- Bebidas;
- Janta;
- Multa;
- Evento especial;
- Outros.

### Dados

- Membro;
- Título;
- Descrição;
- Valor;
- Data de vencimento;
- Status;
- Criado por;
- Data de criação.

Status:

```txt
pending
paid
cancelled
overdue
```

### Critérios de aceite

- Membro só vê cobranças dele;
- Administrador vê todas;
- Contador vê todas;
- Apenas administrador ou contador pode criar cobrança;
- Apenas administrador ou contador pode marcar como paga;
- Valor precisa ser positivo;
- Cobrança cancelada não aparece como pendente.

---

## 5.8 Módulo de janteiros

### Objetivo

Controlar a escala de responsáveis pela janta de cada terça-feira.

### Regras

- Administrador define trios, quartetos ou grupos maiores;
- Cada escala pertence a uma terça-feira;
- A tela inicial mostra os janteiros da terça;
- Se o usuário estiver escalado, deve aparecer destaque para ele.

### Dados

- Terça-feira;
- Lista de membros;
- Observação;
- Criado por;
- Atualizado por;
- Data/hora.

### Critérios de aceite

- Apenas administrador pode criar escala;
- Apenas administrador pode editar escala;
- A escala aparece na tela inicial;
- Membro escalado recebe destaque;
- Histórico de janteiros fica disponível.

---

## 5.9 Módulo de recados e notificações

### Objetivo

Exibir avisos importantes na tela inicial.

### Dados

- Título;
- Mensagem;
- Prioridade;
- Status;
- Data de início;
- Data de expiração;
- Criado por.

Prioridades:

```txt
normal
high
urgent
```

### Funcionalidades

- Criar recado;
- Editar recado;
- Desativar recado;
- Exibir recados ativos na tela inicial;
- Ordenar por prioridade.

### Critérios de aceite

- Recado ativo aparece na tela inicial;
- Recado expirado não aparece;
- Apenas administrador cria recado;
- Prioridade alta aparece em destaque;
- Recados podem ser vinculados a uma terça específica ou gerais.

---

## 6. Estrutura de telas

## 6.1 Login

### Campos

- Telefone;
- Botão entrar.

### Ações

- Validar telefone;
- Liberar acesso;
- Bloquear acesso se não cadastrado.

---

## 6.2 Tela inicial

Deve mostrar:

- Nome do membro;
- Próxima terça-feira;
- Marcação de presença;
- Quantidade de convidados;
- Cobranças pendentes;
- Janteiros da terça;
- Recados;
- Atalhos para sinuca e ranking.

---

## 6.3 Sinuca

Deve mostrar:

- Campeonato atual;
- Ranking;
- Lista de jogos;
- Resultados;
- Botão para lançar resultado;
- Resultados pendentes, se administrador.

---

## 6.4 Bebidas

Disponível para administrador e contador.

Deve mostrar:

- Terça-feira selecionada;
- Lista de membros;
- Botões para adicionar Água/Refri e Cerveja;
- Quantidade por membro;
- Total da terça;
- Logs;
- Relatórios.

---

## 6.5 Cobranças

Para membro:

- Lista das próprias cobranças.

Para administrador/contador:

- Criar cobrança;
- Editar cobrança;
- Marcar como paga;
- Cancelar cobrança;
- Filtrar por membro;
- Filtrar por mês.

---

## 6.6 Janteiros

Para todos:

- Ver janteiros da terça.

Para administrador:

- Criar escala;
- Editar escala;
- Selecionar membros;
- Adicionar observação.

---

## 6.7 Recados

Para todos:

- Ver recados ativos.

Para administrador:

- Criar recado;
- Editar recado;
- Desativar recado;
- Definir prioridade.

---

## 6.8 Administração

Disponível apenas para administradores.

Funções:

- Membros;
- Permissões;
- Duplas;
- Jogos;
- Resultados pendentes;
- Recados;
- Janteiros;
- Configurações.

---

## 7. Modelo de dados inicial

## 7.1 members

```sql
CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  birth_date DATE NULL,
  role ENUM('member', 'player', 'admin', 'accountant') NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 7.2 club_tuesdays

```sql
CREATE TABLE club_tuesdays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  status ENUM('open', 'closed', 'archived') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 7.3 attendance

```sql
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_tuesday_id INT NOT NULL,
  member_id INT NOT NULL,
  status ENUM('dinner', 'football', 'dinner_and_football', 'not_going') NOT NULL,
  dinner_guests INT NOT NULL DEFAULT 0,
  football_guests INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_attendance_per_member_per_tuesday (club_tuesday_id, member_id),

  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);
```

---

## 7.4 pool_championships

```sql
CREATE TABLE pool_championships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  status ENUM('draft', 'active', 'finished', 'cancelled') NOT NULL DEFAULT 'draft',
  start_date DATE NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 7.5 pool_teams

```sql
CREATE TABLE pool_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  championship_id INT NOT NULL,
  player_one_id INT NOT NULL,
  player_two_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (championship_id) REFERENCES pool_championships(id),
  FOREIGN KEY (player_one_id) REFERENCES members(id),
  FOREIGN KEY (player_two_id) REFERENCES members(id)
);
```

---

## 7.6 pool_matches

```sql
CREATE TABLE pool_matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  championship_id INT NOT NULL,
  club_tuesday_id INT NULL,
  team_a_id INT NOT NULL,
  team_b_id INT NOT NULL,
  team_a_points INT NULL,
  team_b_points INT NULL,
  status ENUM('open', 'pending_approval', 'confirmed', 'rejected', 'cancelled', 'corrected') NOT NULL DEFAULT 'open',
  submitted_by_member_id INT NULL,
  approved_by_member_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (championship_id) REFERENCES pool_championships(id),
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (team_a_id) REFERENCES pool_teams(id),
  FOREIGN KEY (team_b_id) REFERENCES pool_teams(id),
  FOREIGN KEY (submitted_by_member_id) REFERENCES members(id),
  FOREIGN KEY (approved_by_member_id) REFERENCES members(id)
);
```

---

## 7.7 drinks

```sql
CREATE TABLE drinks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_tuesday_id INT NOT NULL,
  member_id INT NOT NULL,
  drink_type ENUM('water_soda', 'beer') NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  status ENUM('active', 'removed') NOT NULL DEFAULT 'active',
  created_by_member_id INT NOT NULL,
  removed_by_member_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id),
  FOREIGN KEY (removed_by_member_id) REFERENCES members(id)
);
```

---

## 7.8 drink_logs

```sql
CREATE TABLE drink_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drink_id INT NULL,
  club_tuesday_id INT NOT NULL,
  member_id INT NOT NULL,
  action ENUM('added', 'removed', 'updated') NOT NULL,
  drink_type ENUM('water_soda', 'beer') NOT NULL,
  old_quantity INT NULL,
  new_quantity INT NULL,
  performed_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (drink_id) REFERENCES drinks(id),
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (performed_by_member_id) REFERENCES members(id)
);
```

---

## 7.9 charges

```sql
CREATE TABLE charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NULL,
  status ENUM('pending', 'paid', 'cancelled', 'overdue') NOT NULL DEFAULT 'pending',
  created_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id)
);
```

---

## 7.10 dinner_teams

```sql
CREATE TABLE dinner_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_tuesday_id INT NOT NULL,
  notes TEXT NULL,
  created_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id)
);
```

---

## 7.11 dinner_team_members

```sql
CREATE TABLE dinner_team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dinner_team_id INT NOT NULL,
  member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (dinner_team_id) REFERENCES dinner_teams(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);
```

---

## 7.12 notices

```sql
CREATE TABLE notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  priority ENUM('normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  club_tuesday_id INT NULL,
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id)
);
```

---

## 8. Roadmap por fases

# Fase 0 — Preparação do projeto

## Objetivo

Definir base técnica, arquitetura e estrutura inicial.

## Tarefas

- Criar repositório;
- Criar frontend com React + Vite + TypeScript;
- Configurar Tailwind CSS;
- Configurar rotas;
- Criar layout mobile-first;
- Criar backend com Node.js + Express/Fastify;
- Configurar Prisma;
- Configurar MySQL;
- Criar variáveis de ambiente;
- Configurar deploy do frontend no GitHub Pages;
- Configurar deploy do backend.

## Entregáveis

- Projeto rodando localmente;
- Frontend acessível;
- Backend acessível;
- Banco conectado;
- Estrutura inicial de pastas.

## Prioridade

Alta.

---

# Fase 1 — Login e membros

## Objetivo

Permitir que apenas membros cadastrados acessem o sistema.

## Tarefas

- Criar tabela de membros;
- Criar endpoint de login por telefone;
- Criar sessão/token;
- Criar tela de login;
- Criar tela de administração de membros;
- Criar cadastro de membro;
- Criar edição de membro;
- Criar controle de perfil;
- Criar bloqueio para membros inativos.

## Entregáveis

- Login funcionando;
- Cadastro de membros funcionando;
- Permissões básicas funcionando.

## Critérios de aceite

- Membro cadastrado entra;
- Membro não cadastrado não entra;
- Admin consegue cadastrar membro;
- Admin consegue mudar perfil;
- Membro comum não acessa área administrativa.

## Prioridade

Alta.

---

# Fase 2 — Terças-feiras e tela inicial

## Objetivo

Criar a base semanal e a tela inicial do membro.

## Tarefas

- Criar tabela de terças-feiras;
- Criar função para gerar próxima terça;
- Criar seleção de terça atual;
- Criar tela inicial;
- Exibir dados personalizados do usuário;
- Criar estrutura de cards da home.

## Entregáveis

- Home funcional;
- Terça atual visível;
- Estrutura preparada para presença, cobranças, janteiros e recados.

## Critérios de aceite

- Sistema identifica próxima terça;
- Home mostra nome do usuário;
- Home mostra data da terça;
- Home se adapta ao perfil do usuário.

## Prioridade

Alta.

---

# Fase 3 — Marcação de presença e convidados

## Objetivo

Permitir que membros confirmem ida ao clube.

## Tarefas

- Criar tabela de presença;
- Criar API de marcar presença;
- Criar API de atualizar presença;
- Criar controles de convidados com + e -;
- Criar visão administrativa da presença;
- Criar resumo de presença por terça.

## Entregáveis

- Membro marca presença;
- Membro marca convidados;
- Admin vê lista geral da terça.

## Critérios de aceite

- Cada membro tem uma marcação por terça;
- Quantidade de convidados não fica negativa;
- Alterações atualizam corretamente;
- Admin consegue ver total de janta, futebol e convidados.

## Prioridade

Alta.

---

# Fase 4 — Recados e notificações

## Objetivo

Exibir avisos importantes na tela inicial.

## Tarefas

- Criar tabela de recados;
- Criar CRUD de recados para admin;
- Criar listagem de recados ativos;
- Criar prioridade visual;
- Criar expiração de recados;
- Exibir recados na home.

## Entregáveis

- Admin cria recados;
- Usuários veem recados ativos;
- Recados expirados somem da home.

## Critérios de aceite

- Apenas admin cria recado;
- Recado ativo aparece na home;
- Recado expirado não aparece;
- Recado urgente tem destaque.

## Prioridade

Média-alta.

---

# Fase 5 — Janteiros

## Objetivo

Gerenciar a escala de janta por terça-feira.

## Tarefas

- Criar tabela de janteiros;
- Criar tabela de membros da escala;
- Criar CRUD de escala;
- Criar seleção de trio/quarteto;
- Exibir escala na home;
- Destacar quando usuário está escalado.

## Entregáveis

- Admin cadastra janteiros;
- Membros veem escala;
- Usuário escalado recebe destaque.

## Critérios de aceite

- Escala pertence a uma terça;
- Admin edita escala;
- Home mostra janteiros;
- Histórico fica disponível.

## Prioridade

Média.

---

# Fase 6 — Campeonato de sinuca

## Objetivo

Cadastrar campeonato, duplas, jogos e ranking automático.

## Tarefas

- Criar tabela de campeonatos;
- Criar tabela de duplas;
- Criar tabela de jogos;
- Criar CRUD de campeonato;
- Criar cadastro de duplas;
- Criar cadastro de jogos;
- Criar lançamento de resultado por admin;
- Criar lançamento de resultado por jogador;
- Criar aprovação de resultado;
- Criar ranking automático;
- Criar tela de ranking;
- Criar tela de jogos pendentes.

## Entregáveis

- Campeonato funcional;
- Duplas cadastradas;
- Jogos cadastrados;
- Resultados confirmados;
- Ranking automático.

## Critérios de aceite

- Admin lança resultado confirmado;
- Jogador lança resultado pendente;
- Admin aprova resultado;
- Ranking só usa jogos confirmados;
- Pontuação 0 conta como jogo;
- Ranking mostra pontos e jogos.

## Prioridade

Alta.

---

# Fase 7 — Bebidas

## Objetivo

Controlar consumo semanal de Água/Refri e Cerveja.

## Tarefas

- Criar tabela de bebidas;
- Criar tabela de logs de bebidas;
- Criar tela de bebidas;
- Criar adicionar bebida;
- Criar remover bebida;
- Criar editar quantidade;
- Criar logs automáticos;
- Criar resumo por terça;
- Criar relatório mensal geral;
- Criar relatório mensal por membro.

## Entregáveis

- Admin e contador controlam bebidas;
- Sistema registra logs;
- Relatórios mensais funcionam.

## Critérios de aceite

- Toda adição gera log;
- Toda remoção gera log;
- Toda edição gera log;
- Quantidade não fica negativa;
- Relatório mensal soma corretamente;
- Apenas admin e contador têm acesso irrestrito.

## Prioridade

Alta.

---

# Fase 8 — Cobranças

## Objetivo

Permitir controle de cobranças individuais.

## Tarefas

- Criar tabela de cobranças;
- Criar CRUD de cobranças;
- Criar tela de cobranças do membro;
- Criar tela administrativa de cobranças;
- Criar status de pagamento;
- Criar filtro por mês;
- Criar filtro por membro;
- Exibir cobranças pendentes na home.

## Entregáveis

- Admin/contador criam cobranças;
- Membro vê cobranças próprias;
- Cobranças aparecem na home.

## Critérios de aceite

- Membro não vê cobrança de outro;
- Admin vê todas;
- Contador vê todas;
- Cobrança pendente aparece na home;
- Cobrança paga não aparece como pendente.

## Prioridade

Alta.

---

# Fase 9 — Relatórios

## Objetivo

Criar relatórios úteis para administração e contador.

## Relatórios necessários

### Presença

- Total de membros na janta;
- Total de membros no futebol;
- Total de convidados na janta;
- Total de convidados no futebol.

### Bebidas

- Total de Água/Refri por mês;
- Total de Cerveja por mês;
- Consumo por membro;
- Consumo por terça.

### Cobranças

- Total pendente;
- Total pago;
- Total por membro;
- Total por mês.

### Sinuca

- Ranking;
- Jogos por dupla;
- Pontos por dupla;
- Histórico de resultados.

## Entregáveis

- Tela de relatórios;
- Filtros por mês;
- Filtros por membro;
- Exportação simples em CSV, se possível.

## Critérios de aceite

- Relatório mensal de bebidas funciona;
- Relatório de cobranças funciona;
- Relatório de presença funciona;
- Admin e contador conseguem acessar relatórios financeiros.

## Prioridade

Média.

---

# Fase 10 — Auditoria e segurança

## Objetivo

Melhorar confiabilidade, rastreabilidade e controle.

## Tarefas

- Criar logs para alterações sensíveis;
- Registrar quem fez cada ação;
- Registrar data/hora;
- Criar histórico de alterações em bebidas;
- Criar histórico de resultados de sinuca;
- Criar proteção de rotas;
- Criar middleware de permissão;
- Validar dados no backend;
- Tratar erros de API.

## Entregáveis

- Logs confiáveis;
- Permissões aplicadas;
- Ações sensíveis rastreadas.

## Critérios de aceite

- Usuário sem permissão não acessa rota proibida;
- Edição de bebida gera log;
- Aprovação de resultado registra admin;
- Cobrança registra criador.

## Prioridade

Alta.

---

# Fase 11 — Polimento mobile-first

## Objetivo

Garantir usabilidade boa no celular.

## Tarefas

- Melhorar layout mobile;
- Criar navegação inferior;
- Criar botões grandes;
- Criar cards simples;
- Criar estados de carregamento;
- Criar mensagens de erro;
- Criar confirmação para ações perigosas;
- Melhorar contraste;
- Testar em celulares.

## Entregáveis

- Interface confortável no celular;
- Navegação simples;
- Fluxo rápido para marcação de presença e bebidas.

## Critérios de aceite

- App funciona bem em tela pequena;
- Botões são fáceis de clicar;
- Home carrega rápido;
- Admin consegue usar bebidas pelo celular durante o clube.

## Prioridade

Média-alta.

---

# Fase 12 — Deploy e operação

## Objetivo

Colocar o sistema em produção.

## Tarefas

- Configurar build do frontend;
- Publicar no GitHub Pages;
- Configurar backend em produção;
- Configurar banco MySQL;
- Configurar variáveis de ambiente;
- Criar usuário administrador inicial;
- Testar fluxos principais;
- Criar backup do banco;
- Documentar processo de deploy.

## Entregáveis

- URL pública do frontend;
- API online;
- Banco online;
- Admin inicial criado;
- Checklist de produção.

## Critérios de aceite

- App abre pelo celular;
- Login funciona em produção;
- Dados persistem no MySQL;
- Admin consegue cadastrar membros;
- Fluxos principais funcionam.

## Prioridade

Alta.

---

## 9. Backlog inicial de funcionalidades

## Alta prioridade

- Login por telefone;
- Cadastro de membros;
- Controle de perfil;
- Terça-feira atual;
- Marcação de presença;
- Convidados;
- Campeonato de sinuca;
- Ranking automático;
- Bebidas;
- Logs de bebidas;
- Cobranças;
- Tela inicial.

## Média prioridade

- Recados;
- Janteiros;
- Relatórios mensais;
- Exportação CSV;
- Histórico de sinuca;
- Histórico de presença.

## Baixa prioridade

- Notificações push;
- Confirmação por WhatsApp;
- Upload de comprovante;
- Pagamento via Pix;
- Dashboard avançado;
- Modo offline.

---

## 10. Ordem recomendada de implementação

1. Criar base técnica;
2. Criar banco;
3. Criar login;
4. Criar membros;
5. Criar terças-feiras;
6. Criar home;
7. Criar presença;
8. Criar recados;
9. Criar janteiros;
10. Criar sinuca;
11. Criar bebidas;
12. Criar cobranças;
13. Criar relatórios;
14. Criar logs e auditoria;
15. Publicar versão beta;
16. Testar com poucos membros;
17. Ajustar bugs;
18. Liberar para o clube inteiro.

---

## 11. MVP enxuto

Caso seja necessário lançar rápido, o MVP mínimo deve conter:

- Login por telefone;
- Cadastro de membros;
- Tela inicial;
- Marcação de presença;
- Convidados;
- Cadastro de duplas;
- Lançamento de resultados;
- Ranking automático;
- Bebidas;
- Cobranças simples;
- Recados.

O que pode ficar para depois:

- Relatórios avançados;
- Exportação CSV;
- Logs detalhados além de bebidas;
- Notificação push;
- Confirmação via WhatsApp;
- Pagamento integrado.

---

## 12. Regras críticas que não podem ser esquecidas

1. O clube acontece apenas nas terças-feiras.
2. Toda marcação importante deve estar ligada a uma terça-feira.
3. Acesso só pode acontecer por telefone cadastrado.
4. Membro comum só vê seus próprios dados financeiros.
5. Admin e contador têm acesso amplo à área financeira e bebidas.
6. Bebidas precisam de logs de adicionado, removido e atualizado.
7. Resultado lançado por jogador precisa de aprovação.
8. Resultado lançado por admin já pode ser confirmado.
9. Ranking só considera jogos confirmados.
10. Pontuação 0 conta como jogo quando o resultado está confirmado.
11. Convidados podem ser mais de um.
12. Tela inicial deve centralizar tudo que importa para o membro.

---

## 13. Possível estrutura de pastas

### Frontend

```txt
src/
  app/
  components/
  features/
    auth/
    members/
    home/
    attendance/
    pool/
    drinks/
    charges/
    dinner-teams/
    notices/
    reports/
  hooks/
  services/
  types/
  utils/
  routes/
```

### Backend

```txt
src/
  modules/
    auth/
    members/
    club-tuesdays/
    attendance/
    pool/
    drinks/
    charges/
    dinner-teams/
    notices/
    reports/
  middlewares/
  prisma/
  utils/
  server.ts
```

---

## 14. API inicial sugerida

## Auth

```txt
POST /auth/login
POST /auth/logout
GET /auth/me
```

## Members

```txt
GET /members
POST /members
GET /members/:id
PUT /members/:id
PATCH /members/:id/status
```

## Club Tuesdays

```txt
GET /club-tuesdays
GET /club-tuesdays/current
POST /club-tuesdays
PATCH /club-tuesdays/:id/status
```

## Attendance

```txt
GET /attendance/:clubTuesdayId
POST /attendance
PUT /attendance/:id
```

## Pool

```txt
GET /pool/championships
POST /pool/championships
GET /pool/teams
POST /pool/teams
GET /pool/matches
POST /pool/matches
PUT /pool/matches/:id/result
POST /pool/matches/:id/approve
POST /pool/matches/:id/reject
GET /pool/ranking/:championshipId
```

## Drinks

```txt
GET /drinks/:clubTuesdayId
POST /drinks
PUT /drinks/:id
DELETE /drinks/:id
GET /drinks/logs/:clubTuesdayId
GET /drinks/reports/monthly
```

## Charges

```txt
GET /charges/me
GET /charges
POST /charges
PUT /charges/:id
PATCH /charges/:id/status
```

## Dinner Teams

```txt
GET /dinner-teams/:clubTuesdayId
POST /dinner-teams
PUT /dinner-teams/:id
```

## Notices

```txt
GET /notices/active
GET /notices
POST /notices
PUT /notices/:id
PATCH /notices/:id/status
```

## Reports

```txt
GET /reports/attendance
GET /reports/drinks
GET /reports/charges
GET /reports/pool
```

---

## 15. Checklist de lançamento

Antes de liberar para uso real:

- [ ] Login funcionando em produção;
- [ ] Admin inicial criado;
- [ ] Cadastro de membros testado;
- [ ] Marcação de presença testada;
- [ ] Convidados testados;
- [ ] Sinuca testada com dados reais;
- [ ] Ranking conferido manualmente;
- [ ] Bebidas testadas;
- [ ] Logs de bebidas testados;
- [ ] Cobranças testadas;
- [ ] Recados testados;
- [ ] Janteiros testados;
- [ ] Permissões testadas;
- [ ] Backup do banco configurado;
- [ ] GitHub Pages publicado;
- [ ] Backend publicado;
- [ ] URL compartilhada com administradores.

---

## 16. Versão beta sugerida

A primeira versão beta pode ser usada apenas por:

- Administradores;
- Contador;
- 2 ou 3 membros de teste.

Testar por pelo menos uma terça-feira real antes de liberar para todos.

### Testes durante a beta

- Um membro marca presença;
- Um membro adiciona convidados;
- Admin registra bebidas;
- Contador confere relatório;
- Admin lança resultado da sinuca;
- Jogador lança resultado pendente;
- Admin aprova resultado;
- Cobrança aparece para o membro correto;
- Recado aparece na home;
- Janteiros aparecem corretamente.

---

## 17. Futuras melhorias

- Integração com WhatsApp;
- Login com código de confirmação;
- Notificações push;
- Pix para cobranças;
- Comprovante de pagamento;
- Exportação PDF;
- Painel financeiro completo;
- Ranking histórico da sinuca;
- Estatísticas por jogador;
- Histórico de presença;
- Modo PWA instalável;
- Backup automático;
- Relatórios anuais;
- Aniversariantes do mês.

---

## 18. Conclusão

O app do Clube das Terças deve ser construído como uma plataforma simples, prática e mobile-first, focada no uso real durante as terças-feiras.

A prioridade é permitir que o clube controle presença, convidados, sinuca, bebidas, cobranças, janteiros e recados em um só lugar.

O sistema deve começar simples, mas já com uma estrutura correta de dados, permissões e auditoria para evitar retrabalho no futuro.

A arquitetura recomendada é:

```txt
Frontend SPA no GitHub Pages
+
Backend API separado
+
MySQL
```

Esse modelo permite manter o app leve, barato e fácil de acessar pelo celular, sem abrir mão de persistência, controle e relatórios.
