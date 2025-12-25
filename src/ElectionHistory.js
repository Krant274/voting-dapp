import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Trophy, Calendar, Users, Loader2 } from 'lucide-react';

function ElectionHistory({ contract }) {
    const navigate = useNavigate();
    const [currentElectionId, setCurrentElectionId] = useState(0);
    const [selectedElectionId, setSelectedElectionId] = useState(0);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [electionInfo, setElectionInfo] = useState(null);

    // Load số lượng cuộc bầu cử hiện tại
    useEffect(() => {
        const loadCurrentElectionId = async () => {
            if (!contract) return;
            try {
                const eId = await contract.currentElectionId();
                const id = Number(eId);
                setCurrentElectionId(id);
                if (id > 0) {
                    setSelectedElectionId(id); // Mặc định chọn cuộc bầu cử mới nhất
                }
            } catch (error) {
                console.error('Error loading election ID:', error);
            }
        };
        loadCurrentElectionId();
    }, [contract]);

    // Load dữ liệu khi chọn cuộc bầu cử
    useEffect(() => {
        const loadElectionData = async () => {
            if (!contract || selectedElectionId === 0) return;

            try {
                setLoading(true);

                // Lấy số lượng ứng viên của cuộc bầu cử này
                const count = await contract.candidatesCount(selectedElectionId);
                const candidateCount = Number(count);

                if (candidateCount === 0) {
                    setCandidates([]);
                    setElectionInfo(null);
                    return;
                }

                // Load từng ứng viên
                const candidatePromises = [];
                for (let i = 1; i <= candidateCount; i++) {
                    candidatePromises.push(contract.candidates(selectedElectionId, i));
                }

                const candidatesData = await Promise.all(candidatePromises);

                const formattedCandidates = candidatesData.map(c => ({
                    id: Number(c.id),
                    name: c.name,
                    description: c.description,
                    imageUrl: c.imageUrl,
                    voteCounts: Number(c.voteCount)
                }));

                // Sắp xếp theo số phiếu giảm dần
                formattedCandidates.sort((a, b) => b.voteCounts - a.voteCounts);

                setCandidates(formattedCandidates);

                // Tính toán thông tin cuộc bầu cử
                const totalVotes = formattedCandidates.reduce((sum, c) => sum + c.voteCounts, 0);

                // Tìm TẤT CẢ người có số phiếu cao nhất
                const maxVotes = formattedCandidates[0].voteCounts;
                const winners = formattedCandidates.filter(c => c.voteCounts === maxVotes && maxVotes > 0);

                setElectionInfo({
                    totalVotes,
                    winners: winners.length > 0 ? winners : [],
                    maxVotes: maxVotes,
                    totalCandidates: candidateCount
                });

            } catch (error) {
                console.error('Error loading election data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadElectionData();
    }, [contract, selectedElectionId]);

    if (!contract) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-black text-slate-800 mb-4">Đang kết nối...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold">
                    <ArrowLeft size={20} /> Quay lại trang chủ
                </button>

                <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg text-white">
                            <History size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800">LỊCH SỬ BẦU CỬ</h1>
                            <p className="text-slate-500 text-sm">Xem lại kết quả các cuộc bầu cử trước đó</p>
                        </div>
                    </div>

                    {currentElectionId === 0 ? (
                        <div className="text-center py-12">
                            <Users size={64} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold">Chưa có cuộc bầu cử nào được tổ chức</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Selector cuộc bầu cử */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Chọn cuộc bầu cử để xem:</label>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: currentElectionId }, (_, i) => i + 1).map(id => (
                                        <button
                                            key={id}
                                            onClick={() => setSelectedElectionId(id)}
                                            className={`px-6 py-3 rounded-2xl font-bold transition-all ${selectedElectionId === id
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            <Calendar size={16} className="inline mr-2" />
                                            Lần {id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Thông tin tổng quan */}
                            {electionInfo && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-2 border-blue-200">
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-2">Tổng số ứng viên</p>
                                        <p className="text-3xl font-black text-blue-900">{electionInfo.totalCandidates}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border-2 border-green-200">
                                        <p className="text-xs font-bold text-green-600 uppercase mb-2">Tổng số phiếu</p>
                                        <p className="text-3xl font-black text-green-900">{electionInfo.totalVotes}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border-2 border-amber-200">
                                        <p className="text-xs font-bold text-amber-600 uppercase mb-2">
                                            {electionInfo.winners && electionInfo.winners.length > 1 ? 'Người chiến thắng (HÒA)' : 'Người chiến thắng'}
                                        </p>
                                        {electionInfo.winners && electionInfo.winners.length > 0 ? (
                                            <div>
                                                {electionInfo.winners.map((w, idx) => (
                                                    <p key={idx} className="text-lg font-black text-amber-900">
                                                        {w.name}{idx < electionInfo.winners.length - 1 ? ' & ' : ''}
                                                    </p>
                                                ))}
                                                <p className="text-sm text-amber-700 mt-1">
                                                    ({electionInfo.maxVotes} phiếu)
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-lg font-black text-amber-900">Chưa có</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="text-center py-12">
                        <Loader2 size={48} className="animate-spin mx-auto text-blue-600 mb-4" />
                        <p className="text-slate-600 font-bold">Đang tải dữ liệu...</p>
                    </div>
                )}

                {/* Danh sách ứng viên */}
                {!loading && candidates.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Trophy size={24} className="text-amber-500" />
                            KẾT QUẢ CUỘC BẦU CỬ #{selectedElectionId}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {candidates.map((c, index) => {
                                const isWinner = electionInfo && electionInfo.winners &&
                                    electionInfo.winners.some(w => w.id === c.id) &&
                                    c.voteCounts > 0;

                                return (
                                    <div
                                        key={c.id}
                                        className={`bg-white rounded-[3rem] p-6 shadow-xl border-4 transition-all ${isWinner
                                            ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-white'
                                            : 'border-slate-100'
                                            }`}
                                    >
                                        {/* Badge hạng */}
                                        {isWinner && (
                                            <div className="flex justify-center mb-4">
                                                <div className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-4 py-2 rounded-full font-black text-sm flex items-center gap-2 shadow-lg">
                                                    <Trophy size={16} />
                                                    {electionInfo.winners.length > 1 ? 'ĐỒNG HẠNG NHẤT' : 'QUÁN QUÂN'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Hình ảnh */}
                                        <div className="mb-4 rounded-2xl overflow-hidden bg-slate-100 aspect-square">
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

                                        {/* Tên */}
                                        <h3 className="text-2xl font-black text-slate-800 mb-2 text-center">{c.name}</h3>

                                        {/* Số phiếu */}
                                        <div className="bg-blue-600 text-white text-center py-3 rounded-2xl mb-3">
                                            <p className="text-3xl font-black">{c.voteCounts}</p>
                                            <p className="text-xs font-bold uppercase">Phiếu bầu</p>
                                        </div>

                                        {/* Mô tả */}
                                        <div className="bg-slate-50 p-4 rounded-2xl">
                                            <p className="text-sm text-slate-600 italic line-clamp-3">
                                                "{c.description || 'Không có mô tả'}"
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!loading && candidates.length === 0 && selectedElectionId > 0 && (
                    <div className="text-center py-12 bg-white rounded-3xl">
                        <Users size={64} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">Cuộc bầu cử này chưa có ứng viên</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ElectionHistory;
