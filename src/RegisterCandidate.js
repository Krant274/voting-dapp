import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Loader2 } from 'lucide-react';

// ImgBB API Key miễn phí - Thay bằng key của bạn tại: https://api.imgbb.com/
// Hoặc dùng key demo này (giới hạn 5000 ảnh/ngày, dùng chung)
const IMGBB_API_KEY = 'Tu dien key vào nhé:)))';

function RegisterCandidate({ contract, account, isAdmin }) {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Kiểm tra kích thước file (max 32MB cho ImgBB free)
            if (file.size > 32 * 1024 * 1024) {
                alert('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 32MB.');
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadToImgBB = async (file) => {
        try {
            setUploadProgress('Đang upload ảnh...');

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const data = await response.json();

            if (data.success) {
                setUploadProgress('Upload thành công!');
                return data.data.url; // URL công khai của ảnh
            } else {
                throw new Error(data.error.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Không thể upload ảnh. Vui lòng thử lại.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAdmin) {
            alert('Chỉ Admin mới có quyền đăng ký ứng viên!');
            return;
        }

        if (!name || !description) {
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        // Kiểm tra API key
        if (IMGBB_API_KEY === 'bạn_lấy_key_miễn_phí_tại_imgbb.com') {
            const userChoice = window.confirm(
                '⚠️ Bạn chưa cấu hình ImgBB API key!\n\n' +
                'Bấm OK để xem hướng dẫn lấy API key miễn phí (30 giây).\n' +
                'Hoặc bấm Cancel để tiếp tục không có ảnh.'
            );

            if (userChoice) {
                window.open('https://api.imgbb.com/', '_blank');
                return;
            } else {
                // Tiếp tục mà không có ảnh
                setImageFile(null);
            }
        }

        try {
            setLoading(true);

            let imageUrl = '';
            if (imageFile && IMGBB_API_KEY !== 'bạn_lấy_key_miễn_phí_tại_imgbb.com') {
                imageUrl = await uploadToImgBB(imageFile);
            }

            setUploadProgress('Đang ghi lên Blockchain...');
            const tx = await contract.registerCandidate(name, description, imageUrl);
            await tx.wait();

            alert('✅ Đăng ký ứng viên thành công!');
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
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold">
                    <ArrowLeft size={20} /> Quay lại
                </button>

                <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100">
                    <h1 className="text-3xl font-black text-slate-800 mb-8 text-center">
                        ĐĂNG KÝ ỨNG VIÊN MỚI
                    </h1>

                    {/* Hướng dẫn lấy API key */}
                    {IMGBB_API_KEY === 'bạn_lấy_key_miễn_phí_tại_imgbb.com' && (
                        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl">
                            <p className="text-sm font-bold text-amber-800 mb-2">📌 Hướng dẫn cấu hình upload ảnh (1 lần duy nhất):</p>
                            <ol className="text-sm text-amber-700 space-y-1 ml-4 list-decimal">
                                <li>Truy cập: <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold">api.imgbb.com</a></li>
                                <li>Nhấn "Get API Key" → Đăng ký email (miễn phí vĩnh viễn)</li>
                                <li>Copy API key và paste vào file <code className="bg-amber-200 px-1 rounded">RegisterCandidate.js</code> dòng 7</li>
                            </ol>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tên ứng viên</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium"
                                placeholder="Nhập tên ứng viên"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả / Thông điệp</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-medium resize-none"
                                placeholder="Nhập mô tả về ứng viên"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Hình ảnh ứng viên {!imageFile && <span className="text-slate-400">(không bắt buộc)</span>}
                            </label>
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center">
                                {imagePreview ? (
                                    <div className="space-y-4">
                                        <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-2xl shadow-lg" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImageFile(null);
                                                setImagePreview('');
                                            }}
                                            className="text-sm text-red-600 font-bold hover:underline"
                                        >
                                            ❌ Xóa ảnh
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block">
                                        <Upload size={48} className="mx-auto text-slate-400 mb-2" />
                                        <p className="text-slate-600 font-medium">Click để chọn ảnh</p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {IMGBB_API_KEY === 'bạn_lấy_key_miễn_phí_tại_imgbb.com'
                                                ? '⚠️ Cần cấu hình API key (xem hướng dẫn phía trên)'
                                                : '✅ Upload miễn phí lên ImgBB'}
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
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
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    ĐANG XỬ LÝ...
                                </>
                            ) : (
                                'ĐĂNG KÝ ỨNG VIÊN'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RegisterCandidate;
