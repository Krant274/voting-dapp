import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract.js';
import App from './App';
import RegisterCandidate from './RegisterCandidate';
import ElectionHistory from './ElectionHistory';
import CreateElection from './CreateElection';

const SEPOLIA_CHAIN_ID = '0xaa36a7';

function AppWrapper() {
    const [account, setAccount] = useState('');
    const [contract, setContract] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const checkNetwork = useCallback(async () => {
        if (!window.ethereum) return false;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
            const chainIdHex = '0x' + network.chainId.toString(16);
            return chainIdHex === SEPOLIA_CHAIN_ID;
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

                    if (accounts.length > 0) {
                        const signer = await provider.getSigner();
                        const vContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                        setAccount(accounts[0]);
                        setContract(vContract);

                        const adminAddr = await vContract.admin();
                        setIsAdmin(adminAddr.toLowerCase() === accounts[0].toLowerCase());
                    } else {
                        const vContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
                        setContract(vContract);
                    }
                } catch (err) {
                    console.error("Lỗi khởi tạo hệ thống:", err);
                }

                window.ethereum.on('chainChanged', () => window.location.reload());
                window.ethereum.on('accountsChanged', () => window.location.reload());
            }
        };
        init();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<App />} />
                <Route
                    path="/register-candidate"
                    element={<RegisterCandidate contract={contract} account={account} isAdmin={isAdmin} />}
                />
                <Route
                    path="/history"
                    element={<ElectionHistory contract={contract} />}
                />
                <Route
                    path="/create-election"
                    element={<CreateElection contract={contract} account={account} isAdmin={isAdmin} />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default AppWrapper;
