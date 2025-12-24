import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract.js';
import { Vote, Wallet, Users, Trophy, Power, RefreshCw, Loader2, PlusCircle, AlertTriangle, X } from 'lucide-react';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', description: '' });

  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.pollingInterval = 2000; 
      const network = await provider.getNetwork();
      return '0x' + network.chainId.toString(16) === SEPOLIA_CHAIN_ID;
    } catch { return false; }
  }, []);

  const loadData = useCallback(async (votingContract, userAddress) => {
    try {
      setRefreshing(true);
      const isCorrect = await checkNetwork();
      setWrongNetwork(!isCorrect);
      if (!isCorrect) {
        const eId = await votingContract.currentElectionId();
        setElectionId(Number(eId));
        return;
      }

      const [active, adminAddr, eId] = await Promise.all([
        votingContract.votingActive(),
        votingContract.admin(),
        votingContract.currentElectionId()
      ]);

      const currentID = Number(eId);
      setElectionId(currentID);
      setVotingActive(active);
      if (userAddress) setIsAdmin(adminAddr.toLowerCase() === userAddress.toLowerCase());

      if (currentID > 0) {
        const results = await votingContract.getResults();
        const votedStatus = userAddress ? await votingContract.hasVoted(currentID, userAddress) : false;
        setHasVoted(votedStatus);
        setCandidates(results[0].map((id, i) => ({
          id: Number(id), name: results[1][i], description: results[2][i], voteCounts: Number(results[3][i])
        })));
      }
    } catch (err) { console.error(err); } finally { setRefreshing(false); }
  }, [checkNetwork]);

  useEffect(() => {
      if (contract) {
        const handleUpdate = () => {
          console.log("Phát hiện thay đổi trên Blockchain, đang cập nhật...");
          loadData(contract, account);
        };

        // Đăng ký lắng nghe các sự kiện
        contract.on("VoteCasted", handleUpdate);
        contract.on("CandidateRegistered", handleUpdate);
        contract.on("ElectionStarted", handleUpdate);
        contract.on("ElectionStopped", handleUpdate);

        // Cleanup function: Hủy lắng nghe khi component bị gỡ bỏ để tránh lag/lỗi
        return () => {
          contract.removeAllListeners();
        };
      }
    }, [contract, account, loadData]);

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const vContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          setAccount(accounts[0]);
          setContract(vContract);
          await loadData(vContract, accounts[0]);
        } else {
          const vContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
          setContract(vContract);
          await loadData(vContract, null);
        }
        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    };
    init();
  }, [loadData]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Vui lòng cài đặt MetaMask.");
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      window.location.reload();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleAction = async (method, ...args) => {
    try {
      setLoading(true);
      const tx = await contract[method](...args);
      await tx.wait();
      setWinner(null);
      setShowAddModal(false); 
      setNewCandidate({ name: '', description: '' });
      await loadData(contract, account);
    } catch (err) { alert("Thao tác thất bại."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      
      {/* 1. MODAL: THÊM ỨNG VIÊN */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl z-10 overflow-hidden border border-white animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Thiết lập Ứng viên</h2>
              <button onClick={() => setShowAddModal(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
            </div>
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Họ và Tên ứng viên</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 outline-none transition-all font-bold"
                    placeholder="Nhập tên đầy đủ..."
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Thông điệp</label>
                  <textarea 
                    rows="4"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                    placeholder="Nhập nội dung thông điệp..."
                    value={newCandidate.description}
                    onChange={(e) => setNewCandidate({...newCandidate, description: e.target.value})}
                  ></textarea>
                </div>
                <button 
                  onClick={() => handleAction('registerCandidate', newCandidate.name, newCandidate.description)}
                  disabled={!newCandidate.name}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:bg-slate-200 transition-all"
                >
                  Xác nhận Bổ sung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white font-black italic uppercase tracking-[0.3em]">
          <Loader2 size={64} className="animate-spin mb-4 text-blue-400" />
          Đang xác thực dữ liệu...
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-6 rounded-[2.5rem] shadow-xl border border-white">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg text-white"><Vote size={32} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">
                {electionId === 0 ? "Hệ thống Bình chọn" : `Cuộc Bình chọn v${electionId}`}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${votingActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {electionId === 0 ? "OFFLINE" : votingActive ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                </span>
                {refreshing && <RefreshCw size={14} className="animate-spin text-slate-400" />}
              </div>
            </div>
          </div>
          {!account ? (
            <button onClick={connectWallet} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all"><Wallet size={20}/> KẾT NỐI VÍ</button>
          ) : (
            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-3">
              <Wallet size={16} className="text-slate-400" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Ví cá nhân</p>
                <p className="font-mono text-xs font-bold text-slate-700 leading-none">{account.slice(0,6)}...{account.slice(-4)}</p>
              </div>
            </div>
          )}
        </header>

        {wrongNetwork && (
          <div className="mb-8 bg-amber-50 border-l-8 border-amber-500 p-5 rounded-r-3xl flex items-center gap-4 text-amber-800 animate-pulse shadow-sm italic font-bold uppercase text-xs">
            <AlertTriangle size={32} className="text-amber-500" /> Kết nối sai mạng lưới! Vui lòng chuyển sang Sepolia Testnet.
          </div>
        )}

        {/* Admin Dashboard */}
        {isAdmin && account && (
          <div className="bg-slate-900 text-white p-7 rounded-[2.5rem] mb-10 shadow-2xl flex flex-wrap gap-6 items-center justify-between border-b-8 border-blue-600">
            <h2 className="font-black text-xl uppercase tracking-tighter italic flex items-center gap-2"><Power size={20} className="text-blue-400"/> Admin Panel</h2>
            <div className="flex gap-3">
              {electionId > 0 && votingActive && (
                <button 
                  onClick={() => setShowAddModal(true)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-900/50"
                >
                  <PlusCircle size={18} /> THÊM ỨNG VIÊN
                </button>
              )}
              {votingActive ? (
                <button onClick={() => handleAction('stopVoting')} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg"><Power size={18} /> DỪNG BÌNH CHỌN</button>
              ) : (
                <button onClick={() => { if(window.confirm("Bắt đầu phiên mới?")) handleAction('startNewElection'); }} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg"><RefreshCw size={18} /> {electionId === 0 ? "KHỞI TẠO" : "NHIỆM KỲ MỚI"}</button>
              )}
            </div>
          </div>
        )}

        {/* Winner Display */}
        {!votingActive && candidates.length > 0 && electionId > 0 && (
          <div className="text-center mb-12 animate-in slide-in-from-bottom-4 duration-700">
            {!winner ? (
              <button onClick={async () => {
                const res = await contract.getWinner();
                setWinner({ names: res[0], votes: Number(res[1]) });
              }} className="bg-white border-2 border-amber-500 text-amber-600 px-10 py-5 rounded-[2rem] font-black shadow-xl hover:bg-amber-500 hover:text-white transition-all flex items-center gap-3 mx-auto uppercase"><Trophy size={24} /> Công bố người chiến thắng</button>
            ) : (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border-4 border-white">
                <Trophy size={150} className="absolute -right-10 -bottom-10 opacity-20 rotate-12" />
                <p className="text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-80">{winner.names.length > 1 ? 'KẾT QUẢ ĐỒNG HẠNG' : 'KẾT QUẢ CUỐI CÙNG'}</p>
                <div className="flex flex-wrap justify-center gap-4 mb-4">
                  {winner.names.map((name, idx) => (
                    <h2 key={idx} className="text-5xl font-black drop-shadow-2xl italic tracking-tighter">{name}{idx < winner.names.length - 1 ? ' & ' : ''}</h2>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 bg-black/20 px-8 py-3 rounded-full font-black text-2xl border border-white/20 shadow-inner">
                  <Trophy size={24} className="text-amber-200" /> {winner.votes} PHIẾU ĐỒNG THUẬN
                </div>
              </div>
            )}
          </div>
        )}

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {candidates.map((c) => (
            <div key={c.id} className="bg-white rounded-[3.5rem] p-8 border border-slate-100 shadow-xl flex flex-col h-full hover:shadow-2xl transition-all border-b-[12px] border-transparent hover:border-blue-500 group">
              <div className="flex justify-between items-start mb-8">
                <div className="bg-slate-100 text-slate-500 font-black text-[10px] px-4 py-1.5 rounded-full uppercase italic tracking-tighter">Ứng viên #{c.id}</div>
                <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-xl font-black leading-none">{c.voteCounts}</span>
                  <span className="text-[7px] font-bold uppercase mt-1 italic leading-none">Phiếu</span>
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-4 group-hover:text-blue-600 transition-colors truncate italic tracking-tighter uppercase">{c.name}</h3>
              <div className="flex-grow bg-slate-50/80 p-6 rounded-[2.5rem] border border-slate-100 mb-8 italic text-slate-500 text-sm leading-relaxed overflow-hidden shadow-inner">
                <p className="line-clamp-5">"{c.description || 'Hiện chưa có thông tin chi tiết.'}"</p>
              </div>
              <button
                disabled={!votingActive || hasVoted || !account || loading}
                onClick={() => handleAction('vote', c.id)}
                className={`w-full py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${
                  hasVoted || !votingActive || !account ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg shadow-blue-200'
                }`}
              >
                {!account ? 'CHƯA KẾT NỐI' : hasVoted ? 'ĐÃ BỎ PHIẾU' : !votingActive ? 'ĐÃ ĐÓNG' : 'THỰC HIỆN BỎ PHIẾU'}
              </button>
            </div>
          ))}
        </div>

        {candidates.length === 0 && !loading && (
          <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
            <Users size={64} className="mx-auto text-slate-100 mb-6" />
            <h2 className="text-slate-300 font-black text-2xl uppercase tracking-[0.3em] italic">
              {electionId === 0 ? "Hệ thống chưa khởi chạy" : "Danh sách trống dữ liệu"}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;