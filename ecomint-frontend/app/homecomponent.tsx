"use client";
import { useState, useEffect } from "react";
import { Lucid, Blockfrost } from "@lucid-evolution/lucid";
import { mintCredits, listCredits, getMarketplaceListings, buyCredits } from "../services/marketplace";
import toast, { Toaster } from "react-hot-toast";
import { 
  Wallet, Leaf, TreePine, Sun, Flame, Loader2, ShoppingCart, Sprout, Tag, RefreshCw, FileText, Flag 
} from "lucide-react";

const PROJECT_CATEGORIES = [
  { id: 1, name: "Reflorestamento (Nature-based)", price: 25, icon: Leaf },
  { id: 2, name: "REDD+ (Prevenção de Desmatamento)", price: 20, icon: TreePine },
  { id: 3, name: "Energia Renovável (Solar/Eólica)", price: 15, icon: Sun },
  { id: 4, name: "Captura de Metano (Aterros)", price: 10, icon: Flame },
];

export default function HomeComponent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [lucidInstance, setLucidInstance] = useState<any>(null);
  
  // estados do mint
  const [mintAmount, setMintAmount] = useState<number>(100);
  const [mintProjectType, setMintProjectType] = useState<number>(1);
  const [mintCid, setMintCid] = useState<string>("");
  const [isMinting, setIsMinting] = useState<boolean>(false);

  const [categoryCids, setCategoryCids] = useState<Record<number, string>>({
    1: "", 2: "", 3: "", 4: ""
  });

  // estados de venda
  const [amount, setAmount] = useState<number>(50);
  const [listProjectType, setListProjectType] = useState<number>(1);
  const [priceUsd, setPriceUsd] = useState<number>(PROJECT_CATEGORIES[0].price);
  
  // estados gerais
  const [listings, setListings] = useState<any[]>([]);
  const [isListing, setIsListing] = useState<boolean>(false);
  const [isWaitingBlock, setIsWaitingBlock] = useState<boolean>(false);
  const [buyingUtxo, setBuyingUtxo] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // lista de denúncias
  const [reportedUtxos, setReportedUtxos] = useState<string[]>([]);

  useEffect(() => {
    const savedCids = localStorage.getItem("ecoMint_cached_cids");
    if (savedCids) {
      try { setCategoryCids(JSON.parse(savedCids)); } catch (e) {}
    }

    const savedReports = localStorage.getItem("ecoMint_reported_utxos");
    if (savedReports) {
      try { setReportedUtxos(JSON.parse(savedReports)); } catch (e) {}
    }
  }, []);

  const connectWallet = async () => {
    try {
      const cardano = (window as any).cardano;
      if (!cardano || !cardano.lace) {
        toast.error("Por favor, instale a extensão da carteira Lace!");
        return;
      }
      
      const api = await cardano.lace.enable();
      
      const blockfrost = new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!
      );

      const lucid = await Lucid(blockfrost, "Preview"); 
      lucid.selectWallet.fromAPI(api);

      const address = await lucid.wallet().address();
      setWalletAddress(address);
      setLucidInstance(lucid); 
      
      toast.success("Carteira conectada com sucesso!");
      fetchListings(lucid);
    } catch (error) {
      console.error("Erro ao conectar:", error);
      toast.error("Erro ao conectar a carteira.");
    }
  };

  const fetchListings = async (lucid: any, manualRefresh = false) => {
    if (manualRefresh) setIsRefreshing(true);
    try {
      const items = await getMarketplaceListings(lucid);
      
      // filtro: só mostra se não estiver na lista de denúncias
      const currentReports = JSON.parse(localStorage.getItem("ecoMint_reported_utxos") || "[]");
      const cleanItems = items.filter((item: any) => !currentReports.includes(item.utxo.txHash));
      
      setListings([...cleanItems]); 
      if (manualRefresh) toast.success("Vitrine atualizada!");
    } catch (error) {
      console.error("Erro ao buscar vitrine:", error);
      if (manualRefresh) toast.error("Erro ao atualizar.");
    } finally {
      if (manualRefresh) setIsRefreshing(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    setListProjectType(selectedId);
    
    const category = PROJECT_CATEGORIES.find(c => c.id === selectedId);
    if (category) setPriceUsd(category.price);
  };

  const handleMint = async () => {
    if (!lucidInstance) return;
    setIsMinting(true);
    const toastId = toast.loading("Assine a transação na sua carteira...");
    
    const finalCid = mintCid.trim() || "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

    try {
      await mintCredits(lucidInstance, mintAmount, mintProjectType, finalCid);
      
      const updatedCids = { ...categoryCids, [mintProjectType]: finalCid };
      setCategoryCids(updatedCids);
      localStorage.setItem("ecoMint_cached_cids", JSON.stringify(updatedCids));

      toast.success(`Créditos fabricados com metadados!`, { id: toastId, duration: 5000 });
      setMintCid(""); 
    } catch (error) {
      console.error("Erro ao mintar:", error);
      toast.error("Transação cancelada ou falhou.", { id: toastId });
    } finally {
      setIsMinting(false);
    }
  };

  const handleList = async () => {
    if (!lucidInstance) return;
    setIsListing(true);
    const toastId = toast.loading("Assine a listagem na sua carteira...");

    try {
      await listCredits(lucidInstance, amount, priceUsd, listProjectType);
      
      toast.loading("Transação enviada! Minerando bloco (aprox. 25s)...", { id: toastId });
      setIsWaitingBlock(true);
      
      setTimeout(() => {
        fetchListings(lucidInstance);
        setIsWaitingBlock(false);
        toast.success("Lote listado com sucesso na vitrine!", { id: toastId, duration: 5000 });
      }, 25000);

    } catch (error) {
      console.error("Erro ao listar:", error);
      toast.error("Erro ao listar o lote. Verifique seu saldo.", { id: toastId });
      setIsWaitingBlock(false);
    } finally {
      setIsListing(false);
    }
  };

  const handleBuy = async (lote: any) => {
    if (!lucidInstance) return;
    setBuyingUtxo(lote.utxo.txHash);
    const toastId = toast.loading("Assine a compra na sua carteira...");

    try {
      const paymentAmount = BigInt(lote.priceLovelace * lote.amount);
      await buyCredits(lucidInstance, lote.utxo, lote.seller, paymentAmount);

      toast.loading("Pagamento enviado! Processando a transferência (aprox. 25s)...", { id: toastId });
      setIsWaitingBlock(true);

      setTimeout(() => {
        fetchListings(lucidInstance);
        setIsWaitingBlock(false);
        setBuyingUtxo(null);
        toast.success("🎉 Compra realizada com sucesso! Lote removido.", { id: toastId, duration: 6000 });
      }, 25000);

    } catch (error) {
      console.error("Erro ao comprar:", error);
      toast.error("Erro ao comprar o lote. Tente novamente.", { id: toastId });
      setIsWaitingBlock(false);
      setBuyingUtxo(null);
    }
  };

  // denunciar lote
  const handleReport = (lote: any) => {
    if (window.confirm("Suspeita de Fraude (Greenwashing)?\n\nTem certeza que deseja denunciar este lote? Ele será enviado para auditoria e ocultado da prateleira imediatamente.")) {
      const newReports = [...reportedUtxos, lote.utxo.txHash];
      setReportedUtxos(newReports);
      
      localStorage.setItem("ecoMint_reported_utxos", JSON.stringify(newReports));
      
      setListings(prev => prev.filter(item => item.utxo.txHash !== lote.utxo.txHash));
      
      toast.success("Lote reportado e removido! O vendedor está sob auditoria.", { icon: '🚩', duration: 5000 });
    }
  };

  // ==========================================
  // LOGIN
  // ==========================================
  if (!walletAddress) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden selection:bg-[#deff9a] selection:text-black">
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid #333' }, success: { iconTheme: { primary: '#deff9a', secondary: '#000' } } }} />
        
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#deff9a]/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-3xl text-center animate-fade-up">
          <div className="bg-[#111] p-5 rounded-3xl border border-[#222] mb-8 shadow-[0_0_40px_rgba(222,255,154,0.05)]">
            <Sprout className="w-16 h-16 text-[#deff9a]" />
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight text-white">
            EcoMint <span className="text-[#deff9a]">Marketplace</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed font-light">
            O ecossistema descentralizado que transforma sustentabilidade em ativos reais. 
            <strong className="text-gray-200 font-medium block mt-2">Negocie créditos de carbono diretamente na blockchain.</strong>
          </p>

          <button 
            onClick={connectWallet}
            className="group relative flex items-center justify-center gap-3 bg-[#deff9a] text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(222,255,154,0.2)] hover:shadow-[0_0_40px_rgba(222,255,154,0.5)] hover:scale-105"
          >
            <Wallet className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
            Conectar Carteira Lace
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // DASHBOARD
  // ==========================================
  return (
    <main className="min-h-screen bg-[#050505] text-white p-8 font-sans selection:bg-[#deff9a] selection:text-black">
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: { background: '#111', color: '#fff', border: '1px solid #333' },
          success: { iconTheme: { primary: '#deff9a', secondary: '#000' } }
        }} 
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="animate-fade-in">
        <header className="flex justify-between items-center mb-12 border-b border-[#222] pb-6">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Sprout className="w-10 h-10 text-[#deff9a]" />
            EcoMint <span className="text-[#deff9a] font-medium">Marketplace</span>
          </h1>
          
          <div className="bg-[#111] border border-[#333] px-5 py-2.5 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(222,255,154,0.1)]">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#deff9a] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#deff9a]"></span>
            </span>
            <code className="text-sm font-medium text-gray-300 tracking-wide">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </code>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* painel esquerdo */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            <div className="bg-[#0a0a0a] border border-[#222] p-7 rounded-3xl shadow-lg relative overflow-hidden group hover:border-[#333] transition-colors duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-white">
                <Sprout className="w-24 h-24" />
              </div>
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2 relative z-10">
                <span className="bg-[#111] p-2 rounded-lg border border-[#333]"><Sprout className="w-5 h-5 text-[#deff9a]" /></span>
                1. Emitir Créditos
              </h2>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1.5">Categoria do Projeto</label>
                  <select 
                    value={mintProjectType}
                    onChange={(e) => setMintProjectType(Number(e.target.value))}
                    className="w-full bg-[#111] border border-[#333] rounded-xl p-3.5 text-white focus:outline-none focus:border-[#deff9a] focus:ring-1 focus:ring-[#deff9a] transition-all appearance-none"
                  >
                    {PROJECT_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1.5">Quantidade (Toneladas)</label>
                  <input 
                    type="number" 
                    value={mintAmount} 
                    onChange={(e) => setMintAmount(Number(e.target.value))}
                    className="w-full bg-[#111] border border-[#333] rounded-xl p-3.5 text-white focus:outline-none focus:border-[#deff9a] focus:ring-1 focus:ring-[#deff9a] transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1.5">CID do Certificado (IPFS / Pinata)</label>
                  <input 
                    type="text" 
                    placeholder="Cole o CID gerado no Pinata"
                    value={mintCid} 
                    onChange={(e) => setMintCid(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] rounded-xl p-3.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#deff9a] focus:ring-1 focus:ring-[#deff9a] transition-all font-mono"
                  />
                </div>

                <button 
                  onClick={handleMint}
                  disabled={isMinting}
                  className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-[#deff9a] text-[#deff9a] font-bold py-3.5 rounded-xl mt-2 hover:bg-[#deff9a] hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Leaf className="w-5 h-5" />}
                  {isMinting ? "Assinando..." : "Fabricar (Mint)"}
                </button>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#222] p-7 rounded-3xl shadow-lg relative overflow-hidden group hover:border-[#333] transition-colors duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-[#deff9a]">
                <Tag className="w-24 h-24" />
              </div>
              <h2 className="text-xl font-bold text-[#deff9a] mb-5 flex items-center gap-2 relative z-10">
                <span className="bg-[#111] p-2 rounded-lg border border-[#333]"><Tag className="w-5 h-5 text-[#deff9a]" /></span>
                2. Vender Créditos
              </h2>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-1.5">Categoria do Projeto</label>
                  <select 
                    value={listProjectType}
                    onChange={handleCategoryChange}
                    className="w-full bg-[#111] border border-[#333] rounded-xl p-3.5 text-white focus:outline-none focus:border-[#deff9a] focus:ring-1 focus:ring-[#deff9a] transition-all appearance-none"
                  >
                    {PROJECT_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="text-sm font-medium text-gray-400 block mb-1.5">Quantidade</label>
                      <input 
                          type="number" 
                          value={amount} 
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="w-full bg-[#111] border border-[#333] rounded-xl p-3.5 text-white focus:outline-none focus:border-[#deff9a] focus:ring-1 focus:ring-[#deff9a] transition-all"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="text-sm font-medium text-gray-400 block mb-1.5">Preço (USD)</label>
                      <input 
                          type="number" 
                          value={priceUsd} 
                          onChange={(e) => setPriceUsd(Number(e.target.value))}
                          className="w-full bg-[#111] border border-[#333] rounded-xl p-3.5 text-[#deff9a] font-bold focus:outline-none focus:border-[#deff9a] focus:ring-1 focus:ring-[#deff9a] transition-all"
                      />
                    </div>
                </div>
                <button 
                  onClick={handleList}
                  disabled={isListing || isWaitingBlock}
                  className="w-full flex items-center justify-center gap-2 bg-[#deff9a] text-black font-bold py-4 rounded-xl mt-3 hover:bg-white hover:shadow-[0_0_15px_rgba(222,255,154,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isListing || isWaitingBlock ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                  {isListing ? "Assinando..." : (isWaitingBlock ? "Minerando..." : "Colocar à Venda")}
                </button>
              </div>
            </div>
          </div>

          {/* painel direito */}
          <div className="lg:col-span-8 pl-0 lg:pl-6">
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Prateleira Pública
                  {isWaitingBlock && <Loader2 className="w-5 h-5 animate-spin text-[#deff9a]" />}
                </h2>
                
                <button 
                  onClick={() => fetchListings(lucidInstance, true)}
                  disabled={isRefreshing || !lucidInstance}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-[#deff9a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#111] border border-[#222] px-3 py-1.5 rounded-lg hover:border-[#deff9a]"
                  title="Atualizar vitrine"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#deff9a]" : ""}`} />
                  Atualizar
                </button>
              </div>

              <span className="text-sm text-gray-500 bg-[#111] px-3 py-1 rounded-full border border-[#222]">
                {listings.length} lotes disponíveis
              </span>
            </div>
            
            {listings.length === 0 ? (
              <div className="border border-dashed border-[#333] rounded-3xl p-16 flex flex-col items-center justify-center text-center bg-[#0a0a0a]">
                <ShoppingCart className="w-12 h-12 text-[#333] mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">A prateleira está vazia</h3>
                <p className="text-gray-600 max-w-sm">
                  Seja o primeiro a listar créditos de carbono no marketplace e torne seus projetos acessíveis globalmente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {listings.map((lote, index) => {
                  const category = PROJECT_CATEGORIES.find(c => c.id === lote.projectType) || PROJECT_CATEGORIES[0];
                  const Icon = category.icon;
                  const isBuyingThis = buyingUtxo === lote.utxo.txHash;
                  
                  const currentCid = categoryCids[lote.projectType] || "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
                  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${currentCid}`;

                  return (
                    <div 
                      key={index} 
                      className="group bg-[#0a0a0a] border border-[#222] p-6 rounded-3xl flex flex-col justify-between hover:border-[#deff9a] hover:shadow-[0_0_20px_rgba(222,255,154,0.1)] hover:bg-[#111] transition-all duration-300"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2 bg-[#1a1a1a] text-xs text-[#deff9a] px-3 py-1.5 rounded-lg border border-[#333] font-medium">
                            <Icon className="w-3.5 h-3.5" />
                            {category.name}
                          </div>
                          
                          {/* botões denunciar e certificado */}
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleReport(lote)}
                              className="text-gray-600 hover:text-red-500 bg-[#111] border border-[#222] p-1.5 rounded-lg transition-colors group/warn"
                              title="Denunciar (Greenwashing / Fraude)"
                            >
                              <Flag className="w-3.5 h-3.5 group-hover/warn:fill-red-500/20" />
                            </button>

                            <a 
                              href={ipfsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#deff9a] bg-[#111] border border-[#222] px-2.5 py-1.5 rounded-lg transition-colors group/btn"
                              title="Ver auditoria imutável do projeto no IPFS"
                            >
                              <FileText className="w-3.5 h-3.5 text-gray-500 group-hover/btn:text-[#deff9a]" />
                              Certificado
                            </a>
                          </div>
                        </div>

                        <h3 className="text-3xl font-bold mb-1 tracking-tight text-white group-hover:text-[#deff9a] transition-colors">
                          {lote.amount} <span className="text-lg text-gray-400 font-medium">Ton CO₂</span>
                        </h3>
                        <p className="text-gray-500 text-sm break-all flex items-center gap-1.5 mt-2">
                          <Wallet className="w-3.5 h-3.5" />
                          {lote.seller.slice(0, 10)}...{lote.seller.slice(-8)}
                        </p>
                      </div>
                      
                      <div className="mt-8 flex justify-between items-center border-t border-[#222] pt-5">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Preço Total</p>
                          <p className="text-white font-bold text-xl flex items-baseline gap-1">
                            {(lote.priceLovelace * lote.amount / 1_000_000).toFixed(2)} 
                            <span className="text-sm text-[#deff9a]">ADA</span>
                          </p>
                        </div>
                        <button 
                          onClick={() => handleBuy(lote)}
                          disabled={isBuyingThis || isWaitingBlock}
                          className="bg-[#1a1a1a] border border-[#333] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#deff9a] hover:text-black hover:border-[#deff9a] transition-all duration-300 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isBuyingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          {isBuyingThis ? "Processando..." : "Comprar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}