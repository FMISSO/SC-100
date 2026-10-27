# Instalação antes do voo

## Celular
1. Publique esta pasta em um host HTTPS (GitHub Pages ou Azure Static Web Apps).
2. Abra a URL no celular.
3. Android: menu → **Instalar app**. iPhone: Compartilhar → **Adicionar à Tela de Início**.
4. Navegue pelas seções uma vez.
5. Ative o modo avião e teste.

## Laptop
Execute `python -m http.server 8000` e abra `http://localhost:8000`.

**Importante:** o Service Worker exige HTTPS ou localhost; abrir `index.html` via `file://` não instala o cache offline. Teste antes de embarcar.
