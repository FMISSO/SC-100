# Instalação antes do voo

## GitHub Pages
Antes do primeiro deploy, um administrador deve acessar **Settings → Pages → Build and deployment → Source** e selecionar **GitHub Actions**. O workflow não consegue habilitar o Pages apenas com o `GITHUB_TOKEN`; sem essa configuração, a etapa **Configure GitHub Pages** falha com `Not Found`.

Como alternativa, para habilitar o Pages automaticamente, configure o secret de repositório `PAGES_TOKEN` com um Personal Access Token com permissão **Pages: write** para este repositório (ou escopo `repo` para um token clássico). O workflow usa esse token somente na configuração do Pages; as demais etapas continuam usando o `GITHUB_TOKEN`.

Depois da configuração, execute novamente **Deploy to GitHub Pages** na aba **Actions** usando a branch `main`, ou envie um commit para `main`.

## Celular
1. Publique esta pasta em um host HTTPS (GitHub Pages ou Azure Static Web Apps).
2. Abra a URL no celular.
3. Android: menu → **Instalar app**. iPhone: Compartilhar → **Adicionar à Tela de Início**.
4. Navegue pelas seções uma vez.
5. Ative o modo avião e teste.

## Laptop
Execute `python -m http.server 8000` e abra `http://localhost:8000`.

**Importante:** o Service Worker exige HTTPS ou localhost; abrir `index.html` via `file://` não instala o cache offline. Teste antes de embarcar.
