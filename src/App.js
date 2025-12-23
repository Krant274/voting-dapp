import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract.js';
import { Vote, Wallet, Users, Trophy, Power, RefreshCw, Loader2, PlusCircle, AlertTriangle } from 'lucide-react';

const SEPOLIA_CHAIN_ID = '0xaa36a7';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [votingActive, setVotingActive] = useState(false);
  const [electionId, setElectionId] = useState(0);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  // 1. Hàm kiểm tra mạng (Để xóa lỗi ESLint và bảo vệ DApp)
  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const isWrong = '0x' + network.chainId.toString(16) !== SEPOLIA_CHAIN_ID;
      setWrongNetwork(isWrong);
      return !isWrong;
    } catch {
      return false;
    }
  }, []);

  // 2. Hàm tải dữ liệu (Có gọi checkNetwork)
  const loadData = useCallback(async (votingContract, userAddress) => {
    try {
      setRefreshing(true);
      
      // Gọi checkNetwork ở đây để hết lỗi "unused"
      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) return;

      const [results, active, adminAddr, eId] = await Promise.all([
        votingContract.getResults(),
        votingContract.votingActive(),
        votingContract.admin(),
        votingContract.currentElectionId()
      ]);

      const votedStatus = userAddress ? await votingContract.hasVoted(eId, userAddress) : false;

      setVotingActive(active);
      setElectionId(Number(eId));
      if (userAddress) setIsAdmin(adminAddr.toLowerCase() === userAddress.toLowerCase());
      setHasVoted(votedStatus);

      if (results[0].length > 0) {
        setCandidates(results[0].map((id, i) => ({
          id: Number(id),
          name: results[1][i],
          description: results[2][i],
          voteCounts: Number(results[3][i])
        })));
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setRefreshing(false);
    }
  }, [checkNetwork]);

  // 3. REAL-TIME LISTENER: Tự động cập nhật cho TẤT CẢ mọi người dùng đang mở web
  useEffect(() => {
    if (contract) {
      const handleUpdate = () => loadData(contract, account);

      contract.on("VoteCasted", handleUpdate);
      contract.on("CandidateRegistered", handleUpdate);
      contract.on("ElectionStarted", handleUpdate);
      contract.on("ElectionStopped", handleUpdate);

      return () => {
        contract.removeAllListeners();
      };
    }
  }, [contract, account, loadData]);

  // 4. Khởi tạo ứng dụng
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const vContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(vContract);
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await loadData(vContract, accounts[0]);
        } else {
          await loadData(vContract, null);
        }

        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    };
    init();
  }, [loadData]);

  // 5. Kết nối ví
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Vui lòng cài MetaMask!");
    try {
      setLoading(true);
      await checkNetwork(); // Kiểm tra mạng khi bấm connect
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      if (contract) await loadData(contract, accounts[0]);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (method, ...args) => {
    try {
      setLoading(true);
      const tx = await contract[method](...args);
      await tx.wait();
      setWinner(null);
      await loadData(contract, account);
    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      {/* OVERLAY LOADING */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white">
          <Loader2 size={64} className="animate-spin mb-4 text-blue-400" />
          <h2 className="text-2xl font-black uppercase tracking-widest italic">Đang xác thực giao dịch...</h2>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-6 rounded-[2.5rem] shadow-xl border border-white">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg text-white"><Vote size={32} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight italic">ELECTION v{electionId}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${votingActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {votingActive ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                </span>
                {refreshing && <RefreshCw size={14} className="animate-spin text-slate-400" />}
              </div>
            </div>
          </div>

          {!account ? (
            <button onClick={connectWallet} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg"><Wallet size={20} /> KẾT NỐI VÍ</button>
          ) : (
            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-3">
              <Wallet size={16} className="text-slate-400" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ví cá nhân</p>
                <p className="font-mono text-xs font-bold text-slate-700">{account.slice(0,6)}...{account.slice(-4)}</p>
              </div>
            </div>
          )}
        </header>

        {/* CẢNH BÁO SAI MẠNG */}
        {wrongNetwork && (
          <div className="mb-8 bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-center gap-4 text-amber-800 animate-pulse">
            <AlertTriangle size={32} className="text-amber-500" />
            <p className="text-sm font-bold uppercase tracking-widest">Hãy chuyển sang mạng Sepolia Testnet để tiếp tục!</p>
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {isAdmin && account && (
          <div className="bg-slate-900 text-white p-7 rounded-[2.5rem] mb-10 shadow-2xl flex flex-wrap gap-6 items-center justify-between border-b-8 border-blue-600">
            <h2 className="font-black text-xl uppercase tracking-tighter italic flex items-center gap-2"><Power size={20} className="text-blue-400"/> Admin Dashboard</h2>
            <div className="flex gap-3">
              <button onClick={() => {
                const n = prompt("Tên:"); const d = prompt("Mô tả:"); if(n) handleAction('registerCandidate', n, d);
              }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg"><PlusCircle size={18} /> THÊM ỨNG CỬ VIÊN</button>
              
              {votingActive ? (
                <button onClick={() => handleAction('stopVoting')} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg"><Power size={18} /> DỪNG BẦU CỬ</button>
              ) : (
                <button onClick={() => { if(window.confirm("Bắt đầu cuộc bầu MỚI?")) handleAction('startNewElection'); }} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg"><RefreshCw size={18} /> TẠO CUỘC MỚI</button>
              )}
            </div>
          </div>
        )}

        {/* WINNER DISPLAY (XỬ LÝ HÒA - TIES) */}
        {!votingActive && candidates.length > 0 && (
          <div className="text-center mb-12 animate-in fade-in duration-1000">
            {!winner ? (
              <button onClick={async () => {
                const res = await contract.getWinner();
                setWinner({ names: res[0], votes: Number(res[1]) });
              }} className="bg-white border-2 border-amber-500 text-amber-600 px-10 py-5 rounded-[2rem] font-black shadow-xl hover:bg-amber-500 hover:text-white transition-all flex items-center gap-3 mx-auto uppercase tracking-widest"><Trophy size={24} /> Công bố kết quả</button>
            ) : (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <Trophy size={150} className="absolute -right-10 -bottom-10 opacity-20 rotate-12" />
                <p className="text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-80">{winner.names.length > 1 ? 'KẾT QUẢ ĐỒNG HẠNG' : 'NGƯỜI CHIẾN THẮNG'}</p>
                
                <div className="flex flex-wrap justify-center gap-4 mb-4">
                  {winner.names.map((name, idx) => (
                    <h2 key={idx} className="text-5xl font-black drop-shadow-2xl">{name}{idx < winner.names.length - 1 ? ' & ' : ''}</h2>
                  ))}
                </div>

                <div className="inline-flex items-center gap-2 bg-black/20 px-8 py-3 rounded-full font-black text-2xl border border-white/20">
                  <Trophy size={24} className="text-amber-200" /> {winner.votes} PHIẾU BẦU
                </div>
              </div>
            )}
          </div>
        )}

        {/* CÁC KHUNG ỨNG CỬ VIÊN (CĂN BẰNG NHAU TUYỆT ĐỐI) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {candidates.map((c) => (
            <div key={c.id} className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl flex flex-col h-full hover:shadow-2xl transition-all border-b-[12px] border-transparent hover:border-blue-500 group">
              <div className="flex justify-between items-start mb-8">
                <div className="bg-slate-100 text-slate-500 font-black text-[10px] px-4 py-1.5 rounded-full uppercase italic">Candidate #{c.id}</div>
                <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-xl font-black leading-none">{c.voteCounts}</span>
                  <span className="text-[7px] font-bold uppercase mt-1">Votes</span>
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-4 group-hover:text-blue-600 transition-colors truncate">{c.name}</h3>
              
              {/* Phần mô tả có flex-grow để ép các nút bấm nằm dưới đáy khung */}
              <div className="flex-grow bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 mb-8 italic text-slate-500 text-sm leading-relaxed overflow-hidden">
                <p className="line-clamp-5">"{c.description || 'Chưa có thông tin mô tả cho ứng cử viên này.'}"</p>
              </div>

              <button
                disabled={!votingActive || hasVoted || !account || loading}
                onClick={() => handleAction('vote', c.id)}
                className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${
                  hasVoted || !votingActive || !account ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg shadow-blue-200'
                }`}
              >
                {hasVoted ? 'BẠN ĐÃ BẦU' : !votingActive ? 'HẾT HẠN' : 'BỎ PHIẾU NGAY'}
              </button>
            </div>
          ))}
        </div>

        {candidates.length === 0 && !loading && (
          <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
            <Users size={64} className="mx-auto text-slate-100 mb-6" />
            <h2 className="text-slate-300 font-black text-2xl uppercase tracking-[0.3em]">Chưa có ứng cử viên</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;