# Hướng dẫn hoàn thiện tính năng Upload ảnh ứng viên

## ✅ Đã hoàn thành
1. Tạo component RegisterCandidate.js với form upload ảnh
2. Thiết lập routing giữa trang chủ và trang đăng ký
3. Tích hợp IPFS để lưu trữ ảnh
4. Cập nhật giao diện hiển thị ảnh ứng viên trên trang chủ

## 📋 Các bước bạn cần thực hiện

### BƯỚC 1: Cài đặt thư viện (BẮT BUỘC)
Mở terminal trong thư mục dự án và chạy:
```bash
npm install react-router-dom ipfs-http-client
```

### BƯỚC 2: Sửa Smart Contract Solidity (BẮT BUỘC)

#### 2.1. Sửa struct Candidate
Thêm trường `imageUrl` vào struct:
```solidity
struct Candidate {
    uint id;
    string name;
    string description;
    string imageUrl;  // <--- THÊM DÒNG NÀY
    uint voteCount;
}
```

#### 2.2. Sửa hàm registerCandidate
Thêm tham số `_imageUrl`:
```solidity
function registerCandidate(string memory _name, string memory _description, string memory _imageUrl) public onlyAdmin {
    require(votingActive, "Khong the them ung vien khi bau cu da ket thuc");
    require(block.timestamp < electionEndTime, "Thoi gian bau cu da het");
    
    uint cCount = candidatesCount[currentElectionId];
    cCount++;
    candidates[currentElectionId][cCount] = Candidate(cCount, _name, _description, _imageUrl, 0);
    candidatesCount[currentElectionId] = cCount;
    emit CandidateRegistered(currentElectionId, _name);
}
```

#### 2.3. Sửa hàm getResults
Cập nhật để trả về thêm mảng imageUrl:
```solidity
function getResults() public view returns (
    uint[] memory, 
    string[] memory, 
    string[] memory, 
    string[] memory,  // <--- THÊM DÒNG NÀY (imageUrls)
    uint[] memory
) {
    uint cCount = candidatesCount[currentElectionId];
    uint[] memory ids = new uint[](cCount);
    string[] memory names = new string[](cCount);
    string[] memory descs = new string[](cCount);
    string[] memory imageUrls = new string[](cCount); // <--- THÊM DÒNG NÀY
    uint[] memory votes = new uint[](cCount);

    for (uint i = 1; i <= cCount; i++) {
        Candidate storage c = candidates[currentElectionId][i];
        ids[i-1] = c.id;
        names[i-1] = c.name;
        descs[i-1] = c.description;
        imageUrls[i-1] = c.imageUrl; // <--- THÊM DÒNG NÀY
        votes[i-1] = c.voteCount;
    }
    return (ids, names, descs, imageUrls, votes); // <--- SỬA DÒNG NÀY
}
```

### BƯỚC 3: Deploy lại Smart Contract (BẮT BUỘC)
1. Deploy Smart Contract mới lên mạng Sepolia
2. Sao chép địa chỉ contract mới
3. Cập nhật địa chỉ trong file `src/contract.js`:
   ```javascript
   export const CONTRACT_ADDRESS = "0x...ĐỊA_CHỈ_MỚI...";
   ```
4. Cập nhật ABI mới (copy từ Remix sau khi compile)

### BƯỚC 4: Kiểm tra lại code React (Đã tự động cập nhật)
✅ File `src/RegisterCandidate.js` - Component form đăng ký
✅ File `src/AppWrapper.js` - Quản lý routing và state
✅ File `src/index.js` - Entry point với routing
✅ File `src/App.js` - Hiển thị ảnh trong card ứng viên

### BƯỚC 5: Chạy thử nghiệm
```bash
npm start
```

Sau khi chạy, thử:
1. Truy cập http://localhost:3000
2. Kết nối ví MetaMask
3. Click nút "BỔ SUNG ỨNG VIÊN" (nếu bạn là Admin)
4. Sẽ chuyển sang http://localhost:3000/register-candidate
5. Điền thông tin + upload ảnh → Submit

## 🎨 Tính năng của hệ thống mới

### Upload ảnh
- Tự động upload lên IPFS (lưu trữ phi tập trung)
- Preview ảnh trước khi gửi
- Fallback: Nếu không có ảnh, hiển thị chữ cái đầu tên ứng viên

### Hiển thị
- Ảnh ứng viên hiển thị ở dạng vuông (aspect-square)
- Nếu link ảnh lỗi, tự động chuyển sang placeholder SVG
- Gradient background đẹp mắt khi không có ảnh

## ⚠️ Lưu ý quan trọng

### Về IPFS
- Code sử dụng gateway miễn phí của Infura
- Nếu Infura ngừng dịch vụ, bạn có thể thay thế bằng:
  - Pinata: https://pinata.cloud
  - NFT.Storage: https://nft.storage
  - Web3.Storage: https://web3.storage

### Về Smart Contract
- **Phải deploy lại** contract mới vì đã thay đổi cấu trúc dữ liệu
- Dữ liệu cũ sẽ không tương thích với contract mới
- Nên test trên Remix trước khi deploy lên Sepolia

## 🔧 Troubleshooting

### Lỗi "Cannot find module 'react-router-dom'"
➜ Chạy: `npm install react-router-dom`

### Lỗi "Cannot find module 'ipfs-http-client'"
➜ Chạy: `npm install ipfs-http-client`

### Lỗi khi gọi registerCandidate
➜ Kiểm tra xem contract đã update chưa và ABI đã đúng chưa

### Ảnh không hiển thị
➜ Kiểm tra console browser xem có lỗi CORS hay network không
➜ Thử truy cập trực tiếp URL ảnh trên IPFS gateway

## 📝 Checklist cuối cùng
- [ ] Đã chạy `npm install react-router-dom ipfs-http-client`
- [ ] Đã sửa Smart Contract (struct Candidate)
- [ ] Đã sửa hàm registerCandidate nhận _imageUrl
- [ ] Đã sửa hàm getResults trả về imageUrls
- [ ] Đã deploy contract mới lên Sepolia
- [ ] Đã cập nhật CONTRACT_ADDRESS trong contract.js
- [ ] Đã cập nhật ABI trong contract.js
- [ ] Chạy `npm start` và test thử

---
**Nếu gặp lỗi gì, hãy cho tôi biết để tôi hỗ trợ bạn!**
