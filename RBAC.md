# 🔐 RBAC (Role-Based Access Control) - Documentação

## Visão Geral

O sistema RBAC foi implementado para permitir controle granular de acesso baseado em roles de usuário. Existem 3 roles principais:

### Roles Disponíveis

| Role              | Descrição                      | Permissões                                                       |
| ----------------- | ------------------------------ | ---------------------------------------------------------------- |
| **user** (padrão) | Usuário comum                  | Acesso ao próprio dashboard, ler/escrever/deletar próprios dados |
| **moderator**     | Moderador com acesso expandido | Ler todos os dados, moderar conteúdo                             |
| **admin**         | Administrador do sistema       | Acesso total, gerenciar usuários, alterar roles                  |

## Setup Inicial

### 1. Migração do Banco de Dados

Os novos campos `role` e `is_active` foram adicionados ao modelo `User`:

```bash
python migrate_add_rbac.py
```

Isso vai adicionar:

- `role` VARCHAR(20) DEFAULT 'user'
- `is_active` BOOLEAN DEFAULT TRUE

### 2. Criar Primeiro Admin

Para criar o usuário admin inicial, use o endpoint de seed:

```bash
# Local
curl -X POST "http://localhost:8000/api/admin/seed-admin?email=admin@email.com&senha=senha123"

# Produção
curl -X POST "https://seu-backend.com/api/admin/seed-admin?email=admin@email.com&senha=senha123"
```

**Resposta:**

```json
{
  "message": "Admin criado com sucesso",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@email.com",
    "role": "admin",
    "plan": "premium",
    "is_active": true,
    "created_at": "2024-03-16T10:30:00"
  }
}
```

⚠️ **Importante:** Este endpoint só funciona se nenhum admin existir no sistema. Depois da primeira criação, use os endpoints normais de admin.

## Endpoints Admin

Todos os endpoints abaixo requerem autenticação e role `admin`.

### Listar Todos os Usuários

```bash
GET /api/admin/users?skip=0&limit=100
```

**Headers:**

```
Authorization: Bearer <token>
```

**Resposta:**

```json
[
  {
    "id": 1,
    "nome": "Usuario",
    "email": "user@email.com",
    "role": "user",
    "plan": "free",
    "is_active": true,
    "created_at": "2024-03-16T10:30:00"
  }
]
```

### Obter Detalhes de um Usuário

```bash
GET /api/admin/users/{user_id}
```

### Alterar Role de um Usuário

```bash
PUT /api/admin/users/{user_id}/role
Content-Type: application/json

{
  "role": "moderator"
}
```

**Validações:**

- Role deve ser uma de: `user`, `moderator`, `admin`
- Admin não pode remover a própria permission de admin
- Retorna erro 403 se tentar mudar role sem ser admin

**Resposta:**

```json
{
  "message": "Role do usuário alterado de user para moderator",
  "user": {
    "id": 2,
    "nome": "Usuario",
    "email": "user@email.com",
    "role": "moderator",
    "plan": "free",
    "is_active": true,
    "created_at": "2024-03-16T10:30:00"
  }
}
```

### Ativar/Desativar Usuário

```bash
PUT /api/admin/users/{user_id}/status
Content-Type: application/json

{
  "is_active": false
}
```

**Validações:**

- Admin não pode desativar a própria conta
- Usuários inativos não conseguem fazer login

**Resposta:**

```json
{
  "message": "Usuário desativado",
  "user": {
    "id": 2,
    "nome": "Usuario",
    "email": "user@email.com",
    "role": "user",
    "plan": "free",
    "is_active": false,
    "created_at": "2024-03-16T10:30:00"
  }
}
```

### Ver Roles Disponíveis e Suas Permissões

```bash
GET /api/admin/roles
```

**Resposta:**

```json
{
  "roles": {
    "user": {
      "description": "Usuário comum com acesso ao próprio dashboard",
      "permissions": ["read:own", "write:own", "delete:own"]
    },
    "moderator": {
      "description": "Moderador com acesso expandido",
      "permissions": ["read:all", "write:own", "delete:own", "moderate"]
    },
    "admin": {
      "description": "Administrador com acesso total",
      "permissions": [
        "read:all",
        "write:all",
        "delete:all",
        "manage:users",
        "manage:system"
      ]
    }
  },
  "current_user_role": "admin"
}
```

## Implementação Técnica

### Arquivo: `core/rbac.py`

Contém:

- **`require_admin()`** - Decorator para proteger endpoints admin
- **`require_role(*roles)`** - Decorator para exigir roles específicas
- **`get_role_permissions(role)`** - Retorna permissões de um role
- **`ROLES`** - Definição de roles e suas permissões

### Exemplo de Uso em Novo Endpoint

```python
from core.rbac import require_admin

@app.get("/api/admin/some-feature")
def admin_feature(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Protected endpoint - only accessible by admins"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso apenas para administradores")

    # Admin-only logic here
    return {"message": "Admin feature"}
```

## Segurança

### Verificações Implementadas

1. ✅ **Verificação de Autenticação** - Todos os endpoints requerem token JWT válido
2. ✅ **Verificação de Role** - Endpoints admin verificam se role é "admin"
3. ✅ **Verificação de Status** - Usuários inativos não conseguem acessar endpoints
4. ✅ **Proteção de Self-Removal** - Admin não pode remover próprias permissões
5. ✅ **Proteção de Self-Deactivation** - Admin não pode desativar própria conta
6. ✅ **Rate Limiting** - Implementado em endpoints críticos

### Exemplo de Tratamento de Erros

```
401 Unauthorized - Token inválido ou expirado
403 Forbidden - Usuário não tem permissão (falta de role)
400 Bad Request - Dados inválidos ou tentativa de self-removal
```

## Fluxo de Login com RBAC

```
1. Usuário faz login com POST /api/auth/login
2. Backend verifica:
   - Email existe?
   - Senha está correta?
   - Usuário está ativo (is_active == true)?
3. Se tudo ok:
   - Gera JWT com user_id
   - Retorna token e informações do usuário (incluindo role)
4. Frontend armazena token no localStorage
5. Para próximas requisições, frontend envia: Authorization: Bearer <token>
6. Backend valida token e verifica role conforme necessário
```

## Próximos Passos (Futuro)

- [ ] Implementar "moderator" funcionalidades específicas
- [ ] Adicionar permissões mais granulares (resource-level permissions)
- [ ] Implementar audit log de ações admin
- [ ] Dashboard admin com estatísticas de usuários
- [ ] Sistema de quotas por role
- [ ] API de convites para admins criarem novos usuários

## Teste Rápido

```bash
# 1. Criar admin
curl -X POST "http://localhost:8000/api/admin/seed-admin?email=admin@test.com&senha=senha123"

# 2. Copiar token da resposta
# 3. Listar usuários
curl -X GET "http://localhost:8000/api/admin/users" \
  -H "Authorization: Bearer <seu_token>"

# 4. Criar outro usuário (via registro normal)
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"nome":"User","email":"user@test.com","senha":"senha123"}'

# 5. Alterar role do novo usuário
curl -X PUT "http://localhost:8000/api/admin/users/2/role" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"moderator"}'
```

---

**Status:** ✅ Implementado e testado
**Última atualização:** 2024-03-16
