import {
    Data,
    getAddressDetails,
    validatorToAddress,
    scriptFromNative,
    mintingPolicyToId,
    Constr,
    credentialToAddress
} from "@lucid-evolution/lucid";
import blueprint from "../plutus.json";

// definição do datum 
const MarketplaceDatumSchema = Data.Object({
    seller_pkh: Data.Bytes(),
    project_type: Data.Integer(),
    carbon_amount: Data.Integer(),
    price_per_unit_lovelace: Data.Integer(),
});

function stringToHex(str: string): string {
    return Array.from(str)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
}

// ==========================================
// CONFIGURAÇÃO BASE
// ==========================================
export async function getContractAndTokenData(lucid: any, projectType: number) {
    const validator = blueprint.validators.find((v: any) => v.title.includes("ecomint"));
    if (!validator) {
        throw new Error("Validator 'ecomint' not found in plutus.json");
    }
    const scriptValidator = { type: "PlutusV3" as const, script: validator.compiledCode };
    const scriptAddress = validatorToAddress("Preview", scriptValidator);

    const userAddress = await lucid.wallet().address();
    
    const mintingPolicy = scriptFromNative({
        type: "sig",
        keyHash: getAddressDetails(userAddress).paymentCredential!.hash,
    });

    const policyId = mintingPolicyToId(mintingPolicy);
    
    const TOKEN_NAME = `EcoMint_Type${projectType}`;
    const TOKEN_NAME_HEX = stringToHex(TOKEN_NAME);
    const unit = policyId + TOKEN_NAME_HEX;

    return { scriptValidator, scriptAddress, mintingPolicy, policyId, unit };
}

// ==========================================
// MINT
// ==========================================
export async function mintCredits(lucid: any, amount: number, projectType: number, cid: string) {
    const { mintingPolicy, unit } = await getContractAndTokenData(lucid, projectType);
    
    const tx = await lucid.newTx()
        .mintAssets({ [unit]: BigInt(amount) })
        .attach.MintingPolicy(mintingPolicy)
        // cravando o link do IPFS/Pinata nos metadados da transação
        .attachMetadata(2026, {
            projectType: projectType,
            assetName: `EcoMint_Type${projectType}`,
            certificateCid: cid,
            totalSupply: amount,
            standard: "SBCE-Proto"
        })
        .complete();
        
    const signedTx = await tx.sign.withWallet().complete();
    return await signedTx.submit();
}

async function getAdaToUsdRate(): Promise<number> {
    try {
        const response = await fetch("https://api.coinbase.com/v2/prices/ADA-USD/spot");
        const json: any = await response.json();
        return parseFloat(json.data.amount);
    } catch { return 0.40; } 
}

// ==========================================
// LIST
// ==========================================
export async function listCredits(lucid: any, amount: number, priceUsd: number, projectType: number) {
    const { scriptAddress, unit } = await getContractAndTokenData(lucid, projectType);
    const userAddress = await lucid.wallet().address();
    
    const rate = await getAdaToUsdRate();
    const lovelacePerTon = BigInt(Math.floor((priceUsd / rate) * 1_000_000));
    
    const datum = {
        seller_pkh: getAddressDetails(userAddress).paymentCredential!.hash,
        project_type: BigInt(projectType),
        carbon_amount: BigInt(amount),
        price_per_unit_lovelace: lovelacePerTon,
    };

    const tx = await lucid.newTx()
        .pay.ToContract(
            scriptAddress, 
            { kind: "inline", value: Data.to(datum, MarketplaceDatumSchema as any) }, 
            { lovelace: 2000000n, [unit]: BigInt(amount) }
        )
        .complete();
        
    const signedTx = await tx.sign.withWallet().complete();
    return await signedTx.submit();
}

// ==========================================
// VITRINE
// ==========================================
export async function getMarketplaceListings(lucid: any) {
    const { scriptAddress } = await getContractAndTokenData(lucid, 1);
    const utxOS = await lucid.utxosAt(scriptAddress);
    
    return utxOS.map((utxo: any) => {
        if (!utxo.datum) return null;
        try {
            const data = Data.from(utxo.datum, MarketplaceDatumSchema) as any;
            return {
                utxo,
                seller: data.seller_pkh,
                projectType: Number(data.project_type),
                amount: Number(data.carbon_amount),
                priceLovelace: Number(data.price_per_unit_lovelace)
            };
        } catch { return null; }
    }).filter(Boolean);
}

// ==========================================
// BUY
// ==========================================
export async function buyCredits(lucid: any, utxo: any, sellerPkh: string, paymentAmount: bigint) {
    const { scriptValidator } = await getContractAndTokenData(lucid, 1);
    
    const sellerAddress = credentialToAddress("Preview", {
        type: "Key",
        hash: sellerPkh
    });
    
    const tx = await lucid.newTx()
        .collectFrom([utxo], Data.to(new Constr(0, [])))
        .attach.SpendingValidator(scriptValidator)
        .pay.ToAddress(sellerAddress, { lovelace: paymentAmount })
        .complete();
    
    const signedTx = await tx.sign.withWallet().complete();
    return await signedTx.submit();
}