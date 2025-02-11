import React, { useState, useEffect } from "react";
import Web3 from "web3";
import { useParams } from "react-router-dom";
import NavBar_Logout from "./NavBar_Logout";
import PatientRegistration from "../build/contracts/PatientRegistration.json";
import { create } from "ipfs-http-client";

// Connect to IPFS (use Infura or localhost)
const ipfs = create({ host: "localhost", port: 5001, protocol: "http" });

const UploadDocument = () => {
  const { hhNumber } = useParams();
  const [file, setFile] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileHash, setFileHash] = useState(null);

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        const accounts = await web3Instance.eth.requestAccounts();
        setAccount(accounts[0]);

        const networkId = await web3Instance.eth.net.getId();
        const deployedNetwork = PatientRegistration.networks[networkId];

        if (!deployedNetwork) {
          alert("Contract not deployed on this network");
          return;
        }

        const contractInstance = new web3Instance.eth.Contract(
          PatientRegistration.abi,
          deployedNetwork.address
        );
        setContract(contractInstance);
      } else {
        alert("Please install MetaMask!");
      }
    };
    initWeb3();
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const uploadDocument = async () => {
    if (!file || !contract || !account) {
      alert("Please select a file and connect to MetaMask");
      return;
    }

    setUploading(true);

    try {
      // Convert file to buffer
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onloadend = async () => {
        const buffer = new Uint8Array(reader.result);
        
        // Upload to IPFS
        const added = await ipfs.add(buffer);
        if (!added || !added.path) {
          throw new Error("IPFS upload failed. No path returned.");
        }
      
        const fileHash = added.path;
        setFileHash(fileHash);
        console.log("Uploaded to IPFS:", fileHash);
      
        // Store fileHash in smart contract
        await contract.methods.storePatientDocument(hhNumber, fileHash).send({ from: account });
      
        alert("Document uploaded successfully!");
      };
      
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Upload failed");
    }

    setUploading(false);
  };

  return (
    <div>
      <NavBar_Logout />
      <div className="bg-gradient-to-b from-black to-gray-800 text-white p-10 font-mono h-screen flex flex-col justify-center items-center">
        <h2 className="text-3xl font-bold mb-6 text-center">Upload Document</h2>
        <input type="file" onChange={handleFileChange} className="mb-4" />
        <button
          onClick={uploadDocument}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
        {fileHash && (
          <p className="mt-4 text-green-400">
            Upload Successful!{" "}
            <a
              href={`https://ipfs.io/ipfs/${fileHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              View Document
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default UploadDocument;
