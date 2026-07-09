# EcoMint

O EcoMint é um Aplicativo Descentralizado (dApp) construído na blockchain Cardano, focado na tokenização e negociação de créditos de carbono.

O projeto atua como um marketplace Peer-to-Peer (P2P) e Trustless, eliminando intermediários financeiros e garantindo a rastreabilidade dos ativos ambientais através de metadados on-chain e armazenamento descentralizado, visando mitigar a dupla contagem e o greenwashing.

## Arquitetura e Tecnologias

O repositório é estruturado em duas frentes principais:

- **Frontend e Integração Web3:** Construído com Next.js, React e Tailwind CSS. A comunicação com a blockchain é feita utilizando a biblioteca Lucid Evolution e o indexador Blockfrost.
  
- **Contratos Inteligentes (Smart Contracts):** Desenvolvidos na linguagem Aiken e compilados para Plutus V3, gerenciando a lógica de custódia, validação de transações e regras do marketplace.
  
- **Armazenamento Descentralizado:** Integração com IPFS (via Pinata) para ancoragem de certificados de auditoria (MRV).
  

## Funcionalidades Principais

- **Emissão de Ativos (Minting):** Criação de tokens de carbono categorizados por tipo de projeto (Reflorestamento, REDD+, Energia Renovável, etc.). A emissão exige a inserção de um Content Identifier (CID) do IPFS, que vincula o ativo on-chain ao certificado real de auditoria.
  
- **Negociação Direta (List/Buy):** Os usuários podem listar seus lotes definindo o preço em Dólar (USD), que é convertido em tempo real para ADA. O contrato inteligente garante que, no ato da compra, os fundos sejam transferidos diretamente para o endereço (PKH) do vendedor original.
  
- **Auditoria Transparente:** Todos os lotes listados na prateleira pública exibem o link direto para o certificado no IPFS, permitindo auditoria humana antes da compra.
  
- **Mecanismo de Moderação (Shadowban):** Sistema integrado à interface para denúncia de lotes suspeitos de fraude, ocultando-os imediatamente da listagem pública.
  

## Estrutura do Repositório

- `/eco2`: Contém o código-fonte dos contratos inteligentes em Aiken, arquivos de configuração (`aiken.toml`) e o artefato compilado (`plutus.json`).
  
- `/ecomint-frontend`: Contém a interface de usuário em Next.js, componentes React e a lógica de serviços Web3 (`services/marketplace.ts`).
  

## Pré-requisitos para Execução

Para rodar o projeto localmente, você precisará de:

- Gerenciador de pacotes Bun ou Node.js (NPM/Yarn) instalado.
  
- Extensão de carteira Lace instalada no navegador e configurada para a rede Cardano Preview.
  
- Fundos de teste (tADA) na rede Preview (obtidos via Faucet oficial da Cardano).
  
- Uma chave de API válida do Blockfrost (rede Preview).
  

## Instalação e Uso

1. Clone o repositório:

```
git clone https://github.com/SEU_USUARIO/ecomint.git
cd ecomint
```

2. Acesse o diretório do frontend:

```
cd ecomint-frontend
```

3. Instale as dependências:

```
bun install
```

4. Configure as variáveis de ambiente:
  Crie um arquivo chamado `.env.local` na raiz da pasta `ecomint-frontend` e adicione a sua chave do Blockfrost:

```
NEXT_PUBLIC_BLOCKFROST_API_KEY=sua_chave_preview_aqui
```

5. Inicie o servidor de desenvolvimento:

```
bun run dev
```

6. Acesse a aplicação:
  Abra o navegador e acesse `http://localhost:3000`.

## Notas de Desenvolvimento

Este projeto foi desenvolvido como um protótipo acadêmico e Prova de Conceito (PoC) para o ecossistema Cardano. As transações devem ser executadas estritamente em ambiente de rede de testes (Preview).
