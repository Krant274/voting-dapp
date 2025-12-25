import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract.js';
import { Vote, Wallet, Users, Trophy, Power, RefreshCw, Loader2, PlusCircle, AlertTriangle, Clock, History } from 'lucide-react';

const SEPOLIA_CHAIN_ID = '0xaa36a7';

function App() {
  const navigate = useNavigate();
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [votingActive, setVotingActive] = useState(false);
  const [isContractActive, setIsContractActive] = useState(false);

  const [electionId, setElectionId] = useState(0);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [votingStartTime, setVotingStartTime] = useState(null);
  const [votingEndTime, setVotingEndTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // 1. Kiểm tra mạng kết nối
  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.pollingInterval = 2000;
      const network = await provider.getNetwork();
      const chainIdHex = '0x' + network.chainId.toString(16);

      const isWrong = chainIdHex !== SEPOLIA_CHAIN_ID;
      setWrongNetwork(isWrong);
      return !isWrong;
    } catch {
      return false;
    }
  }, []);

  // Hàm format thời gian còn lại
  const formatTimeRemaining = useCallback((endTime) => {
    if (!endTime) return '';
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;

    if (remaining <= 0) return 'Hết thời gian';

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, []);

  // Countdown timer - cập nhật thời gian còn lại
  useEffect(() => {
    if (!votingActive || !votingEndTime) return;

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = votingEndTime - now;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setVotingActive(false);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [votingActive, votingEndTime]);

  // 2. Tải dữ liệu từ hệ thống Blockchain
  const loadData = useCallback(async (votingContract, userAddress) => {
    try {
      setRefreshing(true);

      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) {
        const eId = await votingContract.currentElectionId();
        setElectionId(Number(eId));
        return;
      }

      const [active, adminAddr, eId, electionInfo] = await Promise.all([
        votingContract.votingActive(),
        votingContract.admin(),
        votingContract.currentElectionId(),
        votingContract.getElectionInfo() // Lấy thông tin thời gian từ blockchain
      ]);

      const currentID = Number(eId);
      setElectionId(currentID);

      // Lấy thông tin thời gian từ blockchain
      const startTime = Number(electionInfo.startTime);
      const endTime = Number(electionInfo.endTime);
      const timeRemain = Number(electionInfo.timeRemaining);

      setVotingStartTime(startTime);
      setVotingEndTime(endTime);
      setTimeRemaining(timeRemain);

      // Kiểm tra xem đã hết thời gian chưa
      const now = Math.floor(Date.now() / 1000);
      const isTimeEnded = endTime > 0 && now >= endTime;

      // Nếu hết thời gian nhưng voting vẫn active, tự động dừng
      if (isTimeEnded && active) {
        setVotingActive(false);
      } else {
        setVotingActive(active);
      }
      setIsContractActive(active);


      if (userAddress) {
        setIsAdmin(adminAddr.toLowerCase() === userAddress.toLowerCase());
      } else {
        setIsAdmin(false);
      }

      if (currentID > 0) {
        const results = await votingContract.getResults();
        const votedStatus = userAddress ? await votingContract.hasVoted(currentID, userAddress) : false;
        setHasVoted(votedStatus);

        if (results[0].length > 0) {
          setCandidates(results[0].map((id, i) => ({
            id: Number(id),
            name: results[1][i],
            description: results[2][i],
            imageUrl: results[3][i], // URL ảnh từ IPFS
            voteCounts: Number(results[4][i]) // Số phiếu giờ ở index 4
          })));
        } else {
          setCandidates([]);
        }
      }
    } catch (err) {
      console.error("Lỗi truy xuất dữ liệu:", err);
    } finally {
      setRefreshing(false);
    }
  }, [checkNetwork]);

  // 3. Cập nhật dữ liệu thời gian thực 
  useEffect(() => {
    if (contract) {
      const handleUpdate = () => loadData(contract, account);
      contract.on("VoteCasted", handleUpdate);
      contract.on("CandidateRegistered", handleUpdate);
      contract.on("ElectionStarted", handleUpdate);
      contract.on("ElectionStopped", handleUpdate);
      contract.on("ElectionExtended", handleUpdate);
      return () => contract.removeAllListeners();
    }
  }, [contract, account, loadData]);

  // 4. Khởi tạo ứng dụng
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          provider.pollingInterval = 2000;
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
        } catch (err) {
          console.error("Lỗi khởi tạo hệ thống:", err);
        }

        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    };
    init();
  }, [loadData]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Vui lòng cài đặt tiện ích MetaMask để sử dụng hệ thống.");
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.pollingInterval = 2000;
      const isCorrect = await checkNetwork();
      if (!isCorrect) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch {
          alert("vui lòng chuyển đổi mạng sang Sepolia Testnet trên ví điện tử.");
          return;
        }
      }

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const signer = await provider.getSigner();
      const vContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setAccount(accounts[0]);
      setContract(vContract);
      await loadData(vContract, accounts[0]);
    } catch (err) {
      if (err.code === -32002) alert("Yêu cầu kết nối đang chờ xử lý, vui lòng kiểm tra thông báo trên MetaMask.");
    } finally {
      setLoading(false);
    }
  };

  // Hàm khởi tạo cuộc bầu cử với giới hạn thời gian
  const startElectionWithTimer = async () => {
    const durationMinutes = prompt("Nhập thời gian bầu cử (phút):", "60");
    if (!durationMinutes || isNaN(durationMinutes)) return;

    try {
      setLoading(true);
      const durationSeconds = parseInt(durationMinutes) * 60; // Chuyển phút thành giây
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + durationSeconds;

      setVotingStartTime(startTime);
      setVotingEndTime(endTime);
      setTimeRemaining(durationSeconds);

      // Gửi thời gian (tính bằng giây) đến contract
      await contract.startNewElection(durationSeconds);
      await new Promise(r => setTimeout(r, 2000));
      await loadData(contract, account);
    } catch (err) {
      alert("Lỗi khởi tạo cuộc bầu cử: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const extendElection = async () => {
    if (!contract) return;
    const minutes = prompt("Nhập số phút muốn gia hạn thêm:", "15");
    if (!minutes || isNaN(minutes)) return;

    try {
      setLoading(true);
      const seconds = parseInt(minutes) * 60;
      const tx = await contract.extendElection(seconds);
      await tx.wait();
      await loadData(contract, account);
      alert("Đã gia hạn thành công!");
    } catch (err) {
      alert("Lỗi gia hạn: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (method, ...args) => {
    if (!account) return alert("Vui lòng kết nối ví điện tử để thực hiện thao tác này.");
    try {
      setLoading(true);
      const tx = await contract[method](...args);
      await tx.wait();
      setWinner(null);
      await loadData(contract, account);
    } catch (err) {
      alert("Yêu cầu không thể thực hiện: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      {/* Lớp phủ đang xử lý */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white">
          <Loader2 size={64} className="animate-spin mb-4 text-blue-400" />
          <h2 className="text-2xl font-black uppercase tracking-widest italic">Hệ thống đang xử lý dữ liệu...</h2>
          <p className="text-slate-400 mt-2 font-medium italic">Vui lòng không đóng trình duyệt trong khi Blockchain xác thực.</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Tiêu đề chính */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-6 rounded-[2.5rem] shadow-xl border border-white">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg text-white shadow-blue-200"><Vote size={32} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight italic">
                {electionId === 0 ? "HỆ THỐNG BÌNH CHỌN" : `BÌNH CHỌN THỨ ${electionId}`}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${votingActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {electionId === 0 ? "CHƯA MỞ" : votingActive ? 'ĐANG DIỄN RA' : 'ĐÃ KẾT THÚC'}
                </span>
                {votingActive && votingEndTime && (
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                    ⏱️ {formatTimeRemaining(votingEndTime)}
                  </span>
                )}
                {refreshing && <RefreshCw size={14} className="animate-spin text-slate-400" />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {electionId > 0 && (
              <button
                onClick={() => navigate('/history')}
                className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all shadow-md active:scale-95"
              >
                <History size={18} /> LỊCH SỬ
              </button>
            )}

            {!account ? (
              <button onClick={connectWallet} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                <Wallet size={20} /> KẾT NỐI VÍ ĐIỆN TỬ
              </button>
            ) : (
              <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-3">
                <Wallet size={16} className="text-slate-400" />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Địa chỉ ví</p>
                  <p className="font-mono text-xs font-bold text-slate-700">{account.slice(0, 6)}...{account.slice(-4)}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Cảnh báo sai mạng */}
        {wrongNetwork && (
          <div className="mb-8 bg-amber-50 border-l-8 border-amber-500 p-5 rounded-r-3xl flex items-center gap-4 text-amber-800 animate-pulse shadow-sm">
            <AlertTriangle size={32} className="text-amber-500" />
            <p className="text-sm font-bold uppercase tracking-widest">Cảnh báo: Sai mạng kết nối! Vui lòng chuyển sang mạng Sepolia Testnet.</p>
          </div>
        )}

        {/* Trung tâm quản trị (Chỉ dành cho Admin) */}
        {isAdmin && account && (
          <div className="bg-slate-900 text-white p-7 rounded-[2.5rem] mb-10 shadow-2xl flex flex-wrap gap-6 items-center justify-between border-b-8 border-blue-600">
            <h2 className="font-black text-xl uppercase tracking-tighter italic flex items-center gap-2"><Power size={20} className="text-blue-400" /> Admin Dashboard</h2>
            <div className="flex gap-3">
              {isContractActive && (
                <button onClick={extendElection} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg active:scale-95"><Clock size={18} /> GIA HẠN</button>
              )}

              {isContractActive ? (
                <button onClick={() => handleAction('stopVoting')} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg active:scale-95"><Power size={18} /> {votingActive ? "KẾT THÚC BÌNH CHỌN" : "XÁC NHẬN KẾT THÚC (Blockchain)"}</button>
              ) : (
                <button onClick={() => navigate('/create-election')} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-lg active:scale-95"><PlusCircle size={18} /> {electionId === 0 ? "TẠO CUỘC BẦU CỬ ĐẦU TIÊN" : "TẠO CUỘC BẦU CỬ MỚI"}</button>
              )}
            </div>
          </div>
        )}

        {/* Hiển thị kết quả*/}
        {!isContractActive && candidates.length > 0 && electionId > 0 && (
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {!winner ? (
              <button onClick={async () => {
                const res = await contract.getWinner();
                setWinner({ names: res[0], votes: Number(res[1]) });
              }} className="bg-white border-2 border-amber-500 text-amber-600 px-10 py-5 rounded-[2rem] font-black shadow-xl hover:bg-amber-500 hover:text-white transition-all flex items-center gap-3 mx-auto uppercase tracking-widest"><Trophy size={24} /> CÔNG BỐ KẾT QUẢ CHUNG CUỘC</button>
            ) : winner.votes > 0 ? (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border-4 border-white">
                <Trophy size={150} className="absolute -right-10 -bottom-10 opacity-20 rotate-12" />
                <p className="text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-80">{winner.names.length > 1 ? 'KẾT QUẢ: ĐỒNG CHIẾN THẮNG' : 'KẾT QUẢ: NGƯỜI CHIẾN THẮNG'}</p>
                <div className="flex flex-wrap justify-center gap-4 mb-4">
                  {winner.names.map((name, idx) => (
                    <h2 key={idx} className="text-5xl font-black drop-shadow-2xl italic">{name}{idx < winner.names.length - 1 ? ' & ' : ''}</h2>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 bg-black/20 px-8 py-3 rounded-full font-black text-2xl border border-white/20">
                  <Trophy size={24} className="text-amber-200" /> {winner.votes} PHIẾU BẦU{winner.names.length > 1 ? ' (HÒA)' : ''}
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 p-10 rounded-[3rem] border-4 border-dashed border-slate-300 text-center">
                <Users size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-xl font-black text-slate-400 uppercase">CHƯA CÓ PHIẾU BẦU NÀO</p>
                <p className="text-sm text-slate-500 mt-2">Cuộc bầu cử đã kết thúc nhưng không có ai bỏ phiếu</p>
              </div>
            )}
          </div>
        )}

        {/* Danh sách ứng viên */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {candidates.map((c) => (
            <div key={c.id} className="bg-white rounded-[3.5rem] p-8 border border-slate-100 shadow-xl flex flex-col h-full hover:shadow-2xl transition-all border-b-[12px] border-transparent hover:border-blue-500 group">
              <div className="flex justify-between items-start mb-8">
                <div className="bg-slate-100 text-slate-500 font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest italic">Mã số ứng viên #{c.id}</div>
                <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-xl font-black leading-none">{c.voteCounts}</span>
                  <span className="text-[7px] font-bold uppercase mt-1 italic">Phiếu</span>
                </div>
              </div>

              {/* Hình ảnh ứng viên */}
              <div className="mb-6 rounded-3xl overflow-hidden bg-slate-100 aspect-square">
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="80" fill="%2394a3b8"%3E' + c.name.charAt(0) + '%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-slate-100">
                    <span className="text-8xl font-black text-blue-300">{c.name.charAt(0)}</span>
                  </div>
                )}
              </div>

              <h3 className="text-3xl font-black text-slate-800 mb-4 group-hover:text-blue-600 transition-colors truncate italic tracking-tighter">{c.name}</h3>
              <div className="flex-grow bg-slate-50/80 p-6 rounded-[2.5rem] border border-slate-100 mb-8 italic text-slate-500 text-sm leading-relaxed overflow-hidden shadow-inner">
                <p className="line-clamp-5">"{c.description || 'Hiện chưa có thông tin mô tả chi tiết từ ứng viên này.'}"</p>
              </div>
              <button
                disabled={!votingActive || hasVoted || !account || loading}
                onClick={() => handleAction('vote', c.id)}
                className={`w-full py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${hasVoted || !votingActive || !account ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg shadow-blue-200'
                  }`}
              >
                {!account ? 'CHƯA KẾT NỐI' : hasVoted ? 'ĐÃ BỎ PHIẾU' : !votingActive ? 'BÌNH CHỌN ĐÃ KẾT THÚC' : 'THỰC HIỆN BỎ PHIẾU'}
              </button>
            </div>
          ))}
        </div>

        {/* Thông báo danh sách trống */}
        {candidates.length === 0 && !loading && (
          <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
            <Users size={64} className="mx-auto text-slate-100 mb-6" />
            <h2 className="text-slate-300 font-black text-2xl uppercase tracking-[0.3em]">
              {electionId === 0 ? "Hệ thống chưa được khởi tạo" : "Hiện chưa có danh sách ứng viên"}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;