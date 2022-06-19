import Storage from "../abis/Storage.json";
import React, { Component } from "react";
import Navbar from "./Navbar";
import Main from "./Main";
import Web3 from "web3";
import "./App.css";

// Declaration of IPFS
const ipfsClient = require("ipfs-http-client");
const ipfs = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

class App extends Component {
  async componentWillMount() {
    await this.loadWeb3();
    await this.loadBlockchainData();
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      window.alert(
        "Non-Ethereum browser detected. You should consider trying MetaMask!"
      );
    }
  }

  async loadBlockchainData() {
    //Declare Web3
    const web3 = window.web3;
    //Load account
    const accounts = await web3.eth.getAccounts();
    console.log(accounts);
    // adding the first account to state
    this.setState({ account: accounts[0] });
    //Network ID
    const networkId = await web3.eth.net.getId();
    const networkData = Storage.networks[networkId];
    if (networkData) {
      const Storage = new web3.eth.Contract(Storage.abi, networkData.address);
      this.setState({ Storage });
      console.log(Storage);

      // get files amount
      const filesCount = await Storage.methods.fileCount().call();
      this.setState({ filesCount });
      // load files and sort by newest
      for (let i = filesCount; i >= 1; i--) {
        const file = await Storage.files(i).call();
        this.setState({
          files: [...this.state.files, file],
        });
      }
    } else {
      window.alert("Storage contract not deployed to the detected network.");
    }
  }

  // Get file from user
  captureFile = (event) => {
    event.preventDefault();

    const file = event.target.files[0];
    const reader = new window.FileReader();

    reader.readAsArrayBuffer(file);
    reader.onloadend = () => {
      this.setState({
        buffer: Buffer(reader.result),
        type: file.type,
        name: file.name,
      });
      console.log("buffer", this.state.buffer);
    };
  };

  //Upload File
  uploadFile = (description) => {
    console.log("Submitting file to ipfs");
    // add file to ipfs
    ipfs.add(this.state.buffer, (error, result) => {
      console.log("IPFS Result", result.size);
      if (error) {
        console.error(error);
        return;
      }
      this.setState({ loading: true });
      // assigning the value for the file without extension
      if (this.state.type === "") {
        this.setState({ type: "none" });
      }
      this.state.Storage.methods
        .uploadFile(
          result[0].hash,
          result[0].size,
          this.state.type,
          this.state.name,
          description
        )
        .send({ from: this.state.account })
        .on("transactionHash", (hash) => {
          this.setState({
            loading: false,
            type: null,
            name: null,
          });
          window.location.reload();
        })
        .on("error", (e) => {
          window.alert("Error");
          this.setState({ loading: false });
        });
    });
  };

  //Set states
  constructor(props) {
    super(props);
    this.state = {
      account: "",
      Storage: null,
      files: [],
      loading: false,
      type: null,
      name: null,
    };

    this.uploadFile = this.uploadFile.bind(this);
    this.captureFile = this.captureFile.bind(this);
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        {this.state.loading ? (
          <div id="loader" className="text-center mt-5">
            <p>Loading...</p>
          </div>
        ) : (
          <Main
            files={this.state.files}
            captureFile={this.captureFile}
            uploadFile={this.uploadFile}
          />
        )}
      </div>
    );
  }
}

export default App;
