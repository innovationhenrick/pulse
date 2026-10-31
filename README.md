<div align="center">

<img src="docs/brand/logo-round.svg" alt="" width="88" height="88">

# Pulse

**Painel pessoal de recuperação, esforço, sono e saúde — self-hosted, na web, no Android e no iPhone.**

Este é o fork pessoal de [innovationhenrick/pulse](https://github.com/innovationhenrick/pulse), mantido para rodar no meu próprio servidor e no meu iPhone.

[![CI](https://github.com/innovationhenrick/pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/innovationhenrick/pulse/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue)](LICENSE)
[![App](https://img.shields.io/badge/app-pulse.labsalt.com-00f19f)](https://pulse.labsalt.com)

<img src="docs/screenshots/phone-home.png" alt="Pulse no celular: sono, recuperação e esforço" width="30%">
<img src="docs/screenshots/phone-health-monitor.png" alt="Pulse no celular: monitor de saúde" width="30%">
<img src="docs/screenshots/phone-journal.png" alt="Pulse no celular: diário" width="30%">

</div>

## O que é este fork

O Pulse transforma os dados que chegam ao Google Health a partir do Fitbit ou Pixel Watch em indicadores pessoais de Recuperação, Esforço, Sono, Pulse Age, estresse, tendências e diário.

Neste fork:

- o servidor principal roda em [https://pulse.labsalt.com](https://pulse.labsalt.com);
- o app usa Next.js, PostgreSQL e Docker, sem depender de um serviço Pulse hospedado por terceiros;
- o idioma Português (Brasil) pode ser escolhido em **Ajustes › App › Idioma** e fica salvo na conta;
- o diretório [mobile/](docs/mobile.md) contém shells Capacitor para Android e iPhone;
- o iPhone usa o bundle id io.github.innovationhenrick.pulse e abre o servidor configurado no próprio aparelho;
- a integração com o openGym está em avaliação como serviço separado, com sincronização controlada de treinos para uma futura área Treinos no Pulse.

## Como acessar

<div align="center">

<a href="docs/setup.md"><img src="docs/badges/self-host.svg" alt="Self-host no seu servidor" height="56"></a>
<a href="docs/mobile.md"><img src="docs/badges/android.svg" alt="Disponível no Android" height="56"></a>
<a href="docs/mobile.md"><img src="docs/badges/ios.svg" alt="Disponível no iOS" height="56"></a>

</div>

### Web e servidor

O servidor é a fonte dos dados e dos scores. A configuração de produção está descrita em [docs/setup.md](docs/setup.md), com Docker, PostgreSQL, Google OAuth e HTTPS.

### Android e iPhone

Os dois aplicativos nativos são shells finos em [mobile/](docs/mobile.md): eles abrem, em uma WebView nativa, o servidor Pulse escolhido na primeira execução.

No iPhone:

~~~sh
cd mobile
pnpm install
pnpm exec cap sync ios
pnpm ios
~~~

No Xcode, selecione seu Team em **Signing & Capabilities** e execute o scheme App no iPhone conectado. O shell do iPhone ainda não lê Apple Health/HealthKit; os scores continuam vindo do pipeline de dados do Google Health no servidor.

## Funcionalidades

- Recuperação, Esforço e Sono com explicações e histórico;
- Pulse Age, Energy Bank, Monitor de estresse e Monitor de saúde;
- atividades, diário, tendências, relatórios e dashboard personalizado;
- Coach opcional usando uma chave do provedor escolhido pelo administrador;
- exportação dos dados e modo demo sem conta Google;
- idioma salvo na conta, atualmente English e Português (Brasil);
- instalação como PWA e shells nativos para Android e iPhone.

Os algoritmos estão documentados em [docs/algorithms](docs/algorithms). O Pulse é uma ferramenta de bem-estar, não um dispositivo médico nem orientação clínica.

## Integração planejada com o openGym

O openGym já está instalado no mesmo VPS e continua sendo o motor de rotinas, sessões, exercícios e progressão. A direção planejada é:

1. manter o openGym como serviço e fonte dos dados detalhados de treino;
2. sincronizar sessões concluídas por um adaptador servidor-servidor, com source e externalId para evitar duplicações;
3. exibir no Pulse um resumo nativo de treino, volume, duração e músculos trabalhados;
4. somente depois decidir se as telas completas de rotina e execução devem ser recriadas no layout do Pulse.

O código, a autenticação, o banco e as mídias do openGym não são copiados para este repositório. A integração deve respeitar a licença AGPL do openGym e os avisos específicos de mídia antes de qualquer redistribuição.

## Rodar localmente

~~~sh
git clone https://github.com/innovationhenrick/pulse.git
cd pulse
pnpm install
cp .env.example .env
docker compose -f compose.dev.yaml up -d
pnpm dev
~~~

Abra http://localhost:3000 e escolha **Continuar com dados de demonstração**. O modo demo gera 180 dias de dados sem acessar sua conta Google.

## Desenvolvimento e CI/CD

O fluxo deste fork usa o GitHub como fonte de verdade:

~~~text
branch local → pull request → CI (app, banco, e2e, site e Android/iOS) → main → deploy seguro no VPS
~~~

- Pull requests executam typecheck, lint, testes, verificação de migrations, e2e e builds móveis/site.
- Um push em main, depois de CI verde, pode disparar o deploy de produção via SSH.
- No VPS, [scripts/deploy.sh](scripts/deploy.sh) faz fetch da branch, backup do PostgreSQL, build, healthcheck e rollback da imagem anterior se necessário.
- O deploy para quando encontra alterações locais rastreadas ou arquivos não rastreados; ele nunca deve apagar trabalho manual do VPS.
- Para sincronizar esta cópia local sem sobrescrever alterações:

  ~~~sh
  scripts/sync-local.sh main
  # ou
  scripts/sync-local.sh feat/pt-br
  ~~~

  O script faz fetch e merge --ff-only apenas quando a árvore está limpa.

Antes de ativar o deploy automático, o checkout do VPS precisa estar limpo e as alterações atualmente não commitadas precisam ser revisadas e preservadas em uma branch/commit. Os segredos do servidor ficam somente nas configurações do GitHub Actions e no VPS; nunca em commits ou no README.

## Documentação

[Setup](docs/setup.md) · [App Android/iPhone](docs/mobile.md) · [Administração](docs/admin.md) · [CI/CD e manutenção](docs/maintainers.md) · [PWA](docs/pwa.md) · [Detalhes técnicos](docs/technical-details.md) · [Contribuição](CONTRIBUTING.md)

## Licença

O Pulse está sob [PolyForm Noncommercial 1.0.0](LICENSE). Consulte também [Security](SECURITY.md), [Code of Conduct](CODE_OF_CONDUCT.md) e [NOTICE](NOTICE).

Este fork preserva os avisos de copyright e as atribuições do projeto original. O scoring portado do [noop](https://github.com/ryanbr/noop) mantém seu aviso próprio.
