import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import * as dotenv from "dotenv";
import { mintCredits, listCredits, getMarketplaceListings, buyCredits } from "./services/marketplace"; 

dotenv.config();

const ACTION = process.env.ACTION;
const API_KEY = process.env.BLOCKFROST_API_KEY;
const MNEMONIC = process.env.WALLET_MNEMONIC;
const SELLER_ADDRESS = process.env.SELLER_ADDRESS;
const PROJECT_TYPE = Number(process.env.PROJECT_TYPE || "1");
const CARBON_AMOUNT = Number(process.env.CARBON_AMOUNT || "0");
const PRICE_USD_PER_TON = Number(process.env.PRICE_USD_PER_TON || "0");

async function main() {
    // 1. inicializar carteira lucid
    const lucid = await Lucid(new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", API_KEY!), "Preview");
    lucid.selectWallet.fromSeed(MNEMONIC!);

    console.log(`\n=== Iniciando EcoMint Runner | Ação: ${ACTION} ===\n`);

    try {
        if (ACTION === "mint") {
            console.log(`Cunhando ${CARBON_AMOUNT} tokens...`);
            const txHash = await mintCredits(lucid, CARBON_AMOUNT);
            console.log(`Sucesso! Hash da transação: ${txHash}`);

        } else if (ACTION === "list") {
            console.log(`Listando ${CARBON_AMOUNT} tokens a $${PRICE_USD_PER_TON} cada...`);
            const txHash = await listCredits(lucid, CARBON_AMOUNT, PRICE_USD_PER_TON, PROJECT_TYPE);
            console.log(`Lote listado com sucesso! Hash: ${txHash}`);

        } else if (ACTION === "buy") {
            console.log(`Procurando lotes disponíveis no contrato...`);
            const listings = await getMarketplaceListings(lucid);
            
            if (listings.length === 0) {
                console.log("Nenhum lote encontrado à venda.");
                return;
            }

            // Pega o primeiro lote disponível na prateleira para testar a compra
            const lote = listings[0];
            console.log(`Comprando lote com ${lote.amount} créditos...`);
            
            const txHash = await buyCredits(lucid, lote.utxo, SELLER_ADDRESS!, BigInt(lote.priceLovelace * lote.amount));
            console.log(`Compra finalizada com sucesso! Hash: ${txHash}`);
        }
    } catch (error) {
        console.error("Ocorreu um erro:", error);
    }
}

main();