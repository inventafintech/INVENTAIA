# Contribuir a INVENTA.AI

1. **Branches**: `feat/<tema>`, `fix/<tema>`, `docs/<tema>` desde `main`. Nunca push directo a `main` sin PR.
2. **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
3. **PR checklist**: `npm run lint` + `npm test` + `npm run build` en verde; screenshots si toca UI; sin secretos.
4. **CI**: cada PR corre `.github/workflows/ci.yml`. El merge a `main` despliega a producción vía Vercel automáticamente.
5. **Seguridad**: reportar vulnerabilidades por email (ver `SECURITY.md`), nunca en issues públicos.

## Colaboradores externos (flujo fork + PR, obligatorio)

> Quien no sea miembro con escritura **jamás** pushea a este repo.
> Todo aporte entra por fork y Pull Request aprobado por @Juzakito.

**El colaborador (una sola vez):**

```powershell
gh repo fork Juzakito/inventa-ai --clone=true
cd inventa-ai
```

**Por cada aporte:**

```powershell
git checkout main; git pull upstream main
git checkout -b feat/mi-modulo
# ... trabaja ...
git push origin feat/mi-modulo
gh pr create --base main --head SU_USUARIO:feat/mi-modulo `
  --title "feat: ..." --body "Qué cambia y por qué. Sin secretos."
```

**El mantenedor (revisión y merge):**

```powershell
gh pr list --repo Juzakito/inventa-ai
gh pr diff NUMERO --repo Juzakito/inventa-ai
gh pr merge NUMERO --repo Juzakito/inventa-ai --squash --delete-branch
```

**Reglas del flujo:**
- NDA firmado **antes** de recibir acceso (ver `docs/NDA-COLABORADOR.md`).
- Acceso del colaborador: rol `Read`. Sin `push` en este repo.
- `CODEOWNERS` asigna a @Juzakito como revisor obligatorio.
- El merge a `main` despliega a producción: revisar el diff completo antes de aprobar.
