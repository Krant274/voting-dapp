import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, Clock, Users, Plus, Trash2, PlayCircle } from 'lucide-react';

const IMGBB_API_KEY = 'b53d2042bd1f452ccdacd93a16fa4c4a';

function CreateElection({ contract, account, isAdmin }) {
    const navigate = useNavigate();

    // Thông tin cuộc bầu cử
    const [electionName, setElectionName] = useState('');
    const [electionDescription, setElectionDescription] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');

    // Danh sách ứng viên
    const [candidates, setCandidates] = useState([]);
    const [currentCandidate, setCurrentCandidate] = useState({
        name: '',
        description: '',
        imageUrl: '',
        imageFile: null,
        imagePreview: ''
    });

    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [step, setStep] = useState(1); // 1: Thông tin bầu cử, 2: Thêm ứng viên, 3: Xác nhận

    // Upload ảnh lên ImgBB
    const uploadToImgBB = async (file) => {
        if (!file) return '';

        try {
            setUploadProgress('Đang upload ảnh...');
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                { method: 'POST', body: formData }
            );

            const data = await response.json();
            if (data.success) {
                setUploadProgress('Upload thành công!');
                return data.data.url;
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            return '';
        }
    };

    // Xử lý chọn ảnh
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 32 * 1024 * 1024) {
                alert('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 32MB.');
                return;
            }
            setCurrentCandidate({
                ...currentCandidate,
                imageFile: file,
                imagePreview: URL.createObjectURL(file)
            });
        }
    };

    // Thêm ứng viên vào danh sách
    const addCandidate = () => {
        if (!currentCandidate.name) {
            alert('Vui lòng nhập tên ứng viên!');
            return;
        }

        setCandidates([...candidates, { ...currentCandidate }]);
        setCurrentCandidate({
            name: '',
            description: '',
            imageUrl: '',
            imageFile: null,
            imagePreview: ''
        });
    };

    // Xóa ứng viên
    const removeCandidate = (index) => {
        setCandidates(candidates.filter((_, i) => i !== index));
    };

    // Tính toán thời gian
    const calculateDuration = () => {
        if (!startDateTime || !endDateTime) return 0;
        const start = new Date(startDateTime).getTime();
        const end = new Date(endDateTime).getTime();
        return Math.floor((end - start) / 1000); // Giây
    };

    // Submit cuộc bầu cử
    const handleSubmit = async () => {
        if (!isAdmin) {
            alert('Chỉ Admin mới có quyền tạo cuộc bầu cử!');
            return;
        }

        if (!electionName || !startDateTime || !endDateTime) {
            alert('Vui lòng điền đầy đủ thông tin bầu cử!');
            return;
        }

        if (candidates.length === 0) {
            alert('Vui lòng thêm ít nhất 1 ứng viên!');
            return;
        }

        const duration = calculateDuration();
        if (duration <= 0) {
            alert('Thời gian kết thúc phải sau thời gian bắt đầu!');
            return;
        }

        try {
            setLoading(true);
            setUploadProgress('Đang khởi tạo cuộc bầu cử...');

            // Bước 1: Tạo cuộc bầu cử mới
            const tx = await contract.startNewElection(duration);
            await tx.wait();

            setUploadProgress('Đang upload ảnh và đăng ký ứng viên...');

            // Bước 2: Đăng ký từng ứng viên
            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];

                // Upload ảnh nếu có
                let imageUrl = candidate.imageUrl;
                if (candidate.imageFile && IMGBB_API_KEY !== 'bạn_lấy_key_miễn_phí_tại_imgbb.com') {
                    imageUrl = await uploadToImgBB(candidate.imageFile);
                }

                setUploadProgress(`Đang đăng ký ứng viên ${i + 1}/${candidates.length}...`);

                const candidateTx = await contract.registerCandidate(
                    candidate.name,
                    candidate.description || '',
                    imageUrl || ''
                );
                await candidateTx.wait();
            }

            alert(`✅ Tạo cuộc bầu cử "${electionName}" thành công với ${candidates.length} ứng viên!`);
            navigate('/');

        } catch (error) {
            alert('❌ Lỗi: ' + (error.message || error.reason || error));
        } finally {
            setLoading(false);
            setUploadProgress('');
        }
    };

    if (!account) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-black text-slate-800 mb-4">Vui lòng kết nối ví</h2>
                    <button onClick={() => navigate('/')} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold">
                        Quay lại trang chủ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold">
                    <ArrowLeft size={20} /> Quay lại
                </button>

                <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100">
                    <h1 className="text-3xl font-black text-slate-800 mb-2 text-center">
                        TẠO CUỘC BẦU CỬ MỚI
                    </h1>
                    <p className="text-center text-slate-500 mb-8">
                        Thiết lập thông tin bầu cử và đăng ký ứng viên
                    </p>

                    {/* Progress Steps */}
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                1
                            </div>
                            <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                2
                            </div>
                            <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                3
                            </div>
                        </div>
                    </div>

                    {/* BƯỚC 1: Thông tin bầu cử */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black text-slate-800 mb-4">📋 Thông tin cuộc bầu cử</h2>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tên cuộc bầu cử *</label>
                                <input
                                    type="text"
                                    value={electionName}
                                    onChange={(e) => setElectionName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium"
                                    placeholder="VD: Bầu chọn lớp trưởng lớp 12A1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả</label>
                                <textarea
                                    value={electionDescription}
                                    onChange={(e) => setElectionDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium resize-none"
                                    placeholder="Mô tả ngắn về cuộc bầu cử này..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Calendar size={16} />
                                        Thời gian bắt đầu *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={startDateTime}
                                        onChange={(e) => setStartDateTime(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Clock size={16} />
                                        Thời gian kết thúc *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={endDateTime}
                                        onChange={(e) => setEndDateTime(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            {startDateTime && endDateTime && (
                                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                                    <p className="text-sm font-bold text-blue-800">
                                        ⏱️ Thời lượng: {Math.floor(calculateDuration() / 60)} phút ({Math.floor(calculateDuration() / 3600)} giờ {Math.floor((calculateDuration() % 3600) / 60)} phút)
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => setStep(2)}
                                disabled={!electionName || !startDateTime || !endDateTime || calculateDuration() <= 0}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                TIẾP TỤC →
                            </button>
                        </div>
                    )}

                    {/* BƯỚC 2: Thêm ứng viên */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <Users size={24} />
                                    Danh sách ứng viên ({candidates.length})
                                </h2>
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-sm text-slate-600 hover:text-slate-900 font-bold"
                                >
                                    ← Quay lại
                                </button>
                            </div>

                            {/* Form thêm ứng viên */}
                            <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border-2 border-dashed border-slate-300">
                                <h3 className="font-black text-slate-700">Thêm ứng viên mới:</h3>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Tên ứng viên *</label>
                                    <input
                                        type="text"
                                        value={currentCandidate.name}
                                        onChange={(e) => setCurrentCandidate({ ...currentCandidate, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium"
                                        placeholder="Nhập tên ứng viên"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả / Slogan</label>
                                    <textarea
                                        value={currentCandidate.description}
                                        onChange={(e) => setCurrentCandidate({ ...currentCandidate, description: e.target.value })}
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium resize-none"
                                        placeholder="Mô tả ngắn về ứng viên..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Hình ảnh</label>
                                    {currentCandidate.imagePreview ? (
                                        <div className="flex items-center gap-4">
                                            <img src={currentCandidate.imagePreview} alt="Preview" className="w-24 h-24 rounded-2xl object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setCurrentCandidate({ ...currentCandidate, imageFile: null, imagePreview: '' })}
                                                className="text-sm text-red-600 font-bold hover:underline"
                                            >
                                                Xóa ảnh
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-blue-500 transition-all">
                                            <Plus size={32} className="mx-auto text-slate-400 mb-2" />
                                            <p className="text-sm text-slate-600 font-medium">Click để chọn ảnh</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>

                                <button
                                    onClick={addCandidate}
                                    className="w-full bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} />
                                    THÊM ỨNG VIÊN VÀO DANH SÁCH
                                </button>
                            </div>

                            {/* Danh sách ứng viên đã thêm */}
                            {candidates.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-black text-slate-700">Đã thêm:</h3>
                                    {candidates.map((candidate, index) => (
                                        <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-2xl border-2 border-slate-200">
                                            {candidate.imagePreview && (
                                                <img src={candidate.imagePreview} alt={candidate.name} className="w-16 h-16 rounded-xl object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-black text-slate-800">{candidate.name}</p>
                                                <p className="text-sm text-slate-500">{candidate.description || 'Không có mô tả'}</p>
                                            </div>
                                            <button
                                                onClick={() => removeCandidate(index)}
                                                className="text-red-600 hover:bg-red-50 p-2 rounded-xl"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setStep(3)}
                                disabled={candidates.length === 0}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                XEM XÉT VÀ XÁC NHẬN →
                            </button>
                        </div>
                    )}

                    {/* BƯỚC 3: Xác nhận */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-slate-800">✅ Xác nhận thông tin</h2>
                                <button
                                    onClick={() => setStep(2)}
                                    className="text-sm text-slate-600 hover:text-slate-900 font-bold"
                                >
                                    ← Quay lại
                                </button>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border-2 border-blue-200 space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Tên cuộc bầu cử</p>
                                    <p className="text-lg font-black text-slate-800">{electionName}</p>
                                </div>
                                {electionDescription && (
                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Mô tả</p>
                                        <p className="text-sm text-slate-600">{electionDescription}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Bắt đầu</p>
                                        <p className="text-sm font-bold text-slate-800">{new Date(startDateTime).toLocaleString('vi-VN')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Kết thúc</p>
                                        <p className="text-sm font-bold text-slate-800">{new Date(endDateTime).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Số lượng ứng viên</p>
                                    <p className="text-2xl font-black text-blue-600">{candidates.length} ứng viên</p>
                                </div>
                            </div>

                            {uploadProgress && (
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl animate-pulse">
                                    <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        {uploadProgress}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:from-green-700 hover:to-blue-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin" />
                                        ĐANG XỬ LÝ...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle size={24} />
                                        KHỞI TẠO CUỘC BẦU CỬ
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CreateElection;
