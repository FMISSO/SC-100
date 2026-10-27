# Instalação antes do voo

## GitHub Pages
Antes do primeiro deploy, um administrador deve acessar **Settings → Pages → Build and deployment → Source** e selecionar **GitHub Actions**. O workflow não consegue habilitar o Pages apenas com o `GITHUB_TOKEN`; sem essa configuração, a etapa **Configure GitHub Pages** falha com `Not Found`.

Como alternativa, para habilitar o Pages automaticamente, configure o secret de repositório `PAGES_TOKEN` com um Personal Access Token com permissão **Pages: write** para este repositório (ou escopo `repo` para um token clássico). O workflow usa esse token somente na configuração do Pages; as demais etapas continuam usando o `GITHUB_TOKEN`.

Depois da configuração, execute novamente **Deploy to GitHub Pages** na aba **Actions** usando a branch `main`, ou envie um commit para `main`.

## Celular
1. Publique esta pasta em um host HTTPS (GitHub Pages ou Azure Static Web Apps).
2. No iPhone, abra a URL no **Safari**. No Android, abra no navegador que usará para instalar o app.
3. Aguarde a mensagem **"Pronto para usar offline"** no cabeçalho. Ela só aparece após a instalação do pacote; todas as aulas, questões, cards e cenários são baixados de uma vez.
4. Android: menu → **Instalar app**. iPhone: Compartilhar → **Adicionar à Tela de Início**.
5. Abra o app pela Tela de Início ainda com internet e confirme novamente a mensagem de pronto.
6. Toque em **Aulas → Abrir aula**. Use **Próxima aula**, **Aula anterior** e **Concluir aula**; cada conclusão concede 20 XP somente uma vez.
7. Feche o app, ative o modo avião e reabra pela Tela de Início. Teste também Quiz, Cards e Cenário antes de embarcar.

As aulas usam os resumos de texto incluídos no projeto, com uma tela de leitura e revisão ativa. Não há vídeos ou aulas externas do Microsoft Learn para baixar. O endereço da aula fica no fragmento da URL (por exemplo, `#aula-1`), permitindo recarregar ou voltar à aula anterior sem internet.

Se aparecer uma mensagem de falha no offline, **não considere o download concluído**: mantenha a conexão e recarregue. Não é necessário apagar o progresso para atualizar o app. Versões antigas do cache deste app são removidas após a instalação da versão nova.

O cache e o progresso pertencem ao navegador/dispositivo. Limpar os dados do site, usar navegação privada ou a remoção de armazenamento pelo iOS pode exigir um novo download. Sempre faça o teste em modo avião antes do voo.

## Laptop
Execute `python -m http.server 8000` e abra `http://localhost:8000`.

Também é possível usar a URL do GitHub Pages. Aguarde **"Pronto para usar offline"** antes de desconectar.

**Importante:** o Service Worker exige HTTPS ou localhost; abrir `index.html` via `file://` permite ler os arquivos locais, mas não instala o cache offline. Se o navegador bloquear o armazenamento ou houver progresso inválido, o app mostra um aviso e mantém as aulas acessíveis, sem apagar os dados anteriores.

## Validação
Com Node.js 24 ou superior, execute `node --test`. Os testes verificam os arquivos e ícones do pacote, a instalação, a atualização e o atendimento offline do Service Worker. O workflow de publicação executa esses testes antes do deploy.
